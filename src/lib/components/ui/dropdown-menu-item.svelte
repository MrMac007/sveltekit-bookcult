<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = DropdownMenuPrimitive.ItemProps & {
		class?: string;
		inset?: boolean;
		variant?: 'default' | 'destructive';
		children?: Snippet;
	};

	let { class: className, inset, variant = 'default', children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Item
	data-slot="dropdown-menu-item"
	data-inset={inset}
	data-variant={variant}
	class={cn(
		'focus:bg-accent/70 focus:text-accent-foreground data-[variant=destructive]:text-rose-600 data-[variant=destructive]:focus:bg-rose-50/80 [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</DropdownMenuPrimitive.Item>
