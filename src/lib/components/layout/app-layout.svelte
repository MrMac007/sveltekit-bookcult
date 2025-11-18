<script lang="ts">
	import AppHeader from './app-header.svelte';
	import BottomNav from './bottom-nav.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		title?: string;
		showLogo?: boolean;
	}

	let { children, title, showLogo = true }: Props = $props();
</script>

<div class="flex min-h-screen flex-col bg-background">
	<AppHeader {title} {showLogo} />
	<main class="flex-1 pb-20 pt-4">
		{@render children()}
	</main>
	<BottomNav />
</div>
