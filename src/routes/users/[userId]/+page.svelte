<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import FollowButton from '$lib/components/profile/follow-button.svelte';
	import { StarRating } from '$lib/components/ui/star-rating';
	import { Users, BookMarked, BookCheck, Star, BookOpen } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title={data.profile.display_name || data.profile.username}>
	<div class="mx-auto max-w-4xl px-4 py-6 space-y-6">
		<Card>
			<CardContent class="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">
				<div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
					{data.profile.display_name?.[0]?.toUpperCase() ||
					data.profile.username[0]?.toUpperCase()}
				</div>
				<div class="flex-1 space-y-3">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 class="page-heading text-xl">
								{data.profile.display_name || data.profile.username}
							</h1>
							<p class="text-muted-foreground">@{data.profile.username}</p>
						</div>
						<div class="w-full sm:w-auto">
							<FollowButton userId={data.profile.id} isFollowing={data.isFollowing} class="sm:w-auto" />
						</div>
					</div>
					{#if data.profile.bio}
						<p class="text-sm text-foreground/80">{data.profile.bio}</p>
					{/if}
					<div class="flex gap-6 text-sm text-muted-foreground">
						<div>
							<span class="font-semibold text-foreground">{data.followerCount}</span> Followers
						</div>
						<div>
							<span class="font-semibold text-foreground">{data.followingCount}</span> Following
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<div class="grid gap-4 sm:grid-cols-3">
			<Card>
				<CardContent class="pt-6 text-center">
					<BookMarked class="mx-auto mb-2 h-6 w-6 text-primary" />
					<p class="page-heading text-xl">{data.wishlistCount}</p>
					<p class="meta-label mt-1">Wishlist</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="pt-6 text-center">
					<BookCheck class="mx-auto mb-2 h-6 w-6 text-primary" />
					<p class="page-heading text-xl">{data.completedCount}</p>
					<p class="meta-label mt-1">Completed</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="pt-6 text-center">
					<Star class="mx-auto mb-2 h-6 w-6 text-primary" />
					<p class="page-heading text-xl">{data.ratingsCount}</p>
					<p class="meta-label mt-1">Ratings</p>
				</CardContent>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card>
				<CardContent class="p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="font-semibold">Wishlist</h3>
						<Badge variant="secondary">{data.wishlistBooks.length}</Badge>
					</div>
					{#if data.wishlistBooks.length === 0}
						<p class="text-sm text-muted-foreground">No wishlist books yet.</p>
					{:else}
						<div class="space-y-3">
							{#each data.wishlistBooks as item (item.id)}
								<a
									href={`/book/${item.books.id}`}
									class="flex items-center gap-3 rounded-md p-2 hover:bg-accent/40"
								>
									<div class="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
										{#if item.books.cover_url}
											<img src={item.books.cover_url} alt={item.books.title} class="h-full w-full object-cover" />
										{:else}
											<BookMarked class="mx-auto h-4 w-4 text-muted-foreground" />
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium line-clamp-1">{item.books.title}</p>
										{#if item.books.authors && item.books.authors.length > 0}
											<p class="text-xs text-muted-foreground line-clamp-1">
												{item.books.authors.join(', ')}
											</p>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
			<Card>
				<CardContent class="p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="font-semibold">Completed</h3>
						<Badge variant="secondary">{data.completedBooks.length}</Badge>
					</div>
					{#if data.completedBooks.length === 0}
						<p class="text-sm text-muted-foreground">No completed books yet.</p>
					{:else}
						<div class="space-y-3">
							{#each data.completedBooks as item (item.id)}
								<a
									href={`/book/${item.books.id}`}
									class="flex items-center gap-3 rounded-md p-2 hover:bg-accent/40"
								>
									<div class="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
										{#if item.books.cover_url}
											<img src={item.books.cover_url} alt={item.books.title} class="h-full w-full object-cover" />
										{:else}
											<BookCheck class="mx-auto h-4 w-4 text-muted-foreground" />
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium line-clamp-1">{item.books.title}</p>
										{#if item.books.authors && item.books.authors.length > 0}
											<p class="text-xs text-muted-foreground line-clamp-1">
												{item.books.authors.join(', ')}
											</p>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardContent class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-semibold">Currently Reading</h3>
					<Badge variant="secondary">{data.currentlyReading.length}</Badge>
				</div>
				{#if data.currentlyReading.length === 0}
					<p class="text-sm text-muted-foreground">Not reading anything right now.</p>
				{:else}
					<div class="space-y-3">
						{#each data.currentlyReading as item (item.id)}
							<a
								href={`/book/${item.books.id}`}
								class="flex items-center gap-3 rounded-md p-2 hover:bg-accent/40"
							>
								<div class="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
									{#if item.books.cover_url}
										<img src={item.books.cover_url} alt={item.books.title} class="h-full w-full object-cover" />
									{:else}
										<BookOpen class="mx-auto h-4 w-4 text-muted-foreground" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium line-clamp-1">{item.books.title}</p>
									{#if item.books.authors && item.books.authors.length > 0}
										<p class="text-xs text-muted-foreground line-clamp-1">
											{item.books.authors.join(', ')}
										</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardContent class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-semibold flex items-center gap-2">
						<Users class="h-4 w-4" />
						Recent Ratings
					</h3>
					<Badge variant="secondary">{data.recentRatings.length}</Badge>
				</div>
				{#if data.recentRatings.length === 0}
					<p class="text-sm text-muted-foreground">No ratings yet.</p>
				{:else}
					<div class="space-y-4">
						{#each data.recentRatings as rating (rating.id)}
							<div class="flex gap-3 border-b pb-4 last:border-b-0 last:pb-0">
								<a
									href={`/book/${rating.books.id}`}
									class="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-muted"
								>
									{#if rating.books.cover_url}
										<img
											src={rating.books.cover_url}
											alt={rating.books.title}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div class="flex h-full w-full items-center justify-center">
											<Star class="h-5 w-5 text-muted-foreground" />
										</div>
									{/if}
								</a>
								<div class="flex-1">
									<a href={`/book/${rating.books.id}`} class="font-medium hover:underline">
										{rating.books.title}
									</a>
									{#if rating.books.authors && rating.books.authors.length > 0}
										<p class="text-xs text-muted-foreground line-clamp-1">
											{rating.books.authors.join(', ')}
										</p>
									{/if}
									<div class="mt-2 flex items-center gap-2">
										<StarRating value={rating.rating} readonly size="sm" />
										<span class="text-xs text-muted-foreground">
											{new Date(rating.created_at).toLocaleDateString()}
										</span>
									</div>
									{#if rating.review}
										<p class="mt-1 text-xs text-foreground/80 line-clamp-2">
											{rating.review}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</AppLayout>
