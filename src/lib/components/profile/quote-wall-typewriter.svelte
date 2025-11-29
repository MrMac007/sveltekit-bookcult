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
</script>

<div
	class={cn(
		'relative rounded-2xl p-6 overflow-hidden',
		'bg-gradient-to-b from-amber-50 to-orange-50/50',
		'border border-amber-200/40',
		className
	)}
>
	<!-- Aged paper texture -->
	<div class="absolute inset-0 opacity-[0.08]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
	
	<!-- Typewriter header -->
	<div class="relative mb-6 text-center">
		<div class="inline-block border-b-2 border-amber-800/20 pb-1">
			<span class="font-mono text-xs tracking-[0.3em] text-amber-800/60 uppercase">Literary Collection</span>
		</div>
	</div>

	<!-- Favorite Books as Film Strip -->
	{#if favoriteBooks.length > 0}
		<div class="relative mb-8">
			<!-- Film strip container -->
			<div class="relative mx-auto max-w-md">
				<!-- Film perforations -->
				<div class="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2">
					{#each Array(4) as _, i}
						<div class="h-2 w-2 rounded-sm bg-amber-900/20"></div>
					{/each}
				</div>
				<div class="absolute right-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2">
					{#each Array(4) as _, i}
						<div class="h-2 w-2 rounded-sm bg-amber-900/20"></div>
					{/each}
				</div>
				
				<!-- Film strip frame -->
				<div class="bg-amber-900/10 border-y-4 border-amber-900/20 px-6 py-4">
					<div class="flex justify-center gap-4">
						{#each favoriteBooks as fav (fav.id)}
							<a
								href="/book/{fav.book.id}"
								class="group relative block transition-transform duration-200 hover:scale-105"
							>
								<div class="relative h-20 w-14 sm:h-24 sm:w-16 overflow-hidden bg-amber-100 border border-amber-800/30 shadow-inner">
									{#if fav.book.cover_url}
										<img
											src={fav.book.cover_url}
											alt={fav.book.title}
											class="h-full w-full object-cover sepia-[0.15] group-hover:sepia-0 transition-all duration-300"
										/>
									{:else}
										<div class="flex h-full w-full items-center justify-center text-amber-400">
											<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
												<path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6zm0 2h12v12H6V6z"/>
											</svg>
										</div>
									{/if}
								</div>
								<p class="mt-1 text-center font-mono text-[9px] text-amber-800/70 truncate max-w-16">
									{fav.book.title}
								</p>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Quotes as Typewriter Pages -->
	{#if quotes.length > 0}
		<div class="space-y-6">
			{#each quotes as quote, i (quote.id)}
				<div class="relative">
					<!-- Page shadow offset -->
					<div class="absolute inset-0 bg-amber-200/30 rounded translate-x-1 translate-y-1"></div>
					
					<!-- Main page -->
					<div class="relative bg-amber-50/90 border border-amber-200/60 rounded p-5 shadow-sm">
						<!-- Red margin line -->
						<div class="absolute left-8 sm:left-12 top-0 bottom-0 w-px bg-rose-300/40"></div>
						
						<!-- Hole punches -->
						<div class="absolute left-2 top-4 h-3 w-3 rounded-full border border-amber-300/50 bg-transparent"></div>
						<div class="absolute left-2 bottom-4 h-3 w-3 rounded-full border border-amber-300/50 bg-transparent"></div>
						
						<div class="pl-6 sm:pl-10">
							<blockquote class="font-mono text-sm leading-relaxed text-amber-900/80 tracking-wide">
								<span class="text-amber-800/40">"</span>{quote.quote_text}<span class="text-amber-800/40">"</span>
							</blockquote>
							<footer class="mt-4 flex items-baseline gap-2 font-mono text-xs">
								<span class="text-amber-600/70">—</span>
								<a href="/book/{quote.book.id}" class="text-amber-700/80 hover:text-amber-900 transition-colors underline decoration-amber-300/50 underline-offset-2">
									{quote.book.title}
								</a>
								{#if quote.book.authors.length > 0}
									<span class="text-amber-600/50">by {quote.book.authors[0]}</span>
								{/if}
								{#if quote.page_number}
									<span class="text-amber-500/60">[p.{quote.page_number}]</span>
								{/if}
							</footer>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if quotes.length === 0 && favoriteBooks.length === 0}
		<div class="text-center py-8 font-mono">
			<p class="text-amber-600/50 text-sm tracking-wide">[ No entries in this collection ]</p>
		</div>
	{/if}

	<!-- Typewriter footer flourish -->
	<div class="mt-6 text-center">
		<span class="font-mono text-xs text-amber-700/30">~ ❦ ~</span>
	</div>
</div>

