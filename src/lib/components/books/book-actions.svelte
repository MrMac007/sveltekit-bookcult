<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { BookMarked, BookOpen, BookCheck, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { BookCardData } from '$lib/types/api';
	import type { User } from '@supabase/supabase-js';
	import { addBookToList, ensureBookExists, removeBookFromList } from '$lib/api/books-client';
	import { isValidUUID } from '$lib/utils/validation';

	interface Props {
		user: User;
		book: BookCardData;
		isInWishlist?: boolean;
		isCompleted?: boolean;
		isCurrentlyReading?: boolean;
		onStatusChange?: () => void;
		class?: string;
		layout?: 'horizontal' | 'vertical';
	}

	let {
		user,
		book,
		isInWishlist = false,
		isCompleted = false,
		isCurrentlyReading = false,
		onStatusChange,
		class: className = '',
		layout = 'horizontal'
	}: Props = $props();

	let addingToWishlist = $state(false);
	let togglingReading = $state(false);
	let markingComplete = $state(false);

	// Local state mirrors
	let localIsInWishlist = $state(isInWishlist);
	let localIsCurrentlyReading = $state(isCurrentlyReading);
	let localIsCompleted = $state(isCompleted);

	// Sync external props to local state
	$effect(() => {
		localIsInWishlist = isInWishlist;
		localIsCurrentlyReading = isCurrentlyReading;
		localIsCompleted = isCompleted;
	});

	/**
	 * Check if the book is already stored in the database
	 */
	const isBookInDb = (id: string) => isValidUUID(id);

	async function handleAddToWishlist() {
		if (addingToWishlist || localIsInWishlist || localIsCompleted) return;

		addingToWishlist = true;
		try {
			await addBookToList(book, 'wishlist');

			localIsInWishlist = true;
			toast.success('Added to wishlist');
			onStatusChange?.();
		} catch (err) {
			console.error('Error adding to wishlist:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to add to wishlist');
		} finally {
			addingToWishlist = false;
		}
	}

	async function handleToggleReading() {
		if (togglingReading || localIsCompleted) return;

		togglingReading = true;
		try {
			if (localIsCurrentlyReading) {
				// Remove from currently reading - need book ID
				if (!isBookInDb(book.id)) {
					throw new Error('Cannot stop reading a book not in database');
				}
				await removeBookFromList(book.id, 'reading');

				localIsCurrentlyReading = false;
				toast.success('Stopped reading');
			} else {
				// Add to currently reading
				await addBookToList(book, 'reading');

				localIsCurrentlyReading = true;
				toast.success('Started reading');
			}

			onStatusChange?.();
		} catch (err) {
			console.error('Error toggling reading status:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to update reading status');
		} finally {
			togglingReading = false;
		}
	}

	async function handleMarkComplete() {
		if (markingComplete || localIsCompleted) return;

		markingComplete = true;
		try {
			const bookId = await ensureBookExists(book);

			// Go to rating page where user can set date and rating
			goto(`/rate/${bookId}`);
		} catch (err) {
			console.error('Error navigating to rating page:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to open rating page');
			markingComplete = false;
		}
	}

	const layoutClasses = layout === 'vertical' ? 'flex-col' : 'flex-row';
</script>

<div class="flex gap-2 {layoutClasses} {className}">
	<!-- Want to Read Button -->
	{#if !localIsInWishlist && !localIsCompleted}
		<Button
			size="sm"
			variant="default"
			onclick={handleAddToWishlist}
			disabled={addingToWishlist}
			class="flex-1"
		>
			{#if addingToWishlist}
				<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
				Adding...
			{:else}
				<BookMarked class="mr-1.5 h-3.5 w-3.5" />
				Want to Read
			{/if}
		</Button>
	{:else if localIsInWishlist && !localIsCompleted}
		<Button size="sm" variant="secondary" disabled class="flex-1">
			<BookMarked class="mr-1.5 h-3.5 w-3.5" />
			In Wishlist
		</Button>
	{/if}

	<!-- Mark as Reading Button -->
	{#if !localIsCompleted}
		<Button
			size="sm"
			variant={localIsCurrentlyReading ? 'secondary' : 'outline'}
			onclick={handleToggleReading}
			disabled={togglingReading}
			class="flex-1"
		>
			{#if togglingReading}
				<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
				{localIsCurrentlyReading ? 'Stopping...' : 'Starting...'}
			{:else if localIsCurrentlyReading}
				<BookOpen class="mr-1.5 h-3.5 w-3.5" />
				Currently Reading
			{:else}
				<BookOpen class="mr-1.5 h-3.5 w-3.5" />
				Mark as Reading
			{/if}
		</Button>
	{/if}

	<!-- Mark as Complete Button -->
	{#if !localIsCompleted}
		<Button
			size="sm"
			variant="outline"
			onclick={handleMarkComplete}
			disabled={markingComplete}
			class="flex-1"
		>
			{#if markingComplete}
				<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
				Loading...
			{:else}
				<BookCheck class="mr-1.5 h-3.5 w-3.5" />
				Mark as Complete
			{/if}
		</Button>
	{:else}
		<Button size="sm" variant="secondary" disabled class="flex-1">
			<BookCheck class="mr-1.5 h-3.5 w-3.5" />
			Completed
		</Button>
	{/if}
</div>
