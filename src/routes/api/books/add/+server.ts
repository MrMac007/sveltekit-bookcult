import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';
import { findOrCreateBook } from '$lib/api/book-helpers';
import type { BookCardData } from '$lib/types/api';
import {
	addToWishlistInternal,
	startReadingInternal,
	markCompleteInternal
} from '$lib/actions/books';

interface BookData {
	title: string;
	authors: string[];
	coverUrl?: string;
	cover_url?: string | null;
	firstPublishYear?: number;
	first_publish_year?: number;
	published_date?: string | null;
}

interface AddBookRequest {
	// Either provide bookId (if book already exists in DB)
	bookId?: string;
	// Or provide workKey + bookData to find/create book
	workKey?: string;
	bookData?: BookData;
	listType: 'wishlist' | 'reading' | 'completed';
	completedAt?: string; // Optional completion date for 'completed' listType
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

	const { bookId: providedBookId, workKey, listType, bookData, completedAt } = body;

	// Validate listType
	if (!listType || !['wishlist', 'reading', 'completed'].includes(listType)) {
		return json({ error: 'Invalid listType. Must be: wishlist, reading, or completed' }, { status: 400 });
	}

	// Must provide either bookId OR (workKey + bookData)
	if (!providedBookId && (!workKey || !bookData?.title)) {
		return json({ error: 'Missing required fields: either bookId OR (workKey + bookData.title)' }, { status: 400 });
	}

	try {
		// Step 1: Get or create the book
		let bookId: string;
		if (providedBookId) {
			// Book already exists in DB
			bookId = providedBookId;
		} else {
			const normalized: BookCardData = {
				id: workKey!,
				open_library_key: workKey!,
				title: bookData!.title,
				authors: bookData!.authors || [],
				cover_url: bookData!.cover_url ?? bookData!.coverUrl ?? null,
				published_date:
					bookData!.published_date ??
					(bookData!.firstPublishYear ? String(bookData!.firstPublishYear) : undefined)
			};

			// Find/create book using shared helper
			bookId = await findOrCreateBook(normalized, supabase);
		}

		// Step 2: Add to the requested list using unified internal helpers
		await addToList(user.id, bookId, listType, supabase, completedAt);

		return json({ success: true, bookId });
	} catch (error) {
		console.error('Error adding book:', error);
		return json({ error: 'Failed to add book' }, { status: 500 });
	}
};

/**
 * Add book to user's list using unified internal helpers
 * This ensures consistent behavior across all entry points
 */
async function addToList(
	userId: string,
	bookId: string,
	listType: 'wishlist' | 'reading' | 'completed',
	supabase: ReturnType<typeof createClient>,
	completedAt?: string
): Promise<void> {
	const db = supabase as any;

	switch (listType) {
		case 'wishlist': {
			const result = await addToWishlistInternal(db, userId, bookId);
			if (!result.success) throw new Error(result.message || 'Failed to add to wishlist');
			break;
		}
		case 'reading': {
			const result = await startReadingInternal(db, userId, bookId);
			if (!result.success) throw new Error(result.message || 'Failed to start reading');
			break;
		}
		case 'completed': {
			const result = await markCompleteInternal(db, userId, bookId, completedAt);
			if (!result.success) throw new Error(result.error || 'Failed to mark complete');
			break;
		}
	}
}
