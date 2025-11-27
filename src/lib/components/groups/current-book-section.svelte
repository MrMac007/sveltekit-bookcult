<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { BookOpen, BookMarked, Users, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface CurrentBook {
		id: string;
		google_books_id: string | null;
		title: string;
		authors: string[] | null;
		cover_url: string | null;
		description: string | null;
		published_date?: string | null;
		page_count?: number | null;
	}

	interface ReadingMember {
		id: string;
		user_id: string;
		started_at: string;
		profiles: {
			id: string;
			username: string;
			display_name: string | null;
		};
	}

	interface Props {
		currentBook: CurrentBook | null;
		isCurrentUserReading: boolean;
		readingMembers: ReadingMember[];
		groupId: string;
		currentUserId: string;
		isAdmin: boolean;
	}

	let { currentBook, isCurrentUserReading, readingMembers, groupId, currentUserId, isAdmin }: Props = $props();
	let showMembers = $state(false);

	function getDisplayName(member: ReadingMember): string {
		return member.profiles.display_name || member.profiles.username;
	}
</script>

{#if currentBook}
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
					<BookOpen class="h-4 w-4" />
				</span>
				Currently Reading
			</CardTitle>
		</CardHeader>
		<CardContent class="pb-4">
			<!-- Book Info -->
			<div class="flex gap-4">
				<!-- Book Cover -->
				<a
					href="/book/{currentBook.id}"
					class="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted hover:opacity-80 transition-opacity"
				>
					{#if currentBook.cover_url}
						<img
							src={currentBook.cover_url}
							alt={currentBook.title}
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<BookMarked class="h-8 w-8 text-muted-foreground" />
						</div>
					{/if}
				</a>

				<!-- Book Details -->
				<div class="flex-1 min-w-0">
					<a href="/book/{currentBook.id}" class="block hover:opacity-80">
						<h3 class="text-xl font-bold line-clamp-2">{currentBook.title}</h3>
					</a>
					{#if currentBook.authors && currentBook.authors.length > 0}
						<p class="mt-1 text-sm text-muted-foreground line-clamp-1">
							by {currentBook.authors.join(', ')}
						</p>
					{/if}

					{#if currentBook.description}
						<p class="mt-2 text-sm text-foreground/80 line-clamp-3">
							{currentBook.description}
						</p>
					{/if}
				</div>
			</div>

			<!-- Reading Status Actions -->
			<div class="mt-4">
				<form method="POST" action="?/toggleGroupBookReading" use:enhance>
					<input type="hidden" name="groupId" value={groupId} />
					<input type="hidden" name="bookId" value={currentBook.id} />
					<Button
						type="submit"
						variant={isCurrentUserReading ? 'outline' : 'default'}
						class="w-full gap-2"
					>
						<BookOpen class="h-4 w-4" />
						{isCurrentUserReading ? "Stop Reading" : "I'm Reading This"}
					</Button>
				</form>
			</div>

			<!-- Members Currently Reading -->
			{#if readingMembers.length > 0}
				<div class="mt-6 border-t pt-4">
					<button
						type="button"
						class="flex w-full items-center justify-between text-sm hover:opacity-80"
						onclick={() => (showMembers = !showMembers)}
					>
						<div class="flex items-center gap-2 text-muted-foreground">
							<Users class="h-4 w-4" />
							<span>
								{readingMembers.length} {readingMembers.length === 1 ? 'member' : 'members'} reading
							</span>
						</div>
						<span class="flex items-center gap-1 text-sm font-medium text-foreground">
							{showMembers ? 'Hide members' : 'Show members'}
							{#if showMembers}
								<ChevronUp class="h-4 w-4" />
							{:else}
								<ChevronDown class="h-4 w-4" />
							{/if}
						</span>
					</button>
					{#if showMembers}
						<div class="mt-3 flex flex-wrap gap-3 text-sm font-medium text-primary">
							{#each readingMembers as member}
								<a
									href={member.user_id === currentUserId ? '/profile' : `/users/${member.user_id}`}
									class="underline-offset-2 hover:underline"
								>
									{getDisplayName(member)}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>
{:else}
	<!-- No current book -->
	<Card>
		<CardContent class="flex flex-col items-center justify-center py-8 text-center">
			<BookOpen class="h-12 w-12 text-muted-foreground mb-3" />
			<h3 class="text-lg font-semibold mb-2">No current reading book</h3>
			<p class="text-sm text-muted-foreground mb-4">
				{#if isAdmin}
					Set a book for the group to read together
				{:else}
					Ask an admin to set a book for the group
				{/if}
			</p>
			{#if isAdmin}
				<Button href="/groups/{groupId}/reading-list">
					Manage Reading List
				</Button>
			{/if}
		</CardContent>
	</Card>
{/if}
