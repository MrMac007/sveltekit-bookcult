<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Search, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import BookCard from './book-card.svelte';
	import type { BookCardData } from '$lib/types/api';
	import { useBookSearch } from '$lib/stores/book-search';
	import { toBookCardData } from '$lib/utils/books';
	import { addBookToList, ensureBookExists } from '$lib/api/books-client';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	let hasSearched = $state(false);
	let searchError = $state<string | null>(null);

	const search = useBookSearch({
		autoSearch: false,
		minQueryLength: 1,
		onError: (message) => {
			searchError = message || 'Failed to search books. Please try again.';
		}
	});

	const { query, results, isSearching, setQuery, search: runSearch, reset } = search;

	// User library state - keyed by work key for O(1) lookup
	let userLibrary = $state<Map<string, LibraryStatus>>(new Map());
	let isAddingBook = $state<string | null>(null);

	interface LibraryStatus {
		wishlist: boolean;
		reading: boolean;
		completed: boolean;
	}

	onMount(async () => {
		if (userId) {
			await loadUserLibrary();
		}
	});

	/**
	 * Load user's library from API
	 */
	async function loadUserLibrary() {
		try {
			const response = await fetch('/api/user/library');
			const data = await response.json();

			const newLibrary = new Map<string, LibraryStatus>();
			for (const book of data.books || []) {
				newLibrary.set(book.open_library_key, book.status);
			}
			userLibrary = newLibrary;
		} catch (error) {
			console.error('Error loading user library:', error);
		}
	}

	/**
	 * Get library status for a work key
	 */
	function getStatus(workKey: string): LibraryStatus {
		return userLibrary.get(workKey) || { wishlist: false, reading: false, completed: false };
	}

	/**
	 * Handle search input
	 */
	function handleSearchInput(value: string) {
		setQuery(value);
		searchError = null;
		if (!value.trim()) {
			hasSearched = false;
			searchError = null;
		}
	}

	/**
	 * Perform search
	 */
	async function performSearch() {
		const currentQuery = $query.trim();
		if (!currentQuery) {
			reset();
			hasSearched = false;
			searchError = null;
			return;
		}

		hasSearched = true;
		searchError = null;

		try {
			await runSearch(currentQuery);
		} catch (error) {
			console.error('Search error:', error);
			searchError = 'Failed to search books. Please try again.';
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		performSearch();
	}

	/**
	 * Add book to wishlist
	 */
	async function handleAddToWishlist(book: BookCardData) {
		const workKey = book.open_library_key || book.id;
		if (!workKey) return;

		isAddingBook = workKey;

		// Optimistic update
		const currentStatus = getStatus(workKey);
		userLibrary.set(workKey, { ...currentStatus, wishlist: true });
		userLibrary = new Map(userLibrary);

		try {
			const result = $results.find((r) => r.open_library_key === workKey);
			if (!result) return;

			await addBookToList(result, 'wishlist');
		} catch (error) {
			console.error('Error adding to wishlist:', error);
			// Rollback optimistic update
			userLibrary.set(workKey, currentStatus);
			userLibrary = new Map(userLibrary);
			toast.error('Failed to add to wishlist. Please try again.');
		} finally {
			isAddingBook = null;
		}
	}

	/**
	 * Mark book as complete - creates the book and navigates to rating page
	 */
	async function handleMarkComplete(book: BookCardData) {
		const workKey = book.open_library_key || book.id;
		if (!workKey) return;

		const result = $results.find((r) => r.open_library_key === workKey);
		if (!result) return;

		isAddingBook = workKey;

		try {
			const bookId = await ensureBookExists(result);
			goto(`/rate/${bookId}`);
		} catch (error) {
			console.error('Error navigating to rating page:', error);
			toast.error('Failed to open rating page. Please try again.');
		} finally {
			isAddingBook = null;
		}
	}
</script>

<div>
	<form onsubmit={handleSubmit} class="mb-8">
		<div class="space-y-3">
			<div class="flex gap-2">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search by title (press Enter or click Search)..."
						class="h-12 pl-9"
						value={$query}
						oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
					/>
					{#if $isSearching}
						<Loader2
							class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
						/>
					{/if}
				</div>
				<Button type="submit" size="lg" disabled={$isSearching || !$query.trim()}>
					{#if $isSearching}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						Search
					{/if}
				</Button>
			</div>
		</div>
	</form>

	{#if $results.length > 0}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold">
				Found {$results.length} {$results.length === 1 ? 'book' : 'books'}
			</h2>
			{#each $results as result (result.open_library_key)}
				{@const status = getStatus(result.open_library_key)}
				<BookCard
					book={toBookCardData(result)}
					onAddToWishlist={handleAddToWishlist}
					onMarkComplete={handleMarkComplete}
					isInWishlist={status.wishlist}
					isCompleted={status.completed}
					showSource={false}
				/>
			{/each}
		</div>
	{/if}

	{#if searchError}
		<div class="py-8 text-center">
			<p class="text-destructive">{searchError}</p>
			<Button variant="outline" class="mt-4" onclick={performSearch}>
				Try again
			</Button>
		</div>
	{:else if !$isSearching && hasSearched && $results.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">
				No books found for "{$query}". Try a different search term.
			</p>
		</div>
	{/if}
</div>
