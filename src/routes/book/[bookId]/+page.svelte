<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import BookDetail from '$lib/components/books/book-detail.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pageTitle = `${data.book.title} - BookCult`;
	const pageDescription = data.book.description
		? data.book.description.slice(0, 160) + (data.book.description.length > 160 ? '...' : '')
		: `${data.book.title} by ${data.book.authors?.join(', ') || 'Unknown Author'}`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={data.book.title} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="book" />
	{#if data.book.cover_url}
		<meta property="og:image" content={data.book.cover_url} />
	{/if}
	{#if data.book.authors?.length}
		<meta property="book:author" content={data.book.authors.join(', ')} />
	{/if}
	{#if data.book.isbn_13}
		<meta property="book:isbn" content={data.book.isbn_13} />
	{/if}
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.book.title} />
	<meta name="twitter:description" content={pageDescription} />
	{#if data.book.cover_url}
		<meta name="twitter:image" content={data.book.cover_url} />
	{/if}
</svelte:head>

<AppLayout title={data.book.title} showLogo={false}>
	<div class="mx-auto max-w-2xl px-4 py-6">
		<BookDetail
			book={data.book}
			user={data.user}
			isInWishlist={data.isInWishlist}
			isCurrentlyReading={data.isCurrentlyReading}
			isCompleted={data.isCompleted}
			userRating={data.userRating}
			groupRatings={data.groupRatings}
			showActions={true}
			showTitle={false}
		/>
	</div>
</AppLayout>
