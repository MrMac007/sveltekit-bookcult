/**
 * Consolidated Open Library cover URL utilities
 *
 * Open Library provides covers via three methods:
 * 1. Cover ID (cover_i) - Most reliable, direct ID reference
 * 2. Edition OLID (cover_edition_key) - Edition with known cover
 * 3. ISBN - Fallback, may not always have cover
 *
 * Adding ?default=false makes Open Library return 404 for missing covers
 * instead of a 1x1 transparent pixel (which doesn't trigger onerror)
 */

export const COVERS_API_URL = 'https://covers.openlibrary.org';

export type CoverSize = 'S' | 'M' | 'L';

/**
 * Get cover URL from Open Library cover ID
 */
export function getCoverUrlById(coverId: number | undefined, size: CoverSize = 'M'): string | undefined {
	if (!coverId || coverId <= 0) return undefined;
	return `${COVERS_API_URL}/b/id/${coverId}-${size}.jpg?default=false`;
}

/**
 * Get cover URL from Open Library edition OLID
 * Note: Only works with Edition IDs (OL...M), not Work keys (OL...W)
 */
export function getCoverUrlByOlid(olid: string | undefined, size: CoverSize = 'M'): string | undefined {
	if (!olid) return undefined;
	return `${COVERS_API_URL}/b/olid/${olid}-${size}.jpg?default=false`;
}

/**
 * Get cover URL from ISBN (13 or 10)
 */
export function getCoverUrlByIsbn(isbn: string | undefined, size: CoverSize = 'M'): string | undefined {
	if (!isbn) return undefined;
	return `${COVERS_API_URL}/b/isbn/${isbn}-${size}.jpg?default=false`;
}

/**
 * Build cover URL with fallback chain: cover_i > cover_edition_key > isbn13 > isbn10
 * This is the recommended function for search results
 */
export function buildCoverUrl(options: {
	coverId?: number;
	coverEditionKey?: string;
	isbn13?: string;
	isbn10?: string;
	size?: CoverSize;
}): string | undefined {
	const { coverId, coverEditionKey, isbn13, isbn10, size = 'M' } = options;

	return (
		getCoverUrlById(coverId, size) ||
		getCoverUrlByOlid(coverEditionKey, size) ||
		getCoverUrlByIsbn(isbn13, size) ||
		getCoverUrlByIsbn(isbn10, size)
	);
}

/**
 * Ensure a cover URL has ?default=false parameter
 * This makes Open Library return 404 instead of transparent pixel for missing covers
 */
export function ensureDefaultFalse(url: string | undefined): string | undefined {
	if (!url) return undefined;

	// Only process Open Library URLs
	if (!url.includes('covers.openlibrary.org')) return url;

	if (url.includes('?default=false') || url.includes('&default=false')) {
		return url;
	}

	return url.includes('?') ? `${url}&default=false` : `${url}?default=false`;
}

/**
 * Get reliable cover URL from an object with various cover-related fields
 * Validates existing cover_url and falls back to ISBNs if needed
 */
export function getReliableCoverUrl(item: {
	cover_url?: string | null;
	isbn_13?: string | null;
	isbn_10?: string | null;
}): string | undefined {
	// First, try to use the stored cover_url (from cover_i during search)
	// This is the most reliable source since Open Library marks these as having covers
	if (item.cover_url && item.cover_url.includes('covers.openlibrary.org')) {
		return ensureDefaultFalse(item.cover_url);
	}

	// Fall back to ISBN-based URLs only if no cover_url exists
	return getCoverUrlByIsbn(item.isbn_13 ?? undefined) || getCoverUrlByIsbn(item.isbn_10 ?? undefined);
}
