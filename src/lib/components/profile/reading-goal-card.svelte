<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
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
		isOwnProfile?: boolean;
		class?: string;
	}

	let { target, completed, year, isOwnProfile = false, class: className = '' }: Props = $props();

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

		const response = await fetch('?/setReadingGoal', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		dialogOpen = false;

		if (response.ok) {
			toast.success('Reading goal updated');
			invalidateAll();
		} else {
			toast.error('Failed to update goal');
		}
	}

	async function handleDelete() {
		if (!confirm('Remove your reading goal for this year?')) return;

		isSubmitting = true;
		const formData = new FormData();
		formData.append('year', year.toString());

		const response = await fetch('?/deleteReadingGoal', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		dialogOpen = false;

		if (response.ok) {
			toast.success('Reading goal removed');
			invalidateAll();
		} else {
			toast.error('Failed to remove goal');
		}
	}
</script>

<Card class="h-full transition-all hover:shadow-md {className}">
	<CardContent class="flex h-full flex-col items-center justify-center pt-6 text-center">
		<Target class="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
		<div class="w-full min-w-0">
			{#if hasGoal}
				<p class="page-heading truncate text-lg sm:text-xl">
					{completed} / {target}
				</p>
				<p class="meta-label mt-1 truncate text-xs sm:text-sm">{year} Goal</p>
				<!-- Progress bar -->
				<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-primary transition-all"
						style="width: {progress}%"
					></div>
				</div>
			{:else}
				<p class="page-heading truncate text-lg sm:text-xl">{completed}</p>
				<p class="meta-label mt-1 truncate text-xs sm:text-sm">{year} Books</p>
			{/if}

			{#if isOwnProfile}
				<button
					type="button"
					class="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
					onclick={openDialog}
				>
					<Pencil class="h-3 w-3" />
					{hasGoal ? 'Edit goal' : 'Set goal'}
				</button>
			{/if}
		</div>
	</CardContent>
</Card>

{#if isOwnProfile}
	<Dialog bind:open={dialogOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="flex items-center gap-2">
					<Target class="h-5 w-5 text-primary" />
					{year} Reading Goal
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-4">
				<p class="text-sm text-muted-foreground">
					How many books do you want to read this year?
				</p>

				<div class="space-y-2">
					<Label for="goal-target">Number of books</Label>
					<Input
						id="goal-target"
						type="number"
						min="1"
						max="365"
						bind:value={goalInput}
						placeholder="12"
					/>
					<p class="text-xs text-muted-foreground">
						Only books with confirmed completion dates count toward your goal.
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
