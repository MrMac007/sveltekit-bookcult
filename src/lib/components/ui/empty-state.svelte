<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		title: string;
		message: string;
		actionText?: string;
		actionHref?: string;
		class?: string;
	}

	let { icon: Icon, title, message, actionText, actionHref, class: className = '' }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center {className}">
	<div
		class="mx-auto mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10"
	>
		<Icon class="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
	</div>
	<h2 class="mb-2 text-lg sm:text-xl font-semibold">{title}</h2>
	<p class="mb-4 text-sm text-muted-foreground">
		{message}
	</p>
	{#if actionText && actionHref}
		<Button href={actionHref} size="sm">
			{actionText}
		</Button>
	{/if}
</div>
