import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BookSearchResult } from '$lib/types/book-search';
import { DEFAULT_SEARCH_LIMIT } from '$lib/constants';
import { searchBooks as searchOpenLibraryBooks } from '$lib/api/open-library-search';

export async function searchBooksUnified(
	supabase: SupabaseClient<Database, 'public'>,
	query: string,
	limit: number = DEFAULT_SEARCH_LIMIT
): Promise<BookSearchResult[]> {
	const client = supabase as any;
	const trimmedQuery = query.trim();

	if (!trimmedQuery) {
		return [];
	}

	// Step 1: Search database first (by title or author)
	const searchTerm = `%${trimmedQuery.toLowerCase()}%`;
	const { data: dbBooks } = await client
		.from('books')
		.select('id, open_library_key, title, authors, cover_url, first_publish_year, published_date')
		.or(`title.ilike.${searchTerm},authors.cs.{${trimmedQuery}}`)
		.limit(limit);

	const dbResults: BookSearchResult[] = (dbBooks || [])
		.filter((book: any) => book.open_library_key)
		.map((book: any) => {
			let firstPublishYear = book.first_publish_year;
			if (!firstPublishYear && book.published_date && /^\d{4}$/.test(book.published_date)) {
				firstPublishYear = parseInt(book.published_date, 10);
			}

			return {
				id: book.id,
				open_library_key: book.open_library_key,
				title: book.title,
				authors: book.authors || [],
				cover_url: book.cover_url,
				first_publish_year: firstPublishYear,
				source: 'database'
			};
		});

	// Step 2: Search Open Library
	let olResults: BookSearchResult[] = [];
	try {
		olResults = await searchOpenLibraryBooks(trimmedQuery, limit);
	} catch (error) {
		console.error('Error searching Open Library:', error);
	}

	// Step 3: Merge and deduplicate (database results first)
	const seenWorkKeys = new Set<string>();
	const mergedResults: BookSearchResult[] = [];

	for (const result of dbResults) {
		if (!seenWorkKeys.has(result.open_library_key)) {
			seenWorkKeys.add(result.open_library_key);
			mergedResults.push(result);
		}
	}

	for (const result of olResults) {
		if (!seenWorkKeys.has(result.open_library_key)) {
			seenWorkKeys.add(result.open_library_key);
			mergedResults.push(result);
		}
	}

	return mergedResults.slice(0, limit);
}
