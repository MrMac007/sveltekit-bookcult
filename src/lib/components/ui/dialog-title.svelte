<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = DialogPrimitive.TitleProps & {
		class?: string;
	};

	let { class: className, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Title
	data-slot="dialog-title"
	class={cn('text-lg leading-none font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Title>
