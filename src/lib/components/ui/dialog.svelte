<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.Props;

	let { ...restProps }: Props = $props();
</script>

<DialogPrimitive.Root data-slot="dialog" {...restProps}>
	{@render children?.()}
</DialogPrimitive.Root>
