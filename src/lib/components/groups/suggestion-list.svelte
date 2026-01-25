<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { BookMarked, Plus, Trash2, Search, Loader2, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

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
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let showSearch = $state(false);
	let selectedRank = $state<number | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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

	async function searchBooks() {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			searchResults = [];
			return;
		}

		isSearching = true;

		try {
			const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
			if (!response.ok) {
				throw new Error('Failed to search books');
			}

			const result = await response.json();
			searchResults = Array.isArray(result) ? result : [];
		} catch (error) {
			console.error('Error searching books:', error);
			searchResults = [];
			toast.error('Failed to search books');
		} finally {
			isSearching = false;
		}
	}

	function handleSearchInput(value: string) {
		searchQuery = value;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (!value.trim()) {
			searchResults = [];
			return;
		}

		debounceTimer = setTimeout(() => {
			searchBooks();
		}, 500);
	}

	function openSearchForRank(rank: number) {
		selectedRank = rank;
		showSearch = true;
		searchQuery = '';
		searchResults = [];
	}

	function closeSearch() {
		showSearch = false;
		selectedRank = null;
		searchQuery = '';
		searchResults = [];
	}

	async function handleAddBook(book: any) {
		if (addingBookId || selectedRank === null) return;

		addingBookId = book.id || book.google_books_id;

		try {
			const formData = new FormData();
			formData.append('groupId', groupId);
			formData.append('bookData', JSON.stringify(book));
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

			<div class="relative">
				<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search for books..."
					value={searchQuery}
					oninput={(e) => {
						const target = e.currentTarget as HTMLInputElement;
						handleSearchInput(target.value);
					}}
					class="pl-9"
				/>
			</div>

			{#if isSearching}
				<div class="flex items-center justify-center py-4">
					<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			{:else if searchResults.length > 0}
				<div class="max-h-64 space-y-2 overflow-y-auto">
					{#each searchResults.slice(0, 5) as book}
						{@const bookId = book.id || book.google_books_id}
						{@const isAlreadySuggested = suggestedBookIds().has(bookId)}
						<div class="flex items-center gap-2 rounded-md border p-2">
							<div class="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
								{#if book.cover_url}
									<img src={book.cover_url} alt={book.title} class="h-full w-full object-cover" />
								{:else}
									<div class="flex h-full w-full items-center justify-center">
										<BookMarked class="h-4 w-4 text-muted-foreground" />
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="line-clamp-1 text-sm font-medium">{book.title}</p>
								{#if book.authors?.length}
									<p class="line-clamp-1 text-xs text-muted-foreground">
										{book.authors.join(', ')}
									</p>
								{/if}
							</div>
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
						</div>
					{/each}
				</div>
			{:else if searchQuery.trim().length >= 2}
				<p class="py-4 text-center text-sm text-muted-foreground">No books found</p>
			{/if}
		</div>
	{/if}

	<!-- Summary -->
	{#if suggestions.length > 0}
		<p class="text-center text-xs text-muted-foreground">
			{suggestions.length} of {maxSuggestions} suggestions added
		</p>
	{/if}
</div>
