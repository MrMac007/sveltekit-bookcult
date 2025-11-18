<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import GroupCard from '$lib/components/groups/group-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Users } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title="Groups">
	<div class="mx-auto max-w-5xl px-4 py-6">
		<!-- Action buttons -->
		<div class="mb-6 flex items-center justify-end gap-2">
			<Button href="/groups/join" variant="outline" size="sm">
				Join
			</Button>
			<Button href="/groups/create" size="sm" class="gap-1.5">
				<Plus class="h-4 w-4" />
				Create
			</Button>
		</div>

		{#if data.groups.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
					<Users class="h-10 w-10 text-primary" />
				</div>
				<h2 class="mb-2 text-xl font-semibold">No Groups Yet</h2>
				<p class="mb-6 max-w-md text-sm text-muted-foreground">
					Create a group to share book ratings with friends, or join an existing group with an invite code.
				</p>
				<div class="flex gap-3">
					<Button href="/groups/join" variant="outline">
						Join Group
					</Button>
					<Button href="/groups/create">
						Create Group
					</Button>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				{#each data.groups as group}
					<GroupCard {group} />
				{/each}
			</div>
		{/if}
	</div>
</AppLayout>
