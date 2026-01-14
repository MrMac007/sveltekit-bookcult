<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { BookMarked, BookOpen, BookCheck, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { BookCardData } from '$lib/types/api';
	import type { User } from '@supabase/supabase-js';
	import MarkCompleteDialog from './mark-complete-dialog.svelte';

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
	let showCompleteDialog = $state(false);

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
	 * Build API request body - handles both existing books (by UUID) and new books (by Open Library key)
	 */
	function buildApiRequestBody(listType: 'wishlist' | 'reading' | 'completed', completedAt?: string) {
		const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id);

		if (isUUID) {
			// Book already in DB, use bookId directly
			return { bookId: book.id, listType, completedAt };
		}

		// New book - provide workKey + bookData for creation
		return {
			workKey: book.open_library_key || book.id,
			listType,
			completedAt,
			bookData: {
				title: book.title,
				authors: book.authors || [],
				coverUrl: book.cover_url || undefined
			}
		};
	}

	async function handleAddToWishlist() {
		if (addingToWishlist || localIsInWishlist || localIsCompleted) return;

		addingToWishlist = true;
		try {
			const response = await fetch('/api/books/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildApiRequestBody('wishlist'))
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to add to wishlist');
			}

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
				const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id);
				if (!isUUID) {
					throw new Error('Cannot stop reading a book not in database');
				}

				const response = await fetch('/api/books/remove', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ bookId: book.id, listType: 'reading' })
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to stop reading');
				}

				localIsCurrentlyReading = false;
				toast.success('Stopped reading');
			} else {
				// Add to currently reading
				const response = await fetch('/api/books/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(buildApiRequestBody('reading'))
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to start reading');
				}

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

	function openCompleteDialog() {
		if (localIsCompleted) return;
		showCompleteDialog = true;
	}

	async function handleMarkComplete(completedAt: string) {
		if (markingComplete || localIsCompleted) return;

		markingComplete = true;
		showCompleteDialog = false;
		try {
			const response = await fetch('/api/books/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildApiRequestBody('completed', completedAt))
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to mark as complete');
			}

			localIsCompleted = true;
			localIsInWishlist = false;
			localIsCurrentlyReading = false;
			onStatusChange?.();

			// Redirect to rating page
			goto(`/rate/${result.bookId}`);
		} catch (err) {
			console.error('Error marking as complete:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to mark as complete');
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
			onclick={openCompleteDialog}
			disabled={markingComplete}
			class="flex-1"
		>
			{#if markingComplete}
				<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
				Completing...
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

<MarkCompleteDialog
	bind:open={showCompleteDialog}
	bookTitle={book.title}
	isSubmitting={markingComplete}
	onConfirm={handleMarkComplete}
/>
