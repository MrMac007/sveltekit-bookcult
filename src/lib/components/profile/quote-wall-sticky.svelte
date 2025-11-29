<script lang="ts">
	import { cn } from '$lib/utils';

	interface QuoteWithBook {
		id: string;
		quote_text: string;
		page_number: number | null;
		book: {
			id: string;
			title: string;
			authors: string[];
			cover_url: string | null;
		};
	}

	interface FavoriteBookWithDetails {
		id: string;
		display_order: number;
		book: {
			id: string;
			title: string;
			authors: string[];
			cover_url: string | null;
		};
	}

	interface Props {
		quotes: QuoteWithBook[];
		favoriteBooks: FavoriteBookWithDetails[];
		class?: string;
	}

	let { quotes, favoriteBooks, class: className }: Props = $props();

	// Sticky note color palette - warm paper tones
	const stickyColors = [
		'bg-amber-50 border-amber-200/60',
		'bg-rose-50 border-rose-200/60',
		'bg-sky-50 border-sky-200/60',
		'bg-lime-50 border-lime-200/60',
		'bg-violet-50 border-violet-200/60',
		'bg-orange-50 border-orange-200/60'
	];

	// Random-ish rotations for organic feel
	const rotations = [
		'-rotate-2',
		'rotate-1',
		'-rotate-1',
		'rotate-2',
		'-rotate-3',
		'rotate-3'
	];

	function getColorIndex(id: string): number {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = ((hash << 5) - hash) + id.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash) % stickyColors.length;
	}

	function getRotationIndex(id: string): number {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = ((hash << 3) + hash) + id.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash) % rotations.length;
	}
</script>

<div
	class={cn(
		'relative rounded-2xl p-6 overflow-hidden',
		'bg-gradient-to-br from-stone-100 via-amber-50/30 to-stone-100',
		'border border-stone-200/50',
		className
	)}
>
	<!-- Cork board texture overlay -->
	<div class="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg width=%2220%22 height=%2220%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 0h20v20H0z%22 fill=%22%23000%22/%3E%3Cpath d=%22M10 0v20M0 10h20%22 stroke=%22%23fff%22 stroke-width=%22.5%22/%3E%3C/svg%3E')]"></div>

	<!-- Favorite Books as Polaroids -->
	{#if favoriteBooks.length > 0}
		<div class="mb-6 flex flex-wrap justify-center gap-4">
			{#each favoriteBooks as fav, i (fav.id)}
				{@const rotation = i === 0 ? '-rotate-3' : i === 1 ? 'rotate-1' : 'rotate-2'}
				<a
					href="/book/{fav.book.id}"
					class={cn(
						'group relative flex-shrink-0 transition-transform duration-200 hover:scale-105 hover:z-10',
						rotation
					)}
				>
					<!-- Polaroid frame -->
					<div class="bg-white p-2 pb-8 shadow-lg rounded-sm border border-stone-200/80">
						<div class="relative h-24 w-16 sm:h-28 sm:w-20 overflow-hidden bg-stone-100">
							{#if fav.book.cover_url}
								<img
									src={fav.book.cover_url}
									alt={fav.book.title}
									class="h-full w-full object-cover"
								/>
							{:else}
								<div class="flex h-full w-full items-center justify-center text-stone-300">
									<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
										<path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6zm0 2h12v12H6V6z"/>
									</svg>
								</div>
							{/if}
						</div>
						<!-- Handwritten label -->
						<p class="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-medium text-stone-500 truncate px-1" style="font-family: 'Caveat', cursive, system-ui;">
							{fav.book.title}
						</p>
					</div>
					<!-- Push pin -->
					<div class="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-red-400 shadow-sm border border-red-500/30"></div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Quotes as Sticky Notes -->
	{#if quotes.length > 0}
		<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
			{#each quotes as quote (quote.id)}
				{@const colorClass = stickyColors[getColorIndex(quote.id)]}
				{@const rotationClass = rotations[getRotationIndex(quote.id)]}
				<div
					class={cn(
						'relative p-4 rounded-sm shadow-md transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg hover:z-10',
						'border-t-4',
						colorClass,
						rotationClass
					)}
				>
					<!-- Tape effect at top -->
					<div class="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-amber-100/80 rounded-sm shadow-sm border border-amber-200/50 opacity-60"></div>
					
					<blockquote class="text-sm text-stone-700 leading-relaxed" style="font-family: 'Caveat', cursive, system-ui; font-size: 1.1rem;">
						"{quote.quote_text}"
					</blockquote>
					<footer class="mt-3 pt-2 border-t border-stone-200/50">
						<a href="/book/{quote.book.id}" class="text-xs text-stone-500 hover:text-stone-700 transition-colors line-clamp-1">
							— {quote.book.title}
						</a>
						{#if quote.page_number}
							<span class="text-xs text-stone-400 ml-1">p.{quote.page_number}</span>
						{/if}
					</footer>
				</div>
			{/each}
		</div>
	{/if}

	{#if quotes.length === 0 && favoriteBooks.length === 0}
		<div class="text-center py-8">
			<p class="text-stone-400 text-sm">No quotes or favorites yet</p>
		</div>
	{/if}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap');
</style>

