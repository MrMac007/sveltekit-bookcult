<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BookOpen, Trash2, Users, Clock } from 'lucide-svelte';

	type CurrentlyReadingItem = {
		id: string;
		started_at: string;
		group_id: string | null;
		books: {
			id: string;
			title: string;
			authors: string[] | null;
			cover_url: string | null;
			description: string | null;
			page_count: number | null;
			published_date: string | null;
		} | null;
		groups?: {
			id: string;
			name: string;
		} | null;
	};

	interface Props {
		currentlyReading: CurrentlyReadingItem[];
		showRemoveButton?: boolean;
		layout?: 'grid' | 'carousel' | 'list';
		maxItems?: number;
		class?: string;
	}

	let {
		currentlyReading,
		showRemoveButton = true,
		layout = 'carousel',
		maxItems,
		class: className = ''
	}: Props = $props();

	const items = maxItems ? currentlyReading.slice(0, maxItems) : currentlyReading;

	function formatStarted(startedAt: string) {
		const start = new Date(startedAt);
		const now = new Date();
		const diffInDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return 'Started today';
		if (diffInDays === 1) return 'Started yesterday';
		if (diffInDays < 7) return `Started ${diffInDays} days ago`;
		if (diffInDays < 30) return `Started ${Math.floor(diffInDays / 7)} weeks ago`;
		return `Started ${start.toLocaleDateString()}`;
	}

	const containerClass =
		layout === 'carousel'
			? 'flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory'
			: layout === 'grid'
				? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'
				: 'space-y-4';
</script>

