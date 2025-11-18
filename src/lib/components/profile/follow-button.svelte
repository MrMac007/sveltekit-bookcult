<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { UserPlus, UserMinus } from 'lucide-svelte';

interface Props {
	userId: string;
	isFollowing: boolean;
	size?: 'default' | 'sm' | 'lg';
	variant?: 'default' | 'secondary' | 'outline' | 'ghost';
	class?: string;
}

let {
	userId,
	isFollowing,
	size = 'default',
	variant = 'default',
	class: className = ''
}: Props = $props();

const actionPath = $derived(isFollowing ? '?/unfollow' : '?/follow');
</script>

<form method="POST" action={actionPath} class={className}>
	<input type="hidden" name="targetUserId" value={userId} />
	<Button type="submit" variant={isFollowing ? 'outline' : variant} size={size} class="gap-2">
		{#if isFollowing}
			<UserMinus class="h-4 w-4" />
			Unfollow
		{:else}
			<UserPlus class="h-4 w-4" />
			Follow
		{/if}
	</Button>
</form>
