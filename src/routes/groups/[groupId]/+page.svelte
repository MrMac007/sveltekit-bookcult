<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import GroupHeader from '$lib/components/groups/group-header.svelte';
	import GroupMembers from '$lib/components/groups/group-members.svelte';
	import CurrentBookSection from '$lib/components/groups/current-book-section.svelte';
	import GroupRatings from '$lib/components/groups/group-ratings.svelte';
	import UpNextSection from '$lib/components/groups/up-next-section.svelte';
	import ManageReadingList from '$lib/components/groups/manage-reading-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title={data.group.name} showLogo={false}>
	<div class="mx-auto max-w-5xl px-4 py-6">
		<div class="space-y-6">
				<GroupHeader group={data.group} />

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div class="order-2 space-y-6 lg:order-1 lg:col-span-2">
						<GroupRatings ratings={data.ratings} currentUserId={data.currentUserId} />
					</div>

					<div class="order-1 space-y-6 lg:order-2 lg:col-span-1">
						<GroupMembers
							members={data.members}
							currentUserId={data.currentUserId}
							isAdmin={data.group.isAdmin}
							groupId={data.group.id}
						/>

						<CurrentBookSection
							currentBook={data.group.currentBook}
							isCurrentUserReading={data.group.isCurrentUserReading}
							readingMembers={data.group.readingMembers}
							groupId={data.group.id}
							currentUserId={data.currentUserId}
							isAdmin={data.group.isAdmin}
						/>

						<UpNextSection
							books={data.upNextBooks}
							isAdmin={data.group.isAdmin}
							groupId={data.group.id}
						/>

						{#if data.group.isAdmin}
							<ManageReadingList
								group={{
									id: data.group.id,
									name: data.group.name,
									current_book_id: data.group.current_book_id
								}}
								userId={data.currentUserId}
								initialBooks={data.readingListBooks}
								isAdmin={data.group.isAdmin}
							/>
						{/if}
					</div>
				</div>
		</div>
	</div>
</AppLayout>
