<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { BookMarked, BookCheck, Star, Users, BookOpen } from 'lucide-svelte';
	import { formatRelativeTime } from '$lib/utils';
	import type { Activity } from '$lib/utils/group-activities';
	import type { ComponentType } from 'svelte';

	interface Props {
		activity: Activity;
		compact?: boolean;
	}

	let { activity, compact = false }: Props = $props();

	function getActivityIcon(): { icon: ComponentType; className: string } {
		switch (activity.activity_type) {
			case 'wishlist_add':
				return { icon: BookMarked, className: 'h-5 w-5 text-blue-500' };
			case 'book_complete':
				return { icon: BookCheck, className: 'h-5 w-5 text-green-500' };
			case 'rating_create':
			case 'rating_update':
				return { icon: Star, className: 'h-5 w-5 text-yellow-500 fill-yellow-500' };
			case 'group_book_add':
				return { icon: Users, className: 'h-5 w-5 text-purple-500' };
			case 'reading_started':
			default:
				return { icon: BookOpen, className: 'h-5 w-5 text-orange-500' };
		}
	}

	function getActivityText() {
		switch (activity.activity_type) {
			case 'wishlist_add':
				return 'added to wishlist';
			case 'book_complete':
				return 'completed';
			case 'rating_create':
				return 'rated';
			case 'rating_update':
				return 'updated rating for';
			case 'group_book_add':
				return activity.metadata?.group_name
					? `added to ${activity.metadata.group_name}'s reading list`
					: 'added to group reading list';
			case 'reading_started':
				return 'started reading';
			default:
				return 'updated';
		}
	}

	const metadata = activity.metadata || {};
	const profile = activity.profiles;
	const iconInfo = getActivityIcon();
</script>

{#if compact}
	<div class="flex gap-3 border-l-2 border-muted pl-3 py-2">
		<div class="mt-0.5 flex-shrink-0">
			<svelte:component this={iconInfo.icon} class={iconInfo.className} />
		</div>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				{#if profile}
					<a href={`/users/${profile.id}`} class="text-sm font-medium hover:underline">
						{profile.display_name || profile.username}
					</a>
				{:else}
					<span class="text-sm font-medium">Unknown user</span>
				{/if}
				<span class="text-sm text-muted-foreground">{getActivityText()}</span>
				<span class="text-xs text-muted-foreground">• {formatRelativeTime(activity.created_at)}</span>
			</div>

			{#if (activity.activity_type === 'rating_create' || activity.activity_type === 'rating_update') && metadata.rating}
				<div class="mt-1 flex items-center gap-2">
					<div class="flex items-center gap-1">
						<Star class="h-3.5 w-3.5 fill-primary text-primary" />
						<span class="text-sm font-semibold">{metadata.rating}</span>
					</div>
					{#if metadata.has_review}
						<span class="text-xs text-muted-foreground">with review</span>
					{/if}
				</div>
			{/if}

			{#if metadata.review_snippet}
				<p class="mt-1.5 line-clamp-2 text-sm italic text-foreground/80">
					"{metadata.review_snippet}"
				</p>
			{/if}
		</div>
	</div>
{:else}
	<Card>
		<CardContent class="p-4">
			<div class="flex gap-4">
				<div class="mt-1 flex-shrink-0">
					<svelte:component this={iconInfo.icon} class={iconInfo.className} />
				</div>
				<div class="min-w-0 flex-1">
					<div class="mb-2 flex items-center gap-2">
						{#if profile}
							<a href={`/users/${profile.id}`} class="font-medium hover:underline">
								{profile.display_name || profile.username}
							</a>
						{:else}
							<span class="font-medium">Unknown user</span>
						{/if}
						<span class="text-sm text-muted-foreground">{getActivityText()}</span>
						<span class="text-xs text-muted-foreground">• {formatRelativeTime(activity.created_at)}</span>
					</div>

					<div class="flex gap-3">
						{#if metadata.book_cover}
							{#if activity.book_id}
								<a
									href={`/book/${activity.book_id}`}
									class="flex-shrink-0 transition-opacity hover:opacity-80"
								>
									<img
										src={metadata.book_cover}
										alt={metadata.book_title ?? 'Book cover'}
										class="h-24 w-16 rounded object-cover"
									/>
								</a>
							{:else}
									<img
										src={metadata.book_cover}
										alt={metadata.book_title ?? 'Book cover'}
										class="h-24 w-16 flex-shrink-0 rounded object-cover"
									/>
							{/if}
						{/if}

						<div class="min-w-0 flex-1">
							{#if metadata.book_title}
								{#if activity.book_id}
									<a href={`/book/${activity.book_id}`}>
										<h3 class="font-medium leading-tight line-clamp-2 transition-colors hover:text-primary">
											{metadata.book_title}
										</h3>
									</a>
								{:else}
									<h3 class="font-medium leading-tight line-clamp-2">{metadata.book_title}</h3>
								{/if}
							{/if}

							{#if metadata.book_authors && metadata.book_authors.length > 0}
								<p class="text-sm text-muted-foreground line-clamp-1">
									{metadata.book_authors.join(', ')}
								</p>
							{/if}

							{#if (activity.activity_type === 'rating_create' ||
								activity.activity_type === 'rating_update') &&
								metadata.rating}
								<div class="mt-2 flex items-center gap-2">
									<div class="flex items-center gap-1">
										<Star class="h-4 w-4 fill-primary text-primary" />
										<span class="font-semibold">{metadata.rating}</span>
									</div>
									{#if metadata.has_review}
										<span class="text-xs text-muted-foreground">with review</span>
									{/if}
								</div>
							{/if}

							{#if metadata.review_snippet}
								<p class="mt-2 line-clamp-3 text-sm italic text-foreground/80">
									"{metadata.review_snippet}"
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
{/if}
