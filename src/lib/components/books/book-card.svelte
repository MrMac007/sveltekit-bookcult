<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { BookMarked, BookCheck } from 'lucide-svelte';
	import BookCover from '$lib/components/ui/book-cover.svelte';
	import BookMetadata from '$lib/components/ui/book-metadata.svelte';
	import type { BookCardData } from '$lib/types/api';

	interface Props {
		book: BookCardData;
		onAddToWishlist?: (book: BookCardData) => void;
		onMarkComplete?: (book: BookCardData) => void;
		isInWishlist?: boolean;
		isCompleted?: boolean;
	}

	let {
		book,
		onAddToWishlist,
		onMarkComplete,
		isInWishlist = false,
		isCompleted = false
	}: Props = $props();
</script>

<Card class="overflow-hidden">
	<CardContent class="p-4">
		<div class="flex gap-4">
			<!-- Book Cover - Clickable -->
			<div class="flex-shrink-0">
				<BookCover
					coverUrl={book.cover_url}
					title={book.title}
					bookId={book.id}
					size="md"
					class="ring-1 ring-border/70"
				/>
			</div>

			<!-- Book Details -->
			<div class="flex flex-1 flex-col">
				<a href="/book/{book.id}">
					<h3 class="page-heading line-clamp-2 text-base transition-colors hover:text-primary">
						{book.title}
					</h3>
				</a>
				{#if book.authors && book.authors.length > 0}
					<p class="mt-1 text-sm text-muted-foreground">
						{book.authors.join(', ')}
					</p>
				{/if}
				{#if book.description}
					<p class="mt-2 line-clamp-3 text-xs text-foreground/80">
						{book.description}
					</p>
				{/if}

				<!-- Metadata -->
				<div class="mt-auto pt-3">
					<BookMetadata publishedDate={book.published_date} pageCount={book.page_count} />
				</div>

				<!-- Actions -->
				<div class="mt-3 flex gap-2">
					{#if onAddToWishlist}
						<Button
							size="sm"
							variant={isInWishlist ? 'secondary' : 'default'}
							onclick={(e) => {
								e.preventDefault();
								onAddToWishlist?.(book);
							}}
							disabled={isInWishlist || isCompleted}
							class="flex-1"
						>
							<BookMarked class="mr-1.5 h-3.5 w-3.5" />
							{isInWishlist ? 'In Wishlist' : 'Want to Read'}
						</Button>
					{/if}
					{#if onMarkComplete}
						<Button
							size="sm"
							variant={isCompleted ? 'secondary' : 'outline'}
							onclick={(e) => {
								e.preventDefault();
								onMarkComplete?.(book);
							}}
							disabled={isCompleted}
							class="flex-1"
						>
							<BookCheck class="mr-1.5 h-3.5 w-3.5" />
							{isCompleted ? 'Completed' : 'Mark Complete'}
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</CardContent>
</Card>
