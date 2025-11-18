<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Copy, Check, Users, Crown, BookMarked } from 'lucide-svelte';

	interface Props {
		group: {
			id: string;
			name: string;
			description?: string | null;
			invite_code: string;
			isAdmin: boolean;
			memberCount: number;
			current_book_id?: string | null;
		};
	}

	let { group }: Props = $props();

	let copied = $state(false);

	function copyInviteCode() {
		navigator.clipboard.writeText(group.invite_code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<Card class="rounded-3xl border border-primary/15 bg-background">
	<CardContent class="p-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start">
			<div class="flex-1 space-y-3">
				<div class="flex items-center gap-2">
					<h1 class="page-heading text-xl">{group.name}</h1>
					{#if group.isAdmin}
						<Badge variant="secondary" class="gap-1">
							<Crown class="h-3 w-3" />
							Admin
						</Badge>
					{/if}
				</div>

				{#if group.description}
					<p class="text-sm text-muted-foreground">
						{group.description}
					</p>
				{/if}

				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<Users class="h-4 w-4" />
					<span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
				</div>
			</div>

			{#if group.isAdmin}
				<div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto lg:flex-col">
					<Button
						href="/groups/{group.id}/reading-list"
						variant="outline"
						size="sm"
						class="gap-1.5"
					>
						<BookMarked class="h-4 w-4" />
						Manage Reading List
					</Button>
				</div>
			{/if}
		</div>

		<div class="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div class="flex-1">
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						Invite Code
					</p>
					<p class="mt-2 font-mono text-2xl font-semibold tracking-[0.4em]">
						{group.invite_code}
					</p>
				</div>
				<Button variant="outline" size="sm" onclick={copyInviteCode} class="gap-2">
					{#if copied}
						<span class="inline-flex items-center gap-2">
							<Check class="h-4 w-4" />
							Copied!
						</span>
					{:else}
						<span class="inline-flex items-center gap-2">
							<Copy class="h-4 w-4" />
							Copy
						</span>
					{/if}
				</Button>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Share this code with friends to invite them to the group
			</p>
		</div>
	</CardContent>
</Card>
