<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { BookMarked, Plus, Trash2, BookOpen, Star, Settings } from 'lucide-svelte';
	import type { Database } from '$lib/types/database';

	type Book = Database['public']['Tables']['books']['Row'] & {
		groupBookId?: string;
	};

	type Group = {
		id: string;
		name: string;
		currentBookId: string | null;
	};

	interface Props {
		group: Group;
		books: Book[];
		isAdmin?: boolean;
		showSearch?: boolean;
		class?: string;
	}

	let {
		group,
		books,
		isAdmin = false,
		showSearch = true,
		class: className = ''
	}: Props = $props();

	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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
			
			const data = await response.json();
			// The API returns the array directly, not wrapped in an object
			searchResults = Array.isArray(data) ? data : [];
		} catch (error) {
			console.error('Error searching books:', error);
			searchResults = [];
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
</script>

{#if !isAdmin}
	<Card class={className}>
		<CardContent class="pt-6">
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"
				>
					<Settings class="h-8 w-8 text-muted-foreground" />
				</div>
				<h3 class="mb-2 font-semibold">Admin Only</h3>
				<p class="text-sm text-muted-foreground">
					Only group admins can manage the reading list.
				</p>
			</div>
		</CardContent>
	</Card>
{:else}
	<div class={className}>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Manage Reading List</h2>
			<Button href="/groups/{group.id}/reading-list" variant="outline" size="sm">
				<Settings class="mr-2 h-4 w-4" />
				Full Manager
			</Button>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Search and Add Books -->
			{#if showSearch}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-base">
							<Plus class="h-4 w-4" />
							Add Books
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							<div>
								<Input
									type="text"
									placeholder="Search for books..."
									value={searchQuery}
									oninput={(e) => handleSearchInput(e.currentTarget.value)}
								/>
							</div>

							{#if isSearching}
								<p class="text-sm text-muted-foreground">Searching...</p>
							{:else if searchResults.length > 0}
								<div class="max-h-[400px] space-y-3 overflow-y-auto">
									{#each searchResults as book}
										<div class="flex gap-3 rounded-lg border p-3">
											<!-- Book Cover -->
											<div
												class="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted"
											>
												{#if book.cover_url}
													<img
														src={book.cover_url}
														alt={book.title}
														class="h-full w-full object-cover"
													/>
												{:else}
													<div class="flex h-full w-full items-center justify-center">
														<BookMarked class="h-6 w-6 text-muted-foreground" />
													</div>
												{/if}
											</div>

											<!-- Book Info -->
											<div class="min-w-0 flex-1">
												<h4 class="line-clamp-2 text-sm font-semibold">{book.title}</h4>
												{#if book.authors && book.authors.length > 0}
													<p class="line-clamp-1 mt-1 text-xs text-muted-foreground">
														{book.authors.join(', ')}
													</p>
												{/if}
											</div>

											<!-- Add Button -->
											<div class="flex-shrink-0">
												{#if isBookInList(book.google_books_id)}
													<Badge variant="secondary" class="text-xs">In List</Badge>
												{:else}
													<form
														method="POST"
														action="/groups/{group.id}/reading-list?/addBook"
														use:enhance={() => {
															return async ({ result }) => {
																if (result.type === 'success') {
																	await invalidateAll();
																	searchQuery = '';
																	searchResults = [];
																}
															};
														}}
													>
														<input type="hidden" name="bookData" value={JSON.stringify(book)} />
														<Button type="submit" size="sm">
															<Plus class="h-4 w-4" />
														</Button>
													</form>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else if searchQuery.trim().length > 0}
								<p class="text-sm text-muted-foreground">No books found</p>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/if}

			<!-- Current Reading List -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<BookOpen class="h-4 w-4" />
						Reading List ({books.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{#if books.length > 0}
						<div class="max-h-[400px] space-y-3 overflow-y-auto">
							{#each books as book}
								<div class="flex gap-3 rounded-lg border p-3">
									<!-- Book Cover -->
									<div class="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
										{#if book.cover_url}
											<img
												src={book.cover_url}
												alt={book.title}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<BookMarked class="h-6 w-6 text-muted-foreground" />
											</div>
										{/if}
									</div>

									<!-- Book Info -->
									<div class="min-w-0 flex-1">
										<a href="/book/{book.id}">
											<h4 class="line-clamp-2 text-sm font-semibold hover:text-primary">
												{book.title}
											</h4>
										</a>
										{#if book.authors && book.authors.length > 0}
											<p class="line-clamp-1 mt-1 text-xs text-muted-foreground">
												{book.authors.join(', ')}
											</p>
										{/if}

										{#if group.currentBookId === book.id}
											<Badge variant="default" class="mt-2 text-xs">
												<Star class="mr-1 h-3 w-3" />
												Current Reading
											</Badge>
										{:else}
											<form
												method="POST"
												action="/groups/{group.id}/reading-list?/setAsCurrentBook"
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
												<Button type="submit" size="sm" variant="outline" class="h-7 text-xs">
													Set as Current
												</Button>
											</form>
										{/if}
									</div>

									<!-- Remove Button -->
									<div class="flex-shrink-0">
										<form
											method="POST"
											action="/groups/{group.id}/reading-list?/removeBook"
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
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<BookOpen class="mb-3 h-10 w-10 text-muted-foreground" />
							<h3 class="mb-2 font-semibold">No books in reading list</h3>
							<p class="text-sm text-muted-foreground">Search and add books to get started</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
{/if}
