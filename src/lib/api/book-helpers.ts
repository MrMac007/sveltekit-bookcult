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
 * Check if an ID is an Open Library key (work or edition)
 * Open Library keys look like: OL12345W (work) or OL12345M (edition)
 */
function isOpenLibraryKey(id: string): boolean {
	return /^OL\d+[WM]$/.test(id);
}

/**
 * Check if an ID is an Open Library work key (canonical book representation)
 * Work keys end with 'W': OL12345W
 */
function isWorkKey(id: string): boolean {
	return /^OL\d+W$/.test(id);
}

/**
 * Check if an ID is an Open Library edition key (specific publication)
 * Edition keys end with 'M': OL12345M
 */
function isEditionKey(id: string): boolean {
	return /^OL\d+M$/.test(id);
}

/**
 * Finds or creates a book in the database.
 * Prioritizes Open Library work keys for deduplication to ensure
 * all users adding the same book reference the same database entry.
 *
 * Lookup priority:
 * 1. Open Library work key (most reliable for "same book" concept)
 * 2. ISBN-13
 * 3. ISBN-10
 * 4. Google Books ID (legacy)
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

	// Determine the Open Library key
	const olKey = bookData.open_library_key ||
		(bookData.id && isOpenLibraryKey(bookData.id) ? bookData.id : null);

	// Warn if an edition key is being used instead of a work key
	if (olKey && isEditionKey(olKey)) {
		console.warn('[book-helpers] Edition key used instead of work key:', olKey);
		console.warn('[book-helpers] For proper deduplication, use work keys (OL...W) not edition keys (OL...M)');
	}

	// 1. First, try to find by Open Library key (most reliable for deduplication)
	if (olKey) {
		const { data } = await client
			.from('books')
			.select('id')
			.eq('open_library_key', olKey)
			.single();

		if (data) {
			return data.id;
		}
	}

	// 2. Try to find by ISBN-13
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

	// 3. Try to find by ISBN-10
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

	// 4. Try to find by Google Books ID (legacy)
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
	const googleBooksId = bookData.google_books_id ||
		(bookData.id && !isOpenLibraryKey(bookData.id) && !isUUID(bookData.id) ? bookData.id : null);

	const { data: newBook, error: bookError } = await client
		.from('books')
		.insert({
			google_books_id: googleBooksId,
			open_library_key: olKey,
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
