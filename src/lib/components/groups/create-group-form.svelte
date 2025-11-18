<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Generate 8-character invite code (uppercase alphanumeric, excluding I, O for clarity)
	function generateInviteCode(): string {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let code = '';
		for (let i = 0; i < 8; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return code;
	}

	const inviteCode = $state(generateInviteCode());
</script>

<Card>
	<CardHeader>
		<CardTitle>Create a Reading Group</CardTitle>
		<CardDescription>
			Start a new reading group and invite friends to join
		</CardDescription>
	</CardHeader>
	<CardContent>
		<form
			method="POST"
			action="?/createGroup"
			use:enhance={() => {
				isSubmitting = true;
				errorMessage = '';

				return async ({ result, update }) => {
					isSubmitting = false;

					if (result.type === 'failure') {
						errorMessage = result.data?.error || 'Failed to create group';
					}
					// Redirect is handled by the server action via throw redirect()
					// No need to handle success case - SvelteKit will follow the redirect
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
					<Label for="name">Group Name *</Label>
					<Input
						id="name"
						name="name"
						type="text"
						required
						maxlength={50}
						placeholder="e.g., Mystery Book Club"
						disabled={isSubmitting}
					/>
				</div>

				<div class="space-y-2">
					<Label for="description">Description (optional)</Label>
					<Textarea
						id="description"
						name="description"
						maxlength={200}
						placeholder="What's your group about?"
						rows={3}
						disabled={isSubmitting}
					/>
				</div>

				<div class="space-y-2">
					<Label>Invite Code</Label>
					<Input
						type="text"
						value={inviteCode}
						readonly
						class="font-mono tracking-wider"
					/>
					<input type="hidden" name="inviteCode" value={inviteCode} />
					<p class="text-xs text-muted-foreground">
						Share this code with others to let them join your group
					</p>
				</div>

				<div class="flex gap-3 pt-4">
					<Button type="submit" disabled={isSubmitting} class="flex-1">
						{isSubmitting ? 'Creating...' : 'Create Group'}
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
