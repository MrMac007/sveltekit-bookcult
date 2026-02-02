<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Trash2, Loader2, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { useBookSearch } from '$lib/stores/book-search';
	import BookSearchPanel from '$lib/components/books/book-search-panel.svelte';
	import BookSearchResultRow from '$lib/components/books/book-search-result-row.svelte';
	import { toBookCardData } from '$lib/utils/books';
	import type { BookSearchResult } from '$lib/types/book-search';

	interface UserSuggestion {
		id: string;
		rank: number;
		book_id: string;
		books: {
			id: string;
			title: string;
			authors: string[];
			cover_url: string | null;
		} | null;
	}

	interface Props {
		groupId: string;
		suggestions: UserSuggestion[];
		maxSuggestions?: number;
	}

	let { groupId, suggestions, maxSuggestions = 5 }: Props = $props();

	// Search state
	const search = useBookSearch({
		autoSearch: true,
		onError: () => toast.error('Failed to search books')
	});

	let showSearch = $state(false);
	let selectedRank = $state<number | null>(null);

	// Action states
	let addingBookId = $state<string | null>(null);
	let removingId = $state<string | null>(null);

	// Get suggestions organized by rank
	const suggestionsByRank = $derived(() => {
		const map = new Map<number, UserSuggestion>();
		for (const s of suggestions) {
			map.set(s.rank, s);
		}
		return map;
	});

	// Available ranks for new suggestions
	const availableRanks = $derived(() => {
		const used = new Set(suggestions.map((s) => s.rank));
		return [1, 2, 3, 4, 5].filter((r) => !used.has(r));
	});

	// Book IDs already suggested
	const suggestedBookIds = $derived(() => new Set(suggestions.map((s) => s.book_id)));

	function openSearchForRank(rank: number) {
		selectedRank = rank;
		showSearch = true;
		search.reset();
	}

	function closeSearch() {
		showSearch = false;
		selectedRank = null;
		search.reset();
	}

	async function handleAddBook(book: BookSearchResult) {
		if (addingBookId || selectedRank === null) return;

		addingBookId = book.id || book.open_library_key;

		try {
			const formData = new FormData();
			formData.append('groupId', groupId);
			formData.append('bookData', JSON.stringify(toBookCardData(book)));
			formData.append('rank', selectedRank.toString());

			const response = await fetch('?/addSuggestion', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to add suggestion');
			} else {
				toast.success(`Added as #${selectedRank} suggestion`);
				closeSearch();
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error adding suggestion:', error);
			toast.error('Failed to add suggestion');
		} finally {
			addingBookId = null;
		}
	}

	async function handleRemoveSuggestion(suggestionId: string) {
		if (removingId) return;

		removingId = suggestionId;

		try {
			const formData = new FormData();
			formData.append('groupId', groupId);
			formData.append('suggestionId', suggestionId);

			const response = await fetch('?/removeSuggestion', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to remove suggestion');
			} else {
				toast.success('Suggestion removed');
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error removing suggestion:', error);
			toast.error('Failed to remove suggestion');
		} finally {
			removingId = null;
		}
	}

	function getRankLabel(rank: number): string {
		const labels: Record<number, string> = {
			1: '1st',
			2: '2nd',
			3: '3rd',
			4: '4th',
			5: '5th'
		};
		return labels[rank] || `${rank}th`;
	}

	function getRankPoints(rank: number): number {
		return 6 - rank;
	}
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Rank up to 5 books you'd like the group to read next. Your list is private until the admin reveals all suggestions.
	</p>

	<!-- Suggestion Slots -->
	<div class="space-y-2">
		{#each [1, 2, 3, 4, 5] as rank}
			{@const suggestion = suggestionsByRank().get(rank)}
			<div
				class="flex items-center gap-3 rounded-lg border p-3 {suggestion
					? 'bg-card'
					: 'border-dashed bg-muted/30'}"
			>
				<!-- Rank Badge -->
				<Badge
					variant={suggestion ? 'default' : 'outline'}
					class="h-8 w-8 shrink-0 justify-center rounded-full text-sm font-semibold"
				>
					{rank}
				</Badge>

				{#if suggestion && suggestion.books}
					<!-- Book Info -->
					<div class="flex min-w-0 flex-1 items-center gap-2">
						<div class="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
							{#if suggestion.books.cover_url}
								<img
									src={suggestion.books.cover_url}
									alt={suggestion.books.title}
									class="h-full w-full object-cover"
								/>
							{:else}
								<div class="flex h-full w-full items-center justify-center">
									<BookMarked class="h-4 w-4 text-muted-foreground" />
								</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="line-clamp-1 text-sm font-medium">{suggestion.books.title}</p>
							{#if suggestion.books.authors?.length}
								<p class="line-clamp-1 text-xs text-muted-foreground">
									{suggestion.books.authors.join(', ')}
								</p>
							{/if}
						</div>
					</div>

					<!-- Points indicator -->
					<span class="text-xs text-muted-foreground">{getRankPoints(rank)} pts</span>

					<!-- Remove Button -->
					<Button
						size="sm"
						variant="ghost"
						class="text-destructive hover:text-destructive"
						onclick={() => handleRemoveSuggestion(suggestion.id)}
						disabled={removingId === suggestion.id}
					>
						{#if removingId === suggestion.id}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Trash2 class="h-4 w-4" />
						{/if}
					</Button>
				{:else}
					<!-- Empty Slot -->
					<div class="flex min-w-0 flex-1 items-center">
						<p class="text-sm text-muted-foreground">
							{getRankLabel(rank)} choice ({getRankPoints(rank)} pts)
						</p>
					</div>

					<Button size="sm" variant="outline" onclick={() => openSearchForRank(rank)}>
						<Plus class="mr-1 h-4 w-4" />
						Add
					</Button>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Search Modal -->
	{#if showSearch && selectedRank !== null}
		<div class="space-y-3 rounded-lg border border-primary/30 bg-card p-4">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">Add {getRankLabel(selectedRank)} choice</p>
				<Button size="sm" variant="ghost" onclick={closeSearch}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<BookSearchPanel {search} maxResults={5} resultsClass="max-h-64 overflow-y-auto space-y-2">
				<svelte:fragment slot="result" let:book>
					{@const bookId = book.id || book.open_library_key}
					{@const isAlreadySuggested = suggestedBookIds().has(bookId)}
					<BookSearchResultRow {book}>
						<svelte:fragment slot="actions">
							{#if isAlreadySuggested}
								<Badge variant="secondary" class="text-xs">In List</Badge>
							{:else}
								<Button
									size="sm"
									variant="ghost"
									onclick={() => handleAddBook(book)}
									disabled={addingBookId === bookId}
								>
									{#if addingBookId === bookId}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<Plus class="h-4 w-4" />
									{/if}
								</Button>
							{/if}
						</svelte:fragment>
					</BookSearchResultRow>
				</svelte:fragment>
			</BookSearchPanel>
		</div>
	{/if}

	<!-- Summary -->
	{#if suggestions.length > 0}
		<p class="text-center text-xs text-muted-foreground">
			{suggestions.length} of {maxSuggestions} suggestions added
		</p>
	{/if}
</div>
