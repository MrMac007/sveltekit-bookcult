<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { StarRating } from '$lib/components/ui/star-rating';
	import BookCover from '$lib/components/ui/book-cover.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import EditDateDialog from '$lib/components/books/edit-date-dialog.svelte';
	import { formatDate } from '$lib/utils/date';
	import { BookCheck, Calendar, Edit, Trash2, Pencil } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showEditDateDialog = $state(false);
	let selectedItem = $state<{
		bookId: string;
		bookTitle: string;
		completedAt: string;
	} | null>(null);
	let isSubmitting = $state(false);

	function openEditDateDialog(bookId: string, bookTitle: string, completedAt: string) {
		selectedItem = { bookId, bookTitle, completedAt };
		showEditDateDialog = true;
	}

	async function handleUpdateDate(completedAt: string) {
		if (!selectedItem) return;

		isSubmitting = true;
		const formData = new FormData();
		formData.append('bookId', selectedItem.bookId);
		formData.append('completedAt', completedAt);

		const response = await fetch('?/updateDate', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		showEditDateDialog = false;

		if (response.ok) {
			toast.success('Date updated');
			invalidateAll();
		} else {
			toast.error('Failed to update date');
		}
	}
</script>

<AppLayout title="Completed Books">
	<div class="mx-auto max-w-5xl px-4 py-6">
		{#if !data.completedBooks || data.completedBooks.length === 0}
			<EmptyState
				icon={BookCheck}
				title="No completed books yet"
				message="Mark books as complete from your wishlist or currently reading list to see them here."
			/>
		{:else}
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">
					{data.completedBooks.length} {data.completedBooks.length === 1 ? 'book' : 'books'} completed
				</h2>
				{#each data.completedBooks as item (item.books.id)}
					<Card>
						<CardContent class="p-4">
							<div class="flex gap-4">
								<div class="flex-shrink-0">
									<BookCover
										coverUrl={item.books.cover_url}
										title={item.books.title}
										bookId={item.books.id}
										size="md"
									/>
								</div>

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

										<button
									type="button"
									class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
									onclick={() => openEditDateDialog(item.books.id, item.books.title, item.completed_at)}
								>
									<Calendar class="h-3.5 w-3.5" />
									<span>
										Completed {formatDate(item.completed_at)}
										{#if !item.date_confirmed}
											<span class="text-amber-500">(unconfirmed)</span>
										{/if}
									</span>
									<Pencil class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
								</button>

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
											onsubmit={(e) => {
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

<EditDateDialog
	bind:open={showEditDateDialog}
	bookTitle={selectedItem?.bookTitle}
	currentDate={selectedItem?.completedAt ?? ''}
	isSubmitting={isSubmitting}
	onConfirm={handleUpdateDate}
/>
