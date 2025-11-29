/**
 * Book Search Service
 *
 * Uses Open Library for all book searches.
 * Open Library provides better canonical editions and a works-based approach.
 */

import { openLibraryAPI, type NormalizedBook } from './open-library';
import type { Book } from '$lib/types/api';

export interface SearchOptions {
	maxResults?: number;
	author?: string;
}

export interface UnifiedBook {
	id: string;
	open_library_key?: string;
	google_books_id?: string;
	isbn_13?: string;
	isbn_10?: string;
	title: string;
	authors: string[];
	publisher?: string;
	published_date?: string;
	description?: string;
	page_count?: number;
	cover_url?: string;
	categories: string[];
	language?: string;
	source: 'openlib' | 'database';
	popularity_score?: number;
}

/**
 * Convert Open Library normalized book to unified format
 */
function fromOpenLibrary(book: NormalizedBook): UnifiedBook {
	return {
		id: book.open_library_key,
		open_library_key: book.open_library_key,
		isbn_13: book.isbn_13,
		isbn_10: book.isbn_10,
		title: book.title,
		authors: book.authors,
		publisher: book.publisher,
		published_date: book.published_date,
		description: book.description,
		page_count: book.page_count,
		cover_url: book.cover_url,
		categories: book.categories,
		language: book.language,
		source: 'openlib',
		popularity_score: book.popularity_score
	};
}

export class BookSearchService {
	/**
	 * Search for books using Open Library
	 *
	 * @param query - Search query (title, author, etc.)
	 * @param options - Search options
	 */
	async search(query: string, options: SearchOptions = {}): Promise<UnifiedBook[]> {
		const { maxResults = 20, author } = options;

		const results = await openLibraryAPI.searchAndNormalize(query, maxResults, author);
		console.log(`[book-search] Open Library returned ${results.length} results`);
		return results.map(fromOpenLibrary);
	}

	/**
	 * Get book details by Open Library key
	 */
	async getBookById(id: string): Promise<UnifiedBook | null> {
		const book = await openLibraryAPI.getBookDetails(id);
		return book ? fromOpenLibrary(book) : null;
	}

	/**
	 * Search by ISBN using Open Library
	 */
	async searchByISBN(isbn: string): Promise<UnifiedBook | null> {
		try {
			const olResponse = await openLibraryAPI.searchByISBN(isbn);
			if (olResponse.docs && olResponse.docs.length > 0) {
				const normalized = openLibraryAPI.normalizeSearchDoc(olResponse.docs[0]);
				return fromOpenLibrary(normalized);
			}
		} catch (error) {
			console.error('[book-search] Open Library ISBN search failed:', error);
		}

		return null;
	}

	/**
	 * Enrich an existing book with data from Open Library
	 * Useful for filling in missing data from existing database records
	 */
	async enrichBook(book: Partial<UnifiedBook>): Promise<UnifiedBook | null> {
		// Try to find by ISBN first (most accurate)
		if (book.isbn_13) {
			const found = await this.searchByISBN(book.isbn_13);
			if (found) return this.mergeBookData(book, found);
		}

		if (book.isbn_10) {
			const found = await this.searchByISBN(book.isbn_10);
			if (found) return this.mergeBookData(book, found);
		}

		// Fall back to title + author search
		if (book.title) {
			const author = book.authors?.[0];
			const results = await this.search(book.title, { author, maxResults: 5 });

			// Find best match
			const titleLower = book.title.toLowerCase();
			const match = results.find((r) => r.title.toLowerCase() === titleLower);

			if (match) {
				return this.mergeBookData(book, match);
			}

			// Return first result if no exact match
			if (results.length > 0) {
				return this.mergeBookData(book, results[0]);
			}
		}

		return null;
	}

	/**
	 * Merge existing book data with newly found data
	 * Prefers existing data where available
	 */
	private mergeBookData(existing: Partial<UnifiedBook>, found: UnifiedBook): UnifiedBook {
		return {
			...found,
			id: existing.id || found.id,
			open_library_key: existing.open_library_key || found.open_library_key,
			google_books_id: existing.google_books_id || found.google_books_id,
			isbn_13: existing.isbn_13 || found.isbn_13,
			isbn_10: existing.isbn_10 || found.isbn_10,
			title: existing.title || found.title,
			authors: existing.authors?.length ? existing.authors : found.authors,
			publisher: existing.publisher || found.publisher,
			published_date: existing.published_date || found.published_date,
			description: existing.description || found.description,
			page_count: existing.page_count || found.page_count,
			cover_url: existing.cover_url || found.cover_url,
			categories: existing.categories?.length ? existing.categories : found.categories
		};
	}
}

// Export singleton instance
export const bookSearchService = new BookSearchService();

