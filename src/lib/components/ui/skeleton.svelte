<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
	}

	let { class: className, ...restProps }: Props = $props();
</script>

<div data-slot="skeleton" class={cn('bg-accent animate-pulse rounded-md', className)} {...restProps}></div>
