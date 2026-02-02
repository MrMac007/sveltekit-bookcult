import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export interface LibraryStatus {
	wishlist: boolean;
	reading: boolean;
	completed: boolean;
}

export interface UserLibraryResponse {
	books: { open_library_key: string; status: LibraryStatus }[];
}

export const GET: RequestHandler = async (event) => {
	const supabase = createClient(event);

	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ books: [] });
	}

	try {
		const db = supabase as any; // Type assertion for Supabase relational queries
		// Get all books the user has in any list, with their work keys
		const [wishlistResult, readingResult, completedResult] = await Promise.all([
			db
				.from('wishlists')
				.select('book_id, books(open_library_key)')
				.eq('user_id', user.id),
			db
				.from('currently_reading')
				.select('book_id, books(open_library_key)')
				.eq('user_id', user.id),
			db
				.from('completed_books')
				.select('book_id, books(open_library_key)')
				.eq('user_id', user.id)
		]);

		// Build a map of work keys to status
		const statusMap = new Map<string, LibraryStatus>();

		const initStatus = (workKey: string): LibraryStatus => {
			if (!statusMap.has(workKey)) {
				statusMap.set(workKey, { wishlist: false, reading: false, completed: false });
			}
			return statusMap.get(workKey)!;
		};

		for (const item of wishlistResult.data || []) {
			const workKey = item.books?.open_library_key;
			if (workKey) {
				initStatus(workKey).wishlist = true;
			}
		}

		for (const item of readingResult.data || []) {
			const workKey = item.books?.open_library_key;
			if (workKey) {
				initStatus(workKey).reading = true;
			}
		}

		for (const item of completedResult.data || []) {
			const workKey = item.books?.open_library_key;
			if (workKey) {
				initStatus(workKey).completed = true;
			}
		}

		const books = Array.from(statusMap.entries()).map(([workKey, status]) => ({
			open_library_key: workKey,
			status
		}));

		return json({ books }, {
			headers: {
				'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
			}
		});
	} catch (error) {
		console.error('Error fetching user library:', error);
		return json({ books: [] });
	}
};
