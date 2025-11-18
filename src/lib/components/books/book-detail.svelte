<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { BookMarked, Star, Sparkles, Loader2, Tag, Calendar } from 'lucide-svelte';
	import { StarRating } from '$lib/components/ui/star-rating';
	import BookActions from './book-actions.svelte';
	import type { Database } from '$lib/types/database';

	type Book = Database['public']['Tables']['books']['Row'];
	type UserRating = {
		rating: number;
		review: string | null;
		created_at: string;
	};
	type GroupRating = {
		id: string;
		rating: number;
		review: string | null;
		created_at: string;
		profiles: {
			id: string;
			username: string | null;
			avatar_url: string | null;
		} | null;
	};

	interface Props {
		book: Book;
		isInWishlist?: boolean;
		isCurrentlyReading?: boolean;
		isCompleted?: boolean;
		userRating?: UserRating | null;
		groupRatings?: GroupRating[];
		showActions?: boolean;
		class?: string;
	}

	let {
		book,
		isInWishlist = false,
		isCurrentlyReading = false,
		isCompleted = false,
		userRating = null,
		groupRatings = [],
		showActions = true,
		class: className = ''
	}: Props = $props();

	let isEnhancing = $state(false);

	const formatDate = (dateString?: string) => {
		if (!dateString) return '';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	async function handleEnhance() {
		if (!book.id || isEnhancing) return;
		isEnhancing = true;
		try {
			const response = await fetch('/api/books/enhance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bookId: book.id }),
				credentials: 'same-origin'
			});
			const result = await response.json();
			if (response.ok && result.success) {
				window.location.reload();
			} else {
				console.error('Enhance error:', result.error);
				alert(result.error || 'Failed to enhance book');
			}
		} catch (error) {
			console.error('Error enhancing book:', error);
			alert('An unexpected error occurred. Please try again.');
		} finally {
			isEnhancing = false;
		}
	}
</script>

