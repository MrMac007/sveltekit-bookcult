<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = DropdownMenuPrimitive.Props & {
		children?: Snippet;
	};

	let { children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Root>
