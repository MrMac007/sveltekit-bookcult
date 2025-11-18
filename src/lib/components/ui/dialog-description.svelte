<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = DialogPrimitive.DescriptionProps & {
		class?: string;
	};

	let { class: className, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Description
	data-slot="dialog-description"
	class={cn('text-muted-foreground text-sm', className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Description>
