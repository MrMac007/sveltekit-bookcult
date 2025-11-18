<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import ActivityCard from '$lib/components/feed/activity-card.svelte';
	import GroupedActivityCard from '$lib/components/feed/grouped-activity-card.svelte';
	import { isActivityGroup } from '$lib/utils/group-activities';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title="Feed">
	<div class="mx-auto max-w-2xl px-4 py-6">
		{#if !data.feedItems || data.feedItems.length === 0}
			<Card>
				<CardContent class="p-8 text-center">
					<p class="text-muted-foreground">No recent activity from users you follow.</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Check back later to see what your friends are reading!
					</p>
				</CardContent>
			</Card>
		{:else}
			<div class="space-y-4">
				{#each data.feedItems as item (isActivityGroup(item) ? `group-${item.book_id}` : item.id)}
					{#if isActivityGroup(item)}
						<GroupedActivityCard group={item} />
					{:else}
						<ActivityCard activity={item} />
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</AppLayout>
