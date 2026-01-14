<script lang="ts">
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import DateInput from '$lib/components/ui/date-input.svelte';
	import { BookCheck, Loader2 } from 'lucide-svelte';

	// Log to verify this version is being loaded
	console.log('mark-complete-dialog.svelte LOADED - version 2');

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

	// Store the date - initialize once
	let completionDate = $state(getTodayString());

	// Debug: Monitor completionDate changes
	$effect(() => {
		console.log('$effect: completionDate is now:', completionDate);
	});

	function handleConfirm() {
		console.log('handleConfirm - sending date:', completionDate);
		if (completionDate) {
			onConfirm?.(completionDate);
		}
	}

	function handleCancel() {
		open = false;
		onCancel?.();
	}

	// Handle dialog open/close
	function handleOpenChange(isOpen: boolean) {
		if (isOpen) {
			// Dialog just opened - reset to today
			completionDate = getTodayString();
			console.log('Dialog opened, reset date to:', completionDate);
		} else {
			// Dialog closing
			handleCancel();
		}
	}

	// Track date changes from input - receives value from DateInput
	function handleDateChange(newValue: string) {
		console.log('Date changed via onchange - received:', newValue, 'state was:', completionDate);
		completionDate = newValue;
		console.log('Date changed via onchange - state now:', completionDate);
	}
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<BookCheck class="h-5 w-5 text-primary" />
				Mark as Complete (v2)
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
					onchange={handleDateChange}
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
