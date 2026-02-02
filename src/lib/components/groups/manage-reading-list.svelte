<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		BookMarked,
		Plus,
		Trash2,
		Loader2,
		Star,
		X,
		Settings
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { useBookSearch } from '$lib/stores/book-search';
	import BookSearchPanel from '$lib/components/books/book-search-panel.svelte';
	import BookSearchResultRow from '$lib/components/books/book-search-result-row.svelte';
	import { toBookCardData } from '$lib/utils/books';
	import GroupReadingListItems from '$lib/components/groups/group-reading-list-items.svelte';
	import type { BookSearchResult } from '$lib/types/book-search';

	interface GroupBook {
		id: string;
		groupBookId: string;
		google_books_id: string | null;
		open_library_key: string | null;
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
	const search = useBookSearch({
		autoSearch: true,
		onError: () => toast.error('Failed to search books')
	});

	let showSearch = $state(false);

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

	function isBookInList(result: BookSearchResult): boolean {
		if (result.id && books.some((book) => book.id === result.id)) {
			return true;
		}

		if (result.open_library_key) {
			return books.some((book) => book.open_library_key === result.open_library_key);
		}

		return false;
	}

	async function handleAddBook(book: BookSearchResult) {
		if (addingBookId) return;

		addingBookId = book.id || book.open_library_key;

		try {
			const formData = new FormData();
			formData.append('bookData', JSON.stringify(toBookCardData(book)));

			const response = await fetch(`/groups/${group.id}/reading-list?/addBook`, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Book added to reading list');
				await invalidateAll();
				search.reset();
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
					search.reset();
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
					<BookSearchPanel {search} maxResults={5} resultsClass="max-h-64 overflow-y-auto space-y-2">
						<svelte:fragment slot="result" let:book>
							{@const isAlreadyAdded = isBookInList(book)}
							{@const bookKey = book.id || book.open_library_key}
							<BookSearchResultRow {book}>
								<svelte:fragment slot="actions">
									{#if isAlreadyAdded}
										<Badge variant="secondary" class="text-xs">Added</Badge>
									{:else}
										<Button
											size="sm"
											variant="ghost"
											onclick={() => handleAddBook(book)}
											disabled={addingBookId === bookKey}
										>
											{#if addingBookId === bookKey}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Plus class="h-4 w-4" />
											{/if}
										</Button>
									{/if}
								</svelte:fragment>
							</BookSearchResultRow>
						</svelte:fragment>
					</BookSearchPanel>
				</div>
			{/if}

			<!-- Current Books List -->
			{#if books.length === 0}
				<div class="py-6 text-center">
					<BookMarked class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
					<p class="text-sm text-muted-foreground">No books in reading list yet</p>
				</div>
			{:else}
				<GroupReadingListItems books={books} currentBookId={group.current_book_id}>
					<svelte:fragment slot="actions" let:book>
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
					</svelte:fragment>
				</GroupReadingListItems>
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
