import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';
import { searchBooksUnified } from '$lib/server/books/search';
import { DEFAULT_SEARCH_LIMIT } from '$lib/constants';

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q');
	const limitParam = event.url.searchParams.get('limit');
	const parsedLimit = limitParam ? parseInt(limitParam, 10) : DEFAULT_SEARCH_LIMIT;
	const limit = Number.isNaN(parsedLimit) ? DEFAULT_SEARCH_LIMIT : parsedLimit;

	if (!query) {
		return json({ error: 'Search query is required' }, { status: 400 });
	}

	try {
		const supabase = createClient(event);
		const results = await searchBooksUnified(supabase, query, limit);

		return json(
			{ results, total: results.length },
			{
				headers: {
					'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
				}
			}
		);
	} catch (error) {
		console.error('Book search error:', error);
		return json({ error: 'Failed to search books' }, { status: 500 });
	}
};
