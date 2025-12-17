<script lang="ts">
	import { BookMarked, Loader2, Check } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	interface Edition {
		key: string;
		title: string;
		cover_url?: string;
		cover_id?: number;
		publisher?: string;
		publish_date?: string;
		isbn_13?: string;
		isbn_10?: string;
		language?: string;
	}

	interface Props {
		workKey: string;
		bookTitle: string;
		onSelect: (edition: Edition) => void | Promise<void>;
		onSkip?: () => void;
	}

	let { workKey, bookTitle, onSelect, onSkip }: Props = $props();

	let editions = $state<Edition[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedKey = $state<string | null>(null);
	let saving = $state(false);
	let failedImages = $state<Set<string>>(new Set());

	function handleImageError(key: string) {
		failedImages = new Set([...failedImages, key]);
	}

	async function loadEditions() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/books/editions?workKey=${encodeURIComponent(workKey)}`);
			if (!response.ok) {
				throw new Error('Failed to load editions');
			}

			const data = await response.json();
			editions = data.editions || [];

			// Auto-select first edition if only one available
			if (editions.length === 1) {
				selectedKey = editions[0].key;
			}
		} catch (err) {
			console.error('Error loading editions:', err);
			error = 'Failed to load cover options';
		} finally {
			loading = false;
		}
	}

	async function handleConfirm() {
		if (!selectedKey) return;

		const selected = editions.find(e => e.key === selectedKey);
		if (!selected) return;

		saving = true;
		try {
			await onSelect(selected);
		} finally {
			saving = false;
		}
	}

	// Load editions on mount
	$effect(() => {
		if (workKey) {
			loadEditions();
		}
	});
</script>

<div class="space-y-4">
	<div class="text-center">
		<h3 class="text-lg font-semibold">Choose a Cover</h3>
		<p class="text-sm text-muted-foreground">
			Select your preferred cover for "{bookTitle}"
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
			<p class="text-sm text-destructive">{error}</p>
			<Button variant="outline" size="sm" onclick={loadEditions} class="mt-2">
				Try Again
			</Button>
		</div>
	{:else if editions.length === 0}
		<div class="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
			<p class="text-sm text-muted-foreground">No cover options available</p>
			{#if onSkip}
				<Button variant="outline" size="sm" onclick={onSkip} class="mt-2">
					Continue Without Cover
				</Button>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-1">
			{#each editions as edition (edition.key)}
				<button
					type="button"
					class="group relative aspect-[2/3] overflow-hidden rounded-md border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 {selectedKey === edition.key ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:border-muted-foreground/50'}"
					onclick={() => selectedKey = edition.key}
				>
					{#if edition.cover_url && !failedImages.has(edition.key)}
						<img
							src={edition.cover_url}
							alt={`${edition.title} - ${edition.publisher || 'Unknown publisher'}`}
							class="h-full w-full object-cover"
							loading="lazy"
							onerror={() => handleImageError(edition.key)}
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center bg-muted">
							<BookMarked class="h-8 w-8 text-muted-foreground" />
						</div>
					{/if}

					{#if selectedKey === edition.key}
						<div class="absolute inset-0 flex items-center justify-center bg-primary/20">
							<div class="rounded-full bg-primary p-1">
								<Check class="h-4 w-4 text-primary-foreground" />
							</div>
						</div>
					{/if}

					<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
						<p class="text-xs text-white truncate">
							{edition.publisher || 'Unknown'}
						</p>
						{#if edition.publish_date}
							<p class="text-xs text-white/70">{edition.publish_date}</p>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<div class="flex gap-2 justify-end pt-2">
			{#if onSkip}
				<Button variant="outline" onclick={onSkip} disabled={saving}>
					Skip
				</Button>
			{/if}
			<Button
				onclick={handleConfirm}
				disabled={!selectedKey || saving}
			>
				{#if saving}
					<Loader2 class="h-4 w-4 animate-spin mr-2" />
					Saving...
				{:else}
					Use This Cover
				{/if}
			</Button>
		</div>
	{/if}
</div>
