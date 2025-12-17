// @ts-nocheck
import { openLibraryAPI } from './open-library';
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
 * Get book from cache or Open Library API
 * Uses Open Library keys for lookups
 * Checks for existing books by ISBN first to avoid duplicates
 */
export async function getOrFetchBook(
	bookId: string,
	supabase: SupabaseClient<Database>
): Promise<Book | null> {
	try {
		// Fetch from Open Library
		const olBook = await openLibraryAPI.getBookDetails(bookId);
		if (!olBook) {
			console.error('[book-cache] Open Library book not found:', bookId);
			return null;
		}
		const book: any = { ...olBook };

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

		// Check by Open Library key
		if (!existingBook) {
			const olKey = book.open_library_key || bookId;
			const { data } = await supabase
				.from('books')
				.select('*')
				.eq('open_library_key', olKey)
				.single();

			if (data && !isStale(data.last_updated)) {
				return data;
			}
			existingBook = data;
		}

		// Check if this is a new book
		const isNewBook = !existingBook;

		// Remove fields that don't exist in the database schema
		const { id: _, averageRating, ratingsCount, popularity_score, edition_count, matchScore, ...bookData } = book;

		// Set the Open Library key
		bookData.open_library_key = bookId;

		// If this is a new book, enhance it with AI
		let enhancedData: Partial<Book> | null = null;
		if (isNewBook) {
			enhancedData = await enhanceBookIfNeeded(book);
		}

		// If book exists, update it; otherwise insert new
		if (existingBook) {
			// Update existing book
			const { data: updatedBook, error: updateError } = await supabase
				.from('books')
				.update({
					...bookData,
					last_updated: new Date().toISOString()
				})
				.eq('id', existingBook.id)
				.select()
				.single();

			if (updateError) {
				console.error('[book-cache] Update error:', updateError.message);
				return existingBook; // Return existing book on error
			}

			return updatedBook || existingBook;
		} else {
			// Insert new book
			const insertData = {
				...bookData,
				...(enhancedData || {}),
				last_updated: new Date().toISOString()
			};

			const { data: insertedBook, error: insertError } = await supabase
				.from('books')
				.insert(insertData)
				.select()
				.single();

			if (insertError) {
				console.error('[book-cache] Insert error - code:', insertError.code);
				console.error('[book-cache] Insert error - message:', insertError.message);

				// If insert failed due to duplicate, try to fetch the existing book
				if (insertError.code === '23505') {
					const { data: existingByKey } = await supabase
						.from('books')
						.select('*')
						.eq('open_library_key', bookId)
						.single();

					if (existingByKey) {
						return existingByKey;
					}
				}

				return null;
			}

			if (insertedBook) {
				console.log('[book-cache] Insert successful, returning book with UUID:', insertedBook.id);
				if (enhancedData) {
					console.log('[book-cache] Book was enhanced with AI during creation');
				}
				return insertedBook;
			}

			return null;
		}
	} catch (error) {
		console.error('Error fetching book from API:', error);

		// If API fails, try to get from cache
		const { data: cachedBook } = await supabase
			.from('books')
			.select('*')
			.eq('open_library_key', bookId)
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

	// Otherwise, search Open Library
	try {
		const books = await openLibraryAPI.searchAndNormalize(query, maxResults);

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
						onConflict: 'open_library_key',
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

	// Fetch from Open Library
	try {
		const response = await openLibraryAPI.searchByISBN(isbn);

		if (!response.docs || response.docs.length === 0) {
			return cachedBook || null;
		}

		const book = openLibraryAPI.normalizeSearchDoc(response.docs[0]);

		// Update or insert in cache
		const { data: upsertedBook } = await supabase
			.from('books')
			.upsert(
				{
					...book,
					last_updated: new Date().toISOString()
				},
				{
					onConflict: 'open_library_key'
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
