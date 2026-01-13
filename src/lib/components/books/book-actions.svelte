<script lang="ts">
	import { goto } from '$app/navigation';
	import { createClient } from '$lib/supabase/client';
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

	const supabase = createClient();

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
	 * Ensure book exists in database and return its database ID
	 */
	async function ensureBookInDb(): Promise<string | null> {
		// If the book ID is already a UUID, it's in the database
		const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id);
		if (isUUID) {
			return book.id;
		}

		// Try to find by open_library_key first
		if (book.open_library_key) {
			const { data: existing } = await supabase
				.from('books')
				.select('id')
				.eq('open_library_key', book.open_library_key)
				.single();

			if (existing) {
				return (existing as { id: string }).id;
			}
		}

		// Try to find by google_books_id (legacy support)
		if (book.google_books_id) {
			const { data: existing } = await supabase
				.from('books')
				.select('id')
				.eq('google_books_id', book.google_books_id)
				.single();

			if (existing) {
				return (existing as { id: string }).id;
			}
		}

		// Fetch the book from our API to create it in the database (uses Open Library)
		const bookKey = book.open_library_key || book.id;
		const response = await fetch(`/api/books/fetch?id=${bookKey}`);
		if (!response.ok) {
			const payload = await response.json();
			throw new Error(payload.error || 'Unable to fetch book');
		}
		const payload = await response.json();
		return payload.id;
	}

	async function handleAddToWishlist() {
		if (addingToWishlist || localIsInWishlist || localIsCompleted) return;

		addingToWishlist = true;
		try {
			const dbBookId = await ensureBookInDb();
			if (!dbBookId) {
				throw new Error('Failed to find or create book');
			}

			const { error } = await supabase.from('wishlists').insert({
				user_id: user.id,
				book_id: dbBookId
			} as any);

			if (error) {
				if (error.code === '23505') {
					// Already in wishlist
					localIsInWishlist = true;
					toast.info('Already in your wishlist');
					return;
				}
				throw error;
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
			const dbBookId = await ensureBookInDb();
			if (!dbBookId) {
				throw new Error('Failed to find or create book');
			}

			if (localIsCurrentlyReading) {
				// Remove from currently reading
				const { error } = await supabase
					.from('currently_reading')
					.delete()
					.eq('user_id', user.id)
					.eq('book_id', dbBookId);

				if (error) throw error;

				localIsCurrentlyReading = false;
				toast.success('Stopped reading');
			} else {
				// Add to currently reading
				const { error } = await supabase.from('currently_reading').insert({
					user_id: user.id,
					book_id: dbBookId
				} as any);

				if (error) {
					if (error.code === '23505') {
						localIsCurrentlyReading = true;
						toast.info('Already reading this book');
						return;
					}
					throw error;
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
			const dbBookId = await ensureBookInDb();
			if (!dbBookId) {
				throw new Error('Failed to find or create book');
			}

			// Remove from wishlist if present
			await supabase.from('wishlists').delete().eq('user_id', user.id).eq('book_id', dbBookId);

			// Remove from currently reading if present
			await supabase
				.from('currently_reading')
				.delete()
				.eq('user_id', user.id)
				.eq('book_id', dbBookId);

			// Add to completed books with the selected date
			const { error } = await supabase.from('completed_books').insert({
				user_id: user.id,
				book_id: dbBookId,
				completed_at: completedAt,
				date_confirmed: true
			} as any);

			if (error) {
				if (error.code === '23505') {
					// Already completed, redirect to rate
					goto(`/rate/${dbBookId}`);
					return;
				}
				throw error;
			}

			localIsCompleted = true;
			localIsInWishlist = false;
			localIsCurrentlyReading = false;
			onStatusChange?.();

			// Redirect to rating page
			goto(`/rate/${dbBookId}`);
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
