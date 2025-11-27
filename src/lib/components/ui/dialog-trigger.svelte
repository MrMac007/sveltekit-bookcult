<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = DialogPrimitive.TriggerProps & {
		class?: string;
		children?: Snippet;
	};

	let { children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Trigger data-slot="dialog-trigger" {...restProps}>
	{@render children?.()}
</DialogPrimitive.Trigger>
