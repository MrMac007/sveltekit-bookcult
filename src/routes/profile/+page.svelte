<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import StatCard from '$lib/components/ui/stat-card.svelte';
	import { User, BookCheck, BookOpen, LogOut } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
		<div class="mb-8 grid grid-cols-1 sm:grid-cols-3 items-stretch gap-3">
			<StatCard icon={BookOpen} value={data.wishlistCount} label="Want to Read" href="/wishlist" />
			<StatCard
				icon={BookOpen}
				value={data.currentlyReadingCount}
				label="Currently Reading"
				href="/currently-reading"
			/>
			<StatCard icon={BookCheck} value={data.completedCount} label="Completed" href="/completed" />
		</div>


		<!-- Actions -->
		<div class="space-y-3">
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
	</div>
</AppLayout>
