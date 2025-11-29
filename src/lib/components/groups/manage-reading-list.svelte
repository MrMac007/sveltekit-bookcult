<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		BookMarked,
		Plus,
		Trash2,
		Search,
		Loader2,
		Star,
		X,
		Settings
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface GroupBook {
		id: string;
		groupBookId: string;
		google_books_id: string | null;
		title: string;
		authors: string[];
		cover_url: string | null;
	}

	interface Props {
		group: {
			id: string;
			name: string;
			admin_id?: string;
			current_book_id?: string | null;
		};
		userId: string;
		initialBooks: GroupBook[];
		isAdmin?: boolean;
		class?: string;
	}

	let {
		group,
		userId,
		initialBooks,
		isAdmin = false,
		class: className = ''
	}: Props = $props();

	// Search state
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let showSearch = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Action states
	let addingBookId = $state<string | null>(null);
	let removingBookId = $state<string | null>(null);
	let settingCurrentId = $state<string | null>(null);

	// Local books state
	let books = $state<GroupBook[]>(initialBooks);

	// Sync with props
	$effect(() => {
		books = initialBooks;
	});

	async function searchBooks() {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			searchResults = [];
			return;
		}

		isSearching = true;

		try {
			const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
			if (!response.ok) {
				throw new Error('Failed to search books');
			}

			const result = await response.json();
			searchResults = Array.isArray(result) ? result : [];
		} catch (error) {
			console.error('Error searching books:', error);
			searchResults = [];
			toast.error('Failed to search books');
		} finally {
			isSearching = false;
		}
	}

	function handleSearchInput(value: string) {
		searchQuery = value;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (!value.trim()) {
			searchResults = [];
			return;
		}

		debounceTimer = setTimeout(() => {
			searchBooks();
		}, 500);
	}

	function isBookInList(googleBooksId: string): boolean {
		return books.some((book) => book.google_books_id === googleBooksId);
	}

	async function handleAddBook(book: any) {
		if (addingBookId) return;

		addingBookId = book.google_books_id || book.id;

		try {
			const formData = new FormData();
			formData.append('bookData', JSON.stringify(book));

			const response = await fetch(`/groups/${group.id}/reading-list?/addBook`, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Book added to reading list');
				await invalidateAll();
				searchQuery = '';
				searchResults = [];
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to add book');
			}
		} catch (error) {
			console.error('Error adding book:', error);
			toast.error('Failed to add book');
		} finally {
			addingBookId = null;
		}
	}

	async function handleRemoveBook(groupBookId: string) {
		if (removingBookId) return;

		removingBookId = groupBookId;

		try {
			const formData = new FormData();
			formData.append('groupBookId', groupBookId);

			const response = await fetch(`/groups/${group.id}/reading-list?/removeBook`, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Book removed from reading list');
				await invalidateAll();
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to remove book');
			}
		} catch (error) {
			console.error('Error removing book:', error);
			toast.error('Failed to remove book');
		} finally {
			removingBookId = null;
		}
	}

	async function handleSetCurrentBook(bookId: string) {
		if (settingCurrentId) return;

		settingCurrentId = bookId;

		try {
			const formData = new FormData();
			formData.append('bookId', bookId);

			const response = await fetch(`/groups/${group.id}/reading-list?/setAsCurrentBook`, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Current book updated');
				await invalidateAll();
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to set current book');
			}
		} catch (error) {
			console.error('Error setting current book:', error);
			toast.error('Failed to set current book');
		} finally {
			settingCurrentId = null;
		}
	}
</script>

