<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import ActivityCard from '$lib/components/feed/activity-card.svelte';
	import GroupedActivityCard from '$lib/components/feed/grouped-activity-card.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import { isActivityGroup } from '$lib/utils/group-activities';
	import { Activity } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title="Feed">
	<div class="mx-auto max-w-2xl px-4 py-6">
		{#if !data.feedItems || data.feedItems.length === 0}
			<EmptyState
				icon={Activity}
				title="No recent activity"
				message="No recent activity from users you follow. Check back later to see what your friends are reading!"
			/>
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
