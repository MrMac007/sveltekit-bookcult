<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.TriggerProps & {
		class?: string;
	};

	let { ...restProps }: Props = $props();
</script>

<DialogPrimitive.Trigger data-slot="dialog-trigger" {...restProps}>
	{@render children?.()}
</DialogPrimitive.Trigger>
