<script lang="ts">
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';

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

	// Generate stable pseudo-random positions based on ID
	function getPosition(id: string, index: number, total: number): { x: number; y: number } {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = ((hash << 5) - hash) + id.charCodeAt(i);
			hash |= 0;
		}
		// Distribute along a curved path
		const baseX = 10 + (index / Math.max(total - 1, 1)) * 80;
		const offsetX = (Math.abs(hash) % 15) - 7;
		const baseY = 20 + Math.sin((index / total) * Math.PI) * 30;
		const offsetY = (Math.abs(hash >> 8) % 20) - 10;
		return {
			x: Math.max(5, Math.min(95, baseX + offsetX)),
			y: Math.max(10, Math.min(90, baseY + offsetY))
		};
	}

	// Glow colors for variety
	const glowColors = [
		'from-cyan-400/20 to-blue-500/10',
		'from-violet-400/20 to-purple-500/10',
		'from-teal-400/20 to-emerald-500/10',
		'from-rose-400/20 to-pink-500/10',
		'from-amber-400/20 to-orange-500/10'
	];

	function getGlowColor(id: string): string {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = ((hash << 5) - hash) + id.charCodeAt(i);
		}
		return glowColors[Math.abs(hash) % glowColors.length];
	}
</script>

<div
	class={cn(
		'relative rounded-2xl p-6 overflow-hidden min-h-[400px]',
		'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
		'border border-indigo-500/20',
		className
	)}
>
	<!-- Star field background -->
	<div class="absolute inset-0 overflow-hidden">
		{#each Array(50) as _, i}
			{@const size = Math.random() > 0.9 ? 2 : 1}
			{@const opacity = 0.3 + Math.random() * 0.5}
			{@const delay = Math.random() * 3}
			<div
				class="absolute rounded-full bg-white animate-pulse"
				style="
					width: {size}px;
					height: {size}px;
					left: {Math.random() * 100}%;
					top: {Math.random() * 100}%;
					opacity: {opacity};
					animation-delay: {delay}s;
					animation-duration: {2 + Math.random() * 2}s;
				"
			></div>
		{/each}
	</div>

	<!-- Nebula glow effects -->
	<div class="absolute inset-0 pointer-events-none">
		<div class="absolute top-10 left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
		<div class="absolute bottom-20 right-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
	</div>

	<!-- Connecting lines (constellation effect) -->
	<svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 1;">
		<defs>
			<linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="rgba(129, 140, 248, 0.1)" />
				<stop offset="50%" stop-color="rgba(129, 140, 248, 0.25)" />
				<stop offset="100%" stop-color="rgba(129, 140, 248, 0.1)" />
			</linearGradient>
		</defs>
		<!-- Draw lines between adjacent quotes -->
		{#each quotes.slice(0, -1) as quote, i}
			{@const pos1 = getPosition(quote.id, i, quotes.length)}
			{@const pos2 = getPosition(quotes[i + 1].id, i + 1, quotes.length)}
			<line
				x1="{pos1.x}%"
				y1="{pos1.y}%"
				x2="{pos2.x}%"
				y2="{pos2.y}%"
				stroke="url(#lineGradient)"
				stroke-width="1"
				opacity="0.4"
			/>
		{/each}
	</svg>

	<!-- Favorite Books as Floating Stars/Planets -->
	{#if favoriteBooks.length > 0}
		<div class="relative z-10 mb-6 flex justify-center gap-6">
			{#each favoriteBooks as fav, i (fav.id)}
				{@const scale = i === 1 ? 'scale-110' : 'scale-100'}
				{@const glowClass = getGlowColor(fav.id)}
				<a
					href="/book/{fav.book.id}"
					class={cn(
						'group relative transition-all duration-300 hover:scale-110',
						scale
					)}
				>
					<!-- Orbital glow ring -->
					<div class={cn(
						'absolute -inset-3 rounded-full bg-gradient-to-br opacity-60 blur-md group-hover:opacity-100 transition-opacity',
						glowClass
					)}></div>
					
					<!-- Book cover as celestial body -->
					<div class="relative h-20 w-14 sm:h-24 sm:w-16 overflow-hidden rounded-lg border border-white/20 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-400/40 transition-shadow">
						{#if fav.book.cover_url}
							<img
								src={fav.book.cover_url}
								alt={fav.book.title}
								class="h-full w-full object-cover"
							/>
						{:else}
							<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-800 to-purple-900 text-indigo-300">
								<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
									<path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6zm0 2h12v12H6V6z"/>
								</svg>
							</div>
						{/if}
						<!-- Shine effect -->
						<div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					</div>
					
					<!-- Title label -->
					<p class="mt-2 text-center text-[10px] font-medium text-indigo-200/80 truncate max-w-16 group-hover:text-indigo-100 transition-colors">
						{fav.book.title}
					</p>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Quotes as Glowing Text Nodes -->
	{#if quotes.length > 0}
		<div class="relative z-10 grid gap-4 grid-cols-1 sm:grid-cols-2">
			{#each quotes as quote, i (quote.id)}
				{@const glowClass = getGlowColor(quote.id)}
				<div
					class="group relative p-4 rounded-xl backdrop-blur-sm transition-all duration-300 hover:backdrop-blur-md"
				>
					<!-- Background glow -->
					<div class={cn(
						'absolute inset-0 rounded-xl bg-gradient-to-br opacity-30 group-hover:opacity-50 transition-opacity',
						glowClass
					)}></div>
					
					<!-- Glass card -->
					<div class="relative bg-white/5 border border-white/10 rounded-xl p-4 group-hover:border-white/20 transition-colors">
						<!-- Star marker -->
						<div class="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50"></div>
						
						<blockquote class="text-sm text-indigo-100/90 leading-relaxed font-light">
							<span class="text-indigo-400/60">"</span>
							{quote.quote_text}
							<span class="text-indigo-400/60">"</span>
						</blockquote>
						<footer class="mt-3 pt-2 border-t border-white/5 flex items-center gap-2">
							<div class="w-1 h-1 rounded-full bg-cyan-400/60"></div>
							<a href="/book/{quote.book.id}" class="text-xs text-cyan-300/70 hover:text-cyan-200 transition-colors truncate">
								{quote.book.title}
							</a>
							{#if quote.page_number}
								<span class="text-xs text-indigo-400/40">p.{quote.page_number}</span>
							{/if}
						</footer>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if quotes.length === 0 && favoriteBooks.length === 0}
		<div class="relative z-10 text-center py-12">
			<div class="inline-block p-4 rounded-full bg-indigo-500/10 mb-4">
				<svg class="w-8 h-8 text-indigo-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
				</svg>
			</div>
			<p class="text-indigo-300/40 text-sm">A constellation waiting to be mapped</p>
		</div>
	{/if}
</div>

