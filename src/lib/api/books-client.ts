import type { BookCardData } from '$lib/types/api';
import type { BookSearchResult } from '$lib/types/book-search';
import { isValidUUID } from '$lib/utils/validation';

type BookInput = BookCardData | BookSearchResult;

interface AddBookResult {
	success: boolean;
	bookId?: string;
	error?: string;
}

function getOpenLibraryKey(book: BookInput): string | null {
	if ('open_library_key' in book && book.open_library_key) {
		return book.open_library_key;
	}

	if ('id' in book && book.id && !isValidUUID(book.id)) {
		return book.id;
	}

	return null;
}

function getCoverUrl(book: BookInput): string | undefined {
	if ('cover_url' in book && book.cover_url) return book.cover_url;
	if ('coverUrl' in book && typeof (book as any).coverUrl === 'string') return (book as any).coverUrl;
	return undefined;
}

function getFirstPublishYear(book: BookInput): number | undefined {
	if ('first_publish_year' in book && typeof book.first_publish_year === 'number') {
		return book.first_publish_year;
	}

	if ('published_date' in book && typeof book.published_date === 'string' && /^\d{4}$/.test(book.published_date)) {
		return parseInt(book.published_date, 10);
	}

	return undefined;
}

function buildAddPayload(
	book: BookInput,
	listType: 'wishlist' | 'reading' | 'completed',
	completedAt?: string
) {
	if ('id' in book && book.id && isValidUUID(book.id)) {
		return { bookId: book.id, listType, completedAt };
	}

	const openLibraryKey = getOpenLibraryKey(book);
	if (!openLibraryKey) {
		throw new Error('Missing Open Library key for book');
	}

	return {
		workKey: openLibraryKey,
		listType,
		completedAt,
		bookData: {
			title: book.title,
			authors: book.authors || [],
			coverUrl: getCoverUrl(book),
			firstPublishYear: getFirstPublishYear(book)
		}
	};
}

export async function addBookToList(
	book: BookInput,
	listType: 'wishlist' | 'reading' | 'completed',
	completedAt?: string
): Promise<AddBookResult> {
	const payload = buildAddPayload(book, listType, completedAt);
	const response = await fetch('/api/books/add', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});

	const result = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(result.error || 'Failed to update list');
	}

	return result as AddBookResult;
}

export async function removeBookFromList(
	bookId: string,
	listType: 'wishlist' | 'reading'
): Promise<void> {
	const response = await fetch('/api/books/remove', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ bookId, listType })
	});

	const result = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(result.error || 'Failed to update list');
	}
}

export async function ensureBookExists(book: BookInput): Promise<string> {
	if ('id' in book && book.id && isValidUUID(book.id)) {
		return book.id;
	}

	const result = await addBookToList(book, 'wishlist');

	if (!result.bookId) {
		throw new Error(result.error || 'Failed to create book');
	}

	return result.bookId;
}
