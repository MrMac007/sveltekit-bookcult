<script lang="ts">
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = AvatarPrimitive.FallbackProps & {
		class?: string;
	};

	let { class: className, ...restProps }: Props = $props();
</script>

<AvatarPrimitive.Fallback
	data-slot="avatar-fallback"
	class={cn('bg-muted flex size-full items-center justify-center rounded-full', className)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Fallback>
