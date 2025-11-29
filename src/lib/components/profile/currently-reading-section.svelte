<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { createClient } from '$lib/supabase/client';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import BookCover from '$lib/components/ui/book-cover.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import { BookOpen, X, Loader2, Users } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface CurrentlyReadingBook {
		id: string;
		started_at: string;
		group_id: string | null;
		books: {
			id: string;
			title: string;
			authors: string[];
			cover_url: string | null;
		} | null;
		groups: {
			id: string;
			name: string;
		} | null;
	}

	interface Props {
		books: CurrentlyReadingBook[];
		onRemove?: (bookId: string) => void;
		class?: string;
	}

	let { books, onRemove, class: className = '' }: Props = $props();

	const supabase = createClient();
	let removingBookId = $state<string | null>(null);

	async function handleRemove(item: CurrentlyReadingBook) {
		if (!item.books || removingBookId) return;

		removingBookId = item.books.id;
		try {
			const { error } = await supabase
				.from('currently_reading')
				.delete()
				.eq('id', item.id);

			if (error) throw error;

			toast.success('Removed from currently reading');
			onRemove?.(item.books.id);
			await invalidateAll();
		} catch (err) {
			console.error('Error removing from currently reading:', err);
			toast.error('Failed to remove book');
		} finally {
			removingBookId = null;
		}
	}
</script>

<div class={className}>
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<BookOpen class="h-5 w-5 text-primary" />
			<h2 class="font-semibold">Currently Reading</h2>
			{#if books.length > 0}
				<Badge variant="secondary" class="text-xs">{books.length}</Badge>
			{/if}
		</div>
		{#if books.length > 0}
			<a href="/currently-reading" class="text-sm text-primary hover:underline">View All</a>
		{/if}
	</div>

	{#if books.length === 0}
		<Card>
			<CardContent class="py-8">
				<EmptyState
					icon={BookOpen}
					title="Not reading anything"
					message="Start reading a book from your wishlist or discover something new."
					actionText="Discover Books"
					actionHref="/discover"
				/>
			</CardContent>
		</Card>
	{:else}
		<!-- Mobile: Horizontal scroll carousel -->
		<div class="block md:hidden">
			<div class="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
				{#each books as item (item.id)}
					{#if item.books}
						<div class="relative flex-shrink-0 w-28">
							<BookCover
								coverUrl={item.books.cover_url}
								title={item.books.title}
								bookId={item.books.id}
								size="md"
								class="ring-1 ring-border/70"
							/>
							<!-- Group badge -->
							{#if item.groups}
								<div class="mt-2">
									<a href="/groups/{item.groups.id}">
										<Badge variant="secondary" class="text-xs gap-1 max-w-full truncate">
											<Users class="h-3 w-3 flex-shrink-0" />
											<span class="truncate">{item.groups.name}</span>
										</Badge>
									</a>
								</div>
							{/if}
							<!-- Remove button -->
							<button
								type="button"
								class="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors"
								onclick={() => handleRemove(item)}
								disabled={removingBookId === item.books?.id}
								title="Stop reading"
							>
								{#if removingBookId === item.books?.id}
									<Loader2 class="h-3 w-3 animate-spin" />
								{:else}
									<X class="h-3 w-3" />
								{/if}
							</button>
							<p class="mt-2 line-clamp-2 text-xs font-medium">{item.books.title}</p>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Desktop: Grid layout -->
		<div class="hidden md:block">
			<div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
				{#each books as item (item.id)}
					{#if item.books}
						<Card class="overflow-hidden">
							<CardContent class="p-4">
								<div class="flex gap-3">
									<div class="relative flex-shrink-0">
										<BookCover
											coverUrl={item.books.cover_url}
											title={item.books.title}
											bookId={item.books.id}
											size="sm"
											class="ring-1 ring-border/70"
										/>
									</div>
									<div class="flex-1 min-w-0">
										<a href="/book/{item.books.id}">
											<h3 class="line-clamp-2 text-sm font-medium hover:text-primary transition-colors">
												{item.books.title}
											</h3>
										</a>
										{#if item.books.authors && item.books.authors.length > 0}
											<p class="mt-0.5 text-xs text-muted-foreground line-clamp-1">
												{item.books.authors.join(', ')}
											</p>
										{/if}
										{#if item.groups}
											<div class="mt-2">
												<a href="/groups/{item.groups.id}">
													<Badge variant="secondary" class="text-xs gap-1">
														<Users class="h-3 w-3" />
														{item.groups.name}
													</Badge>
												</a>
											</div>
										{/if}
									</div>
									<button
										type="button"
										class="flex-shrink-0 self-start rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
										onclick={() => handleRemove(item)}
										disabled={removingBookId === item.books?.id}
										title="Stop reading"
									>
										{#if removingBookId === item.books?.id}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<X class="h-4 w-4" />
										{/if}
									</button>
								</div>
							</CardContent>
						</Card>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
