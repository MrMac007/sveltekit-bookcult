<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import GroupHeader from '$lib/components/groups/group-header.svelte';
	import GroupMembers from '$lib/components/groups/group-members.svelte';
	import GroupGoalSection from '$lib/components/groups/group-goal-section.svelte';
	import CurrentBookSection from '$lib/components/groups/current-book-section.svelte';
	import GroupRatings from '$lib/components/groups/group-ratings.svelte';
	import UpNextSection from '$lib/components/groups/up-next-section.svelte';
	import SuggestionSection from '$lib/components/groups/suggestion-section.svelte';
	import ManageReadingList from '$lib/components/groups/manage-reading-list.svelte';
	import Tabs from '$lib/components/ui/tabs.svelte';
	import TabsList from '$lib/components/ui/tabs-list.svelte';
	import TabsTrigger from '$lib/components/ui/tabs-trigger.svelte';
	import TabsContent from '$lib/components/ui/tabs-content.svelte';
	import { Star, Lightbulb, BookOpen, Settings } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pageTitle = `${data.group.name} - BookCult`;
	const pageDescription = data.group.description
		? data.group.description.slice(0, 160) + (data.group.description.length > 160 ? '...' : '')
		: `${data.group.name} book club on BookCult. ${data.members.length} members.`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={data.group.name} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.group.name} />
	<meta name="twitter:description" content={pageDescription} />
</svelte:head>

<AppLayout title={data.group.name} showLogo={false}>
	<div class="mx-auto max-w-5xl px-4 py-6">
		<div class="space-y-6">
			<GroupHeader group={data.group} />

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<!-- Main Content with Tabs -->
				<div class="order-2 lg:order-1 lg:col-span-2">
					<Tabs value="ratings" class="w-full">
						<TabsList class="mb-4 w-full justify-start">
							<TabsTrigger value="ratings" class="flex items-center gap-1.5">
								<Star class="h-4 w-4" />
								<span class="hidden sm:inline">Ratings</span>
							</TabsTrigger>
							<TabsTrigger value="suggestions" class="flex items-center gap-1.5">
								<Lightbulb class="h-4 w-4" />
								<span class="hidden sm:inline">Suggestions</span>
							</TabsTrigger>
							<TabsTrigger value="reading-list" class="flex items-center gap-1.5">
								<BookOpen class="h-4 w-4" />
								<span class="hidden sm:inline">Reading List</span>
							</TabsTrigger>
							{#if data.group.isAdmin}
								<TabsTrigger value="manage" class="flex items-center gap-1.5">
									<Settings class="h-4 w-4" />
									<span class="hidden sm:inline">Manage</span>
								</TabsTrigger>
							{/if}
						</TabsList>

						<TabsContent value="ratings">
							<GroupRatings ratings={data.ratings} currentUserId={data.currentUserId} />
						</TabsContent>

						<TabsContent value="suggestions">
							<SuggestionSection
								groupId={data.group.id}
								isAdmin={data.group.isAdmin}
								round={data.suggestions.round}
								userSuggestions={data.suggestions.userSuggestions}
								results={data.suggestions.results}
							/>
						</TabsContent>

						<TabsContent value="reading-list">
							<UpNextSection
								books={data.upNextBooks}
								isAdmin={data.group.isAdmin}
								groupId={data.group.id}
							/>
						</TabsContent>

						{#if data.group.isAdmin}
							<TabsContent value="manage">
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
							</TabsContent>
						{/if}
					</Tabs>
				</div>

				<!-- Sidebar -->
				<div class="order-1 space-y-6 lg:order-2 lg:col-span-1">
					<CurrentBookSection
						currentBook={data.group.currentBook}
						isCurrentUserReading={data.group.isCurrentUserReading}
						readingMembers={data.group.readingMembers}
						groupId={data.group.id}
						currentUserId={data.currentUserId}
						isAdmin={data.group.isAdmin}
						deadline={data.group.current_book_deadline}
						hasUserCompleted={data.group.hasUserCompletedCurrentBook}
					/>

					<GroupGoalSection
						target={data.groupGoal.target}
						completed={data.groupGoal.completed}
						year={data.groupGoal.year}
						isAdmin={data.group.isAdmin}
						groupId={data.group.id}
					/>

					<GroupMembers
						members={data.members}
						currentUserId={data.currentUserId}
						isAdmin={data.group.isAdmin}
						groupId={data.group.id}
					/>
				</div>
			</div>
		</div>
	</div>
</AppLayout>
