<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import type { ComponentType, Snippet } from 'svelte';

	interface Props {
		icon?: ComponentType;
		value: string | number;
		label: string;
		href?: string;
		class?: string;
		children?: Snippet;
	}

	let { icon: Icon, value, label, href, class: className = '', children }: Props = $props();
</script>

{#snippet cardInner()}
	<CardContent class="flex h-full flex-col items-center justify-center pt-6 text-center">
		{#if Icon}
			<Icon class="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
		{/if}
		{#if children}
			{@render children()}
		{:else}
			<div class="w-full min-w-0">
				<p class="page-heading truncate text-lg sm:text-xl">{value}</p>
				<p class="meta-label mt-1 truncate text-xs sm:text-sm">{label}</p>
			</div>
		{/if}
	</CardContent>
{/snippet}

{#if href}
	<a {href} class="block h-full">
		<Card class="h-full transition-all hover:shadow-md {className}">
			{@render cardInner()}
		</Card>
	</a>
{:else}
	<Card class="h-full transition-all hover:shadow-md {className}">
		{@render cardInner()}
	</Card>
{/if}
