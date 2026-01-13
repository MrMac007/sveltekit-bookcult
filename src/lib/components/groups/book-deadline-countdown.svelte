<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import DateInput from '$lib/components/ui/date-input.svelte';
	import { Clock, Pencil, Loader2, X, AlertCircle, CheckCircle } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';

	interface Props {
		deadline: string | null;
		hasUserCompleted?: boolean;
		isAdmin?: boolean;
		groupId: string;
	}

	let { deadline, hasUserCompleted = false, isAdmin = false, groupId }: Props = $props();

	let dialogOpen = $state(false);
	let isSubmitting = $state(false);
	let deadlineInput = $state('');

	// Calculate days remaining/overdue
	const deadlineInfo = $derived(() => {
		if (!deadline) return null;

		const deadlineDate = new Date(deadline);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		deadlineDate.setHours(0, 0, 0, 0);

		const diffTime = deadlineDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return {
			days: Math.abs(diffDays),
			isOverdue: diffDays < 0,
			isToday: diffDays === 0,
			isSoon: diffDays > 0 && diffDays <= 3,
			isNear: diffDays > 3 && diffDays <= 7,
		};
	});

	function getTomorrowString(): string {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().split('T')[0];
	}

	function openDialog() {
		deadlineInput = deadline ? new Date(deadline).toISOString().split('T')[0] : getTomorrowString();
		dialogOpen = true;
	}

	async function handleSave() {
		if (!deadlineInput) {
			toast.error('Please select a deadline date');
			return;
		}

		isSubmitting = true;
		const formData = new FormData();
		formData.append('groupId', groupId);
		formData.append('deadline', deadlineInput);

		const response = await fetch('?/setDeadline', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		dialogOpen = false;

		if (response.ok) {
			toast.success('Deadline set');
			invalidateAll();
		} else {
			toast.error('Failed to set deadline');
		}
	}

	async function handleClear() {
		if (!confirm('Remove the deadline for this book?')) return;

		isSubmitting = true;
		const formData = new FormData();
		formData.append('groupId', groupId);

		const response = await fetch('?/clearDeadline', {
			method: 'POST',
			body: formData
		});

		isSubmitting = false;
		dialogOpen = false;

		if (response.ok) {
			toast.success('Deadline removed');
			invalidateAll();
		} else {
			toast.error('Failed to remove deadline');
		}
	}
</script>

{#if hasUserCompleted}
	<!-- User completed - show completion message -->
	<div class="flex items-center gap-2 text-sm text-primary">
		<CheckCircle class="h-4 w-4" />
		<span class="font-medium">You've completed this book!</span>
	</div>
{:else if deadline}
	{@const info = deadlineInfo()}
	{#if info}
		<div class={cn(
			'flex items-center justify-between gap-2 rounded-lg px-3 py-2',
			info.isOverdue && 'bg-destructive/10 text-destructive',
			info.isToday && 'bg-amber-500/10 text-amber-600',
			info.isSoon && 'bg-amber-500/10 text-amber-600',
			info.isNear && 'bg-yellow-500/10 text-yellow-600',
			!info.isOverdue && !info.isToday && !info.isSoon && !info.isNear && 'bg-primary/10 text-primary'
		)}>
			<div class="flex items-center gap-2">
				{#if info.isOverdue}
					<AlertCircle class="h-4 w-4" />
				{:else}
					<Clock class="h-4 w-4" />
				{/if}
				<span class="text-sm font-medium">
					{#if info.isOverdue}
						{info.days} {info.days === 1 ? 'day' : 'days'} overdue
					{:else if info.isToday}
						Due today!
					{:else}
						{info.days} {info.days === 1 ? 'day' : 'days'} remaining
					{/if}
				</span>
			</div>
			{#if isAdmin}
				<button
					type="button"
					class="text-current opacity-70 hover:opacity-100 transition-opacity"
					onclick={openDialog}
				>
					<Pencil class="h-3.5 w-3.5" />
					<span class="sr-only">Edit deadline</span>
				</button>
			{/if}
		</div>
	{/if}
{:else if isAdmin}
	<!-- No deadline - admin can set one -->
	<Button variant="outline" size="sm" onclick={openDialog} class="w-full">
		<Clock class="mr-2 h-3.5 w-3.5" />
		Set Deadline
	</Button>
{/if}

{#if isAdmin}
	<Dialog bind:open={dialogOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="flex items-center gap-2">
					<Clock class="h-5 w-5 text-primary" />
					Book Deadline
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-4">
				<p class="text-sm text-muted-foreground">
					Set a deadline for members to complete the current book.
				</p>

				<div class="space-y-2">
					<Label for="deadline-date">Deadline date</Label>
					<DateInput
						bind:value={deadlineInput}
						min={getTomorrowString()}
						id="deadline-date"
						name="deadline"
						required
					/>
					<p class="text-xs text-muted-foreground">
						Members will see a countdown until this date.
					</p>
				</div>
			</div>

			<div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
				{#if deadline}
					<Button
						variant="ghost"
						onclick={handleClear}
						disabled={isSubmitting}
						class="text-destructive hover:text-destructive"
					>
						<X class="mr-2 h-4 w-4" />
						Remove Deadline
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
							Set Deadline
						{/if}
					</Button>
				</div>
			</div>
		</DialogContent>
	</Dialog>
{/if}
