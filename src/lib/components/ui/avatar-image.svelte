<script lang="ts">
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = AvatarPrimitive.ImageProps & {
		class?: string;
	};

	let { class: className, ...restProps }: Props = $props();
</script>

<AvatarPrimitive.Image
	data-slot="avatar-image"
	class={cn('aspect-square size-full', className)}
	{...restProps}
/>
