<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BookMarked, Loader2 } from 'lucide-svelte';
	import type { Recommendation } from '$lib/types/recommendations';

	interface Props {
		books: Recommendation[];
		onAddToWishlist: (bookId: string) => void | Promise<void>;
		wishlistIds: Set<string>;
		addingToWishlist?: string | null;
	}

	let { books, onAddToWishlist, wishlistIds, addingToWishlist = null }: Props = $props();
	let currentIndex = $state(0);
	let touchStart = $state<number | null>(null);
	let touchEnd = $state<number | null>(null);
	let interval: ReturnType<typeof setInterval> | null = null;

	const currentBook = $derived(books[currentIndex]);
	const isInWishlist = $derived(
		currentBook ? wishlistIds.has(currentBook.google_books_id) : false
	);

	function startRotation() {
		stopRotation();
		if (!books.length) return;
		interval = setInterval(() => {
			currentIndex = (currentIndex + 1) % books.length;
		}, 10000);
	}

	function stopRotation() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

$effect(() => {
	const length = books.length;
	if (!length) {
		stopRotation();
		return;
	}

	startRotation();
	return () => stopRotation();
});

	onDestroy(stopRotation);

	function handleTouchStart(event: TouchEvent) {
		touchStart = event.touches[0]?.clientX ?? null;
	}

	function handleTouchMove(event: TouchEvent) {
		touchEnd = event.touches[0]?.clientX ?? null;
	}

	function handleTouchEnd() {
		if (!touchStart || !touchEnd) return;
		const distance = touchStart - touchEnd;
		const leftSwipe = distance > 50;
		const rightSwipe = distance < -50;

		if (leftSwipe) {
			currentIndex = (currentIndex + 1) % books.length;
		} else if (rightSwipe) {
			currentIndex = (currentIndex - 1 + books.length) % books.length;
		}

		touchStart = null;
		touchEnd = null;
	}

	function handleAdd(e: MouseEvent) {
		e.preventDefault();
		if (!currentBook || isInWishlist) return;
		onAddToWishlist(currentBook.google_books_id);
	}
</script>

{#if currentBook}
	<div
		class="relative"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		<div class="min-h-[280px] rounded-lg border bg-card p-4">
			<div class="flex gap-4">
				<a
					href={`/book/${currentBook.google_books_id}`}
					class="relative h-44 w-32 flex-shrink-0 overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-80"
				>
					{#if currentBook.cover_url}
						<img
							src={currentBook.cover_url}
							alt={`Cover of ${currentBook.title}`}
							class="h-full w-full object-cover"
							loading="lazy"
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<BookMarked class="h-12 w-12 text-muted-foreground" />
						</div>
					{/if}

					{#if isInWishlist}
						<div class="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
							<BookMarked class="h-3 w-3" />
						</div>
					{/if}
				</a>

				<div class="flex flex-1 flex-col">
					<a href={`/book/${currentBook.google_books_id}`}>
						<h3 class="font-semibold leading-tight transition-colors hover:text-primary line-clamp-2">
							{currentBook.title}
						</h3>
					</a>
					<p class="mt-1 text-sm text-muted-foreground">
						{currentBook.authors.join(', ')}
					</p>
					<p class="mt-2 text-sm italic text-primary/80 line-clamp-2">
						{currentBook.reason}
					</p>
					<p class="mt-2 text-xs text-muted-foreground line-clamp-3">
						{currentBook.blurb}
					</p>

					{#if !isInWishlist}
						<button
							type="button"
							onclick={handleAdd}
							disabled={addingToWishlist === currentBook.google_books_id}
							class="mt-auto flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{#if addingToWishlist === currentBook.google_books_id}
								<span class="flex items-center gap-2">
									<Loader2 class="h-4 w-4 animate-spin" />
									<span>Adding...</span>
								</span>
							{:else}
								<span class="flex items-center gap-2">
									<BookMarked class="h-4 w-4" />
									<span>Want to Read</span>
								</span>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>

		<div class="mt-3 flex justify-center gap-1.5">
			{#each books as _, index (index)}
				<button
					type="button"
					class={`h-1.5 rounded-full transition-all ${
						index === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
					}`}
					onclick={() => (currentIndex = index)}
					aria-label={`Go to recommendation ${index + 1}`}
				></button>
			{/each}
		</div>
	</div>
{/if}
