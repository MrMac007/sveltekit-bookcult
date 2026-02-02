<script lang="ts">
	import { BookMarked, Star } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';

	interface GroupReadingListBook {
		id: string;
		groupBookId?: string;
		title: string;
		authors: string[];
		cover_url: string | null;
	}

	interface Props {
		books: GroupReadingListBook[];
		currentBookId?: string | null;
		currentLabel?: string;
		class?: string;
	}

	let {
		books,
		currentBookId = null,
		currentLabel = 'Current',
		class: className = ''
	}: Props = $props();
</script>

<div class={`space-y-2 ${className}`.trim()}>
	{#each books as book (book.groupBookId ?? book.id)}
		<div class="flex items-center gap-2 rounded-lg border bg-card p-2">
			<div class="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
				{#if book.cover_url}
					<img src={book.cover_url} alt={book.title} class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center">
						<BookMarked class="h-4 w-4 text-muted-foreground" />
					</div>
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<a href="/book/{book.id}" class="line-clamp-1 text-sm font-medium hover:text-primary">
					{book.title}
				</a>
				{#if book.authors?.length}
					<p class="line-clamp-1 text-xs text-muted-foreground">
						{book.authors.join(', ')}
					</p>
				{/if}
				{#if currentBookId === book.id}
					<Badge variant="default" class="mt-1 text-xs">
						<Star class="mr-1 h-3 w-3" />
						{currentLabel}
					</Badge>
				{/if}
			</div>
			<div class="flex items-center gap-1">
				<slot name="actions" {book} />
			</div>
		</div>
	{/each}
</div>
