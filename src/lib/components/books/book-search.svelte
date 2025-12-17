<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Search, Loader2, X } from 'lucide-svelte';
	import BookCard from './book-card.svelte';
	import EditionPicker from './edition-picker.svelte';
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

	// Edition picker state
	let showEditionPicker = $state(false);
	let editionPickerBook = $state<BookCardData | null>(null);
	let pendingAction = $state<'wishlist' | 'complete' | null>(null);

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
	 * Check if book exists in database, returns { exists: true, id } or { exists: false, olKey }
	 */
	async function checkBookExists(book: BookCardData): Promise<{ exists: true; id: string } | { exists: false; olKey: string | null }> {
		// If already a valid UUID, it exists
		if (book.id && isValidUUID(book.id)) {
			return { exists: true, id: book.id };
		}

		// Determine the Open Library key
		const olKey = book.open_library_key || (book.id && /^OL\d+[WM]$/.test(book.id) ? book.id : null);

		if (olKey) {
			const { data: existing } = await supabase
				.from('books')
				.select('id')
				.eq('open_library_key', olKey)
				.single();

			const typedExisting = existing as { id: string } | null;
			if (typedExisting?.id) {
				return { exists: true, id: typedExisting.id };
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
				return { exists: true, id: typedExisting.id };
			}
		}

		return { exists: false, olKey };
	}

	/**
	 * Create book in database, optionally with a user-selected cover
	 */
	async function createBook(olKey: string, coverUrl?: string): Promise<string | null> {
		try {
			const url = coverUrl
				? `/api/books/fetch?id=${olKey}&cover_url=${encodeURIComponent(coverUrl)}`
				: `/api/books/fetch?id=${olKey}`;

			const response = await fetch(url);
			if (response.ok) {
				const payload = await response.json();
				if (payload?.id && isValidUUID(payload.id)) {
					return payload.id;
				}
			} else {
				const errorData = await response.json().catch(() => ({}));
				console.error('[createBook] API fetch failed:', response.status, errorData);
			}
		} catch (err) {
			console.error('[createBook] Fetch error:', err);
		}
		return null;
	}

	async function ensureBookId(book: BookCardData): Promise<string | null> {
		const result = await checkBookExists(book);

		if (result.exists) {
			return result.id;
		}

		// Book doesn't exist - create with default cover
		if (result.olKey) {
			return await createBook(result.olKey);
		}

		console.error('[ensureBookId] Could not get book ID for:', book.title);
		return null;
	}

	/**
	 * Handle edition selection from the picker
	 */
	async function handleEditionSelect(edition: { key: string; cover_url?: string }) {
		if (!editionPickerBook || !pendingAction) return;

		const book = editionPickerBook;
		const olKey = book.open_library_key || book.id;

		if (!olKey) {
			alert('Unable to save book');
			closeEditionPicker();
			return;
		}

		// Create book with selected cover
		const bookId = await createBook(olKey, edition.cover_url);

		if (!bookId) {
			alert('Unable to save book');
			closeEditionPicker();
			return;
		}

		// Now perform the pending action
		const user = await getCurrentUser();
		if (!user) {
			closeEditionPicker();
			return;
		}

		if (pendingAction === 'wishlist') {
			await addToWishlistWithId(user.id, bookId, book);
		} else if (pendingAction === 'complete') {
			await markCompleteWithId(user.id, bookId, book);
		}

		closeEditionPicker();
	}

	function closeEditionPicker() {
		showEditionPicker = false;
		editionPickerBook = null;
		pendingAction = null;
	}

	/**
	 * Skip edition picker and use default cover
	 */
	async function handleSkipEditionPicker() {
		if (!editionPickerBook || !pendingAction) {
			closeEditionPicker();
			return;
		}

		const book = editionPickerBook;
		const action = pendingAction;

		closeEditionPicker();

		// Use the default flow
		if (action === 'wishlist') {
			await handleAddToWishlist(book);
		} else if (action === 'complete') {
			await handleMarkComplete(book);
		}
	}

	/**
	 * Add book to wishlist with known book ID
	 */
	async function addToWishlistWithId(userId: string, bookId: string, book: BookCardData) {
		try {
			const { error } = await supabase
				.from('wishlists')
				.insert({ user_id: userId, book_id: bookId } as any);

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
		}
	}

	/**
	 * Mark book as complete with known book ID
	 */
	async function markCompleteWithId(userId: string, bookId: string, book: BookCardData) {
		try {
			const { data: existing } = await supabase
				.from('completed_books')
				.select('id')
				.eq('user_id', userId)
				.eq('book_id', bookId)
				.single();

			if (existing) {
				goto(`/rate/${bookId}`);
				return;
			}

			await supabase.from('wishlists').delete().eq('user_id', userId).eq('book_id', bookId);
			await supabase.from('currently_reading').delete().eq('user_id', userId).eq('book_id', bookId);

			const { error: insertError } = await supabase
				.from('completed_books')
				.insert({ user_id: userId, book_id: bookId } as any);

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
		}
	}

	async function handleAddToWishlist(book: BookCardData) {
		const user = await getCurrentUser();
		if (!user) return;

		// Check if book exists in database
		const result = await checkBookExists(book);

		if (result.exists) {
			// Book exists, add directly
			await addToWishlistWithId(user.id, result.id, book);
		} else if (result.olKey) {
			// Book doesn't exist, show edition picker
			editionPickerBook = book;
			pendingAction = 'wishlist';
			showEditionPicker = true;
		} else {
			alert('Unable to save book');
		}
	}

	async function handleMarkComplete(book: BookCardData) {
		const user = await getCurrentUser();
		if (!user) return;

		// Check if book exists in database
		const result = await checkBookExists(book);

		if (result.exists) {
			// Book exists, mark complete directly
			await markCompleteWithId(user.id, result.id, book);
		} else if (result.olKey) {
			// Book doesn't exist, show edition picker
			editionPickerBook = book;
			pendingAction = 'complete';
			showEditionPicker = true;
		} else {
			alert('Unable to save book');
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

<!-- Edition Picker Modal -->
{#if showEditionPicker && editionPickerBook}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={closeEditionPicker}
			aria-label="Close"
		></button>

		<!-- Modal -->
		<div class="relative z-10 mx-4 w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg">
			<button
				type="button"
				class="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
				onclick={closeEditionPicker}
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>

			<EditionPicker
				workKey={editionPickerBook.open_library_key || editionPickerBook.id || ''}
				bookTitle={editionPickerBook.title}
				onSelect={handleEditionSelect}
				onSkip={handleSkipEditionPicker}
			/>
		</div>
	</div>
{/if}
