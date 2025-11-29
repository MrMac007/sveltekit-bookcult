import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BookCardData } from '$lib/types/api';

/**
 * Check if an ID is a UUID (database ID) vs external ID
 * UUIDs are 36 chars with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
function isUUID(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Check if an ID is an Open Library key
 * Open Library keys look like: OL12345W (work) or OL12345M (edition)
 */
function isOpenLibraryKey(id: string): boolean {
	return /^OL\d+[WM]$/.test(id);
}

/**
 * Finds or creates a book in the database.
 * Supports both Google Books IDs and Open Library keys.
 *
 * @param bookData - Book data (should have database ID from search)
 * @param supabase - Supabase client instance
 * @returns The database book ID (UUID) to use for relationships
 */
export async function findOrCreateBook(
	bookData: BookCardData,
	supabase: SupabaseClient<Database, 'public'>
): Promise<string | null> {
	const client = supabase as any;

	// If already a UUID, return it
	if (bookData.id && isUUID(bookData.id)) {
		return bookData.id;
	}

	// Try to find existing book by ISBN first (most reliable deduplication)
	if (bookData.isbn_13) {
		const { data } = await client
			.from('books')
			.select('id')
			.eq('isbn_13', bookData.isbn_13)
			.single();

		if (data) {
			return data.id;
		}
	}

	if (bookData.isbn_10) {
		const { data } = await client
			.from('books')
			.select('id')
			.eq('isbn_10', bookData.isbn_10)
			.single();

		if (data) {
			return data.id;
		}
	}

	// Try to find by Open Library key
	if (bookData.open_library_key) {
		const { data } = await client
			.from('books')
			.select('id')
			.eq('open_library_key', bookData.open_library_key)
			.single();

		if (data) {
			return data.id;
		}
	}

	// Check if the ID itself is an Open Library key
	if (bookData.id && isOpenLibraryKey(bookData.id)) {
		const { data } = await client
			.from('books')
			.select('id')
			.eq('open_library_key', bookData.id)
			.single();

		if (data) {
			return data.id;
		}
	}

	// Try to find by Google Books ID
	if (bookData.google_books_id) {
		const { data } = await client
			.from('books')
			.select('id')
			.eq('google_books_id', bookData.google_books_id)
			.single();

		if (data) {
			return data.id;
		}
	}

	// Book doesn't exist in database, create it
	console.log('[book-helpers] Creating new book:', bookData.title);

	// Determine which external ID to use
	const openLibraryKey = bookData.open_library_key ||
		(bookData.id && isOpenLibraryKey(bookData.id) ? bookData.id : null);
	const googleBooksId = bookData.google_books_id ||
		(bookData.id && !isOpenLibraryKey(bookData.id) && !isUUID(bookData.id) ? bookData.id : null);

	const { data: newBook, error: bookError } = await client
		.from('books')
		.insert({
			google_books_id: googleBooksId,
			open_library_key: openLibraryKey,
			title: bookData.title,
			authors: bookData.authors,
			description: bookData.description,
			cover_url: bookData.cover_url,
			published_date: bookData.published_date,
			page_count: bookData.page_count,
			categories: bookData.categories,
			isbn_10: bookData.isbn_10,
			isbn_13: bookData.isbn_13,
			ai_enhanced: false // Will be enhanced on first view
		})
		.select('id')
		.single();

	if (bookError) {
		console.error('Error creating book:', bookError);
		throw bookError;
	}

	return newBook?.id || null;
}
