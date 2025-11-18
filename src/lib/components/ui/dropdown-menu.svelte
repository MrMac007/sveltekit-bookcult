<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.Props;

	let { ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Root>
