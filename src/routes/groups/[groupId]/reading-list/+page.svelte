<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Trash2, BookOpen, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { useBookSearch } from '$lib/stores/book-search';
	import BookSearchPanel from '$lib/components/books/book-search-panel.svelte';
	import BookSearchResultRow from '$lib/components/books/book-search-result-row.svelte';
	import GroupReadingListItems from '$lib/components/groups/group-reading-list-items.svelte';
	import { toBookCardData } from '$lib/utils/books';
	import type { BookSearchResult } from '$lib/types/book-search';

	let { data }: { data: PageData } = $props();

	const search = useBookSearch({
		autoSearch: true
	});

	function isBookInList(result: BookSearchResult): boolean {
		if (result.id && data.books.some((book) => book.id === result.id)) {
			return true;
		}

		return data.books.some((book) => book.open_library_key === result.open_library_key);
	}
</script>

<AppLayout title="Manage Reading List">
	<div class="mx-auto max-w-5xl px-4 py-6">
		<div class="mb-6 flex items-center gap-4">
			<Button href="/groups/{data.group.id}" size="sm">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Group
			</Button>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Search and Add Books -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Plus class="h-5 w-5" />
						Add Books
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<BookSearchPanel
							{search}
							maxResults={20}
							showIcon={false}
							resultsClass="space-y-3 max-h-[600px] overflow-y-auto"
						>
							<svelte:fragment slot="result" let:book>
								<BookSearchResultRow {book} showYear={true} showSourceBadge={true}>
									<svelte:fragment slot="actions">
										{#if isBookInList(book)}
											<Badge variant="secondary" class="text-xs">In List</Badge>
										{:else}
											<form
												method="POST"
												action="?/addBook"
												use:enhance={() => {
													return async ({ result }) => {
														if (result.type === 'success') {
															await invalidateAll();
														}
													};
												}}
											>
												<input
													type="hidden"
													name="bookData"
													value={JSON.stringify(toBookCardData(book))}
												/>
												<Button type="submit" size="sm">
													<Plus class="h-4 w-4" />
												</Button>
											</form>
										{/if}
									</svelte:fragment>
								</BookSearchResultRow>
							</svelte:fragment>
						</BookSearchPanel>
					</div>
				</CardContent>
			</Card>

			<!-- Current Reading List -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<BookOpen class="h-5 w-5" />
						Reading List ({data.books.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{#if data.books.length > 0}
						<GroupReadingListItems
							books={data.books}
							currentBookId={data.group.currentBookId}
							currentLabel="Current Reading"
							class="max-h-[600px] overflow-y-auto"
						>
							<svelte:fragment slot="actions" let:book>
								{#if data.group.currentBookId !== book.id}
									<form
										method="POST"
										action="?/setAsCurrentBook"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === 'success') {
													await invalidateAll();
												}
											};
										}}
										class="mt-2"
									>
										<input type="hidden" name="bookId" value={book.id} />
										<Button type="submit" size="sm" variant="outline" class="text-xs h-7">
											Set as Current
										</Button>
									</form>
								{/if}
								<form
									method="POST"
									action="?/removeBook"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												await invalidateAll();
											}
										};
									}}
								>
									<input type="hidden" name="groupBookId" value={book.groupBookId} />
									<Button
										type="submit"
										size="sm"
										variant="ghost"
										class="text-destructive hover:text-destructive"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</form>
							</svelte:fragment>
						</GroupReadingListItems>
					{:else}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<BookOpen class="h-12 w-12 text-muted-foreground mb-3" />
							<h3 class="text-lg font-semibold mb-2">No books in reading list</h3>
							<p class="text-sm text-muted-foreground">
								Search and add books to get started
							</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</AppLayout>
