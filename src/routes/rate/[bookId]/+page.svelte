<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import RatingForm from '$lib/components/books/rating-form.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title="Rate Book">
	<div class="mx-auto max-w-2xl px-4 py-6">
		<RatingForm
			book={data.book}
			existingRating={data.existingRating?.rating}
			existingReview={data.existingRating?.review}
			existingCompletionDate={data.existingCompletionDate}
		/>
	</div>
</AppLayout>
