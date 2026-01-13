<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import { Target, Pencil, Loader2, Trash2 } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	interface Props {
		target: number | null;
		completed: number;
		year: number;
		isAdmin?: boolean;
		groupId: string;
	}

	let { target, completed, year, isAdmin = false, groupId }: Props = $props();

	let dialogOpen = $state(false);
	let isSubmitting = $state(false);
	let goalInput = $state(target?.toString() ?? '12');

	// Progress calculation
	const progress = $derived(target ? Math.min(100, (completed / target) * 100) : 0);
	const hasGoal = $derived(target !== null);

	function openDialog() {
		goalInput = target?.toString() ?? '12';
		dialogOpen = true;
	}

	async function handleSave() {
		const targetNum = parseInt(goalInput, 10);
		if (isNaN(targetNum) || targetNum < 1 || targetNum > 365) {
			toast.error('Please enter a number between 1 and 365');
			return;
		}

		isSubmitting = true;
		const formData = new FormData();
		formData.append('year', year.toString());
		formData.append('target', targetNum.toString());

		const response = await fetch('?/setGroupGoal', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		dialogOpen = false;

		if (response.ok) {
			toast.success('Group goal updated');
			invalidateAll();
		} else {
			toast.error('Failed to update goal');
		}
	}

	async function handleDelete() {
		if (!confirm('Remove the group reading goal for this year?')) return;

		isSubmitting = true;
		const formData = new FormData();
		formData.append('year', year.toString());

		const response = await fetch('?/deleteGroupGoal', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		dialogOpen = false;

		if (response.ok) {
			toast.success('Group goal removed');
			invalidateAll();
		} else {
			toast.error('Failed to remove goal');
		}
	}
</script>

<Card>
	<CardHeader class="pb-3">
		<CardTitle class="flex items-center gap-2 text-base">
			<Target class="h-4 w-4 text-primary" />
			{year} Group Goal
			{#if isAdmin}
				<button
					type="button"
					class="ml-auto text-muted-foreground hover:text-foreground transition-colors"
					onclick={openDialog}
				>
					<Pencil class="h-3.5 w-3.5" />
					<span class="sr-only">{hasGoal ? 'Edit goal' : 'Set goal'}</span>
				</button>
			{/if}
		</CardTitle>
	</CardHeader>
	<CardContent>
		{#if hasGoal}
			<div class="text-center">
				<p class="text-2xl font-bold text-foreground">
					{completed} <span class="text-muted-foreground font-normal">of</span> {target}
				</p>
				<p class="text-sm text-muted-foreground mt-1">books completed</p>
				<!-- Progress bar -->
				<div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-primary transition-all"
						style="width: {progress}%"
					></div>
				</div>
				<p class="text-xs text-muted-foreground mt-2">
					{Math.round(progress)}% complete
				</p>
			</div>
		{:else}
			<div class="text-center py-2">
				<p class="text-2xl font-bold text-foreground">{completed}</p>
				<p class="text-sm text-muted-foreground mt-1">books completed in {year}</p>
				{#if isAdmin}
					<Button variant="outline" size="sm" class="mt-3" onclick={openDialog}>
						Set Group Goal
					</Button>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>

{#if isAdmin}
	<Dialog bind:open={dialogOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="flex items-center gap-2">
					<Target class="h-5 w-5 text-primary" />
					{year} Group Goal
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-4">
				<p class="text-sm text-muted-foreground">
					How many books should the group complete this year?
				</p>

				<div class="space-y-2">
					<Label for="group-goal-target">Number of books</Label>
					<Input
						id="group-goal-target"
						type="number"
						min="1"
						max="365"
						bind:value={goalInput}
						placeholder="12"
					/>
					<p class="text-xs text-muted-foreground">
						Counts completions of books from the reading list by group members.
					</p>
				</div>
			</div>

			<div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
				{#if hasGoal}
					<Button
						variant="ghost"
						onclick={handleDelete}
						disabled={isSubmitting}
						class="text-destructive hover:text-destructive"
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Remove Goal
					</Button>
				{:else}
					<div></div>
				{/if}
				<div class="flex gap-2">
					<Button variant="outline" onclick={() => (dialogOpen = false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button onclick={handleSave} disabled={isSubmitting}>
						{#if isSubmitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Saving...
						{:else}
							Save Goal
						{/if}
					</Button>
				</div>
			</div>
		</DialogContent>
	</Dialog>
{/if}
