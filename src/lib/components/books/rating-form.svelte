<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { StarRating } from '$lib/components/ui/star-rating';
	import { BookMarked } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	interface Props {
		book: {
			id: string;
			title: string;
			authors: string[];
			cover_url?: string;
		};
		existingRating?: number;
		existingReview?: string;
	}

	let { book, existingRating, existingReview }: Props = $props();

	let rating = $state(existingRating || 0);
	let review = $state(existingReview || '');
	let isSubmitting = $state(false);
</script>

<div class="space-y-6">
	<!-- Book Info -->
	<Card>
		<CardContent class="pt-6">
			<div class="flex gap-4">
				<div class="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-md bg-muted">
					{#if book.cover_url}
						<img
							src={book.cover_url}
							alt={book.title}
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<BookMarked class="h-12 w-12 text-muted-foreground" />
						</div>
					{/if}
				</div>
				<div>
					<h1 class="text-xl font-bold">{book.title}</h1>
					{#if book.authors && book.authors.length > 0}
						<p class="mt-1 text-sm text-muted-foreground">
							by {book.authors.join(', ')}
						</p>
					{/if}
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Rating Form -->
	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ result, update }) => {
				await update();
				isSubmitting = false;
				if (result.type === 'success') {
					goto('/profile');
				}
			};
		}}
	>
		<input type="hidden" name="book_id" value={book.id} />
		<input type="hidden" name="rating" value={rating} />

		<Card>
			<CardHeader>
				<CardTitle>How would you rate this book?</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex justify-center">
					<StarRating
						value={rating}
						onchange={(newRating) => rating = newRating}
						size="lg"
					/>
				</div>

				<div class="space-y-2">
					<label for="review" class="text-sm font-medium">
						Write a review (optional)
					</label>
					<Textarea
						id="review"
						name="review"
						placeholder="Share your thoughts about this book..."
						bind:value={review}
						rows={5}
						class="resize-none"
					/>
				</div>
			</CardContent>
		</Card>

		<div class="flex gap-3">
			<Button
				type="button"
				variant="outline"
				onclick={() => window.history.back()}
				disabled={isSubmitting}
				class="flex-1"
			>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={isSubmitting || rating === 0}
				class="flex-1"
			>
				{isSubmitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
			</Button>
		</div>
	</form>
</div>
