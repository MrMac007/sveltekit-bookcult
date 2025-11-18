import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BookCardData } from '$lib/types/api';

/**
 * Finds or creates a book in the database.
 * Now that search results come from the database-first approach,
 * books should already have a database ID. This function serves as
 * a fallback for edge cases where a book needs to be added directly.
 *
 * @param bookData - Book data (should have database ID from search)
 * @param supabase - Supabase client instance
 * @returns The database book ID (UUID) to use for relationships
 */
export async function findOrCreateBook(
	bookData: BookCardData,
	supabase: SupabaseClient<Database, 'public'>
): Promise<string | null> {
	const client = supabase as any
	// Check if the id looks like a UUID (database ID) vs Google Books ID
	// UUIDs are 36 chars with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	// Google Books IDs are shorter alphanumeric strings
	const isUUID =
		bookData.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookData.id);

	if (isUUID) {
		// Already has a database ID, return it
		return bookData.id;
	}

	// Try to find existing book by google_books_id
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
	// Note: AI enhancement will happen on first page view, not on creation
	// This saves database writes and API calls
	console.log('[book-helpers] Creating new book:', bookData.title);

	const { data: newBook, error: bookError } = await client
		.from('books')
		.insert({
			google_books_id: bookData.google_books_id,
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
