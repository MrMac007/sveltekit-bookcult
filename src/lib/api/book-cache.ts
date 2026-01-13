import { openLibraryAPI } from './open-library';
import type { Book } from '$lib/types/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type BookRow = Database['public']['Tables']['books']['Row'];

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
 * Get book from cache or Open Library API
 * Uses Open Library keys for lookups
 * Checks for existing books by ISBN first to avoid duplicates
 */
export async function getOrFetchBook(
	bookId: string,
	supabase: SupabaseClient<Database>
): Promise<Book | null> {
	const db = supabase as any; // Type assertion for Supabase queries
	try {
		// Fetch from Open Library
		const olBook = await openLibraryAPI.getBookDetails(bookId);
		if (!olBook) {
			console.error('[book-cache] Open Library book not found:', bookId);
			return null;
		}
		const book: any = { ...olBook };

		// Try to find existing book by ISBN or Open Library key (parallel lookups)
		const olKey = book.open_library_key || bookId;
		const lookupPromises = await Promise.all([
			book.isbn_13
				? db.from('books').select('*').eq('isbn_13', book.isbn_13).maybeSingle()
				: Promise.resolve({ data: null }),
			book.isbn_10
				? db.from('books').select('*').eq('isbn_10', book.isbn_10).maybeSingle()
				: Promise.resolve({ data: null }),
			db.from('books').select('*').eq('open_library_key', olKey).maybeSingle(),
		]);

		const [isbn13Result, isbn10Result, olKeyResult] = lookupPromises;

		// Check results in order of preference (ISBN-13 > ISBN-10 > OL key)
		// Return fresh data immediately if found
		for (const result of [isbn13Result, isbn10Result, olKeyResult]) {
			if (result.data && !isStale(result.data.last_updated)) {
				return result.data;
			}
		}

		// Use any existing book found (even if stale) for updating
		const existingBook = isbn13Result.data || isbn10Result.data || olKeyResult.data;

		// Remove temporary/computed fields that don't belong in the database
		const {
			id: _,
			averageRating,
			ratingsCount,
			matchScore,
			...bookData
		} = book;

		// Set the Open Library key
		bookData.open_library_key = bookId;

		// Extract first_publish_year from published_date if it's a year string
		if (bookData.published_date && /^\d{4}$/.test(bookData.published_date)) {
			bookData.first_publish_year = parseInt(bookData.published_date, 10);
		}

		// If book exists, update it; otherwise insert new
		if (existingBook) {
			// Update existing book
			const { data: updatedBook, error: updateError } = await db
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
			// Insert new book (without automatic AI enhancement)
			const insertData = {
				...bookData,
				last_updated: new Date().toISOString()
			};

			const { data: insertedBook, error: insertError } = await db
				.from('books')
				.insert(insertData)
				.select()
				.single();

			if (insertError) {
				console.error('[book-cache] Insert error - code:', insertError.code);
				console.error('[book-cache] Insert error - message:', insertError.message);

				// If insert failed due to duplicate, try to fetch the existing book
				if (insertError.code === '23505') {
					const { data: existingByKey } = await db
						.from('books')
						.select('*')
						.eq('open_library_key', bookId)
						.maybeSingle();

					if (existingByKey) {
						return existingByKey;
					}
				}

				return null;
			}

			if (insertedBook) {
				console.log('[book-cache] Insert successful, returning book with UUID:', insertedBook.id);
				return insertedBook;
			}

			return null;
		}
	} catch (error) {
		console.error('Error fetching book from API:', error);

		// If API fails, try to get from cache
		const { data: cachedBook } = await db
			.from('books')
			.select('*')
			.eq('open_library_key', bookId)
			.maybeSingle();

		return cachedBook || null;
	}
}

// Note: getOrFetchBookWithCover has been removed.
// Book covers are now automatically selected using UK-preferred editions via getBestEditionForUK().
// Use getOrFetchBook() which automatically selects the best cover.

/**
 * Search books with caching
 */
export async function searchBooks(
	query: string,
	supabase: SupabaseClient<Database>,
	maxResults: number = 20
): Promise<Book[]> {
	const db = supabase as any; // Type assertion for Supabase queries
	// First, try full-text search in our cache
	const { data: cachedBooks } = await db
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
		// Return results without auto-caching - books are only saved when user explicitly adds them
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
	const db = supabase as any; // Type assertion for Supabase queries
	// Try to get from cache by ISBN
	const { data: cachedBook } = await db
		.from('books')
		.select('*')
		.or(`isbn_13.eq.${isbn},isbn_10.eq.${isbn}`)
		.maybeSingle();

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
		const { data: upsertedBook } = await db
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
