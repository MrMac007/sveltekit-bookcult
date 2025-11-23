<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import BookCard from '$lib/components/books/book-card.svelte';
	import { StarRating } from '$lib/components/ui/star-rating';
	import BookCover from '$lib/components/ui/book-cover.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import { formatDate } from '$lib/utils/date';
	import { BookMarked, BookOpen, BookCheck } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title="My Books">
	<div class="mx-auto max-w-5xl px-4 py-6">
		<Tabs value="wishlist" class="w-full">
			<TabsList class="grid w-full grid-cols-3 text-xs sm:text-sm">
				<TabsTrigger value="wishlist">
					Wishlist ({data.wishlistBooks.length})
				</TabsTrigger>
				<TabsTrigger value="reading">
					Reading ({data.currentlyReading.length})
				</TabsTrigger>
				<TabsTrigger value="completed">
					Completed ({data.completedBooks.length})
				</TabsTrigger>
			</TabsList>

			<TabsContent value="wishlist" class="mt-6">
				{#if data.wishlistBooks.length > 0}
					<div class="space-y-4">
						{#each data.wishlistBooks as item}
							<BookCard
								book={{
									id: item.books.id,
									google_books_id: item.books.google_books_id,
									title: item.books.title,
									authors: item.books.authors,
									cover_url: item.books.cover_url,
									description: item.books.description,
									published_date: item.books.published_date,
									page_count: item.books.page_count,
									categories: item.books.categories,
									isbn_10: item.books.isbn_10,
									isbn_13: item.books.isbn_13
								}}
								isInWishlist={true}
							/>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon={BookMarked}
						title="No books in wishlist"
						message="Add books you want to read"
						actionText="Discover Books"
						actionHref="/discover"
					/>
				{/if}
			</TabsContent>

			<TabsContent value="reading" class="mt-6">
				{#if data.currentlyReading.length > 0}
					<div class="space-y-4">
						{#each data.currentlyReading as item}
							<BookCard
								book={{
									id: item.books.id,
									google_books_id: item.books.google_books_id,
									title: item.books.title,
									authors: item.books.authors,
									cover_url: item.books.cover_url,
									description: item.books.description,
									published_date: item.books.published_date,
									page_count: item.books.page_count,
									categories: item.books.categories,
									isbn_10: item.books.isbn_10,
									isbn_13: item.books.isbn_13
								}}
							/>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon={BookOpen}
						title="Not currently reading"
						message="Start reading a book from your wishlist"
					/>
				{/if}
			</TabsContent>

			<TabsContent value="completed" class="mt-6">
				{#if data.completedBooks.length > 0}
					<div class="space-y-4">
						{#each data.completedBooks as item}
							<div class="rounded-lg border p-4">
								<div class="flex gap-4">
									<div class="flex-shrink-0">
										<BookCover
											coverUrl={item.books.cover_url}
											title={item.books.title}
											bookId={item.books.id}
											size="md"
										/>
									</div>
									<div class="flex-1">
										<a href="/book/{item.books.id}" class="block hover:opacity-80">
											<h3 class="font-semibold line-clamp-2">{item.books.title}</h3>
											{#if item.books.authors && item.books.authors.length > 0}
												<p class="mt-1 text-sm text-muted-foreground">
													{item.books.authors.join(', ')}
												</p>
											{/if}
										</a>
										{#if item.rating}
											<div class="mt-3">
												<StarRating value={item.rating.rating} readonly size="md" />
												{#if item.rating.review}
													<p class="mt-2 text-sm text-foreground/80 line-clamp-2">
														{item.rating.review}
													</p>
												{/if}
											</div>
										{:else}
											<div class="mt-3">
												<a
													href="/rate/{item.books.id}"
													class="text-sm text-primary hover:underline"
												>
													Rate this book
												</a>
											</div>
										{/if}
										<p class="mt-2 text-xs text-muted-foreground">
											Completed on {formatDate(item.completed_at)}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon={BookCheck}
						title="No completed books yet"
						message="Mark books as complete to track your progress"
					/>
				{/if}
			</TabsContent>
		</Tabs>
	</div>
</AppLayout>
