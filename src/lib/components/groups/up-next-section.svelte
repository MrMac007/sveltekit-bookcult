<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { BookMarked, GripVertical, Save, Check } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	interface Book {
		id?: string;
		groupBookId?: string;
		google_books_id?: string | null;
		title?: string;
		authors?: string[] | null;
		cover_url?: string | null;
		description?: string | null;
		published_date?: string | null;
		page_count?: number | null;
		displayOrder: number | null;
		addedAt?: string;
	}

	interface Props {
		books: Book[];
		isAdmin: boolean;
		groupId: string;
	}

	let { books, isAdmin, groupId }: Props = $props();

	let sortedBooks = $state([...books]);
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let isSaving = $state(false);
	let hasUnsavedChanges = $state(false);
	let justSaved = $state(false);
	let originalOrder = $state<string[]>(books.map(b => b.groupBookId).filter((id): id is string => !!id));

	// Update sortedBooks when books prop changes from server
	$effect(() => {
		if (draggedIndex === null && !isSaving) {
			// Check if the book IDs have changed (not just reordered)
			const currentIds = books.map(b => b.groupBookId).filter(Boolean).sort().join(',');
			const sortedIds = sortedBooks.map(b => b.groupBookId).filter(Boolean).sort().join(',');
			
			// Only update if books were added/removed, not if just reordered
			if (currentIds !== sortedIds) {
				sortedBooks = [...books];
				originalOrder = books.map(b => b.groupBookId).filter((id): id is string => !!id);
				hasUnsavedChanges = false;
			}
		}
	});

	function handleDragStart(event: DragEvent, index: number) {
		if (!isAdmin) return;
		draggedIndex = index;
		dragOverIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (!isAdmin || draggedIndex === null) return;

		if (dragOverIndex !== index) {
			// Visually reorder as we drag over different positions
			const newBooks = [...sortedBooks];
			const draggedBook = newBooks[draggedIndex];
			newBooks.splice(draggedIndex, 1);
			newBooks.splice(index, 0, draggedBook);
			sortedBooks = newBooks;
			draggedIndex = index; // Update dragged index to new position
		}
		
		dragOverIndex = index;
	}

	function handleDrop(event: DragEvent, index: number) {
		event.preventDefault();
		if (!isAdmin || draggedIndex === null) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		// Check if order actually changed
		const currentOrder = sortedBooks.map(b => b.groupBookId).join(',');
		const original = originalOrder.join(',');
		hasUnsavedChanges = currentOrder !== original;

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	async function handleSave() {
		if (!hasUnsavedChanges || isSaving) return;
		
		isSaving = true;
		justSaved = false;

		const bookOrders = sortedBooks.map((book, index) => ({
			groupBookId: book.groupBookId,
			displayOrder: index,
		}));

		try {
			const formData = new FormData();
			formData.append('groupId', groupId);
			formData.append('bookOrders', JSON.stringify(bookOrders));

			const response = await fetch('?/reorderReadingList', {
				method: 'POST',
				body: formData,
			});
			
			if (response.ok) {
				// Update the original order to match current
				originalOrder = sortedBooks.map(b => b.groupBookId).filter((id): id is string => !!id);
				hasUnsavedChanges = false;
				justSaved = true;
				
				// Show saved checkmark for 2 seconds
				setTimeout(() => {
					justSaved = false;
				}, 2000);
				
				// Refresh data from server to ensure consistency
				await invalidateAll();
			} else {
				console.error('Failed to save order:', response.status);
				alert('Failed to save order. Please try again.');
			}
		} catch (error) {
			console.error('Error saving order:', error);
			alert('Failed to save order. Please try again.');
		} finally {
			isSaving = false;
		}
	}
</script>

{#if sortedBooks.length > 0}
	<Card class="rounded-3xl border border-primary/15">
		<CardHeader>
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<CardTitle class="text-xl">Up Next</CardTitle>
					{#if isAdmin}
						<p class="text-sm text-muted-foreground">
							Drag to reorder the reading list
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">
							Books on the reading list not yet rated by members
						</p>
					{/if}
				</div>
				
				{#if isAdmin && (hasUnsavedChanges || isSaving || justSaved)}
					<Button 
						size="sm" 
						variant={justSaved ? "outline" : "default"}
						onclick={handleSave}
						disabled={isSaving || justSaved}
						class="flex items-center gap-2"
					>
						{#if isSaving}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
							<span>Saving...</span>
						{:else if justSaved}
							<Check class="h-4 w-4" />
							<span>Saved</span>
						{:else}
							<Save class="h-4 w-4" />
							<span>Save Order</span>
						{/if}
					</Button>
				{/if}
			</div>
		</CardHeader>
		<CardContent class="space-y-3">
			{#each sortedBooks as book, index (book.groupBookId)}
				<div
					class="flex gap-3 rounded-lg border bg-card p-3 transition-all {isAdmin ? 'cursor-move hover:border-primary/40' : ''} {draggedIndex === index ? 'opacity-50' : ''} {dragOverIndex === index && draggedIndex !== index ? 'border-primary scale-[1.02]' : ''}"
					draggable={isAdmin}
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
					role="listitem"
				>
					{#if isAdmin}
						<div class="flex flex-col justify-center text-muted-foreground">
							<GripVertical class="h-5 w-5" />
						</div>
					{/if}

					<!-- Book Cover -->
					<a href="/book/{book.id}" class="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted hover:opacity-80">
						{#if book.cover_url}
							<img
								src={book.cover_url}
								alt={book.title}
								class="h-full w-full object-cover"
							/>
						{:else}
							<div class="flex h-full w-full items-center justify-center">
								<BookMarked class="h-5 w-5 text-muted-foreground" />
							</div>
						{/if}
					</a>

					<!-- Book Details -->
					<div class="flex-1 min-w-0">
						<a href="/book/{book.id}" class="block hover:opacity-80">
							<h4 class="font-medium line-clamp-2 text-sm">{book.title}</h4>
							{#if book.authors && book.authors.length > 0}
								<p class="mt-0.5 text-xs text-muted-foreground line-clamp-1">
									{book.authors.join(', ')}
								</p>
							{/if}
						</a>
						<div class="mt-1">
							<Badge variant="secondary" class="text-xs">Not yet rated</Badge>
						</div>
					</div>
				</div>
			{/each}
		</CardContent>
	</Card>
{/if}

