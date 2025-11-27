<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = DropdownMenuPrimitive.LabelProps & {
		class?: string;
		inset?: boolean;
		children?: Snippet;
	};

	let { class: className, inset, children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Label
	data-slot="dropdown-menu-label"
	data-inset={inset}
	class={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
	{...restProps}
>
	{@render children?.()}
</DropdownMenuPrimitive.Label>
