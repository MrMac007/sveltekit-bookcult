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
 * Simple scoring based on title match + Open Library popularity metrics
 */
function calculateScore(doc: OpenLibrarySearchDoc, query: string): number {
	let score = 0;
	const queryLower = query.toLowerCase().trim();
	const titleLower = doc.title.toLowerCase();

	// Title match (0-40 points)
	if (titleLower === queryLower) {
		score += 40; // Exact match
	} else if (titleLower.startsWith(queryLower)) {
		score += 30; // Starts with query
	} else if (titleLower.includes(queryLower)) {
		score += 20; // Contains query
	}

	// Popularity from read count (0-40 points)
	const readCount = doc.already_read_count || 0;
	if (readCount > 10000) score += 40;
	else if (readCount > 1000) score += 30;
	else if (readCount > 100) score += 20;
	else if (readCount > 10) score += 10;

	// Rating quality (0-10 points)
	if (doc.ratings_count && doc.ratings_count > 50) {
		const avgRating = doc.ratings_average || 0;
		score += Math.min(10, Math.round(avgRating * 2));
	}

	// Edition count as popularity signal (0-10 points)
	const editions = doc.edition_count || 0;
	if (editions > 100) score += 10;
	else if (editions > 50) score += 7;
	else if (editions > 20) score += 5;
	else if (editions > 5) score += 3;

	return score;
}
