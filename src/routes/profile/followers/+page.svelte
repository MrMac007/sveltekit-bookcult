<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import FollowButton from '$lib/components/profile/follow-button.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<AppLayout title="Followers">
	<div class="mx-auto max-w-2xl px-4 py-6">
		<Card>
			<CardContent class="p-4">
				{#if !data.followers || data.followers.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						<p>No followers yet</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Share your profile with friends to grow your network!
						</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.followers as follower (follower.id)}
							<div class="flex items-center gap-4 rounded-md p-3 hover:bg-accent/50">
								<a href={`/users/${follower.follower_id}`}>
									<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold transition-colors hover:bg-primary/20">
										{follower.profiles?.display_name?.[0]?.toUpperCase() ||
										follower.profiles?.username?.[0]?.toUpperCase() ||
										'?'}
									</div>
								</a>
								<div class="flex-1">
									<a href={`/users/${follower.follower_id}`} class="hover:underline">
										<p class="font-medium">
											{follower.profiles?.display_name ||
											follower.profiles?.username ||
											'Unknown User'}
										</p>
									</a>
									<p class="text-sm text-muted-foreground">
										@{follower.profiles?.username}
									</p>
								</div>
								<FollowButton
									userId={follower.follower_id}
									isFollowing={follower.isFollowingBack}
									size="sm"
									class="w-auto"
								/>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</AppLayout>
