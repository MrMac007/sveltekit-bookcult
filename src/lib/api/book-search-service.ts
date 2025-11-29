/**
 * Unified Book Search Service
 *
 * Hybrid approach:
 * 1. Primary: Open Library (better canonical editions, works-based)
 * 2. Fallback: Google Books (wider coverage for obscure titles)
 *
 * The service normalizes results from both sources to a consistent format.
 */

import { openLibraryAPI, type NormalizedBook } from './open-library';
import { googleBooksAPI } from './google-books';
import type { Book } from '$lib/types/api';

export type SearchSource = 'openlib' | 'google' | 'hybrid';

export interface SearchOptions {
	maxResults?: number;
	author?: string;
	source?: SearchSource;
	/** Minimum results from Open Library before falling back to Google */
	minOpenLibResults?: number;
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
	source: 'openlib' | 'google';
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

/**
 * Convert Google Books result to unified format
 */
function fromGoogleBooks(book: any): UnifiedBook {
	return {
		id: book.google_books_id || book.id,
		google_books_id: book.google_books_id || book.id,
		isbn_13: book.isbn_13,
		isbn_10: book.isbn_10,
		title: book.title,
		authors: book.authors || [],
		publisher: book.publisher,
		published_date: book.published_date,
		description: book.description,
		page_count: book.page_count,
		cover_url: book.cover_url,
		categories: book.categories || [],
		language: book.language,
		source: 'google'
	};
}

/**
 * Deduplicate books based on ISBN or title+author
 */
function deduplicateBooks(books: UnifiedBook[]): UnifiedBook[] {
	const seen = new Map<string, UnifiedBook>();

	for (const book of books) {
		// Create dedup keys
		const isbn13Key = book.isbn_13 ? `isbn13:${book.isbn_13}` : null;
		const isbn10Key = book.isbn_10 ? `isbn10:${book.isbn_10}` : null;
		const titleAuthorKey = `title:${book.title.toLowerCase()}:${book.authors.join(',').toLowerCase()}`;

		// Check if we've seen this book before
		const existingByIsbn13 = isbn13Key ? seen.get(isbn13Key) : null;
		const existingByIsbn10 = isbn10Key ? seen.get(isbn10Key) : null;
		const existingByTitle = seen.get(titleAuthorKey);

		const existing = existingByIsbn13 || existingByIsbn10 || existingByTitle;

		if (existing) {
			// Prefer Open Library results, or merge data
			if (existing.source === 'openlib') {
				// Keep Open Library, but steal Google's data if it has more
				if (book.source === 'google') {
					if (!existing.description && book.description) {
						existing.description = book.description;
					}
					if (!existing.cover_url && book.cover_url) {
						existing.cover_url = book.cover_url;
					}
					if (!existing.page_count && book.page_count) {
						existing.page_count = book.page_count;
					}
					if (!existing.google_books_id && book.google_books_id) {
						existing.google_books_id = book.google_books_id;
					}
				}
			} else if (book.source === 'openlib') {
				// Replace Google result with Open Library
				if (isbn13Key) seen.set(isbn13Key, book);
				if (isbn10Key) seen.set(isbn10Key, book);
				seen.set(titleAuthorKey, book);
				// Merge Google's data into Open Library result
				if (!book.description && existing.description) {
					book.description = existing.description;
				}
				if (!book.cover_url && existing.cover_url) {
					book.cover_url = existing.cover_url;
				}
				if (!book.google_books_id && existing.google_books_id) {
					book.google_books_id = existing.google_books_id;
				}
			}
			continue;
		}

		// New book, add to seen map
		if (isbn13Key) seen.set(isbn13Key, book);
		if (isbn10Key) seen.set(isbn10Key, book);
		seen.set(titleAuthorKey, book);
	}

	// Return unique books in order of first appearance
	const uniqueBooks: UnifiedBook[] = [];
	const addedIds = new Set<string>();

	for (const book of books) {
		const isbn13Key = book.isbn_13 ? `isbn13:${book.isbn_13}` : null;
		const titleAuthorKey = `title:${book.title.toLowerCase()}:${book.authors.join(',').toLowerCase()}`;
		const seenBook = (isbn13Key ? seen.get(isbn13Key) : null) || seen.get(titleAuthorKey);

		if (seenBook && !addedIds.has(seenBook.id)) {
			uniqueBooks.push(seenBook);
			addedIds.add(seenBook.id);
		}
	}

	return uniqueBooks;
}

export class BookSearchService {
	/**
	 * Search for books using the hybrid approach
	 *
	 * @param query - Search query (title, author, etc.)
	 * @param options - Search options
	 */
	async search(query: string, options: SearchOptions = {}): Promise<UnifiedBook[]> {
		const {
			maxResults = 20,
			author,
			source = 'hybrid',
			minOpenLibResults = 5
		} = options;

		// Single source searches
		if (source === 'openlib') {
			return this.searchOpenLibrary(query, maxResults, author);
		}

		if (source === 'google') {
			return this.searchGoogleBooks(query, maxResults, author);
		}

		// Hybrid search: Try Open Library first
		try {
			const openLibResults = await this.searchOpenLibrary(query, maxResults, author);

			// If we have enough results, return them
			if (openLibResults.length >= minOpenLibResults) {
				console.log(`[book-search] Open Library returned ${openLibResults.length} results`);
				return openLibResults;
			}

			// Not enough results, supplement with Google Books
			console.log(
				`[book-search] Open Library returned only ${openLibResults.length} results, supplementing with Google Books`
			);

			const googleResults = await this.searchGoogleBooks(query, maxResults, author);

			// Combine and deduplicate
			const combined = [...openLibResults, ...googleResults];
			const deduplicated = deduplicateBooks(combined);

			console.log(
				`[book-search] Combined: ${openLibResults.length} OpenLib + ${googleResults.length} Google = ${deduplicated.length} unique`
			);

			return deduplicated.slice(0, maxResults);
		} catch (openLibError) {
			// Open Library failed, fall back to Google Books entirely
			console.error('[book-search] Open Library failed, falling back to Google Books:', openLibError);

			try {
				return this.searchGoogleBooks(query, maxResults, author);
			} catch (googleError) {
				console.error('[book-search] Both APIs failed:', googleError);
				throw new Error('Failed to search books from all sources');
			}
		}
	}

