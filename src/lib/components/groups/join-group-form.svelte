<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

	let isSubmitting = $state(false);
	let errorMessage = $state('');
</script>

<Card>
	<CardHeader>
		<CardTitle>Join a Reading Group</CardTitle>
		<CardDescription>
			Enter an invite code to join an existing group
		</CardDescription>
	</CardHeader>
	<CardContent>
		<form
			method="POST"
			action="?/joinGroup"
			use:enhance={() => {
				isSubmitting = true;
				errorMessage = '';

				return async ({ result, update }) => {
					isSubmitting = false;

					if (result.type === 'failure') {
						const data = result.data as { error?: string } | undefined;
						errorMessage = data?.error || 'Failed to join group';
					}
					// Redirect is handled by the server action via throw redirect()
					// SvelteKit will automatically follow the redirect
					await update();
				};
			}}
		>
			<div class="space-y-4">
				{#if errorMessage}
					<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
						{errorMessage}
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="inviteCode">Invite Code *</Label>
					<Input
						id="inviteCode"
						name="inviteCode"
						type="text"
						required
						maxlength={8}
						placeholder="Enter 8-character code"
						class="font-mono tracking-wider uppercase"
						oninput={(e) => {
							const input = e.target as HTMLInputElement;
							input.value = input.value.toUpperCase();
						}}
						disabled={isSubmitting}
					/>
					<p class="text-xs text-muted-foreground">
						Ask a group admin for their invite code
					</p>
				</div>

				<div class="flex gap-3 pt-4">
					<Button type="submit" disabled={isSubmitting} class="flex-1">
						{isSubmitting ? 'Joining...' : 'Join Group'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onclick={() => goto('/groups')}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
				</div>
			</div>
		</form>
	</CardContent>
</Card>
