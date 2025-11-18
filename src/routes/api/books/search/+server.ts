import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';
import { googleBooksAPI } from '$lib/api/google-books';

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q');
	const source = event.url.searchParams.get('source') || 'database'; // database, api, or both
	const author = event.url.searchParams.get('author') || undefined; // optional author filter

	if (!query) {
		return json({ error: 'Search query is required' }, { status: 400 });
	}

	try {
		const supabase = createClient(event);

		// If requesting API only, skip database search
		if (source === 'api') {
			const apiResults = await googleBooksAPI.searchAndNormalize(query, 20, author);
			return json(apiResults);
		}

		// Search the local database
		const searchTerm = `%${query.toLowerCase()}%`;

		// Build the search query
		let dbQuery = supabase.from('books').select('*');

		// Apply title search - search in title or authors array
		dbQuery = dbQuery.or(`title.ilike.${searchTerm},authors.cs.{${query}}`);

		// Add author filter if provided
		if (author && author.trim()) {
			// Fetch results first, then filter by author on application side
			const { data: dbBooks, error: dbError } = await dbQuery.limit(100);

			if (dbError) {
				console.error('Database search error:', dbError);
			}

			// Filter results by author on the application side
			const authorLower = author.toLowerCase();
			const filteredBooks = (dbBooks || [])
				.filter((book: any) => {
					const authors = book.authors || [];
					return authors.some((a: string) => a.toLowerCase().includes(authorLower));
				})
				.slice(0, 20);

			const formattedDbResults = filteredBooks.map((book: any) => ({
				id: book.id,
				google_books_id: book.google_books_id,
				isbn_13: book.isbn_13,
				isbn_10: book.isbn_10,
				title: book.title,
				authors: book.authors || [],
				publisher: book.publisher,
				published_date: book.published_date,
				description: book.description,
				page_count: book.page_count,
				cover_url: book.cover_url,
				categories: book.categories || [],
				language: book.language
			}));

			// If we have database results and not requesting both sources, return them
			if (formattedDbResults.length > 0 && source !== 'both') {
				return json(formattedDbResults);
			}

			// No database results or requesting both sources, query Google Books API
			const apiResults = await googleBooksAPI.searchAndNormalize(query, 20, author);

			// If requesting both, merge and deduplicate
			if (source === 'both' && formattedDbResults.length > 0) {
				const dbGoogleIds = new Set(
					formattedDbResults.map((book) => book.google_books_id).filter(Boolean)
				);
				const uniqueApiResults = apiResults.filter(
					(book: any) => !dbGoogleIds.has(book.google_books_id)
				);
				return json([...formattedDbResults, ...uniqueApiResults]);
			}

			return json(apiResults);
		}

		// No author filter - simpler query
		const { data: dbBooks, error: dbError } = await dbQuery.limit(20);

		if (dbError) {
			console.error('Database search error:', dbError);
		}

		// Format database results
		const formattedDbResults = (dbBooks || []).map((book: any) => ({
			id: book.id,
			google_books_id: book.google_books_id,
			isbn_13: book.isbn_13,
			isbn_10: book.isbn_10,
			title: book.title,
			authors: book.authors || [],
			publisher: book.publisher,
			published_date: book.published_date,
			description: book.description,
			page_count: book.page_count,
			cover_url: book.cover_url,
			categories: book.categories || [],
			language: book.language
		}));

		// If we have database results and not requesting both sources, return them
		if (formattedDbResults.length > 0 && source !== 'both') {
			return json(formattedDbResults);
		}

		// No database results or requesting both sources, query Google Books API
		const apiResults = await googleBooksAPI.searchAndNormalize(query, 20, author);

		// If requesting both, merge and deduplicate
		if (source === 'both' && formattedDbResults.length > 0) {
			// Create a set of google_books_ids from database results
			const dbGoogleIds = new Set(
				formattedDbResults.map((book) => book.google_books_id).filter(Boolean)
			);

			// Filter out API results that are already in database
			const uniqueApiResults = apiResults.filter(
				(book: any) => !dbGoogleIds.has(book.google_books_id)
			);

			// Return database results first, then unique API results
			return json([...formattedDbResults, ...uniqueApiResults]);
		}

		return json(apiResults);
	} catch (error) {
		console.error('Book search error:', error);
		return json({ error: 'Failed to search books' }, { status: 500 });
	}
};
