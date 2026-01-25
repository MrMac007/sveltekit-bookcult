<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BookMarked, Star, Loader2, Users, Trophy, Award, Medal } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

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
		results: SuggestionResult[];
		groupId: string;
		isAdmin: boolean;
	}

	let { results, groupId, isAdmin }: Props = $props();

	let settingCurrentId = $state<string | null>(null);

	async function handleSetAsCurrent(bookId: string) {
		if (settingCurrentId) return;

		settingCurrentId = bookId;

		try {
			const formData = new FormData();
			formData.append('groupId', groupId);
			formData.append('bookId', bookId);

			const response = await fetch('?/setRevealedBookAsCurrent', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to set current book');
			} else {
				toast.success('Book set as current reading!');
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error setting current book:', error);
			toast.error('Failed to set current book');
		} finally {
			settingCurrentId = null;
		}
	}

	function getRankIcon(rank: number) {
		if (rank === 1) return Trophy;
		if (rank === 2) return Award;
		if (rank === 3) return Medal;
		return null;
	}

	function getRankColor(rank: number): string {
		if (rank === 1) return 'text-yellow-500';
		if (rank === 2) return 'text-gray-400';
		if (rank === 3) return 'text-amber-600';
		return 'text-muted-foreground';
	}

	function getRankBgColor(rank: number): string {
		if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
		if (rank === 2) return 'bg-gray-400/10 border-gray-400/30';
		if (rank === 3) return 'bg-amber-600/10 border-amber-600/30';
		return 'bg-card';
	}
</script>

<div class="space-y-3">
	{#if results.length === 0}
		<div class="py-6 text-center">
			<BookMarked class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
			<p class="text-sm text-muted-foreground">No suggestions were submitted this round.</p>
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">
			The group's top picks based on everyone's ranked suggestions.
		</p>

		<div class="space-y-2">
			{#each results as result}
				{@const RankIcon = getRankIcon(result.final_rank)}
				<div
					class="flex items-center gap-3 rounded-lg border p-3 {getRankBgColor(result.final_rank)}"
				>
					<!-- Rank Badge -->
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border {getRankBgColor(
							result.final_rank
						)}"
					>
						{#if RankIcon}
							<RankIcon class="h-5 w-5 {getRankColor(result.final_rank)}" />
						{:else}
							<span class="text-lg font-bold {getRankColor(result.final_rank)}">
								{result.final_rank}
							</span>
						{/if}
					</div>

					{#if result.books}
						<!-- Book Info -->
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div class="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-muted shadow-sm">
								{#if result.books.cover_url}
									<img
										src={result.books.cover_url}
										alt={result.books.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="flex h-full w-full items-center justify-center">
										<BookMarked class="h-4 w-4 text-muted-foreground" />
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<a
									href="/book/{result.books.id}"
									class="line-clamp-1 text-sm font-medium hover:text-primary hover:underline"
								>
									{result.books.title}
								</a>
								{#if result.books.authors?.length}
									<p class="line-clamp-1 text-xs text-muted-foreground">
										{result.books.authors.join(', ')}
									</p>
								{/if}

								<!-- Score breakdown -->
								<div class="mt-1 flex flex-wrap items-center gap-2">
									<Badge variant="outline" class="text-xs">
										{result.total_score} pts
									</Badge>
									{#if result.overlap_bonus > 0}
										<span class="flex items-center gap-1 text-xs text-muted-foreground">
											<Users class="h-3 w-3" />
											{result.member_count} suggested
											<span class="text-green-600">(+{result.overlap_bonus})</span>
										</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Admin action -->
						{#if isAdmin}
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleSetAsCurrent(result.books!.id)}
								disabled={settingCurrentId === result.books.id}
								title="Set as current reading"
							>
								{#if settingCurrentId === result.books.id}
									<Loader2 class="h-4 w-4 animate-spin" />
								{:else}
									<Star class="h-4 w-4" />
								{/if}
							</Button>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
			<span>Scoring: 1st=5pts, 2nd=4pts, 3rd=3pts, 4th=2pts, 5th=1pt</span>
			<span>+bonus for books multiple members suggested</span>
		</div>
	{/if}
</div>
