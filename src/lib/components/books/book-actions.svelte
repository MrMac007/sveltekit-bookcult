<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { BookMarked, BookOpen, BookCheck, Check } from 'lucide-svelte';

	interface Props {
		bookId: string;
		isInWishlist?: boolean;
		isCurrentlyReading?: boolean;
		isCompleted?: boolean;
		showCompleteButton?: boolean;
		layout?: 'horizontal' | 'vertical';
		class?: string;
	}

	let {
		bookId,
		isInWishlist = false,
		isCurrentlyReading = false,
		isCompleted = false,
		showCompleteButton = true,
		layout = 'horizontal',
		class: className = ''
	}: Props = $props();

	let isSubmitting = $state(false);
	let actionMessage = $state('');

	// Reactive values for optimistic UI updates
	let optimisticWishlist = $state(isInWishlist);
	let optimisticReading = $state(isCurrentlyReading);
	let optimisticCompleted = $state(isCompleted);

	// Update optimistic values when props change
	$effect(() => {
		optimisticWishlist = isInWishlist;
	});

	$effect(() => {
		optimisticReading = isCurrentlyReading;
	});

	$effect(() => {
		optimisticCompleted = isCompleted;
	});

	// Clear messages after 3 seconds
	$effect(() => {
		if (actionMessage) {
			const timer = setTimeout(() => {
				actionMessage = '';
			}, 3000);
			return () => clearTimeout(timer);
		}
	});

	const containerClass =
		layout === 'vertical' ? 'flex flex-col gap-3' : 'flex flex-col sm:flex-row gap-2 sm:gap-3';
</script>

<div class="{containerClass} {className}">
	{#if !optimisticCompleted}
		<!-- Wishlist Toggle Button -->
		<form
			method="POST"
			action={optimisticWishlist ? '?/removeFromWishlist' : '?/addToWishlist'}
			class={layout === 'vertical' ? 'w-full' : 'w-full sm:flex-1'}
			use:enhance={() => {
				isSubmitting = true;
				optimisticWishlist = !optimisticWishlist;
				return async ({ result, update }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success' && result.data) {
						if (result.data.message) {
							actionMessage = result.data.message;
						}
					}
				};
			}}
		>
			<Button
				type="submit"
				variant={optimisticWishlist ? 'outline' : 'default'}
				disabled={isSubmitting}
				class="w-full text-xs sm:text-sm"
			>
				<BookMarked class="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
				{#if optimisticWishlist}
					<span class="hidden sm:inline">Remove from Wishlist</span>
					<span class="sm:hidden">Remove</span>
				{:else}
					<span class="hidden sm:inline">Add to Wishlist</span>
					<span class="sm:hidden">Wishlist</span>
				{/if}
			</Button>
		</form>

		<!-- Start/Stop Reading Button -->
		<form
			method="POST"
			action={optimisticReading ? '?/stopReading' : '?/startReading'}
			class={layout === 'vertical' ? 'w-full' : 'w-full sm:flex-1'}
			use:enhance={() => {
				isSubmitting = true;
				optimisticReading = !optimisticReading;
				return async ({ result, update }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success' && result.data) {
						if (result.data.message) {
							actionMessage = result.data.message;
						}
					}
				};
			}}
		>
			<Button
				type="submit"
				variant="outline"
				disabled={isSubmitting}
				class="w-full text-xs sm:text-sm"
			>
				{#if optimisticReading}
					<Check class="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
					Reading
				{:else}
					<BookOpen class="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
					<span class="hidden sm:inline">Start Reading</span>
					<span class="sm:hidden">Reading</span>
				{/if}
			</Button>
		</form>
	{/if}

	<!-- Mark Complete Button -->
	{#if showCompleteButton}
		<form
			method="POST"
			action="?/markComplete"
			class={layout === 'vertical' ? 'w-full' : 'w-full sm:flex-1'}
			use:enhance={() => {
				isSubmitting = true;
				optimisticCompleted = true;
				return async ({ result, update }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success' && result.data) {
						if (result.data.message) {
							actionMessage = result.data.message;
						}
					}
				};
			}}
		>
			<Button
				type="submit"
				variant={optimisticCompleted ? 'secondary' : 'outline'}
				disabled={isSubmitting || optimisticCompleted}
				class="w-full text-xs sm:text-sm"
			>
				<BookCheck class="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
				{#if optimisticCompleted}
					Completed
				{:else}
					<span class="hidden sm:inline">Mark Complete</span>
					<span class="sm:hidden">Complete</span>
				{/if}
			</Button>
		</form>
	{/if}
</div>

<!-- Action Message Toast -->
{#if actionMessage}
	<div
		class="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
	>
		{actionMessage}
	</div>
{/if}
