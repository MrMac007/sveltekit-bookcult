<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = DropdownMenuPrimitive.SeparatorProps & {
		class?: string;
	};

	let { class: className, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Separator
	data-slot="dropdown-menu-separator"
	class={cn('bg-border -mx-1 my-1 h-px', className)}
	{...restProps}
/>