<div class={className}>
	{#if items.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
				<BookOpen class="h-8 w-8 text-primary" />
			</div>
			<h3 class="mb-1 font-semibold">No Books Currently Reading</h3>
			<p class="text-sm text-muted-foreground">
				Start reading by tapping "Start Reading" on any book.
			</p>
		</div>
	{:else}
		<div class={containerClass}>
			{#each items as item (item.id)}
				{#if item.books}
					{#if layout === 'carousel'}
						<!-- Carousel Card -->
						<div class="flex-shrink-0 snap-start" style="width: 200px;">
							<Card class="h-full">
								<CardContent class="flex h-full flex-col p-4">
									<a
										href={`/book/${item.books.id}`}
										class="relative mb-3 aspect-[2/3] overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-80"
									>
										{#if item.books.cover_url}
											<img
												src={item.books.cover_url}
												alt={item.books.title}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<BookOpen class="h-12 w-12 text-muted-foreground" />
											</div>
										{/if}
									</a>

									<div class="flex flex-1 flex-col">
										<a href={`/book/${item.books.id}`} class="mb-1">
											<h4
												class="line-clamp-2 text-sm font-semibold leading-tight transition-colors hover:text-primary"
											>
												{item.books.title}
											</h4>
										</a>

										{#if item.books.authors && item.books.authors.length > 0}
											<p class="mb-2 line-clamp-1 text-xs text-muted-foreground">
												{item.books.authors[0]}
											</p>
										{/if}

										{#if item.groups}
											<Badge variant="outline" class="mb-2 w-fit gap-1 text-xs">
												<Users class="h-2.5 w-2.5" />
												{item.groups.name}
											</Badge>
										{/if}

										<div class="mt-auto">
											<div class="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
												<Clock class="h-3 w-3" />
												<span class="truncate">{formatStarted(item.started_at)}</span>
											</div>

											{#if showRemoveButton}
												<form
													method="POST"
													action="/currently-reading?/remove"
													onsubmit={(e) => {
														if (!confirm('Remove from currently reading?')) {
															e.preventDefault();
														}
													}}
												>
													<input type="hidden" name="recordId" value={item.id} />
													<Button
														type="submit"
														variant="ghost"
														size="sm"
														class="h-8 w-full gap-1 text-xs text-destructive hover:text-destructive"
													>
														<Trash2 class="h-3 w-3" />
														Remove
													</Button>
												</form>
											{/if}
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					{:else if layout === 'grid'}
						<!-- Grid Card -->
						<Card class="h-full">
							<CardContent class="flex h-full flex-col p-4">
								<a
									href={`/book/${item.books.id}`}
									class="relative mb-3 aspect-[2/3] overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-80"
								>
									{#if item.books.cover_url}
										<img
											src={item.books.cover_url}
											alt={item.books.title}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div class="flex h-full w-full items-center justify-center">
											<BookOpen class="h-12 w-12 text-muted-foreground" />
										</div>
									{/if}
								</a>

								<div class="flex flex-1 flex-col">
									<a href={`/book/${item.books.id}`} class="mb-1">
										<h4
											class="line-clamp-2 text-sm font-semibold leading-tight transition-colors hover:text-primary"
										>
											{item.books.title}
										</h4>
									</a>

									{#if item.books.authors && item.books.authors.length > 0}
										<p class="mb-2 line-clamp-1 text-xs text-muted-foreground">
											{item.books.authors.join(', ')}
										</p>
									{/if}

									{#if item.groups}
										<Badge variant="outline" class="mb-2 w-fit gap-1 text-xs">
											<Users class="h-2.5 w-2.5" />
											{item.groups.name}
										</Badge>
									{/if}

									<div class="mt-auto">
										<div class="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
											<Clock class="h-3 w-3" />
											<span>{formatStarted(item.started_at)}</span>
										</div>

										{#if showRemoveButton}
											<form
												method="POST"
												action="/currently-reading?/remove"
												onsubmit={(e) => {
													if (!confirm('Remove from currently reading?')) {
														e.preventDefault();
													}
												}}
											>
												<input type="hidden" name="recordId" value={item.id} />
												<Button
													type="submit"
													variant="ghost"
													size="sm"
													class="h-8 w-full gap-1 text-xs text-destructive hover:text-destructive"
												>
													<Trash2 class="h-3 w-3" />
													Remove
												</Button>
											</form>
										{/if}
									</div>
								</div>
							</CardContent>
						</Card>
					{:else}
						<!-- List Item -->
						<Card>
							<CardContent class="p-4">
								<div class="flex gap-4">
									<a
										href={`/book/${item.books.id}`}
										class="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-80"
									>
										{#if item.books.cover_url}
											<img
												src={item.books.cover_url}
												alt={item.books.title}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<BookOpen class="h-10 w-10 text-muted-foreground" />
											</div>
										{/if}
									</a>

									<div class="flex flex-1 flex-col">
										<a href={`/book/${item.books.id}`}>
											<h4
												class="font-semibold leading-tight transition-colors hover:text-primary"
											>
												{item.books.title}
											</h4>
										</a>

										{#if item.books.authors && item.books.authors.length > 0}
											<p class="mt-1 text-sm text-muted-foreground">
												by {item.books.authors.join(', ')}
											</p>
										{/if}

										<div class="mt-2 flex flex-wrap items-center gap-2">
											{#if item.groups}
												<Badge variant="outline" class="gap-1 text-xs">
													<Users class="h-3 w-3" />
													{item.groups.name}
												</Badge>
											{/if}

											<div class="flex items-center gap-1 text-xs text-muted-foreground">
												<Clock class="h-3 w-3" />
												<span>{formatStarted(item.started_at)}</span>
											</div>
										</div>

										{#if showRemoveButton}
											<div class="mt-auto pt-3">
												<form
													method="POST"
													action="/currently-reading?/remove"
													onsubmit={(e) => {
														if (!confirm('Remove from currently reading?')) {
															e.preventDefault();
														}
													}}
												>
													<input type="hidden" name="recordId" value={item.id} />
													<Button
														type="submit"
														variant="ghost"
														size="sm"
														class="gap-1 text-destructive hover:text-destructive"
													>
														<Trash2 class="h-3.5 w-3.5" />
														Remove
													</Button>
												</form>
											</div>
										{/if}
									</div>
								</div>
							</CardContent>
						</Card>
					{/if}
				{/if}
			{/each}
		</div>

		{#if maxItems && currentlyReading.length > maxItems}
			<div class="mt-4 text-center">
				<Button href="/currently-reading" variant="outline">
					View All ({currentlyReading.length})
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
