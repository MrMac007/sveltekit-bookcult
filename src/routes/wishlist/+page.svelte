<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import BookCard from '$lib/components/books/book-card.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import { BookMarked } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	async function handleRemove(bookId: string) {
		const formData = new FormData();
		formData.append('bookId', bookId);

		const response = await fetch('?/removeFromWishlist', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			invalidateAll();
		}
	}

	function handleMarkComplete(book: any) {
		// Navigate directly to rating page
		goto(`/rate/${book.id}`);
	}
</script>

<AppLayout title="Wishlist">
	<div class="mx-auto max-w-5xl px-4 py-6">
		<div class="mb-6 space-y-1">
			<h1 class="page-heading">My Wishlist</h1>
			<p class="text-sm text-muted-foreground">
				<span class="meta-label">Stories waiting on your shelf</span>
			</p>
		</div>

		{#if data.wishlistBooks.length > 0}
			<div class="space-y-4">
				{#each data.wishlistBooks as item (item.books!.id)}
					{@const book = item.books!}
					<div class="relative">
						<BookCard
							book={{
								id: book.id,
								google_books_id: book.google_books_id,
								title: book.title,
								authors: book.authors,
								cover_url: book.cover_url,
								description: book.description,
								published_date: book.published_date,
								page_count: book.page_count,
								categories: book.categories,
								isbn_10: book.isbn_10,
								isbn_13: book.isbn_13
							}}
							onMarkComplete={handleMarkComplete}
							isInWishlist={true}
						/>
						<div class="mt-2">
							<form method="POST" action="?/removeFromWishlist" use:enhance>
								<input type="hidden" name="bookId" value={book.id} />
								<button
									type="submit"
									class="text-sm text-destructive hover:underline"
								>
									Remove from wishlist
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<EmptyState
				icon={BookMarked}
				title="Your wishlist is empty"
				message="Start adding books you want to read"
				actionText="Discover Books"
				actionHref="/discover"
			/>
		{/if}
	</div>
</AppLayout>
