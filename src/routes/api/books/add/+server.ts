import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

interface AddBookRequest {
	workKey: string;
	listType: 'wishlist' | 'reading' | 'completed';
	bookData: {
		title: string;
		authors: string[];
		coverUrl?: string;
		firstPublishYear?: number;
	};
}

export const POST: RequestHandler = async (event) => {
	const supabase = createClient(event);

	// Check authentication
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: AddBookRequest;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { workKey, listType, bookData } = body;

	if (!workKey || !listType || !bookData?.title) {
		return json({ error: 'Missing required fields: workKey, listType, bookData.title' }, { status: 400 });
	}

	// Validate listType
	if (!['wishlist', 'reading', 'completed'].includes(listType)) {
		return json({ error: 'Invalid listType. Must be: wishlist, reading, or completed' }, { status: 400 });
	}

	try {
		// Step 1: Get or create the book by work key
		const bookId = await getOrCreateBook(workKey, bookData, supabase);

		// Step 2: Add to the requested list
		await addToList(user.id, bookId, listType, supabase);

		return json({ success: true, bookId });
	} catch (error) {
		console.error('Error adding book:', error);
		return json({ error: 'Failed to add book' }, { status: 500 });
	}
};

/**
 * Get existing book by work key or create a new one
 */
async function getOrCreateBook(
	workKey: string,
	bookData: AddBookRequest['bookData'],
	supabase: ReturnType<typeof createClient>
): Promise<string> {
	const client = supabase as any;

	// Check if book exists by work key
	const { data: existing } = await client
		.from('books')
		.select('id')
		.eq('open_library_key', workKey)
		.single();

	if (existing?.id) {
		return existing.id;
	}

	// Create new book
	const { data: newBook, error } = await client
		.from('books')
		.insert({
			open_library_key: workKey,
			title: bookData.title,
			authors: bookData.authors,
			cover_url: bookData.coverUrl,
			first_publish_year: bookData.firstPublishYear,
			ai_enhanced: false,
			last_updated: new Date().toISOString()
		})
		.select('id')
		.single();

	if (error) {
		// Handle race condition - another request may have created the book
		if (error.code === '23505') {
			const { data: raceWinner } = await client
				.from('books')
				.select('id')
				.eq('open_library_key', workKey)
				.single();

			if (raceWinner?.id) {
				return raceWinner.id;
			}
		}
		throw error;
	}

	return newBook.id;
}

/**
 * Add book to user's list (wishlist, reading, or completed)
 */
async function addToList(
	userId: string,
	bookId: string,
	listType: 'wishlist' | 'reading' | 'completed',
	supabase: ReturnType<typeof createClient>
): Promise<void> {
	const client = supabase as any;

	const tableMap = {
		wishlist: 'wishlists',
		reading: 'currently_reading',
		completed: 'completed_books'
	} as const;

	const table = tableMap[listType];

	// Check if already in list
	const { data: existing } = await client
		.from(table)
		.select('id')
		.eq('user_id', userId)
		.eq('book_id', bookId)
		.single();

	if (existing) {
		// Already in list, nothing to do
		return;
	}

	// Add to list
	const { error } = await client.from(table).insert({
		user_id: userId,
		book_id: bookId
	});

	if (error && error.code !== '23505') {
		// Ignore duplicate key error (race condition)
		throw error;
	}
}
