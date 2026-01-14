<script lang="ts">
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import DateInput from '$lib/components/ui/date-input.svelte';
	import { Calendar, Loader2 } from 'lucide-svelte';
	import { getTodayString, parseDateString } from '$lib/utils/date';

	interface Props {
		open?: boolean;
		bookTitle?: string;
		currentDate?: string;
		isSubmitting?: boolean;
		onConfirm?: (completedAt: string) => void;
		onCancel?: () => void;
	}

	let {
		open = $bindable(false),
		bookTitle = 'this book',
		currentDate = '',
		isSubmitting = false,
		onConfirm,
		onCancel
	}: Props = $props();

	let completionDate = $state(parseDateString(currentDate));

	// Update date when dialog opens or currentDate changes
	$effect(() => {
		if (open) {
			completionDate = parseDateString(currentDate);
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
				<Calendar class="h-5 w-5 text-primary" />
				Edit Completion Date
			</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<p class="text-sm text-muted-foreground">
				When did you finish reading <span class="font-medium text-foreground">{bookTitle}</span>?
			</p>

			<div class="space-y-2">
				<Label for="edit-completion-date">Completion date</Label>
				<DateInput
					bind:value={completionDate}
					max={getTodayString()}
					id="edit-completion-date"
					name="completedAt"
					required
				/>
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
					<Calendar class="mr-2 h-4 w-4" />
					Save Date
				{/if}
			</Button>
		</div>
	</DialogContent>
</Dialog>
