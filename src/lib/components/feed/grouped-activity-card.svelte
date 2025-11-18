<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { BookMarked, ChevronDown, ChevronUp } from 'lucide-svelte';
	import ActivityCard from './activity-card.svelte';
	import type { ActivityGroup } from '$lib/utils/group-activities';

	interface Props {
		group: ActivityGroup;
	}

	let { group }: Props = $props();
	let isExpanded = $state(false);

	const COLLAPSE_THRESHOLD = 5;
	const INITIAL_VISIBLE_COUNT = 4;

	const shouldCollapse = $derived(group.activities.length >= COLLAPSE_THRESHOLD);
	const visibleActivities = $derived(
		shouldCollapse && !isExpanded
			? group.activities.slice(0, INITIAL_VISIBLE_COUNT)
			: group.activities
	);
	const hiddenCount = $derived(Math.max(group.activities.length - INITIAL_VISIBLE_COUNT, 0));

	function formatTimeRange() {
		const now = new Date();
		const oldest = new Date(group.oldestDate);
		const diffInDays = Math.floor((now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return 'Today';
		if (diffInDays === 1) return 'Since yesterday';
		if (diffInDays < 7) return `Last ${diffInDays} days`;
		return 'Last week';
	}
</script>

<Card>
	<CardContent class="p-4">
		<div class="mb-4 flex gap-3 border-b pb-4">
			<a
				href={`/book/${group.book_id}`}
				class="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted transition-opacity hover:opacity-80"
			>
				{#if group.book_cover}
					<img
						src={group.book_cover}
						alt={group.book_title}
						class="h-full w-full object-cover"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center">
						<BookMarked class="h-6 w-6 text-muted-foreground" />
					</div>
				{/if}
			</a>

			<div class="min-w-0 flex-1">
				<a href={`/book/${group.book_id}`}>
					<h3 class="font-semibold leading-tight line-clamp-2 transition-colors hover:text-primary">
						{group.book_title}
					</h3>
				</a>
				{#if group.book_authors && group.book_authors.length > 0}
					<p class="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
						by {group.book_authors.join(', ')}
					</p>
				{/if}
				<div class="mt-2 flex items-center gap-2 text-xs">
					<span class="font-medium text-primary">
						{group.activities.length}
						{group.activities.length === 1 ? ' interaction' : ' interactions'}
					</span>
					<span class="text-muted-foreground">•</span>
					<span class="text-muted-foreground">{formatTimeRange()}</span>
				</div>
			</div>
		</div>

		<div class="space-y-3">
			{#each visibleActivities as activity (activity.id)}
				<ActivityCard activity={activity} compact />
			{/each}
		</div>

		{#if shouldCollapse}
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (isExpanded = !isExpanded)}
				class="mt-3 w-full text-sm"
			>
				{#if isExpanded}
					<ChevronUp class="mr-1.5 h-4 w-4" />
					Show less
				{:else}
					<ChevronDown class="mr-1.5 h-4 w-4" />
					Show {hiddenCount} more {hiddenCount === 1 ? 'interaction' : 'interactions'}
				{/if}
			</Button>
		{/if}
	</CardContent>
</Card>
