<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Lightbulb, Lock, Unlock, Eye, RefreshCw } from 'lucide-svelte';
	import SuggestionList from './suggestion-list.svelte';
	import SuggestionResults from './suggestion-results.svelte';
	import { toast } from 'svelte-sonner';

	interface SuggestionRound {
		id: string;
		status: 'open' | 'revealed';
	}

	interface UserSuggestion {
		id: string;
		rank: number;
		book_id: string;
		books: {
			id: string;
			title: string;
			authors: string[];
			cover_url: string | null;
		} | null;
	}

	interface SuggestionResult {
		id: string;
		final_rank: number;
		base_score: number;
		overlap_bonus: number;
		total_score: number;
		member_count: number;
		book_id: string;
		books: {
			id: string;
			title: string;
			authors: string[];
			cover_url: string | null;
		} | null;
	}

	interface Props {
		groupId: string;
		isAdmin: boolean;
		round: SuggestionRound | null;
		userSuggestions: UserSuggestion[];
		results: SuggestionResult[];
	}

	let { groupId, isAdmin, round, userSuggestions, results }: Props = $props();

	let isRevealing = $state(false);
	let isReopening = $state(false);

	const isOpen = $derived(!round || round.status === 'open');
	const isRevealed = $derived(round?.status === 'revealed');
	const hasRound = $derived(round !== null);
	const hasSuggestions = $derived(userSuggestions.length > 0);

	async function handleReveal() {
		if (!confirm('Reveal all suggestions? This will lock in everyone\'s lists and calculate the top 5.')) return;

		isRevealing = true;
		const formData = new FormData();
		formData.append('groupId', groupId);

		try {
			const response = await fetch('?/revealSuggestions', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to reveal suggestions');
			} else {
				toast.success('Suggestions revealed!');
				await invalidateAll();
			}
		} catch {
			toast.error('Failed to reveal suggestions');
		} finally {
			isRevealing = false;
		}
	}

	async function handleReopen() {
		if (!confirm('Start a new round? This will clear all current suggestions and results.')) return;

		isReopening = true;
		const formData = new FormData();
		formData.append('groupId', groupId);

		try {
			const response = await fetch('?/reopenSuggestions', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to start new round');
			} else {
				toast.success('New suggestion round started!');
				await invalidateAll();
			}
		} catch {
			toast.error('Failed to start new round');
		} finally {
			isReopening = false;
		}
	}
</script>

<Card class="rounded-3xl border border-primary/15">
	<CardHeader>
		<div class="flex items-center justify-between">
			<CardTitle class="flex items-center gap-2 text-lg">
				<Lightbulb class="h-5 w-5 text-primary" />
				Book Suggestions
				{#if isRevealed}
					<Badge variant="secondary" class="ml-2">
						<Lock class="mr-1 h-3 w-3" />
						Revealed
					</Badge>
				{:else if hasRound}
					<Badge variant="outline" class="ml-2">
						<Unlock class="mr-1 h-3 w-3" />
						Open
					</Badge>
				{/if}
			</CardTitle>

			{#if isAdmin}
				<div class="flex gap-2">
					{#if isOpen && hasSuggestions}
						<Button
							size="sm"
							variant="default"
							onclick={handleReveal}
							disabled={isRevealing}
						>
							{#if isRevealing}
								<RefreshCw class="mr-1 h-4 w-4 animate-spin" />
								Revealing...
							{:else}
								<Eye class="mr-1 h-4 w-4" />
								Reveal
							{/if}
						</Button>
					{/if}
					{#if isRevealed}
						<Button
							size="sm"
							variant="outline"
							onclick={handleReopen}
							disabled={isReopening}
						>
							{#if isReopening}
								<RefreshCw class="mr-1 h-4 w-4 animate-spin" />
								Starting...
							{:else}
								<RefreshCw class="mr-1 h-4 w-4" />
								New Round
							{/if}
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	</CardHeader>

	<CardContent>
		{#if isRevealed}
			<SuggestionResults {results} {groupId} {isAdmin} />
		{:else}
			<SuggestionList {groupId} suggestions={userSuggestions} maxSuggestions={5} />
		{/if}
	</CardContent>
</Card>