<div class={className}>
	<!-- Book Header -->
	<div class="mb-8 text-center">
		<!-- Book Cover -->
		<div class="relative mx-auto mb-4 h-60 w-40 overflow-hidden rounded-lg bg-muted">
			{#if book.cover_url}
				<img
					src={book.cover_url}
					alt="Cover of {book.title}"
					class="h-full w-full object-cover"
				/>
			{:else}
				<div class="flex h-full w-full items-center justify-center">
					<BookMarked class="h-16 w-16 text-muted-foreground" />
				</div>
			{/if}
		</div>

		<!-- Title and Author -->
		<h1 class="page-heading text-center text-2xl">{book.title}</h1>
		{#if book.authors && book.authors.length > 0}
			<p class="mt-2 text-lg text-muted-foreground">
				by {book.authors.join(', ')}
			</p>
		{/if}

		<!-- Publisher and Year -->
		<div class="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
			{#if book.publisher}
				<span>{book.publisher}</span>
			{/if}
			{#if book.published_date && book.publisher}
				<span>•</span>
			{/if}
			{#if book.published_date}
				<span>{new Date(book.published_date).getFullYear()}</span>
			{/if}
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="mb-6 grid grid-cols-3 gap-4">
		<!-- Categories Card -->
		<Card class="transition-all hover:shadow-md">
			<CardContent class="pt-6 text-center">
				<Tag class="mx-auto mb-2 h-6 w-6 text-primary" />
				{#if book.categories && book.categories.length > 0}
					<div class="mb-1 flex flex-wrap items-center justify-center gap-1">
						{#each book.categories as category}
							<Badge variant="secondary" class="text-xs">{category}</Badge>
						{/each}
					</div>
				{:else}
					<p class="text-2xl font-bold text-muted-foreground">—</p>
				{/if}
			</CardContent>
		</Card>

		<!-- Published Year Card -->
		<Card class="transition-all hover:shadow-md">
			<CardContent class="pt-6 text-center">
				<Calendar class="mx-auto mb-2 h-6 w-6 text-primary" />
				<p class="page-heading text-xl">
					{#if book.published_date}
						{new Date(book.published_date).getFullYear()}
					{:else}
						—
					{/if}
				</p>
				<p class="meta-label mt-1">Published</p>
			</CardContent>
		</Card>

		<!-- Ratings Card -->
		<Card class="transition-all hover:shadow-md">
			<CardContent class="pt-6 text-center">
				<Star class="mx-auto mb-2 h-6 w-6 text-primary" />
				<p class="page-heading text-xl">
					{userRating ? groupRatings.length + 1 : groupRatings.length}
				</p>
				<p class="meta-label mt-1">Ratings</p>
			</CardContent>
		</Card>
	</div>

	<!-- Action Buttons -->
	{#if showActions}
		<div class="mb-6">
			<BookActions
				bookId={book.id}
				{isInWishlist}
				{isCurrentlyReading}
				{isCompleted}
				showCompleteButton={true}
			/>
		</div>
	{/if}


	<!-- User's Rating -->
	{#if userRating}
		<Card class="mb-6">
			<CardContent class="pt-6">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold">Your Rating</h3>
					<a href="/rate/{book.id}" class="text-sm text-primary hover:underline"> Edit </a>
				</div>
				<div class="mt-3">
					<StarRating value={userRating.rating} readonly size="md" />
					{#if userRating.review}
						<p class="mt-3 text-sm text-foreground/80">{userRating.review}</p>
					{/if}
					<p class="mt-2 text-xs text-muted-foreground">
						Rated on {formatDate(userRating.created_at)}
					</p>
				</div>
			</CardContent>
		</Card>
	{:else if isCompleted}
		<div class="mb-6">
			<Button onclick={() => (window.location.href = `/rate/${book.id}`)} class="w-full">
				<Star class="mr-2 h-4 w-4" />
				Rate this Book
			</Button>
		</div>
	{/if}

	<!-- Book Details -->
	<Card class="mb-6">
		<CardContent class="space-y-4 pt-6">
			<div class="flex items-center justify-between">
				<h3 class="font-semibold">About this book</h3>
				{#if book.ai_enhanced}
					<Badge variant="secondary" class="gap-1.5">
						<Sparkles class="h-3 w-3" />
						AI Enhanced
					</Badge>
				{:else}
					<Button
						variant="outline"
						size="sm"
						class="gap-1.5"
						onclick={handleEnhance}
						disabled={isEnhancing}
					>
						{#if isEnhancing}
							<span class="flex items-center gap-1.5">
								<Loader2 class="h-3.5 w-3.5 animate-spin" />
								Enhancing...
							</span>
						{:else}
							<span class="flex items-center gap-1.5">
								<Sparkles class="h-3.5 w-3.5" />
								Enhance with AI
							</span>
						{/if}
					</Button>
				{/if}
			</div>

			{#if book.description}
				<div>
					<h3 class="mb-2 font-semibold">Description</h3>
					<p class="text-sm leading-relaxed text-foreground/80">
						{book.description}
					</p>
				</div>
			{/if}

			{#if book.page_count}
				<div>
					<h3 class="mb-2 font-semibold">Page Count</h3>
					<p class="text-sm text-foreground/80">{book.page_count} pages</p>
				</div>
			{/if}

			{#if book.isbn_13 || book.isbn_10}
				<div>
					<h3 class="mb-2 font-semibold">ISBN</h3>
					<div class="text-sm text-foreground/80">
						{#if book.isbn_13}
							<p>ISBN-13: {book.isbn_13}</p>
						{/if}
						{#if book.isbn_10}
							<p>ISBN-10: {book.isbn_10}</p>
						{/if}
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Group Ratings -->
	{#if groupRatings.length > 0}
		<Card>
			<CardContent class="pt-6">
				<h3 class="mb-4 font-semibold">Ratings from Your Groups</h3>
				<div class="space-y-4">
					{#each groupRatings as rating}
						<div class="border-b pb-4 last:border-b-0 last:pb-0">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<p class="text-sm font-medium">
											{rating.profiles?.username || 'Unknown User'}
										</p>
										<StarRating value={rating.rating} readonly size="sm" />
									</div>
									{#if rating.review}
										<p class="mt-2 text-sm text-foreground/80">
											{rating.review}
										</p>
									{/if}
									<p class="mt-1 text-xs text-muted-foreground">
										{formatDate(rating.created_at)}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
