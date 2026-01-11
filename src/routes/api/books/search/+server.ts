import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBooks, type SearchResult } from '$lib/api/open-library-search';
import { createClient } from '$lib/supabase/server';

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q');
	const limitParam = event.url.searchParams.get('limit');
	const limit = limitParam ? parseInt(limitParam, 10) : 20;

	if (!query) {
		return json({ error: 'Search query is required' }, { status: 400 });
	}

	try {
		const supabase = createClient(event);
		const client = supabase as any;

		// Step 1: Search database first (by title or author)
		const searchTerm = `%${query.toLowerCase()}%`;
		const { data: dbBooks } = await client
			.from('books')
			.select('id, open_library_key, title, authors, cover_url, first_publish_year, published_date')
			.or(`title.ilike.${searchTerm},authors.cs.{${query}}`)
			.limit(limit);

		// Convert database results to SearchResult format
		const dbResults: SearchResult[] = (dbBooks || [])
			.filter((book: any) => book.open_library_key) // Only include books with work keys
			.map((book: any) => ({
				workKey: book.open_library_key,
				title: book.title,
				authors: book.authors || [],
				coverUrl: book.cover_url,
				firstPublishYear: book.first_publish_year || (book.published_date ? parseInt(book.published_date) : undefined),
				source: 'database' as const,
				// Include database ID for existing books
				id: book.id
			}));

		// Step 2: Search Open Library
		const olResults = await searchBooks(query, limit);

		// Step 3: Merge and deduplicate (database results first)
		const seenWorkKeys = new Set<string>();
		const mergedResults: SearchResult[] = [];

		// Add database results first (they take priority)
		for (const result of dbResults) {
			if (!seenWorkKeys.has(result.workKey)) {
				seenWorkKeys.add(result.workKey);
				mergedResults.push(result);
			}
		}

		// Add Open Library results that aren't already in database
		for (const result of olResults) {
			if (!seenWorkKeys.has(result.workKey)) {
				seenWorkKeys.add(result.workKey);
				mergedResults.push(result);
			}
		}

		// Limit final results
		const finalResults = mergedResults.slice(0, limit);

		return json({ results: finalResults, total: finalResults.length });
	} catch (error) {
		console.error('Book search error:', error);
		return json({ error: 'Failed to search books' }, { status: 500 });
	}
};

export type { SearchResult };
