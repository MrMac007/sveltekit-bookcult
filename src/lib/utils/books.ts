import type { BookCardData } from '$lib/types/api';
import type { BookSearchResult } from '$lib/types/book-search';

export interface BookCreatePayload {
	workKey: string;
	bookData: {
		title: string;
		authors: string[];
		coverUrl?: string;
		firstPublishYear?: number;
	};
}

export function normalizeSearchResult(input: any): BookSearchResult | null {
	if (!input) return null;

	const openLibraryKey = input.open_library_key || input.workKey;
	if (!openLibraryKey || !input.title) return null;

	const coverUrl = input.cover_url ?? input.coverUrl ?? null;

	return {
		id: input.id,
		open_library_key: openLibraryKey,
		title: input.title,
		authors: input.authors || [],
		cover_url: coverUrl,
		first_publish_year: input.first_publish_year ?? input.firstPublishYear,
		source: input.source
	};
}

export function toBookCardData(result: BookSearchResult): BookCardData {
	return {
		id: result.id ?? result.open_library_key,
		open_library_key: result.open_library_key,
		title: result.title,
		authors: result.authors,
		cover_url: result.cover_url,
		published_date: result.first_publish_year ? String(result.first_publish_year) : undefined,
		source: result.source === 'openlib' ? 'openlib' : result.source === 'database' ? 'database' : undefined
	};
}

export function toBookDataForCreate(result: BookSearchResult): BookCreatePayload {
	return {
		workKey: result.open_library_key,
		bookData: {
			title: result.title,
			authors: result.authors || [],
			coverUrl: result.cover_url ?? undefined,
			firstPublishYear: result.first_publish_year
		}
	};
}

export function getSearchResultKey(result: BookSearchResult): string {
	return result.id ?? result.open_library_key;
}
