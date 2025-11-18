<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import BookSearch from '$lib/components/books/book-search.svelte';
	import RecommendationsSection from '$lib/components/books/recommendations-section.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout>
	<div class="mx-auto max-w-5xl px-4 py-6">
		<!-- Welcome Section -->
		<div class="mb-6 space-y-1">
			<h1 class="page-heading">
				Welcome, {data.profile?.display_name || data.profile?.username}
			</h1>
			<p class="text-sm text-muted-foreground">
				<span class="meta-label">Discover worlds you might love</span>
			</p>
		</div>

		<!-- Book Search -->
		<div class="mb-8">
			<BookSearch userId={data.userId} />
		</div>

		<RecommendationsSection userId={data.userId} />
	</div>
</AppLayout>
