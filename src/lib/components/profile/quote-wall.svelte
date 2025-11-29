<script lang="ts">
	import { cn } from '$lib/utils';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Quote, Pencil, Sparkles } from 'lucide-svelte';
	import type { WallStyle } from '$lib/types/database';
	import QuoteWallSticky from './quote-wall-sticky.svelte';
	import QuoteWallTypewriter from './quote-wall-typewriter.svelte';
	import QuoteWallConstellation from './quote-wall-constellation.svelte';

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
		wallStyle: WallStyle;
		isEditable?: boolean;
		onEditClick?: () => void;
		class?: string;
	}

	let { 
		quotes, 
		favoriteBooks, 
		wallStyle, 
		isEditable = false, 
		onEditClick,
		class: className 
	}: Props = $props();

	const hasContent = quotes.length > 0 || favoriteBooks.length > 0;
</script>

<div class={cn('relative', className)}>
	<!-- Section Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Sparkles class="h-5 w-5 text-primary" />
			<h2 class="font-semibold">Quote Wall</h2>
		</div>
		{#if isEditable}
			<Button variant="ghost" size="sm" onclick={onEditClick}>
				<Pencil class="h-4 w-4 mr-1" />
				Edit
			</Button>
		{/if}
	</div>

	{#if !hasContent && !isEditable}
		<!-- Empty state for viewing others' profiles -->
		<Card>
			<CardContent class="py-8 text-center">
				<Quote class="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
				<p class="text-sm text-muted-foreground">No quotes or favorites shared yet</p>
			</CardContent>
		</Card>
	{:else if !hasContent && isEditable}
		<!-- Empty state with call to action for own profile -->
		<Card class="border-dashed">
			<CardContent class="py-8 text-center">
				<Quote class="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
				<h3 class="font-medium mb-1">Create your Quote Wall</h3>
				<p class="text-sm text-muted-foreground mb-4">
					Share your favorite quotes and books to give visitors a glimpse into your literary world
				</p>
				<Button variant="outline" onclick={onEditClick}>
					<Sparkles class="h-4 w-4 mr-2" />
					Get Started
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Render the appropriate style variant -->
		{#if wallStyle === 'sticky-notes'}
			<QuoteWallSticky {quotes} {favoriteBooks} />
		{:else if wallStyle === 'typewriter'}
			<QuoteWallTypewriter {quotes} {favoriteBooks} />
		{:else if wallStyle === 'constellation'}
			<QuoteWallConstellation {quotes} {favoriteBooks} />
		{:else}
			<!-- Fallback to sticky notes -->
			<QuoteWallSticky {quotes} {favoriteBooks} />
		{/if}
	{/if}
</div>

