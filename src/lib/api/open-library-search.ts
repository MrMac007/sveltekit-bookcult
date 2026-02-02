/**
 * Simplified Open Library search module
 * Uses work-level deduplication (work IDs like "OL12345W")
 */

import { buildCoverUrl } from '$lib/utils/covers';
import { OPEN_LIBRARY_SEARCH_URL } from '$lib/constants';
import type { OpenLibrarySearchDoc, OpenLibrarySearchResponse } from '$lib/api/open-library';
import type { BookSearchResult } from '$lib/types/book-search';

/**
 * Search Open Library and return normalized results
 */
export async function searchBooks(query: string, limit: number = 20): Promise<BookSearchResult[]> {
	if (!query.trim()) {
		return [];
	}

	const params = new URLSearchParams({
		q: query,
		limit: String(Math.max(limit * 3, 60)), // Fetch extra to capture more series books
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
 * Normalize an Open Library search doc to our BookSearchResult format
 */
function normalizeSearchDoc(doc: OpenLibrarySearchDoc): BookSearchResult | null {
	// Extract work key from path (e.g., "/works/OL12345W" -> "OL12345W")
	const workKey = doc.key?.replace('/works/', '');

	if (!workKey || !doc.title) {
		return null;
	}

	return {
		open_library_key: workKey,
		title: doc.title,
		authors: doc.author_name || [],
		cover_url: getCoverUrl(doc),
		first_publish_year: doc.first_publish_year,
		source: 'openlib'
	};
}

/**
 * Get the best cover URL for a search result
 * Uses consolidated cover URL utility
 */
function getCoverUrl(doc: OpenLibrarySearchDoc): string | null {
	const isbn13 = doc.isbn?.find((i) => i.length === 13);
	const isbn10 = doc.isbn?.find((i) => i.length === 10) || doc.isbn?.[0];

	return buildCoverUrl({
		coverId: doc.cover_i,
		coverEditionKey: doc.cover_edition_key,
		isbn13,
		isbn10
	}) ?? null;
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
