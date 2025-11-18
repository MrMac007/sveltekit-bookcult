<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { BookMarked, Plus, Trash2, BookOpen, ArrowLeft, Star } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

			const result = await response.json();
			// The API returns the array directly, not wrapped in an object
			searchResults = Array.isArray(result) ? result : [];
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
		return data.books.some((book) => book.google_books_id === googleBooksId);
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
						<div>
							<Input
								type="text"
								placeholder="Search for books..."
								value={searchQuery}
								oninput={(e) => {
									const target = e.currentTarget as HTMLInputElement;
									handleSearchInput(target.value);
								}}
							/>
						</div>

						{#if isSearching}
							<p class="text-sm text-muted-foreground">Searching...</p>
						{:else if searchResults.length > 0}
							<div class="space-y-3 max-h-[600px] overflow-y-auto">
								{#each searchResults as book}
									<div class="flex gap-3 rounded-lg border p-3">
										<!-- Book Cover -->
										<div class="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
											{#if book.cover_url}
												<img
													src={book.cover_url}
													alt={book.title}
													class="h-full w-full object-cover"
												/>
											{:else}
												<div class="flex h-full w-full items-center justify-center">
													<BookMarked class="h-8 w-8 text-muted-foreground" />
												</div>
											{/if}
										</div>

										<!-- Book Info -->
										<div class="flex-1 min-w-0">
											<h4 class="font-semibold line-clamp-2 text-sm">{book.title}</h4>
											{#if book.authors && book.authors.length > 0}
												<p class="mt-1 text-xs text-muted-foreground line-clamp-1">
													{book.authors.join(', ')}
												</p>
											{/if}
											{#if book.published_date}
												<p class="mt-1 text-xs text-muted-foreground">
													{new Date(book.published_date).getFullYear()}
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
														value={JSON.stringify(book)}
													/>
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
						<div class="space-y-3 max-h-[600px] overflow-y-auto">
							{#each data.books as book}
								<div class="flex gap-3 rounded-lg border p-3">
									<!-- Book Cover -->
									<div class="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
										{#if book.cover_url}
											<img
												src={book.cover_url}
												alt={book.title}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<BookMarked class="h-8 w-8 text-muted-foreground" />
											</div>
										{/if}
									</div>

									<!-- Book Info -->
									<div class="flex-1 min-w-0">
										<h4 class="font-semibold line-clamp-2 text-sm">{book.title}</h4>
										{#if book.authors && book.authors.length > 0}
											<p class="mt-1 text-xs text-muted-foreground line-clamp-1">
												{book.authors.join(', ')}
											</p>
										{/if}

										{#if data.group.currentBookId === book.id}
											<Badge variant="default" class="mt-2 text-xs">
												<Star class="mr-1 h-3 w-3" />
												Current Reading
											</Badge>
										{:else}
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
									</div>

									<!-- Remove Button -->
									<div class="flex-shrink-0">
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
									</div>
								</div>
							{/each}
						</div>
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
