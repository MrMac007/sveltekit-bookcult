<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Search, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import BookCard from './book-card.svelte';
	import type { BookCardData } from '$lib/types/api';
	import type { SearchResult } from '$lib/api/open-library-search';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	// Search state
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let hasSearched = $state(false);
	let searchError = $state<string | null>(null);

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
				newLibrary.set(book.workKey, book.status);
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
		searchQuery = value;
		if (!value.trim()) {
			searchResults = [];
			hasSearched = false;
		}
	}

	/**
	 * Perform search
	 */
	async function performSearch() {
		const query = searchQuery.trim();
		if (!query) {
			searchResults = [];
			hasSearched = false;
			searchError = null;
			return;
		}

		isSearching = true;
		hasSearched = true;
		searchError = null;

		try {
			const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
			if (!response.ok) {
				throw new Error('Failed to search books');
			}

			const data = await response.json();
			searchResults = data.results || [];
		} catch (error) {
			console.error('Search error:', error);
			searchResults = [];
			searchError = 'Failed to search books. Please try again.';
		} finally {
			isSearching = false;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		performSearch();
	}

	/**
	 * Convert SearchResult to BookCardData for the BookCard component
	 */
	function toBookCardData(result: SearchResult): BookCardData {
		return {
			id: result.workKey,
			open_library_key: result.workKey,
			title: result.title,
			authors: result.authors,
			cover_url: result.coverUrl,
			published_date: result.firstPublishYear?.toString(),
			source: 'openlib'
		};
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
			const result = searchResults.find((r) => r.workKey === workKey);
			if (!result) return;

			const response = await fetch('/api/books/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					workKey,
					listType: 'wishlist',
					bookData: {
						title: result.title,
						authors: result.authors,
						coverUrl: result.coverUrl,
						firstPublishYear: result.firstPublishYear
					}
				})
			});

			if (!response.ok) {
				throw new Error('Failed to add to wishlist');
			}
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
	 * Mark book as complete
	 */
	async function handleMarkComplete(book: BookCardData) {
		const workKey = book.open_library_key || book.id;
		if (!workKey) return;

		isAddingBook = workKey;

		// Optimistic update
		const currentStatus = getStatus(workKey);
		userLibrary.set(workKey, { wishlist: false, reading: false, completed: true });
		userLibrary = new Map(userLibrary);

		try {
			const result = searchResults.find((r) => r.workKey === workKey);
			if (!result) return;

			const response = await fetch('/api/books/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					workKey,
					listType: 'completed',
					bookData: {
						title: result.title,
						authors: result.authors,
						coverUrl: result.coverUrl,
						firstPublishYear: result.firstPublishYear
					}
				})
			});

			if (!response.ok) {
				throw new Error('Failed to mark as complete');
			}

			const data = await response.json();
			if (data.bookId) {
				goto(`/rate/${data.bookId}`);
			}
		} catch (error) {
			console.error('Error marking as complete:', error);
			// Rollback optimistic update
			userLibrary.set(workKey, currentStatus);
			userLibrary = new Map(userLibrary);
			toast.error('Failed to mark as complete. Please try again.');
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
						value={searchQuery}
						oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
					/>
					{#if isSearching}
						<Loader2
							class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
						/>
					{/if}
				</div>
				<Button type="submit" size="lg" disabled={isSearching || !searchQuery.trim()}>
					{#if isSearching}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						Search
					{/if}
				</Button>
			</div>
		</div>
	</form>

	{#if searchResults.length > 0}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold">
				Found {searchResults.length} {searchResults.length === 1 ? 'book' : 'books'}
			</h2>
			{#each searchResults as result (result.workKey)}
				{@const status = getStatus(result.workKey)}
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
	{:else if !isSearching && hasSearched && searchResults.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">
				No books found for "{searchQuery}". Try a different search term.
			</p>
		</div>
	{/if}
</div>
