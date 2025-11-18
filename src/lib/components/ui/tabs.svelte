<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	};

	let { class: className, children, ...restProps }: Props = $props();
</script>

<TabsPrimitive.Root
	data-slot="tabs"
	class={cn('flex flex-col gap-2', className)}
	{...restProps}
>
	{@render children()}
</TabsPrimitive.Root>
