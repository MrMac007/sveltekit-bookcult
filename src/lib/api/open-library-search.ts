/**
 * Simplified Open Library search module
 * Uses work-level deduplication (work IDs like "OL12345W")
 */

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';

export interface SearchResult {
	workKey: string; // "OL12345W" - primary identifier
	title: string;
	authors: string[];
	coverUrl: string | null;
	firstPublishYear?: number;
	editionCount?: number;
	ratingsAverage?: number;
	readCount?: number;
	// Optional fields for database results
	id?: string; // Database UUID (only for books already in DB)
	source?: 'database' | 'openlib';
}

interface OpenLibrarySearchDoc {
	key: string; // "/works/OL12345W"
	title: string;
	author_name?: string[];
	cover_i?: number;
	cover_edition_key?: string;
	isbn?: string[];
	first_publish_year?: number;
	edition_count?: number;
	ratings_average?: number;
	ratings_count?: number;
	already_read_count?: number;
	want_to_read_count?: number;
	currently_reading_count?: number;
}

interface OpenLibrarySearchResponse {
	docs: OpenLibrarySearchDoc[];
	numFound: number;
}

/**
 * Search Open Library and return normalized results
 */
export async function searchBooks(query: string, limit: number = 20): Promise<SearchResult[]> {
	if (!query.trim()) {
		return [];
	}

	const params = new URLSearchParams({
		q: query,
		limit: String(limit * 2), // Fetch extra to account for filtering
		fields: [
			'key',
			'title',
			'author_name',
			'cover_i',
			'cover_edition_key',
			'isbn',
			'first_publish_year',
			'edition_count',
			'ratings_average',
			'ratings_count',
			'already_read_count',
			'want_to_read_count',
			'currently_reading_count'
		].join(',')
	});

	const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params}`);

	if (!response.ok) {
		throw new Error(`Open Library search failed: ${response.status}`);
	}

	const data: OpenLibrarySearchResponse = await response.json();

	// Normalize, score, and dedupe results
	const results = data.docs
		.map((doc) => ({
			result: normalizeSearchDoc(doc),
			score: calculateScore(doc, query)
		}))
		.filter((item) => item.result !== null)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((item) => item.result!);

	return results;
}

/**
 * Normalize an Open Library search doc to our SearchResult format
 */
function normalizeSearchDoc(doc: OpenLibrarySearchDoc): SearchResult | null {
	// Extract work key from path (e.g., "/works/OL12345W" -> "OL12345W")
	const workKey = doc.key?.replace('/works/', '');

	if (!workKey || !doc.title) {
		return null;
	}

	return {
		workKey,
		title: doc.title,
		authors: doc.author_name || [],
		coverUrl: getCoverUrl(doc),
		firstPublishYear: doc.first_publish_year,
		editionCount: doc.edition_count,
		ratingsAverage: doc.ratings_average,
		readCount: doc.already_read_count
	};
}

/**
 * Get the best cover URL for a search result
 * Uses Open Library's cover service with ?default=false to get 404 for missing covers
 */
function getCoverUrl(doc: OpenLibrarySearchDoc): string | null {
	// Prefer cover_i (direct cover ID) - most reliable
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`;
	}

	// Fall back to cover_edition_key (OLID)
	if (doc.cover_edition_key) {
		return `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg?default=false`;
	}

	// Fall back to ISBN
	if (doc.isbn?.length) {
		const isbn = doc.isbn.find((i) => i.length === 13) || doc.isbn[0];
		return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
	}

	return null;
}

/**
 * Calculate relevance score for sorting results
 * Title match is weighted heavily - popularity only matters for tie-breaking
 */
function calculateScore(doc: OpenLibrarySearchDoc, query: string): number {
	const queryLower = query.toLowerCase().trim();
	const titleLower = doc.title.toLowerCase();

	// Determine title match level
	let titleMatchLevel: 'exact' | 'starts' | 'contains' | 'none';
	if (titleLower === queryLower) {
		titleMatchLevel = 'exact';
	} else if (titleLower.startsWith(queryLower)) {
		titleMatchLevel = 'starts';
	} else if (titleLower.includes(queryLower)) {
		titleMatchLevel = 'contains';
	} else {
		titleMatchLevel = 'none';
	}

	// Calculate popularity score (0-30 points)
	let popularityScore = 0;
	const readCount = doc.already_read_count || 0;
	if (readCount > 10000) popularityScore = 30;
	else if (readCount > 1000) popularityScore = 25;
	else if (readCount > 100) popularityScore = 15;
	else if (readCount > 10) popularityScore = 8;

	// Add rating bonus (0-10 points)
	if (doc.ratings_count && doc.ratings_count > 50) {
		const avgRating = doc.ratings_average || 0;
		popularityScore += Math.min(10, Math.round(avgRating * 2));
	}

	// Add edition count bonus (0-5 points)
	const editions = doc.edition_count || 0;
	if (editions > 100) popularityScore += 5;
	else if (editions > 50) popularityScore += 3;
	else if (editions > 20) popularityScore += 2;

	// Final score based on title match level
	// Title match is the primary factor, popularity is secondary
	switch (titleMatchLevel) {
		case 'exact':
			return 200 + popularityScore; // 200-245 range
		case 'starts':
			return 150 + popularityScore; // 150-195 range
		case 'contains':
			return 100 + popularityScore; // 100-145 range
		case 'none':
			// If title doesn't match at all, heavily penalize
			// Only get a fraction of popularity score
			return Math.floor(popularityScore * 0.3); // 0-13 range
	}
}