	/**
	 * Search Open Library only
	 */
	private async searchOpenLibrary(
		query: string,
		maxResults: number,
		author?: string
	): Promise<UnifiedBook[]> {
		const results = await openLibraryAPI.searchAndNormalize(query, maxResults, author);
		return results.map(fromOpenLibrary);
	}

	/**
	 * Search Google Books only
	 */
	private async searchGoogleBooks(
		query: string,
		maxResults: number,
		author?: string
	): Promise<UnifiedBook[]> {
		const results = await googleBooksAPI.searchAndNormalize(query, maxResults, author);
		return results.map(fromGoogleBooks);
	}

	/**
	 * Get book details by ID (works with either Open Library key or Google Books ID)
	 */
	async getBookById(id: string, source?: 'openlib' | 'google'): Promise<UnifiedBook | null> {
		// Detect source from ID format if not specified
		if (!source) {
			// Open Library keys start with "OL" and end with "W" (work) or "M" (edition)
			source = /^OL\d+[WM]$/.test(id) ? 'openlib' : 'google';
		}

		if (source === 'openlib') {
			const book = await openLibraryAPI.getBookDetails(id);
			return book ? fromOpenLibrary(book) : null;
		}

		const volume = await googleBooksAPI.getBookById(id);
		const normalized = googleBooksAPI.normalizeVolume(volume);
		return fromGoogleBooks(normalized);
	}

	/**
	 * Search by ISBN (tries both sources)
	 */
	async searchByISBN(isbn: string): Promise<UnifiedBook | null> {
		// Try Open Library first
		try {
			const olResponse = await openLibraryAPI.searchByISBN(isbn);
			if (olResponse.docs && olResponse.docs.length > 0) {
				const normalized = openLibraryAPI.normalizeSearchDoc(olResponse.docs[0]);
				return fromOpenLibrary(normalized);
			}
		} catch (error) {
			console.error('[book-search] Open Library ISBN search failed:', error);
		}

		// Fall back to Google Books
		try {
			const gbResponse = await googleBooksAPI.searchByISBN(isbn);
			if (gbResponse.items && gbResponse.items.length > 0) {
				const normalized = googleBooksAPI.normalizeVolume(gbResponse.items[0]);
				return fromGoogleBooks(normalized);
			}
		} catch (error) {
			console.error('[book-search] Google Books ISBN search failed:', error);
		}

		return null;
	}

	/**
	 * Enrich an existing book with data from both sources
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

