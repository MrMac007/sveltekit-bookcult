// @ts-nocheck
import { googleBooksAPI } from './google-books';
import type { Book } from '$lib/types/api';
import { enhanceBookMetadata, validateEnhancedMetadata } from '$lib/ai/book-enhancer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const CACHE_EXPIRY_DAYS = 30;

/**
 * Check if cached book data is stale
 */
function isStale(lastUpdated: string): boolean {
	const lastUpdateDate = new Date(lastUpdated);
	const expiryDate = new Date(lastUpdateDate.getTime() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
	return new Date() > expiryDate;
}

/**
 * Enhance book metadata with AI
 * Returns enhanced data or null if enhancement fails
 */
async function enhanceBookIfNeeded(book: Book): Promise<Partial<Book> | null> {
	try {
		console.log('[book-cache] Enhancing new book with AI:', book.title);

		const enhanced = await enhanceBookMetadata({
			title: book.title,
			authors: book.authors,
			description: book.description,
			categories: book.categories || [],
			published_date: book.published_date,
			publisher: book.publisher,
			isbn_13: book.isbn_13,
			isbn_10: book.isbn_10
		});

		// Validate the enhanced metadata
		if (!validateEnhancedMetadata(enhanced)) {
			console.error('[book-cache] Enhanced metadata failed validation');
			return null;
		}

		console.log('[book-cache] AI enhancement successful:', {
			categories: enhanced.categories,
			descriptionWords: enhanced.description.split(/\s+/).length,
			publishedDate: enhanced.published_date
		});

		return {
			categories: enhanced.categories,
			description: enhanced.description,
			published_date: enhanced.published_date,
			publisher: enhanced.publisher || book.publisher,
			ai_enhanced: true,
			ai_enhanced_at: new Date().toISOString()
		};
	} catch (error) {
		console.error('[book-cache] Error enhancing book with AI:', error);
		return null;
	}
}

/**
 * Get book from cache or API
 * Checks for existing books by ISBN first to avoid duplicates
 */
export async function getOrFetchBook(
	googleBooksId: string,
	supabase: SupabaseClient<Database>
): Promise<Book | null> {
	// Fetch from API first to get ISBN information
	try {
		const volume = await googleBooksAPI.getBookById(googleBooksId);
		const book = googleBooksAPI.normalizeVolume(volume);

		// Try to find existing book by ISBN first (deduplication)
		let existingBook = null;

		if (book.isbn_13) {
			const { data } = await supabase
				.from('books')
				.select('*')
				.eq('isbn_13', book.isbn_13)
				.single();

			if (data && !isStale(data.last_updated)) {
				return data;
			}
			existingBook = data;
		}

		if (!existingBook && book.isbn_10) {
			const { data } = await supabase
				.from('books')
				.select('*')
				.eq('isbn_10', book.isbn_10)
				.single();

			if (data && !isStale(data.last_updated)) {
				return data;
			}
			existingBook = data;
		}

		// Fall back to google_books_id check
		if (!existingBook) {
			const { data } = await supabase
				.from('books')
				.select('*')
				.eq('google_books_id', googleBooksId)
				.single();

			if (data && !isStale(data.last_updated)) {
				return data;
			}
			existingBook = data;
		}

		// Check if this is a new book (not in existingBook)
		const isNewBook = !existingBook;

		// Update or insert in cache (upsert by google_books_id to avoid duplicates there)
		// Remove fields that don't exist in the database schema or should be auto-generated
		const { id: _, averageRating, ratingsCount, ...bookData } = book;

		// If this is a new book, enhance it with AI
		let enhancedData: Partial<Book> | null = null;
		if (isNewBook) {
			enhancedData = await enhanceBookIfNeeded(book);
		}

		const { data: upsertedBook, error: upsertError } = await supabase
			.from('books')
			.upsert(
				{
					...bookData,
					...(enhancedData || {}), // Apply AI enhancements if available
					last_updated: new Date().toISOString()
				},
				{
					onConflict: 'google_books_id'
				}
			)
			.select()
			.single();

		if (upsertError) {
			console.error('[book-cache] Upsert error - code:', upsertError.code);
			console.error('[book-cache] Upsert error - message:', upsertError.message);
			console.error('[book-cache] Upsert error - details:', upsertError.details);
			console.error('[book-cache] Upsert error - hint:', upsertError.hint);
		}

		if (upsertedBook) {
			console.log('[book-cache] Upsert successful, returning book with UUID:', upsertedBook.id);
			if (isNewBook && enhancedData) {
				console.log('[book-cache] Book was enhanced with AI during creation');
			}
			return upsertedBook;
		} else {
			console.warn(
				'[book-cache] Upsert returned null, falling back to normalized book with Google Books ID:',
				book.id
			);
			return book;
		}
	} catch (error) {
		console.error('Error fetching book from API:', error);
		// If API fails, try to get from cache by google_books_id
		const { data: cachedBook } = await supabase
			.from('books')
			.select('*')
			.eq('google_books_id', googleBooksId)
			.single();

		return cachedBook || null;
	}
}

/**
 * Search books with caching
 */
export async function searchBooks(
	query: string,
	supabase: SupabaseClient<Database>,
	maxResults: number = 20
): Promise<Book[]> {
	// First, try full-text search in our cache
	const { data: cachedBooks } = await supabase
		.from('books')
		.select('*')
		.textSearch('search_vector', query)
		.limit(maxResults);

	// If we have enough cached results, return them
	if (cachedBooks && cachedBooks.length >= Math.min(5, maxResults)) {
		return cachedBooks;
	}

	// Otherwise, search the API
	try {
		const books = await googleBooksAPI.searchAndNormalize(query, maxResults);

		// Cache the results (upsert to avoid duplicates)
		if (books.length > 0) {
			await supabase
				.from('books')
				.upsert(
					books.map((book) => ({
						...book,
						last_updated: new Date().toISOString()
					})),
					{
						onConflict: 'google_books_id',
						ignoreDuplicates: false
					}
				);
		}

		return books;
	} catch (error) {
		console.error('Error searching books:', error);
		// Fall back to cached results if API fails
		return cachedBooks || [];
	}
}

/**
 * Get book by ISBN with caching
 */
export async function getBookByISBN(
	isbn: string,
	supabase: SupabaseClient<Database>
): Promise<Book | null> {
	// Try to get from cache by ISBN
	const { data: cachedBook } = await supabase
		.from('books')
		.select('*')
		.or(`isbn_13.eq.${isbn},isbn_10.eq.${isbn}`)
		.single();

	// If cached and not stale, return it
	if (cachedBook && !isStale(cachedBook.last_updated)) {
		return cachedBook;
	}

	// Fetch from API
	try {
		const response = await googleBooksAPI.searchByISBN(isbn);

		if (!response.items || response.items.length === 0) {
			return cachedBook || null;
		}

		const book = googleBooksAPI.normalizeVolume(response.items[0]);

		// Update or insert in cache
		const { data: upsertedBook } = await supabase
			.from('books')
			.upsert(
				{
					...book,
					last_updated: new Date().toISOString()
				},
				{
					onConflict: 'google_books_id'
				}
			)
			.select()
			.single();

		return upsertedBook || book;
	} catch (error) {
		console.error('Error fetching book by ISBN:', error);
		return cachedBook || null;
	}
}