{#if !isAdmin}
	<!-- Non-admin view: Just show a message -->
	<Card class="rounded-3xl border border-primary/15 {className}">
		<CardContent class="py-6 text-center text-sm text-muted-foreground">
			Only group admins can manage the reading list.
		</CardContent>
	</Card>
{:else}
	<Card class="rounded-3xl border border-primary/15 {className}">
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="flex items-center gap-2 text-lg">
					<Settings class="h-5 w-5" />
					Manage Reading List
				</CardTitle>
				<Button
					size="sm"
					variant={showSearch ? 'secondary' : 'outline'}
					onclick={() => {
						showSearch = !showSearch;
						if (!showSearch) {
							searchQuery = '';
							searchResults = [];
						}
					}}
				>
					{#if showSearch}
						<X class="h-4 w-4" />
					{:else}
						<Plus class="mr-1 h-4 w-4" />
						Add Book
					{/if}
				</Button>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Search Section -->
			{#if showSearch}
				<div class="space-y-3 rounded-lg border border-dashed p-3">
					<div class="relative">
						<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search for books..."
							value={searchQuery}
							oninput={(e) => {
								const target = e.currentTarget as HTMLInputElement;
								handleSearchInput(target.value);
							}}
							class="pl-9"
						/>
					</div>

					{#if isSearching}
						<div class="flex items-center justify-center py-4">
							<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					{:else if searchResults.length > 0}
						<div class="max-h-64 space-y-2 overflow-y-auto">
							{#each searchResults.slice(0, 5) as book}
								<div class="flex items-center gap-2 rounded-md border p-2">
									<div class="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
										{#if book.cover_url}
											<img
												src={book.cover_url}
												alt={book.title}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<BookMarked class="h-4 w-4 text-muted-foreground" />
											</div>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="line-clamp-1 text-sm font-medium">{book.title}</p>
										{#if book.authors?.length}
											<p class="line-clamp-1 text-xs text-muted-foreground">
												{book.authors.join(', ')}
											</p>
										{/if}
									</div>
									{#if isBookInList(book.google_books_id)}
										<Badge variant="secondary" class="text-xs">Added</Badge>
									{:else}
										<Button
											size="sm"
											variant="ghost"
											onclick={() => handleAddBook(book)}
											disabled={addingBookId === (book.google_books_id || book.id)}
										>
											{#if addingBookId === (book.google_books_id || book.id)}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Plus class="h-4 w-4" />
											{/if}
										</Button>
									{/if}
								</div>
							{/each}
						</div>
					{:else if searchQuery.trim().length >= 2}
						<p class="py-4 text-center text-sm text-muted-foreground">No books found</p>
					{/if}
				</div>
			{/if}

			<!-- Current Books List -->
			{#if books.length === 0}
				<div class="py-6 text-center">
					<BookMarked class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
					<p class="text-sm text-muted-foreground">No books in reading list yet</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each books as book (book.groupBookId)}
						<div class="flex items-center gap-2 rounded-lg border bg-card p-2">
							<div class="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
								{#if book.cover_url}
									<img
										src={book.cover_url}
										alt={book.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="flex h-full w-full items-center justify-center">
										<BookMarked class="h-4 w-4 text-muted-foreground" />
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<a href="/book/{book.id}" class="line-clamp-1 text-sm font-medium hover:text-primary">
									{book.title}
								</a>
								{#if book.authors?.length}
									<p class="line-clamp-1 text-xs text-muted-foreground">
										{book.authors.join(', ')}
									</p>
								{/if}
								{#if group.current_book_id === book.id}
									<Badge variant="default" class="mt-1 text-xs">
										<Star class="mr-1 h-3 w-3" />
										Current
									</Badge>
								{/if}
							</div>
							<div class="flex items-center gap-1">
								{#if group.current_book_id !== book.id}
									<Button
										size="sm"
										variant="ghost"
										title="Set as current book"
										onclick={() => handleSetCurrentBook(book.id)}
										disabled={settingCurrentId === book.id}
									>
										{#if settingCurrentId === book.id}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<Star class="h-4 w-4" />
										{/if}
									</Button>
								{/if}
								<Button
									size="sm"
									variant="ghost"
									class="text-destructive hover:text-destructive"
									title="Remove from list"
									onclick={() => handleRemoveBook(book.groupBookId)}
									disabled={removingBookId === book.groupBookId}
								>
									{#if removingBookId === book.groupBookId}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<Trash2 class="h-4 w-4" />
									{/if}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Link to full page -->
			<div class="pt-2 text-center">
				<a
					href="/groups/{group.id}/reading-list"
					class="text-sm text-primary hover:underline"
				>
					View full reading list manager
				</a>
			</div>
		</CardContent>
	</Card>
{/if}
