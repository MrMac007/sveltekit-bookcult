<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import Tabs from '$lib/components/ui/tabs.svelte';
	import TabsList from '$lib/components/ui/tabs-list.svelte';
	import TabsTrigger from '$lib/components/ui/tabs-trigger.svelte';
	import TabsContent from '$lib/components/ui/tabs-content.svelte';
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import { 
		Palette, 
		Heart, 
		Quote, 
		Plus, 
		Trash2, 
		Check, 
		X,
		Loader2,
		StickyNote,
		Type,
		Sparkles,
		BookOpen
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { WallStyle } from '$lib/types/database';

	interface BookOption {
		id: string;
		title: string;
		authors: string[];
		cover_url: string | null;
	}

	interface QuoteWithBook {
		id: string;
		quote_text: string;
		page_number: number | null;
		book: BookOption;
	}

	interface FavoriteBookWithDetails {
		id: string;
		display_order: number;
		book: BookOption;
	}

	interface Props {
		open?: boolean;
		currentStyle: WallStyle;
		quotes: QuoteWithBook[];
		favoriteBooks: FavoriteBookWithDetails[];
		availableBooks: BookOption[];
		onClose?: () => void;
	}

	let { 
		open = $bindable(false),
		currentStyle,
		quotes,
		favoriteBooks,
		availableBooks,
		onClose
	}: Props = $props();

	// Local state
	let selectedStyle = $state<WallStyle>(currentStyle);
	let selectedFavorites = $state<(string | null)[]>([null, null, null]);
	let isAddingQuote = $state(false);
	let newQuoteBookId = $state('');
	let newQuoteText = $state('');
	let newQuotePageNumber = $state('');
	let isSaving = $state(false);
	let deletingQuoteId = $state<string | null>(null);

	// Initialize favorites from props
	$effect(() => {
		const initial: (string | null)[] = [null, null, null];
		for (const fav of favoriteBooks) {
			if (fav.display_order >= 1 && fav.display_order <= 3) {
				initial[fav.display_order - 1] = fav.book.id;
			}
		}
		selectedFavorites = initial;
	});

	// Style options with previews
	const styleOptions: { value: WallStyle; label: string; description: string; icon: typeof StickyNote }[] = [
		{
			value: 'sticky-notes',
			label: 'Sticky Notes',
			description: 'Colorful post-it style notes on a cork board',
			icon: StickyNote
		},
		{
			value: 'typewriter',
			label: 'Typewriter',
			description: 'Vintage monospace on aged paper',
			icon: Type
		},
		{
			value: 'constellation',
			label: 'Constellation',
			description: 'Glowing text nodes in a starry sky',
			icon: Sparkles
		}
	];

	function handleClose() {
		open = false;
		onClose?.();
	}

	function resetQuoteForm() {
		newQuoteBookId = '';
		newQuoteText = '';
		newQuotePageNumber = '';
		isAddingQuote = false;
	}

	function getBookById(id: string): BookOption | undefined {
		return availableBooks.find(b => b.id === id);
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="max-w-2xl w-full h-[95vh] md:h-auto md:max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
		<DialogHeader class="p-4 md:p-6 pb-2 border-b">
			<DialogTitle>Edit Quote Wall</DialogTitle>
		</DialogHeader>

		<Tabs value="style" class="flex-1 flex flex-col min-h-0">
			<div class="px-4 md:px-6 pt-2">
				<TabsList class="grid w-full grid-cols-3">
					<TabsTrigger value="style">
						<Palette class="h-4 w-4 mr-1.5" />
						<span class="hidden sm:inline">Style</span>
					</TabsTrigger>
					<TabsTrigger value="favorites">
						<Heart class="h-4 w-4 mr-1.5" />
						<span class="hidden sm:inline">Favorites</span>
					</TabsTrigger>
					<TabsTrigger value="quotes">
						<Quote class="h-4 w-4 mr-1.5" />
						<span class="hidden sm:inline">Quotes</span>
					</TabsTrigger>
				</TabsList>
			</div>

			<!-- Style Selection Tab -->
			<TabsContent value="style" class="mt-0 h-full flex flex-col">
				<form
					method="POST"
					action="?/setWallStyle"
					class="flex flex-col h-full"
					use:enhance={() => {
						isSaving = true;
						return async ({ result }) => {
							isSaving = false;
							if (result.type === 'success') {
								toast.success('Style updated');
								await invalidateAll();
							} else {
								toast.error('Failed to update style');
							}
						};
					}}
				>
					<div class="flex-1 overflow-y-auto p-4 md:p-6">
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
							{#each styleOptions as option (option.value)}
								{@const isSelected = selectedStyle === option.value}
								<label
									class={cn(
										'relative flex sm:flex-col items-center sm:text-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-accent',
										isSelected 
											? 'border-primary bg-primary/5' 
											: 'border-transparent bg-muted/50 hover:border-primary/20'
									)}
								>
									<input
										type="radio"
										name="wallStyle"
										value={option.value}
										bind:group={selectedStyle}
										class="sr-only"
									/>
									<div class={cn(
										'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
										isSelected ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
									)}>
										<option.icon class="h-5 w-5" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="font-medium text-sm mb-0.5">{option.label}</div>
										<p class="text-xs text-muted-foreground line-clamp-2">{option.description}</p>
									</div>
									{#if isSelected}
										<div class="absolute top-2 right-2 sm:top-2 sm:right-2">
											<Check class="h-4 w-4 text-primary" />
										</div>
									{/if}
								</label>
							{/each}
						</div>
					</div>
					<div class="p-4 md:p-6 pt-2 border-t flex justify-end bg-background">
						<Button type="submit" class="w-full sm:w-auto" disabled={isSaving || selectedStyle === currentStyle}>
							{#if isSaving}
								<Loader2 class="h-4 w-4 mr-2 animate-spin" />
							{/if}
							Save Style
						</Button>
					</div>
				</form>
			</TabsContent>

			<!-- Favorite Books Tab -->
			<TabsContent value="favorites" class="mt-0 h-full">
				<form
					method="POST"
					action="?/setFavoriteBooks"
					class="flex flex-col h-full"
					use:enhance={() => {
						isSaving = true;
						return async ({ result }) => {
							isSaving = false;
							if (result.type === 'success') {
								toast.success('Favorites updated');
								await invalidateAll();
							} else {
								toast.error('Failed to update favorites');
							}
						};
					}}
				>
					<div class="flex-1 overflow-y-auto py-4 px-1">
						<p class="text-sm text-muted-foreground mb-4">
							Select up to 3 books to showcase on your quote wall.
						</p>

						{#if availableBooks.length === 0}
							<Card>
								<CardContent class="py-8 text-center">
									<BookOpen class="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
									<p class="text-muted-foreground text-sm">
										Add books to your wishlist or completed list to select favorites
									</p>
								</CardContent>
							</Card>
						{:else}
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								{#each [1, 2, 3] as slot}
									{@const slotIndex = slot - 1}
									{@const selectedBookId = selectedFavorites[slotIndex]}
									{@const selectedBook = selectedBookId ? getBookById(selectedBookId) : null}
									
									<div class="group relative flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
													{slot}
												</div>
												<span class="text-xs font-medium text-muted-foreground">Slot {slot}</span>
											</div>
											{#if selectedBook}
												<button
													type="button"
													class="text-muted-foreground hover:text-destructive transition-colors"
													onclick={() => {
														const newFavs = [...selectedFavorites];
														newFavs[slotIndex] = null;
														selectedFavorites = newFavs;
													}}
												>
													<X class="h-4 w-4" />
													<span class="sr-only">Clear slot</span>
												</button>
											{/if}
										</div>

										<div class="relative flex-1 min-h-[160px] rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center text-center p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
											{#if selectedBook}
												<div class="relative z-10 flex flex-col items-center gap-2">
													{#if selectedBook.cover_url}
														<img 
															src={selectedBook.cover_url} 
															alt="" 
															class="h-24 w-16 rounded shadow-sm object-cover"
														/>
													{:else}
														<div class="h-24 w-16 rounded bg-muted border flex items-center justify-center">
															<BookOpen class="h-6 w-6 text-muted-foreground/50" />
														</div>
													{/if}
													<div class="w-full px-2">
														<p class="text-sm font-medium leading-tight line-clamp-2 text-foreground">
															{selectedBook.title}
														</p>
														{#if selectedBook.authors.length > 0}
															<p class="text-xs text-muted-foreground line-clamp-1 mt-0.5">
																{selectedBook.authors[0]}
															</p>
														{/if}
													</div>
												</div>
											{:else}
												<Plus class="h-8 w-8 text-muted-foreground/40 mb-2" />
												<span class="text-sm text-muted-foreground font-medium">Select Book</span>
											{/if}
											
											<select
												class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
												name="favorite{slot}"
												value={selectedFavorites[slotIndex] || ''}
												onchange={(e) => {
													const newValue = e.currentTarget.value || null;
													const newFavs = [...selectedFavorites];
													// If book is already selected in another slot, clear that slot? 
													// Or just allow the swap? 
													// The UI prevents selecting disabled options, so swapping is tricky.
													// For now, just set it.
													newFavs[slotIndex] = newValue;
													selectedFavorites = newFavs;
												}}
											>
												<option value="">Select a book...</option>
												{#each availableBooks as book (book.id)}
													{@const isSelectedElsewhere = selectedFavorites.includes(book.id) && selectedFavorites[slotIndex] !== book.id}
													<option value={book.id} disabled={isSelectedElsewhere}>
														{book.title} {book.authors.length > 0 ? `by ${book.authors[0]}` : ''}
													</option>
												{/each}
											</select>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div class="mt-4 flex justify-end pt-4 border-t">
						<Button type="submit" class="w-full sm:w-auto" disabled={isSaving || availableBooks.length === 0}>
							{#if isSaving}
								<Loader2 class="h-4 w-4 mr-2 animate-spin" />
							{/if}
							Save Favorites
						</Button>
					</div>
				</form>
			</TabsContent>

			<!-- Quotes Tab -->
			<TabsContent value="quotes" class="mt-0 h-full flex flex-col">
				<div class="flex-1 overflow-y-auto p-4 md:p-6">
					<p class="text-sm text-muted-foreground mb-4">
						Add memorable quotes from your books. You can add up to 10 quotes.
					</p>

					<!-- Existing Quotes -->
					{#if quotes.length > 0}
						<div class="space-y-3 mb-4">
							{#each quotes as quote (quote.id)}
								<Card>
									<CardContent class="p-4">
										<div class="flex gap-3">
											<div class="flex-1 min-w-0">
												<blockquote class="text-sm text-foreground/90 line-clamp-2">
													"{quote.quote_text}"
												</blockquote>
												<p class="text-xs text-muted-foreground mt-1">
													— {quote.book.title}
													{#if quote.page_number}
														<span class="ml-1">(p.{quote.page_number})</span>
													{/if}
												</p>
											</div>
											<form
												method="POST"
												action="?/deleteQuote"
												use:enhance={() => {
													deletingQuoteId = quote.id;
													return async ({ result }) => {
														deletingQuoteId = null;
														if (result.type === 'success') {
															toast.success('Quote removed');
															await invalidateAll();
														} else {
															toast.error('Failed to remove quote');
														}
													};
												}}
											>
												<input type="hidden" name="quoteId" value={quote.id} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class="flex-shrink-0 text-muted-foreground hover:text-destructive"
													disabled={deletingQuoteId === quote.id}
												>
													{#if deletingQuoteId === quote.id}
														<Loader2 class="h-4 w-4 animate-spin" />
													{:else}
														<Trash2 class="h-4 w-4" />
													{/if}
												</Button>
											</form>
										</div>
									</CardContent>
								</Card>
							{/each}
						</div>
					{/if}

					<!-- Add Quote Form -->
					{#if isAddingQuote}
						<Card class="border-dashed">
							<CardContent class="p-4">
								<form
									method="POST"
									action="?/addQuote"
									use:enhance={() => {
										isSaving = true;
										return async ({ result }) => {
											isSaving = false;
											if (result.type === 'success') {
												toast.success('Quote added');
												resetQuoteForm();
												await invalidateAll();
											} else {
												toast.error('Failed to add quote');
											}
										};
									}}
								>
									<div class="space-y-4">
										<div>
											<Label for="bookId">Book</Label>
											<select
												id="bookId"
												name="bookId"
												bind:value={newQuoteBookId}
												required
												class="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
											>
												<option value="">Select a book...</option>
												{#each availableBooks as book (book.id)}
													<option value={book.id}>
														{book.title} {book.authors.length > 0 ? `by ${book.authors[0]}` : ''}
													</option>
												{/each}
											</select>
										</div>
										<div>
											<Label for="quoteText">Quote</Label>
											<Textarea
												id="quoteText"
												name="quoteText"
												bind:value={newQuoteText}
												placeholder="Enter the quote..."
												required
												maxlength={500}
												class="mt-1.5"
											/>
											<p class="text-xs text-muted-foreground mt-1">
												{newQuoteText.length}/500 characters
											</p>
										</div>
										<div>
											<Label for="pageNumber">Page Number (optional)</Label>
											<Input
												id="pageNumber"
												name="pageNumber"
												type="number"
												bind:value={newQuotePageNumber}
												placeholder="e.g., 42"
												min={1}
												class="mt-1.5 w-32"
											/>
										</div>
										<div class="flex gap-2 justify-end">
											<Button type="button" variant="ghost" onclick={resetQuoteForm}>
												Cancel
											</Button>
											<Button type="submit" disabled={isSaving || !newQuoteBookId || !newQuoteText.trim()}>
												{#if isSaving}
													<Loader2 class="h-4 w-4 mr-2 animate-spin" />
												{/if}
												Add Quote
											</Button>
										</div>
									</div>
								</form>
							</CardContent>
						</Card>
					{:else if quotes.length < 10}
						<Button
							variant="outline"
							class="w-full border-dashed h-12"
							onclick={() => isAddingQuote = true}
							disabled={availableBooks.length === 0}
						>
							<Plus class="h-4 w-4 mr-2" />
							Add Quote
						</Button>
						{#if availableBooks.length === 0}
							<p class="text-xs text-muted-foreground text-center mt-2">
								Add books to your collection first
							</p>
						{/if}
					{:else}
						<p class="text-sm text-muted-foreground text-center">
							Maximum of 10 quotes reached. Remove one to add more.
						</p>
					{/if}
				</div>
			</TabsContent>
		</Tabs>
	</DialogContent>
</Dialog>

