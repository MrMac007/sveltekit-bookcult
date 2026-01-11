<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Search, Loader2 } from 'lucide-svelte';
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
	let searchResults = $state<BookCardData[]>([]);
	let isSearching = $state(false);
	let hasSearched = $state(false);
	let hadDatabaseResults = $state(false);
	let hasShownApiResults = $state(false);
	let isLoadingMore = $state(false);
	let userWishlistIds = $state<Set<string>>(new Set());
	let userCompletedIds = $state<Set<string>>(new Set());
	let isAddingBook = $state<string | null>(null); // Track which book is being added

	// Helper to check if a book is in a set by any of its identifiers
	function isBookInSet(book: BookCardData, idSet: Set<string>): boolean {
		return (
			(book.id && idSet.has(book.id)) ||
			(book.google_books_id && idSet.has(book.google_books_id)) ||
			(book.open_library_key && idSet.has(book.open_library_key)) ||
			false
		);
	}

	onMount(() => {
		if (userId) {
			loadUserBookStatuses();
		}
	});

	function handleSearchInput(value: string) {
		searchQuery = value;

		if (!value.trim()) {
			searchResults = [];
			hasSearched = false;
			hadDatabaseResults = false;
			hasShownApiResults = false;
		}
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
			const url = `/api/books/search?q=${encodeURIComponent(query)}&source=database`;
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
			const url = `/api/books/search?q=${encodeURIComponent(query)}&source=api`;
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
		performSearch();
	}

	async function loadUserBookStatuses() {
		try {
			type BookIds = { id?: string; google_books_id?: string | null; open_library_key?: string | null };
			type ItemWithBooks = { books: BookIds | null };

			const [wishlistResult, completedResult] = await Promise.all([
				supabase
					.from('wishlists')
					.select('books(id, google_books_id, open_library_key)')
					.eq('user_id', userId),
				supabase
					.from('completed_books')
					.select('books(id, google_books_id, open_library_key)')
					.eq('user_id', userId),
			]);

			// Collect all identifiers (UUID, google_books_id, open_library_key)
			const wishlistIds = new Set<string>();
			for (const item of (wishlistResult.data || []) as ItemWithBooks[]) {
				const book = item.books;
				if (book?.id) wishlistIds.add(book.id);
				if (book?.google_books_id) wishlistIds.add(book.google_books_id);
				if (book?.open_library_key) wishlistIds.add(book.open_library_key);
			}
			userWishlistIds = wishlistIds;

			const completedIds = new Set<string>();
			for (const item of (completedResult.data || []) as ItemWithBooks[]) {
				const book = item.books;
				if (book?.id) completedIds.add(book.id);
				if (book?.google_books_id) completedIds.add(book.google_books_id);
				if (book?.open_library_key) completedIds.add(book.open_library_key);
			}
			userCompletedIds = completedIds;
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

	/**
	 * Ensure book exists in database, creating it with auto-selected best edition if needed.
	 * Returns the database UUID for the book.
	 */
	async function ensureBookId(book: BookCardData): Promise<string | null> {
		// If already a valid UUID, it exists
		if (book.id && isValidUUID(book.id)) {
			return book.id;
		}

		// Determine the Open Library key
		const olKey = book.open_library_key || (book.id && /^OL\d+[WM]$/.test(book.id) ? book.id : null);

		// Check if book exists by Open Library key
		if (olKey) {
			const { data: existing } = await supabase
				.from('books')
				.select('id')
				.eq('open_library_key', olKey)
				.single();

			const typedExisting = existing as { id: string } | null;
			if (typedExisting?.id) {
				return typedExisting.id;
			}
		}

		// Check legacy Google Books ID
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

		// Book doesn't exist - create with auto-selected best UK edition
		if (olKey) {
			try {
				const response = await fetch(`/api/books/fetch?id=${olKey}`);
				if (response.ok) {
					const payload = await response.json();
					if (payload?.id && isValidUUID(payload.id)) {
						return payload.id;
					}
				} else {
					const errorData = await response.json().catch(() => ({}));
					console.error('[ensureBookId] API fetch failed:', response.status, errorData);
				}
			} catch (err) {
				console.error('[ensureBookId] Fetch error:', err);
			}
		}

		console.error('[ensureBookId] Could not get book ID for:', book.title);
		return null;
	}

	/**
	 * Add book to wishlist
	 */
	async function handleAddToWishlist(book: BookCardData) {
		const user = await getCurrentUser();
		if (!user) return;

		const bookKey = book.open_library_key || book.id || '';
		isAddingBook = bookKey;

		try {
			const bookId = await ensureBookId(book);
			if (!bookId) {
				alert('Unable to save book. Please try again.');
				return;
			}

			const { error } = await supabase
				.from('wishlists')
				.insert({ user_id: user.id, book_id: bookId } as any);

			if (error && error.code !== '23505') {
				throw error;
			}

			// Update local state with all available identifiers
			const newWishlistIds = new Set(userWishlistIds);
			const newCompletedIds = new Set(userCompletedIds);

			newWishlistIds.add(bookId);
			if (book.id) newWishlistIds.add(book.id);
			if (book.google_books_id) newWishlistIds.add(book.google_books_id);
			if (book.open_library_key) newWishlistIds.add(book.open_library_key);

			newCompletedIds.delete(bookId);
			if (book.id) newCompletedIds.delete(book.id);
			if (book.google_books_id) newCompletedIds.delete(book.google_books_id);
			if (book.open_library_key) newCompletedIds.delete(book.open_library_key);

			userWishlistIds = newWishlistIds;
			userCompletedIds = newCompletedIds;
		} catch (error) {
			console.error('Error adding to wishlist:', error);
			alert('Failed to add to wishlist. Please try again.');
		} finally {
			isAddingBook = null;
		}
	}

	/**
	 * Mark book as complete
	 */
	async function handleMarkComplete(book: BookCardData) {
		const user = await getCurrentUser();
		if (!user) return;

		const bookKey = book.open_library_key || book.id || '';
		isAddingBook = bookKey;

		try {
			const bookId = await ensureBookId(book);
			if (!bookId) {
				alert('Unable to save book. Please try again.');
				return;
			}

			// Check if already completed
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

			// Remove from other lists
			await supabase.from('wishlists').delete().eq('user_id', user.id).eq('book_id', bookId);
			await supabase.from('currently_reading').delete().eq('user_id', user.id).eq('book_id', bookId);

			const { error: insertError } = await supabase
				.from('completed_books')
				.insert({ user_id: user.id, book_id: bookId } as any);

			if (insertError) {
				throw insertError;
			}

			// Update local state
			const newCompletedIds = new Set(userCompletedIds);
			const newWishlistIds = new Set(userWishlistIds);

			newCompletedIds.add(bookId);
			if (book.id) newCompletedIds.add(book.id);
			if (book.google_books_id) newCompletedIds.add(book.google_books_id);
			if (book.open_library_key) newCompletedIds.add(book.open_library_key);

			newWishlistIds.delete(bookId);
			if (book.id) newWishlistIds.delete(book.id);
			if (book.google_books_id) newWishlistIds.delete(book.google_books_id);
			if (book.open_library_key) newWishlistIds.delete(book.open_library_key);

			userCompletedIds = newCompletedIds;
			userWishlistIds = newWishlistIds;

			goto(`/rate/${bookId}`);
		} catch (error) {
			console.error('Error marking as complete:', error);
			alert('Failed to mark as complete. Please try again.');
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
						<Loader2 class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
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
			{#each searchResults as book (book.google_books_id || book.open_library_key || book.id)}
				<BookCard
					{book}
					onAddToWishlist={handleAddToWishlist}
					onMarkComplete={handleMarkComplete}
					isInWishlist={isBookInSet(book, userWishlistIds)}
					isCompleted={isBookInSet(book, userCompletedIds)}
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
