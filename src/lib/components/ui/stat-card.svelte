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

{#if href}
	<a {href} class="block">
		<Card class="transition-all hover:shadow-md {className}">
			<CardContent class="pt-6 text-center">
				{#if Icon}
					<Icon class="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
				{/if}
				{#if children}
					{@render children()}
				{:else}
					<p class="page-heading text-lg sm:text-xl">{value}</p>
					<p class="meta-label mt-1 text-xs sm:text-sm">{label}</p>
				{/if}
			</CardContent>
		</Card>
	</a>
{:else}
	<Card class="transition-all hover:shadow-md {className}">
		<CardContent class="pt-6 text-center">
			{#if Icon}
				<Icon class="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
			{/if}
			{#if children}
				{@render children()}
			{:else}
				<p class="page-heading text-lg sm:text-xl">{value}</p>
				<p class="meta-label mt-1 text-xs sm:text-sm">{label}</p>
			{/if}
		</CardContent>
	</Card>
{/if}
