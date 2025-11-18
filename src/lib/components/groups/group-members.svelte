<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Users, UserMinus, ShieldCheck, ShieldOff } from 'lucide-svelte';

	interface Member {
		id: string;
		role: 'member' | 'admin';
		joined_at: string;
		profiles: {
			id: string;
			username: string;
			display_name: string | null;
			avatar_url: string | null;
		};
	}

	interface Props {
		members: Member[];
		currentUserId: string;
		isAdmin: boolean;
		groupId: string;
	}

	let { members, currentUserId, isAdmin, groupId }: Props = $props();

	function getDisplayName(member: Member): string {
		return member.profiles.display_name || member.profiles.username;
	}

	function getInitials(member: Member): string {
		const name = getDisplayName(member);
		return name.substring(0, 2).toUpperCase();
	}
</script>

<Card class="rounded-3xl border border-primary/15 bg-background">
	<CardHeader>
		<CardTitle class="flex items-center justify-between">
			<span class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				Members ({members.length})
			</span>
		</CardTitle>
	</CardHeader>
	<CardContent class="space-y-3">
		{#each members as member}
			<div class="flex items-center justify-between rounded-2xl border border-primary/10 bg-muted/40 p-3">
				<div class="flex items-center gap-3">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
						{getInitials(member)}
					</div>
					<div class="flex items-center gap-3">
						<div>
							<div class="flex items-center gap-2">
								<a
									href="/users/{member.profiles.id}"
									class="font-medium hover:underline"
								>
									{getDisplayName(member)}
								</a>
								{#if member.role === 'admin'}
									<Badge variant="secondary" class="text-xs">Admin</Badge>
								{/if}
								{#if member.profiles.id === currentUserId}
									<Badge variant="outline" class="text-xs">You</Badge>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">
								@{member.profiles.username}
							</p>
						</div>
					</div>
				</div>

				{#if isAdmin && member.profiles.id !== currentUserId}
					<div class="flex items-center gap-1">
						<form method="POST" action="?/updateMemberRole" use:enhance>
							<input type="hidden" name="groupId" value={groupId} />
							<input type="hidden" name="userId" value={member.profiles.id} />
							<input
								type="hidden"
								name="newRole"
								value={member.role === 'admin' ? 'member' : 'admin'}
							/>
							<Button
								type="submit"
								size="sm"
								variant="ghost"
								title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
								class="h-8 w-8 p-0"
							>
								{#if member.role === 'admin'}
									<ShieldOff class="h-4 w-4" />
								{:else}
									<ShieldCheck class="h-4 w-4" />
								{/if}
							</Button>
						</form>

						<form method="POST" action="?/removeMember" use:enhance>
							<input type="hidden" name="groupId" value={groupId} />
							<input type="hidden" name="userId" value={member.profiles.id} />
							<Button
								type="submit"
								size="sm"
								variant="ghost"
								class="h-8 w-8 p-0 text-destructive hover:text-destructive"
								title="Remove from group"
							>
								<UserMinus class="h-4 w-4" />
							</Button>
						</form>
					</div>
				{/if}
			</div>
		{/each}
	</CardContent>
</Card>
