<script lang="ts">
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import DateInput from '$lib/components/ui/date-input.svelte';
	import { BookCheck, Loader2 } from 'lucide-svelte';

	interface Props {
		open?: boolean;
		bookTitle?: string;
		isSubmitting?: boolean;
		onConfirm?: (completedAt: string) => void;
		onCancel?: () => void;
	}

	let {
		open = $bindable(false),
		bookTitle = 'this book',
		isSubmitting = false,
		onConfirm,
		onCancel
	}: Props = $props();

	// Default to today's date in YYYY-MM-DD format
	function getTodayString(): string {
		const today = new Date();
		return today.toISOString().split('T')[0];
	}

	let completionDate = $state(getTodayString());

	// Reset date to today when dialog opens
	$effect(() => {
		if (open) {
			completionDate = getTodayString();
		}
	});

	function handleConfirm() {
		if (completionDate) {
			onConfirm?.(completionDate);
		}
	}

	function handleCancel() {
		open = false;
		onCancel?.();
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			handleCancel();
		}
	}
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<BookCheck class="h-5 w-5 text-primary" />
				Mark as Complete
			</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<p class="text-sm text-muted-foreground">
				When did you finish reading <span class="font-medium text-foreground">{bookTitle}</span>?
			</p>

			<div class="space-y-2">
				<Label for="completion-date">Completion date</Label>
				<DateInput
					bind:value={completionDate}
					max={getTodayString()}
					id="completion-date"
					name="completionDate"
					required
				/>
				<p class="text-xs text-muted-foreground">
					You can select a past date if you're adding an older read.
				</p>
			</div>
		</div>

		<div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
			<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={handleConfirm} disabled={isSubmitting || !completionDate}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					<BookCheck class="mr-2 h-4 w-4" />
					Complete
				{/if}
			</Button>
		</div>
	</DialogContent>
</Dialog>
