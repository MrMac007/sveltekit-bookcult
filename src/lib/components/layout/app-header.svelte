<script lang="ts">
	import { BookOpen } from 'lucide-svelte';

	interface Props {
		title?: string;
		showLogo?: boolean;
	}

	let { title = 'BookCult', showLogo = true }: Props = $props();
</script>

<header
	class="sticky top-0 z-40 border-b border-border/40 bg-gradient-to-b from-background/95 via-background/95 to-background/80 backdrop-blur-xl safe-top"
>
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<div class="flex items-center gap-3">
			{#if showLogo}
				<a href="/discover" class="flex items-center gap-3">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20"
					>
						<BookOpen class="h-4 w-4 text-primary" />
					</div>
					<div class="flex flex-col">
						<span class="brand-title">{title}</span>
					</div>
				</a>
			{:else}
				<h1 class="page-heading text-base">{title}</h1>
			{/if}
		</div>
	</div>
</header>
