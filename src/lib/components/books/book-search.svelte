<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-svelte';
	import BookCard from './book-card.svelte';
	import type { BookCardData } from '$lib/types/api';
	import { createClient } from '$lib/supabase/client';
	import { isValidUUID } from '$lib/utils/validation';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	const supabase = createClient();

	let searchQuery = $state('');
	let authorQuery = $state('');
	let showAdvanced = $state(false);
	let searchResults = $state<BookCardData[]>([]);
	let isSearching = $state(false);
	let hasSearched = $state(false);
	let hadDatabaseResults = $state(false);
	let hasShownApiResults = $state(false);
	let isLoadingMore = $state(false);
	let userWishlist = $state<Set<string>>(new Set());
	let userCompleted = $state<Set<string>>(new Set());

	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		if (userId) {
			loadUserBookStatuses();
		}
	});

	function handleSearchInput(value: string) {
		searchQuery = value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (!value.trim()) {
			searchResults = [];
			hasSearched = false;
			hadDatabaseResults = false;
			hasShownApiResults = false;
			return;
		}

		searchTimeout = setTimeout(() => {
			performSearch();
		}, 500);
	}

	async function performSearch() {
		const query = searchQuery.trim();
		if (!query) {
			searchResults = [];
			hasSearched = false;
			return;
		}

		isSearching = true;
		hasSearched = true;
		hasShownApiResults = false;

		try {
			let url = `/api/books/search?q=${encodeURIComponent(query)}&source=database`;
			if (authorQuery.trim()) {
				url += `&author=${encodeURIComponent(authorQuery.trim())}`;
			}

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Failed to search books');
			}

			const data = (await response.json()) as BookCardData[];
			searchResults = data;
			hadDatabaseResults = data.length > 0;
			await loadUserBookStatuses();
		} catch (error) {
			console.error('Search error:', error);
			searchResults = [];
			hadDatabaseResults = false;
		} finally {
			isSearching = false;
		}
	}

	async function loadMoreFromAPI() {
		const query = searchQuery.trim();
		if (!query) return;

		isLoadingMore = true;
		try {
			let url = `/api/books/search?q=${encodeURIComponent(query)}&source=api`;
			if (authorQuery.trim()) {
				url += `&author=${encodeURIComponent(authorQuery.trim())}`;
			}

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Failed to load additional results');
			}

			const apiResults = (await response.json()) as BookCardData[];
			// Deduplicate by both Google Books ID and Open Library key
			const existingGoogleIds = new Set(searchResults.map((book) => book.google_books_id).filter(Boolean));
			const existingOLKeys = new Set(searchResults.map((book) => book.open_library_key).filter(Boolean));
			const newResults = apiResults.filter((book) =>
				!(book.google_books_id && existingGoogleIds.has(book.google_books_id)) &&
				!(book.open_library_key && existingOLKeys.has(book.open_library_key))
			);
			searchResults = [...searchResults, ...newResults];
			hasShownApiResults = true;
		} catch (error) {
			console.error('Error loading more results:', error);
		} finally {
			isLoadingMore = false;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		performSearch();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
			performSearch();
		}
	}

	async function loadUserBookStatuses() {
		try {
			const [{ data: wishlistData }, { data: completedData }] = await Promise.all([
				supabase
					.from('wishlists')
					.select('books(google_books_id)')
					.eq('user_id', userId),
				supabase
					.from('completed_books')
					.select('books(google_books_id)')
					.eq('user_id', userId),
			]);

			userWishlist = new Set(
				(wishlistData || [])
					.map((item: any) => item.books?.google_books_id)
					.filter((id: string | null): id is string => Boolean(id))
			);

			userCompleted = new Set(
				(completedData || [])
					.map((item: any) => item.books?.google_books_id)
					.filter((id: string | null): id is string => Boolean(id))
			);
		} catch (error) {
			console.error('Error loading book statuses:', error);
		}
	}

	async function getCurrentUser() {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			goto('/login');
			return null;
		}
		return user;
	}

	async function ensureBookId(book: BookCardData): Promise<string | null> {
		if (book.id && isValidUUID(book.id)) {
			return book.id;
		}

		// Try Open Library key first
		if (book.open_library_key) {
			const { data: existing } = await supabase
				.from('books')
				.select('id')
				.eq('open_library_key', book.open_library_key)
				.single();

			const typedExisting = existing as { id: string } | null;
			if (typedExisting?.id) {
				return typedExisting.id;
			}

			const response = await fetch(`/api/books/fetch?id=${book.open_library_key}`);
			if (response.ok) {
				const payload = await response.json();
				if (payload?.id) return payload.id;
			}
		}

		// Check database for existing books with Google Books ID (legacy support)
		if (book.google_books_id) {
			const { data: existing } = await supabase
				.from('books')
				.select('id')
				.eq('google_books_id', book.google_books_id)
				.single();

			const typedExisting = existing as { id: string } | null;
			if (typedExisting?.id) {
				return typedExisting.id;
			}
		}

		// Last resort: try the book.id as Open Library key (format: OL12345W)
		if (book.id && /^OL\d+[WM]$/.test(book.id)) {
			const response = await fetch(`/api/books/fetch?id=${book.id}`);
			if (response.ok) {
				const payload = await response.json();
				if (payload?.id) return payload.id;
			}
		}

		return null;
	}

	async function handleAddToWishlist(book: BookCardData) {
		const user = await getCurrentUser();
		if (!user) return;

		try {
			const bookId = await ensureBookId(book);
			if (!bookId) {
				throw new Error('Unable to save book');
			}

			const { error } = await supabase
				.from('wishlists')
				.insert({ user_id: user.id, book_id: bookId } as any);

			if (error && error.code !== '23505') {
				throw error;
			}

			if (book.google_books_id) {
				userWishlist = new Set([...userWishlist, book.google_books_id]);
				userCompleted = new Set(
					[...userCompleted].filter((id) => id !== book.google_books_id)
				);
			}
		} catch (error) {
			console.error('Error adding to wishlist:', error);
			alert('Failed to add to wishlist. Please try again.');
		}
	}

	async function handleMarkComplete(book: BookCardData) {
		const user = await getCurrentUser();
		if (!user) return;

		try {
			const bookId = await ensureBookId(book);
			if (!bookId) {
				throw new Error('Unable to save book');
			}

			const { data: existing } = await supabase
				.from('completed_books')
				.select('id')
				.eq('user_id', user.id)
				.eq('book_id', bookId)
				.single();

			if (existing) {
				goto(`/rate/${bookId}`);
				return;
			}

			await supabase.from('wishlists').delete().eq('user_id', user.id).eq('book_id', bookId);
			await supabase
				.from('currently_reading')
				.delete()
				.eq('user_id', user.id)
				.eq('book_id', bookId);

			const { error: insertError } = await supabase
				.from('completed_books')
				.insert({ user_id: user.id, book_id: bookId } as any);

			if (insertError) {
				throw insertError;
			}

			if (book.google_books_id) {
				userCompleted = new Set([...userCompleted, book.google_books_id]);
				userWishlist = new Set(
					[...userWishlist].filter((id) => id !== book.google_books_id)
				);
			}

			goto(`/rate/${bookId}`);
		} catch (error) {
			console.error('Error marking as complete:', error);
			alert('Failed to mark as complete. Please try again.');
		}
	}
