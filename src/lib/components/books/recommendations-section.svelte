<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Sparkles, RefreshCw, ChevronLeft, ChevronRight, BookMarked, Loader2 } from 'lucide-svelte';
	import MobileRecommendationCarousel from './mobile-recommendation-carousel.svelte';
	import CompactRecommendationCard from './compact-recommendation-card.svelte';
	import { createClient } from '$lib/supabase/client';
	import type { Recommendation, RecommendationsResponse } from '$lib/types/recommendations';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	const supabase = createClient();
	let recommendations = $state<Recommendation[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	let fromCache = $state(false);
	let wishlistIds = $state<Set<string>>(new Set());
	let currentIndex = $state(0);
	let addingToWishlist = $state<string | null>(null);

	async function loadRecommendations(forceRefresh = false) {
		try {
			if (!forceRefresh) {
				loading = true;
			} else {
				refreshing = true;
			}
			error = null;

			const query = forceRefresh ? '?forceRefresh=1' : '';
			const response = await fetch(`/api/recommendations${query}`);
			const result = (await response.json()) as RecommendationsResponse;

			if (result.error) {
				error = result.error;
				recommendations = [];
				return;
			}

			recommendations = result.recommendations || [];
			fromCache = result.fromCache;
			currentIndex = 0;
		} catch (err) {
			console.error('Error loading recommendations:', err);
			error = 'Failed to load recommendations';
			recommendations = [];
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function loadWishlistStatus() {
		try {
			const { data } = await supabase
				.from('wishlists')
				.select('books(google_books_id)')
				.eq('user_id', userId);

			const ids = new Set(
				(data || [])
					.map((item: any) => item.books?.google_books_id)
					.filter((id: string | null): id is string => Boolean(id))
			);
			wishlistIds = ids;
		} catch (err) {
			console.error('Error loading wishlist status:', err);
		}
	}

	async function handleAddToWishlist(googleBooksId: string) {
		if (addingToWishlist === googleBooksId) return;

		addingToWishlist = googleBooksId;
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				goto('/login');
				return;
			}

			// Ensure the book exists in our DB
			const { data: existingBook } = await supabase
				.from('books')
				.select('id')
				.eq('google_books_id', googleBooksId)
				.single();

			const typedExisting = existingBook as { id: string } | null;
			let dbBookId = typedExisting?.id;

			if (!dbBookId) {
				const response = await fetch(`/api/books/fetch?id=${googleBooksId}`);
				if (!response.ok) {
					const payload = await response.json();
					throw new Error(payload.error || 'Unable to fetch book');
				}
				const payload = await response.json();
				dbBookId = payload.id;
			}

			const { error: insertError } = await supabase
				.from('wishlists')
				.insert({ user_id: user.id, book_id: dbBookId } as any);

			if (insertError && insertError.code !== '23505') {
				throw insertError;
			}

			wishlistIds = new Set([...wishlistIds, googleBooksId]);

			await fetch('/api/recommendations/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bookId: googleBooksId }),
			});
		} catch (err) {
			console.error('Error adding to wishlist:', err);
			alert(err instanceof Error ? err.message : 'Failed to add to wishlist');
		} finally {
			addingToWishlist = null;
		}
	}

	function goToPrevious() {
		if (!recommendations.length) return;
		currentIndex = (currentIndex - 1 + recommendations.length) % recommendations.length;
	}

	function goToNext() {
		if (!recommendations.length) return;
		currentIndex = (currentIndex + 1) % recommendations.length;
	}

	function handleThumbnailClick(index: number) {
		currentIndex = index;
	}

	onMount(() => {
		loadRecommendations();
		loadWishlistStatus();
	});
</script>

