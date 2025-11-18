<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { StarRating } from '$lib/components/ui/star-rating';
	import { BookMarked } from 'lucide-svelte';

	interface Rating {
		id: string;
		rating: number;
		review: string | null;
		created_at: string;
		book_id: string;
		book_title: string;
		book_authors: string[] | null;
		book_cover_url: string | null;
		profiles: {
			id: string;
			username: string;
			display_name: string | null;
		} | null;
	}

	interface Props {
		ratings: Rating[];
		currentUserId: string;
	}

	let { ratings, currentUserId }: Props = $props();

	// Group ratings by book
	const ratingsByBook = $derived.by(() => {
		const grouped = new Map<
			string,
			{
				bookId: string;
				title: string;
				authors: string[] | null;
				cover: string | null;
				ratings: Rating[];
				averageRating: number;
			}
		>();

		ratings.forEach((rating) => {
			if (!grouped.has(rating.book_id)) {
				grouped.set(rating.book_id, {
					bookId: rating.book_id,
					title: rating.book_title,
					authors: rating.book_authors,
					cover: rating.book_cover_url,
					ratings: [],
					averageRating: 0,
				});
			}

			const group = grouped.get(rating.book_id)!;
			group.ratings.push(rating);
		});

		// Calculate average ratings
		grouped.forEach((group) => {
			const sum = group.ratings.reduce((acc, r) => acc + r.rating, 0);
			group.averageRating = sum / group.ratings.length;
		});

		// Convert to array and sort by number of ratings (most read first)
		return Array.from(grouped.values()).sort((a, b) => b.ratings.length - a.ratings.length);
	});
</script>

{#if ratingsByBook.length > 0}
	<div class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-xl font-semibold">Group Books</h2>
			<p class="text-sm text-muted-foreground">
				{ratingsByBook.length} {ratingsByBook.length === 1 ? 'book' : 'books'} rated
			</p>
		</div>

		<div class="space-y-4">
			{#each ratingsByBook as book}
				<Card class="rounded-3xl border border-primary/15 bg-background">
					<CardContent class="p-6">
						<div class="flex gap-4">
							<!-- Book Cover -->
							<a href="/book/{book.bookId}" class="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted hover:opacity-80">
								{#if book.cover}
									<img
										src={book.cover}
										alt={book.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="flex h-full w-full items-center justify-center">
										<BookMarked class="h-8 w-8 text-muted-foreground" />
									</div>
								{/if}
							</a>

							<!-- Book Details & Ratings -->
							<div class="flex-1">
								<a href="/book/{book.bookId}" class="block hover:opacity-80">
									<h3 class="font-semibold line-clamp-2">{book.title}</h3>
									{#if book.authors && book.authors.length > 0}
										<p class="mt-1 text-sm text-muted-foreground">
											{book.authors.join(', ')}
										</p>
									{/if}
								</a>

								<!-- Average Rating -->
								<div class="mt-3 flex items-center gap-2">
									<StarRating value={book.averageRating} readonly size="sm" />
									<span class="text-sm text-muted-foreground">
										{book.averageRating.toFixed(1)} ({book.ratings.length} {book.ratings.length === 1 ? 'rating' : 'ratings'})
									</span>
								</div>

								<!-- Individual Ratings -->
								<div class="mt-4 space-y-3">
									{#each book.ratings as rating}
										<div class="border-l-2 border-muted pl-4">
											<div class="flex items-center gap-2">
												{#if rating.profiles}
													<a
														href="/users/{rating.profiles.id}"
														class="text-sm font-medium hover:underline"
													>
														{rating.profiles.display_name || rating.profiles.username}
													</a>
												{/if}
												<StarRating value={rating.rating} readonly size="sm" />
											</div>
											{#if rating.review}
												<p class="mt-1 text-sm text-foreground/80">
													{rating.review}
												</p>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<BookMarked class="h-12 w-12 text-muted-foreground mb-3" />
		<h3 class="text-lg font-semibold mb-2">No ratings yet</h3>
		<p class="text-sm text-muted-foreground">
			Group members haven't rated any books yet
		</p>
	</div>
{/if}
