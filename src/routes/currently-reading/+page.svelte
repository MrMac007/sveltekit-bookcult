<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { BookOpen, BookCheck, Trash2, Clock } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatStarted(startedAt: string) {
		const start = new Date(startedAt);
		const now = new Date();
		const diffInDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return 'Started today';
		if (diffInDays === 1) return 'Started yesterday';
		if (diffInDays < 7) return `Started ${diffInDays} days ago`;
		if (diffInDays < 30) return `Started ${Math.floor(diffInDays / 7)} weeks ago`;
		return `Started ${start.toLocaleDateString()}`;
	}
</script>

<AppLayout title="Currently Reading">
	<div class="mx-auto max-w-5xl px-4 py-6">
		{#if !data.currentlyReading || data.currentlyReading.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
					<BookOpen class="h-10 w-10 text-primary" />
				</div>
				<h2 class="mb-2 text-xl font-semibold">No Books Currently Reading</h2>
				<p class="max-w-md text-sm text-muted-foreground">
					Start reading by tapping "Mark as Reading" on any book.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">
					{data.currentlyReading.length} {data.currentlyReading.length === 1 ? 'book' : 'books'} in
					progress
				</h2>
				{#each data.currentlyReading as item (item.id)}
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
											<BookOpen class="h-12 w-12 text-muted-foreground" />
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
											<Clock class="h-3.5 w-3.5" />
											<span>{formatStarted(item.started_at)}</span>
										</div>

										{#if item.books.description}
											<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
												{item.books.description}
											</p>
										{/if}

										<div class="mt-auto flex flex-wrap gap-2 pt-3 text-xs text-muted-foreground">
											{#if item.books.published_date}
												<span>{new Date(item.books.published_date).getFullYear()}</span>
											{/if}
											{#if item.books.page_count && item.books.published_date}
												<span>•</span>
											{/if}
											{#if item.books.page_count}
												<span>{item.books.page_count} pages</span>
											{/if}
										</div>
									</div>

									<div class="mt-3 flex flex-wrap gap-2">
										<form method="POST" action="?/markComplete" class="flex-1 min-w-[140px]">
											<input type="hidden" name="bookId" value={item.books.id} />
											<Button type="submit" variant="default" size="sm" class="w-full gap-1.5">
												<BookCheck class="h-3.5 w-3.5" />
												Mark Complete
											</Button>
										</form>
										<form
											method="POST"
											action="?/remove"
											class="flex-1 min-w-[140px]"
											on:submit={(e) => {
												if (!confirm('Remove this book from currently reading?')) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="recordId" value={item.id} />
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
