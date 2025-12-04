<script lang="ts">
	import { BookMarked } from 'lucide-svelte';
	import type { Recommendation } from '$lib/types/recommendations';

	interface Props {
		book: Recommendation;
		onAddToWishlist: (bookId: string) => void | Promise<void>;
		isInWishlist?: boolean;
	}

	let { book, onAddToWishlist, isInWishlist = false }: Props = $props();

	function handleAdd(e: MouseEvent) {
		e.preventDefault();
		if (isInWishlist) return;
		onAddToWishlist(book.open_library_key);
	}
</script>

<div class="flex h-full w-full flex-col">
	<a
		href={`/book/${book.open_library_key}`}
		class="group relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted transition-transform hover:scale-[1.02]"
	>
		{#if book.cover_url}
			<img src={book.cover_url} alt={`Cover of ${book.title}`} class="h-full w-full object-cover" loading="lazy" />
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<BookMarked class="h-12 w-12 text-muted-foreground" />
			</div>
		{/if}

		{#if isInWishlist}
			<div class="absolute right-2 top-2 rounded-full bg-primary p-1.5 text-primary-foreground">
				<BookMarked class="h-3.5 w-3.5" />
			</div>
		{/if}
	</a>

	<a href={`/book/${book.open_library_key}`} class="mt-3 flex flex-1 flex-col">
		<h3 class="text-sm font-semibold leading-tight line-clamp-3 transition-colors group-hover:text-primary">
			{book.title}
		</h3>
		<p class="mt-1.5 text-xs text-muted-foreground line-clamp-1">
			{book.authors.join(', ')}
		</p>
		<p class="mt-2 text-xs italic text-primary/70 line-clamp-3 leading-snug">
			{book.reason}
		</p>
	</a>

	<button
		type="button"
		onclick={handleAdd}
		disabled={isInWishlist}
		class={`mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
			isInWishlist
				? 'cursor-not-allowed bg-muted text-muted-foreground'
				: 'bg-primary text-primary-foreground hover:bg-primary/90'
		}`}
	>
		<BookMarked class="h-3.5 w-3.5" />
		<span>{isInWishlist ? 'In Wishlist' : 'Want to Read'}</span>
	</button>
</div>
