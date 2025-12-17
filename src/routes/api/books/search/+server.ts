import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';
import { bookSearchService, type UnifiedBook } from '$lib/api/book-search-service';

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q');
	const source = event.url.searchParams.get('source') || 'database'; // database, api, both
	const author = event.url.searchParams.get('author') || undefined;

	if (!query) {
		return json({ error: 'Search query is required' }, { status: 400 });
	}

	try {
		const supabase = createClient(event);

		// API-only searches (bypass database) - uses Open Library
		if (source === 'api') {
			const apiResults = await bookSearchService.search(query, {
				maxResults: 20,
				author
			});
			return json(apiResults);
		}

		// Search the local database first
		const searchTerm = `%${query.toLowerCase()}%`;
		let dbQuery = supabase.from('books').select('*');
		dbQuery = dbQuery.or(`title.ilike.${searchTerm},authors.cs.{${query}}`);

		// Handle author filter
		if (author && author.trim()) {
			const { data: dbBooks, error: dbError } = await dbQuery.limit(100);

			if (dbError) {
				console.error('Database search error:', dbError);
			}

			const authorLower = author.toLowerCase();
			const filteredBooks = (dbBooks || [])
				.filter((book: any) => {
					const authors = book.authors || [];
					return authors.some((a: string) => a.toLowerCase().includes(authorLower));
				})
				.slice(0, 20);

			const formattedDbResults = formatDatabaseResults(filteredBooks);

			if (formattedDbResults.length > 0 && source !== 'both') {
				return json(formattedDbResults);
			}

			// Supplement with API results using Open Library
			const apiResults = await bookSearchService.search(query, {
				maxResults: 20,
				author
			});

			if (source === 'both' && formattedDbResults.length > 0) {
				return json(mergeAndDeduplicate(formattedDbResults, apiResults));
			}

			return json(apiResults);
		}

		// No author filter - simpler query
		const { data: dbBooks, error: dbError } = await dbQuery.limit(20);

		if (dbError) {
			console.error('Database search error:', dbError);
		}

		const formattedDbResults = formatDatabaseResults(dbBooks || []);

		if (formattedDbResults.length > 0 && source !== 'both') {
			return json(formattedDbResults);
		}

		// Use Open Library search
		const apiResults = await bookSearchService.search(query, {
			maxResults: 20,
			author
		});

		if (source === 'both' && formattedDbResults.length > 0) {
			return json(mergeAndDeduplicate(formattedDbResults, apiResults));
		}

		return json(apiResults);
	} catch (error) {
		console.error('Book search error:', error);
		return json({ error: 'Failed to search books' }, { status: 500 });
	}
};

/**
 * Generate a fallback cover URL from Open Library
 * Using ?default=false to get 404 instead of 1x1 transparent pixel for missing covers
 * Note: OLID covers only work with Edition IDs (OL...M), not Work keys (OL...W)
 */
function getFallbackCoverUrl(book: any): string | null {
	// Try ISBN first (most reliable for covers)
	if (book.isbn_13) {
		return `https://covers.openlibrary.org/b/isbn/${book.isbn_13}-M.jpg?default=false`;
	}
	if (book.isbn_10) {
		return `https://covers.openlibrary.org/b/isbn/${book.isbn_10}-M.jpg?default=false`;
	}
	return null;
}

/**
 * Generate a reliable cover URL, preferring fresh ISBN-based URLs over stored ones
 * This avoids issues with old/broken URLs stored in the database
 */
function getReliableCoverUrl(book: any): string | undefined {
	// Always prefer generating a fresh URL from ISBN (most reliable)
	const freshUrl = getFallbackCoverUrl(book);
	if (freshUrl) {
		return freshUrl;
	}

	// If no ISBN available, check if stored URL uses covers.openlibrary.org with ?default=false
	if (book.cover_url &&
		book.cover_url.includes('covers.openlibrary.org') &&
		book.cover_url.includes('?default=false')) {
		return book.cover_url;
	}

	// Don't use old/broken URLs that might redirect to archive.org
	return undefined;
}

/**
 * Format database results to match UnifiedBook format
 */
function formatDatabaseResults(books: any[]): UnifiedBook[] {
	return books.map((book) => ({
		id: book.id,
		google_books_id: book.google_books_id,
		open_library_key: book.open_library_key,
		isbn_13: book.isbn_13,
		isbn_10: book.isbn_10,
		title: book.title,
		authors: book.authors || [],
		publisher: book.publisher,
		published_date: book.published_date,
		description: book.description,
		page_count: book.page_count,
		cover_url: getReliableCoverUrl(book),
		categories: book.categories || [],
		language: book.language,
		source: 'database' as const // Mark as from database for debugging
	}));
}

/**
 * Merge database results with API results, deduplicating by ISBN or title
 */
function mergeAndDeduplicate(dbResults: UnifiedBook[], apiResults: UnifiedBook[]): UnifiedBook[] {
	const seen = new Set<string>();

	// Add database results first (they take priority)
	for (const book of dbResults) {
		if (book.isbn_13) seen.add(`isbn13:${book.isbn_13}`);
		if (book.isbn_10) seen.add(`isbn10:${book.isbn_10}`);
		if (book.google_books_id) seen.add(`google:${book.google_books_id}`);
		if (book.open_library_key) seen.add(`openlib:${book.open_library_key}`);
		seen.add(`title:${book.title.toLowerCase()}`);
	}

	// Filter API results
	const uniqueApiResults = apiResults.filter((book) => {
		const isDuplicate =
			(book.isbn_13 && seen.has(`isbn13:${book.isbn_13}`)) ||
			(book.isbn_10 && seen.has(`isbn10:${book.isbn_10}`)) ||
			(book.google_books_id && seen.has(`google:${book.google_books_id}`)) ||
			(book.open_library_key && seen.has(`openlib:${book.open_library_key}`)) ||
			seen.has(`title:${book.title.toLowerCase()}`);

		return !isDuplicate;
	});

	return [...dbResults, ...uniqueApiResults];
}
