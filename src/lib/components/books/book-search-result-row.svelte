<script lang="ts">
	import { BookMarked } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import type { BookSearchResult } from '$lib/types/book-search';

	interface Props {
		book: BookSearchResult;
		showYear?: boolean;
		showSourceBadge?: boolean;
	}

	let { book, showYear = false, showSourceBadge = false }: Props = $props();
</script>

<div class="flex items-center gap-2 rounded-md border p-2">
	<div class="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
		{#if book.cover_url}
			<img src={book.cover_url} alt={book.title} class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<BookMarked class="h-4 w-4 text-muted-foreground" />
			</div>
		{/if}
	</div>
	<div class="min-w-0 flex-1">
		<p class="line-clamp-1 text-sm font-medium">{book.title}</p>
		{#if book.authors?.length}
			<p class="line-clamp-1 text-xs text-muted-foreground">{book.authors.join(', ')}</p>
		{/if}
		{#if showYear && book.first_publish_year}
			<p class="text-xs text-muted-foreground">{book.first_publish_year}</p>
		{/if}
		{#if showSourceBadge && book.source === 'database'}
			<Badge variant="outline" class="mt-1 text-[10px]">In Database</Badge>
		{/if}
	</div>
	<slot name="actions" {book} />
</div>
