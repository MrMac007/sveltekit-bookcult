import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';
import {
	removeFromWishlistInternal,
	stopReadingInternal
} from '$lib/actions/books';

interface RemoveBookRequest {
	bookId: string;
	listType: 'wishlist' | 'reading';
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

	let body: RemoveBookRequest;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { bookId, listType } = body;

	if (!bookId || !listType) {
		return json({ error: 'Missing required fields: bookId, listType' }, { status: 400 });
	}

	// Validate listType
	if (!['wishlist', 'reading'].includes(listType)) {
		return json({ error: 'Invalid listType. Must be: wishlist or reading' }, { status: 400 });
	}

	try {
		const db = supabase as any;

		switch (listType) {
			case 'wishlist': {
				const result = await removeFromWishlistInternal(db, user.id, bookId);
				if (!result.success) throw new Error(result.message || 'Failed to remove from wishlist');
				break;
			}
			case 'reading': {
				const result = await stopReadingInternal(db, user.id, bookId);
				if (!result.success) throw new Error(result.message || 'Failed to stop reading');
				break;
			}
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error removing book:', error);
		return json({ error: 'Failed to remove book' }, { status: 500 });
	}
};
