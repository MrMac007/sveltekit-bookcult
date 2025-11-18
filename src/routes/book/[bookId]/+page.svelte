<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import BookDetail from '$lib/components/books/book-detail.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title={data.book.title} showLogo={false}>
	<div class="mx-auto max-w-2xl px-4 py-6">
		<BookDetail
			book={data.book}
			isInWishlist={data.isInWishlist}
			isCurrentlyReading={data.isCurrentlyReading}
			isCompleted={data.isCompleted}
			userRating={data.userRating}
			groupRatings={data.groupRatings}
			showActions={true}
		/>
	</div>
</AppLayout>
