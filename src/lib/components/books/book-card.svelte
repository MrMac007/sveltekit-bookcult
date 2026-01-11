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
		showSource?: boolean;
	}

	let {
		book,
		onAddToWishlist,
		onMarkComplete,
		isInWishlist = false,
		isCompleted = false,
		showSource = false
	}: Props = $props();

	// Determine source for display
	const displaySource = $derived(() => {
		if (book.source) return book.source;
		// Infer from available IDs if source not set
		if (book.open_library_key && !book.google_books_id) return 'openlib';
		if (book.google_books_id && !book.open_library_key) return 'google';
		return 'database';
	});

	const sourceLabel = $derived(() => {
		const src = displaySource();
		switch (src) {
			case 'openlib': return 'Open Library';
			case 'google': return 'Google Books';
			case 'database': return 'Database';
			default: return src;
		}
	});

	const sourceColor = $derived(() => {
		const src = displaySource();
		switch (src) {
			case 'openlib': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
			case 'google': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
			case 'database': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
			default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
		}
	});
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
				<div class="flex items-start justify-between gap-2">
					<a href="/book/{book.id}" class="flex-1" data-sveltekit-preload-data="off">
						<h3 class="page-heading line-clamp-2 text-base transition-colors hover:text-primary">
							{book.title}
						</h3>
					</a>
					{#if showSource}
						<span class="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide {sourceColor()}">
							{sourceLabel()}
						</span>
					{/if}
				</div>
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
