<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = TabsPrimitive.ContentProps & {
		class?: string;
		children: Snippet;
	};

	let { class: className, children, ...restProps }: Props = $props();
</script>

<TabsPrimitive.Content
	data-slot="tabs-content"
	class={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
	{...restProps}
>
	{@render children()}
</TabsPrimitive.Content>
