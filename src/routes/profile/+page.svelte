<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import StatCard from '$lib/components/ui/stat-card.svelte';
	import ReadingGoalCard from '$lib/components/profile/reading-goal-card.svelte';
	import CurrentlyReadingSection from '$lib/components/profile/currently-reading-section.svelte';
	import QuoteWall from '$lib/components/profile/quote-wall.svelte';
	import QuoteWallEditor from '$lib/components/profile/quote-wall-editor.svelte';
	import { User, BookCheck, BookOpen, BookMarked, LogOut, Settings } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import DialogDescription from '$lib/components/ui/dialog-description.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let editDialogOpen = $state(false);
	let quoteWallEditorOpen = $state(false);
</script>

<AppLayout title="Profile">
	<div class="mx-auto max-w-2xl px-4 py-6">
		<!-- Profile Header -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
				{#if data.profile.avatar_url}
					<img
						src={data.profile.avatar_url}
						alt={data.profile.username}
						class="h-full w-full rounded-full object-cover"
					/>
				{:else}
					<User class="h-12 w-12 text-primary" />
				{/if}
			</div>
			<h1 class="page-heading text-xl">
				{data.profile.display_name || data.profile.username}
			</h1>
			{#if data.profile.display_name && data.profile.username !== data.profile.display_name}
				<p class="text-muted-foreground">@{data.profile.username}</p>
			{/if}
			{#if data.profile.bio}
				<p class="mt-2 text-sm text-foreground/80">{data.profile.bio}</p>
			{/if}
		</div>

		<!-- Stats -->
		<div class="mb-8 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4 sm:gap-3">
			<StatCard icon={BookMarked} value={data.wishlistCount} label="Want to Read" href="/wishlist" />
			<StatCard
				icon={BookOpen}
				value={data.currentlyReadingCount}
				label="Currently Reading"
				href="/currently-reading"
			/>
			<StatCard icon={BookCheck} value={data.completedCount} label="Completed" href="/completed" />
			<ReadingGoalCard
				target={data.readingGoal.target}
				completed={data.readingGoal.completed}
				year={data.readingGoal.year}
				isOwnProfile={true}
			/>
		</div>

		<!-- Currently Reading Section -->
		<CurrentlyReadingSection books={data.currentlyReading} class="mb-8" />

		<!-- Quote Wall Section -->
		<QuoteWall
			quotes={data.userQuotes}
			favoriteBooks={data.favoriteBooks}
			wallStyle={data.wallStyle}
			isEditable={true}
			onEditClick={() => quoteWallEditorOpen = true}
			class="mb-8"
		/>

		<!-- Actions -->
		<div class="space-y-3">
			<Button 
				variant="outline" 
				class="w-full"
				onclick={() => editDialogOpen = true}
			>
				<Settings class="mr-2 h-4 w-4" />
				Edit Profile
			</Button>

			<form 
				method="POST" 
				action="/auth/signout" 
				use:enhance={() => {
					return async ({ result }) => {
						await invalidateAll();
						await goto('/', { replaceState: true });
					};
				}}
				class="w-full"
			>
				<Button type="submit" variant="destructive" class="w-full">
					<LogOut class="mr-2 h-4 w-4" />
					Sign Out
				</Button>
			</form>
		</div>
		
		<!-- Edit Profile Dialog -->
		<Dialog bind:open={editDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
					<DialogDescription>
						Coming Soon
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>

		<!-- Quote Wall Editor Dialog -->
		<QuoteWallEditor
			bind:open={quoteWallEditorOpen}
			currentStyle={data.wallStyle}
			quotes={data.userQuotes}
			favoriteBooks={data.favoriteBooks}
			availableBooks={data.availableBooks}
			onClose={() => quoteWallEditorOpen = false}
		/>
	</div>
</AppLayout>
