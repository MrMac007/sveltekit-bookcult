<script lang="ts">
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = AvatarPrimitive.Props & {
		class?: string;
	};

	let { class: className, ...restProps }: Props = $props();
</script>

<AvatarPrimitive.Root
	data-slot="avatar"
	class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Root>