{#if loading && recommendations.length === 0}
	<div class="flex items-center justify-center py-12">
		<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
	</div>
{:else if error}
	<div class="space-y-3">
		<div class="flex items-center gap-2">
			<Sparkles class="h-4 w-4 text-primary" />
			<h2 class="text-lg font-semibold">Recommended For You</h2>
		</div>
		<div class="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
			<p class="text-sm text-muted-foreground">{error}</p>
		</div>
	</div>
{:else if recommendations.length > 0}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Sparkles class="h-4 w-4 text-primary" />
				<h2 class="text-lg font-semibold">Recommended For You</h2>
			</div>
			<button
				type="button"
				class="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
				onclick={() => loadRecommendations(true)}
				disabled={refreshing}
				aria-label="Refresh recommendations"
			>
				<RefreshCw class={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
			</button>
		</div>

		<div class="block md:hidden">
			<MobileRecommendationCarousel
				books={recommendations}
				onAddToWishlist={handleAddToWishlist}
				{wishlistIds}
				addingToWishlist={addingToWishlist}
			/>
		</div>

		<div class="hidden md:block">
			{#if recommendations[currentIndex]}
				<div class="rounded-lg border bg-card p-8">
					<div class="relative">
						<div class="mx-auto flex max-w-3xl flex-col gap-6">
							<div class="flex items-center justify-center gap-4">
								<button
									type="button"
									class="flex-shrink-0 rounded-full border bg-background/95 p-2 transition-colors hover:bg-accent"
									onclick={goToPrevious}
									aria-label="Previous recommendation"
								>
									<ChevronLeft class="h-5 w-5" />
								</button>
								<div class="flex gap-3">
									{#each recommendations as rec, index (rec.google_books_id)}
										<button
											type="button"
											class={`relative h-24 w-16 overflow-hidden rounded-md transition-all ${
												index === currentIndex
													? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
													: 'opacity-60 hover:opacity-100 hover:scale-105'
											}`}
											onclick={() => handleThumbnailClick(index)}
										>
											{#if rec.cover_url}
												<img
													src={rec.cover_url}
													alt={`Cover of ${rec.title}`}
													class="h-full w-full object-cover"
												/>
											{:else}
												<div class="flex h-full w-full items-center justify-center bg-muted">
													<BookMarked class="h-6 w-6 text-muted-foreground" />
												</div>
											{/if}
										</button>
									{/each}
								</div>
								<button
									type="button"
									class="flex-shrink-0 rounded-full border bg-background/95 p-2 transition-colors hover:bg-accent"
									onclick={goToNext}
									aria-label="Next recommendation"
								>
									<ChevronRight class="h-5 w-5" />
								</button>
							</div>

							<div class="flex flex-col gap-4">
								<a href={`/book/${recommendations[currentIndex].google_books_id}`}>
									<h3 class="text-xl font-bold transition-colors hover:text-primary">
										{recommendations[currentIndex].title}
									</h3>
								</a>
								<p class="text-sm text-muted-foreground">
									by {recommendations[currentIndex].authors.join(', ')}
								</p>
								<div class="rounded-lg border border-primary/10 bg-primary/5 p-4">
									<p class="text-sm font-medium italic text-primary/90">
										{recommendations[currentIndex].reason}
									</p>
								</div>
								<p class="text-sm leading-relaxed text-muted-foreground">
									{recommendations[currentIndex].blurb}
								</p>

								{#if !wishlistIds.has(recommendations[currentIndex].google_books_id)}
									<button
										type="button"
										class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
										onclick={() => handleAddToWishlist(recommendations[currentIndex].google_books_id)}
										disabled={addingToWishlist === recommendations[currentIndex].google_books_id}
									>
										{#if addingToWishlist === recommendations[currentIndex].google_books_id}
											<span class="flex items-center gap-2">
												<Loader2 class="h-5 w-5 animate-spin" />
												<span>Adding...</span>
											</span>
										{:else}
											<span class="flex items-center gap-2">
												<BookMarked class="h-5 w-5" />
												<span>Want to Read</span>
											</span>
										{/if}
									</button>
								{:else}
									<div class="text-sm text-muted-foreground">Already in your wishlist</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="mt-8 flex justify-center gap-2">
						{#each recommendations as _, index (index)}
							<button
								type="button"
								class={`h-2 rounded-full transition-all ${
									index === currentIndex
										? 'w-8 bg-primary'
										: 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
								}`}
								onclick={() => handleThumbnailClick(index)}
								aria-label={`Go to recommendation ${index + 1}`}
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<p class="text-xs text-muted-foreground">AI-powered • Refreshes after 5 days or 3 wishlist adds</p>
	</div>
{/if}
