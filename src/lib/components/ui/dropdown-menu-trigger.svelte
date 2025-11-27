<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = DropdownMenuPrimitive.TriggerProps & {
		class?: string;
		children?: Snippet;
	};

	let { children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Trigger>