</script>

<div>
	<form onsubmit={handleSubmit} class="mb-8">
		<div class="space-y-3">
			<div class="relative">
				<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Search by title..."
					class="h-12 pl-9"
					value={searchQuery}
					oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
				/>
				{#if isSearching}
					<Loader2 class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (showAdvanced = !showAdvanced)}
					class="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					{#if showAdvanced}
						<ChevronUp class="h-3 w-3" />
						Hide filters
					{:else}
						<ChevronDown class="h-3 w-3" />
						Show filters
					{/if}
				</button>
			</div>

			{#if showAdvanced}
				<div class="pt-1">
					<Input
						id="author"
						type="text"
						placeholder="Filter by author (optional)"
						bind:value={authorQuery}
						onkeydown={handleKeyDown}
						class="h-10"
					/>
				</div>
			{/if}
		</div>
	</form>

	{#if searchResults.length > 0}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold">
				Found {searchResults.length} {searchResults.length === 1 ? 'book' : 'books'}
			</h2>
			{#each searchResults as book (book.google_books_id || book.open_library_key || book.id)}
				<BookCard
					{book}
					onAddToWishlist={handleAddToWishlist}
					onMarkComplete={handleMarkComplete}
					isInWishlist={book.google_books_id ? userWishlist.has(book.google_books_id) : false}
					isCompleted={book.google_books_id ? userCompleted.has(book.google_books_id) : false}
					showSource={true}
				/>
			{/each}

			{#if hadDatabaseResults && !hasShownApiResults}
				<div class="flex justify-center pt-4">
					<Button
						type="button"
						onclick={loadMoreFromAPI}
						disabled={isLoadingMore}
						size="sm"
						class="flex items-center gap-2"
					>
						{#if isLoadingMore}
							<span class="flex items-center gap-2">
								<Loader2 class="h-4 w-4 animate-spin" />
								Loading more results...
							</span>
						{:else}
							<span>Search Online for More</span>
						{/if}
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	{#if !isSearching && hasSearched && searchResults.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">
				No books found for "{searchQuery}". Try a different search term.
			</p>
		</div>
	{/if}
</div>
