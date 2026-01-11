import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBooks, type SearchResult } from '$lib/api/open-library-search';

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q');
	const limitParam = event.url.searchParams.get('limit');
	const limit = limitParam ? parseInt(limitParam, 10) : 20;

	if (!query) {
		return json({ error: 'Search query is required' }, { status: 400 });
	}

	try {
		const results = await searchBooks(query, limit);
		return json({ results, total: results.length });
	} catch (error) {
		console.error('Book search error:', error);
		return json({ error: 'Failed to search books' }, { status: 500 });
	}
};

export type { SearchResult };
