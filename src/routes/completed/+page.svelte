<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { StarRating } from '$lib/components/ui/star-rating';
	import { BookCheck, Calendar, Edit, Trash2, BookMarked } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<AppLayout title="Completed Books">
	<div class="mx-auto max-w-5xl px-4 py-6">
		{#if !data.completedBooks || data.completedBooks.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
					<BookCheck class="h-10 w-10 text-primary" />
				</div>
				<h2 class="mb-2 text-xl font-semibold">No completed books yet</h2>
				<p class="max-w-md text-sm text-muted-foreground">
					Mark books as complete from your wishlist or currently reading list to see them here.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">
					{data.completedBooks.length} {data.completedBooks.length === 1 ? 'book' : 'books'} completed
				</h2>
				{#each data.completedBooks as item (item.books.id)}
					<Card>
						<CardContent class="p-4">
							<div class="flex gap-4">
								<a
									href={`/book/${item.books.id}`}
									class="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-80"
								>
									{#if item.books.cover_url}
										<img
											src={item.books.cover_url}
											alt={item.books.title}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div class="flex h-full w-full items-center justify-center">
											<BookMarked class="h-12 w-12 text-muted-foreground" />
										</div>
									{/if}
								</a>

								<div class="flex flex-1 flex-col">
									<div class="flex-1">
										<a href={`/book/${item.books.id}`}>
											<h3 class="font-semibold leading-tight transition-colors hover:text-primary">
												{item.books.title}
											</h3>
										</a>
										{#if item.books.authors && item.books.authors.length > 0}
											<p class="mt-1 text-sm text-muted-foreground">
												by {item.books.authors.join(', ')}
											</p>
										{/if}

										<div class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
											<Calendar class="h-3.5 w-3.5" />
											<span>Completed {formatDate(item.completed_at)}</span>
										</div>

										{#if item.rating?.rating !== undefined}
											<div class="mt-3">
												<StarRating value={item.rating.rating} readonly size="sm" />
											</div>
										{/if}

										{#if item.rating?.review}
											<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
												{item.rating.review}
											</p>
										{/if}
									</div>

									<div class="mt-3 flex flex-wrap gap-2">
										<a href={`/rate/${item.books.id}`} class="flex-1 min-w-[140px]">
											<Button variant="outline" size="sm" class="w-full gap-1.5">
												<Edit class="h-3.5 w-3.5" />
												{item.rating ? 'Edit Rating' : 'Add Rating'}
											</Button>
										</a>
										<form
											method="POST"
											action="?/remove"
											class="flex-1 min-w-[140px]"
											on:submit={(e) => {
												if (!confirm('Remove this book from completed (and delete rating)?')) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="bookId" value={item.books.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												class="w-full gap-1.5 text-destructive hover:text-destructive"
											>
												<Trash2 class="h-3.5 w-3.5" />
												Remove
											</Button>
										</form>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</AppLayout>
