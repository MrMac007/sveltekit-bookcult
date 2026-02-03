import { writable, get, type Writable } from 'svelte/store';
import { DEFAULT_SEARCH_LIMIT, MIN_SEARCH_QUERY_LEN } from '$lib/constants';
import type { BookSearchResult } from '$lib/types/book-search';

export interface BookSearchController {
	query: Writable<string>;
	results: Writable<BookSearchResult[]>;
	isSearching: Writable<boolean>;
	error: Writable<string | null>;
	search: (queryOverride?: string) => Promise<void>;
	reset: () => void;
	setQuery: (value: string) => void;
	minQueryLength: number;
}

interface UseBookSearchOptions {
	endpoint?: string;
	limit?: number;
	debounceMs?: number;
	minQueryLength?: number;
	autoSearch?: boolean;
	cacheMs?: number;
	onError?: (message: string) => void;
}

export function useBookSearch(options: UseBookSearchOptions = {}): BookSearchController {
	const {
		endpoint = '/api/books/search',
		limit = DEFAULT_SEARCH_LIMIT,
		debounceMs = 500,
		minQueryLength = MIN_SEARCH_QUERY_LEN,
		autoSearch = true,
		cacheMs = 5 * 60 * 1000,
		onError
	} = options;

	const query = writable('');
	const results = writable<BookSearchResult[]>([]);
	const isSearching = writable(false);
	const error = writable<string | null>(null);

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let abortController: AbortController | null = null;
	let activeRequestId = 0;
	const cache = new Map<string, { results: BookSearchResult[]; timestamp: number }>();

	function clearDebounce() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
	}

	async function runSearch(rawQuery: string) {
		const trimmed = rawQuery.trim();
		if (!trimmed || trimmed.length < minQueryLength) {
			results.set([]);
			error.set(null);
			isSearching.set(false);
			return;
		}

		const cacheKey = trimmed.toLowerCase();
		const cached = cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < cacheMs) {
			results.set(cached.results);
			error.set(null);
			isSearching.set(false);
			return;
		}

		clearDebounce();
		const requestId = ++activeRequestId;

		if (abortController) {
			abortController.abort();
		}

		abortController = new AbortController();

		isSearching.set(true);
		error.set(null);

		try {
			const response = await fetch(
				`${endpoint}?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
				{ signal: abortController.signal }
			);

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(payload?.error || 'Failed to search books');
			}

			const data = await response.json();
			if (requestId !== activeRequestId) return;
			const nextResults = data.results || [];
			results.set(nextResults);
			cache.set(cacheKey, { results: nextResults, timestamp: Date.now() });
		} catch (err) {
			if (requestId !== activeRequestId) return;
			if (err instanceof DOMException && err.name === 'AbortError') {
				return;
			}

			const message = err instanceof Error ? err.message : 'Failed to search books';
			results.set([]);
			error.set(message);
			onError?.(message);
		} finally {
			if (requestId === activeRequestId) {
				isSearching.set(false);
			}
		}
	}

	function setQuery(value: string) {
		query.set(value);

		const trimmed = value.trim();
		if (!trimmed || trimmed.length < minQueryLength) {
			clearDebounce();
			activeRequestId++;
			if (abortController) {
				abortController.abort();
				abortController = null;
			}
			results.set([]);
			error.set(null);
			isSearching.set(false);
			return;
		}

		if (autoSearch) {
			clearDebounce();
			debounceTimer = setTimeout(() => {
				void runSearch(value);
			}, debounceMs);
		}
	}

	async function search(queryOverride?: string) {
		const value = queryOverride ?? get(query);
		await runSearch(value);
	}

	function reset() {
		clearDebounce();
		activeRequestId++;
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
		query.set('');
		results.set([]);
		error.set(null);
		isSearching.set(false);
	}

	return {
		query,
		results,
		isSearching,
		error,
		search,
		reset,
		setQuery,
		minQueryLength
	};
}
