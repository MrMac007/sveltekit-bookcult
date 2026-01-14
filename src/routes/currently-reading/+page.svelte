<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import BookCover from '$lib/components/ui/book-cover.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import MarkCompleteDialog from '$lib/components/books/mark-complete-dialog.svelte';
	import { formatRelativeTime } from '$lib/utils/date';
	import { BookOpen, BookCheck, Trash2, Clock, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showCompleteDialog = $state(false);
	let selectedBook = $state<{ id: string; title: string } | null>(null);
	let isSubmitting = $state(false);

	function openCompleteDialog(bookId: string, bookTitle: string) {
		selectedBook = { id: bookId, title: bookTitle };
		showCompleteDialog = true;
	}

	async function handleMarkComplete(completedAt: string) {
		if (!selectedBook) return;

		// Capture book ID and close dialog immediately to prevent date reset issues
		const bookId = selectedBook.id;
		showCompleteDialog = false;
		isSubmitting = true;

		const formData = new FormData();
		formData.append('bookId', bookId);
		formData.append('completedAt', completedAt);

		const response = await fetch('?/markComplete', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;

		if (response.ok) {
			const result = await response.json();
			if (result.type === 'redirect') {
				goto(result.location);
			}
		}
	}
</script>

<AppLayout title="Currently Reading">
	<div class="mx-auto max-w-5xl px-4 py-6">
		{#if !data.currentlyReading || data.currentlyReading.length === 0}
			<EmptyState
				icon={BookOpen}
				title="No Books Currently Reading"
				message="Start reading by tapping 'Mark as Reading' on any book."
			/>
		{:else}
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">
					{data.currentlyReading.length} {data.currentlyReading.length === 1 ? 'book' : 'books'} in
					progress
				</h2>
				{#each data.currentlyReading as item (item.id)}
					{@const book = item.books!}
					<Card>
						<CardContent class="p-4">
							<div class="flex gap-4">
								<div class="flex-shrink-0">
									<BookCover
										coverUrl={book.cover_url}
										title={book.title}
										bookId={book.id}
										size="md"
									/>
								</div>

								<div class="flex flex-1 flex-col">
									<div class="flex-1">
										<a href={`/book/${book.id}`}>
											<h3 class="font-semibold leading-tight transition-colors hover:text-primary">
												{book.title}
											</h3>
										</a>
										{#if book.authors && book.authors.length > 0}
											<p class="mt-1 text-sm text-muted-foreground">
												by {book.authors.join(', ')}
											</p>
										{/if}

										<div class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
											<Clock class="h-3.5 w-3.5" />
											<span>{formatRelativeTime(item.started_at)}</span>
										</div>

										{#if book.description}
											<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
												{book.description}
											</p>
										{/if}

										<div class="mt-auto flex flex-wrap gap-2 pt-3 text-xs text-muted-foreground">
											{#if book.published_date}
												<span>{new Date(book.published_date).getFullYear()}</span>
											{/if}
											{#if book.page_count && book.published_date}
												<span>•</span>
											{/if}
											{#if book.page_count}
												<span>{book.page_count} pages</span>
											{/if}
										</div>
									</div>

									<div class="mt-3 flex flex-wrap gap-2">
										<div class="flex-1 min-w-[140px]">
											<Button
												variant="default"
												size="sm"
												class="w-full gap-1.5"
												onclick={() => openCompleteDialog(book.id, book.title)}
												disabled={isSubmitting && selectedBook?.id === book.id}
											>
												{#if isSubmitting && selectedBook?.id === book.id}
													<Loader2 class="h-3.5 w-3.5 animate-spin" />
													Completing...
												{:else}
													<BookCheck class="h-3.5 w-3.5" />
													Mark Complete
												{/if}
											</Button>
										</div>
										<form
											method="POST"
											action="?/remove"
											class="flex-1 min-w-[140px]"
											onsubmit={(e) => {
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

<MarkCompleteDialog
	bind:open={showCompleteDialog}
	bookTitle={selectedBook?.title}
	isSubmitting={isSubmitting}
	onConfirm={handleMarkComplete}
/>
