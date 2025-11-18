<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

	interface Props {
		variant?: BadgeVariant;
		class?: string;
		children?: Snippet;
		href?: string;
	}

	let { variant = 'default', class: className, children, href, ...restProps }: Props = $props();

	const variantClasses = {
		default:
			'border-transparent bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100/80 [a&]:hover:bg-emerald-100/80',
		secondary:
			'border-transparent bg-accent text-accent-foreground/90 ring-1 ring-accent/60 [a&]:hover:bg-accent/80',
		destructive:
			'border-transparent bg-rose-50 text-rose-900 ring-1 ring-rose-100 [a&]:hover:bg-rose-100/80',
		outline:
			'border-border/70 bg-card/60 text-muted-foreground [a&]:hover:border-primary/60 [a&]:hover:text-foreground'
	};

	const baseClasses =
		'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';
</script>

{#if href}
	<a
		{href}
		data-slot="badge"
		class={cn(baseClasses, variantClasses[variant], className)}
		{...restProps}
	>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<span data-slot="badge" class={cn(baseClasses, variantClasses[variant], className)} {...restProps}>
		{#if children}
			{@render children()}
		{/if}
	</span>
{/if}
