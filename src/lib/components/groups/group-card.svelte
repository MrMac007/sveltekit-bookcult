<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Crown, Users } from 'lucide-svelte';

	interface Props {
		group: {
			id: string;
			name: string;
			description?: string | null;
			memberCount: number;
			isAdmin: boolean;
		};
	}

	let { group }: Props = $props();
</script>

<a href="/groups/{group.id}" class="block">
	<Card class="transition-colors hover:bg-accent/50">
		<CardContent class="p-4">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<h3 class="text-lg font-semibold">{group.name}</h3>
						{#if group.isAdmin}
							<Badge variant="secondary" class="gap-1 text-xs">
								<Crown class="h-3 w-3" />
								Admin
							</Badge>
						{/if}
					</div>
					{#if group.description}
						<p class="mt-1 text-sm text-muted-foreground line-clamp-2">
							{group.description}
						</p>
					{/if}
					<div class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
						<Users class="h-3.5 w-3.5" />
						<span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</a>
