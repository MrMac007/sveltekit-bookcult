<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Search, Loader2 } from 'lucide-svelte';
	import type { BookSearchController } from '$lib/stores/book-search';
	import { MIN_SEARCH_QUERY_LEN } from '$lib/constants';

	interface Props {
		search: BookSearchController;
		placeholder?: string;
		showIcon?: boolean;
		maxResults?: number;
		class?: string;
		inputClass?: string;
		resultsClass?: string;
		emptyMessage?: string;
		showEmpty?: boolean;
	}

	let {
		search,
		placeholder = 'Search for books...',
		showIcon = true,
		maxResults = 5,
		class: className = '',
		inputClass = '',
		resultsClass = 'space-y-2',
		emptyMessage = 'No books found',
		showEmpty = true
	}: Props = $props();

	const { query, results, isSearching, setQuery, minQueryLength } = search;

	const effectiveMinLength = minQueryLength ?? MIN_SEARCH_QUERY_LEN;
</script>

<div class={className}>
	<div class="relative">
		{#if showIcon}
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		{/if}
		<Input
			type="text"
			placeholder={placeholder}
			value={$query}
			oninput={(e) => {
				const target = e.currentTarget as HTMLInputElement;
				setQuery(target.value);
			}}
			class={`${showIcon ? 'pl-9' : ''} ${inputClass}`.trim()}
		/>
		{#if $isSearching}
			<Loader2
				class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
			/>
		{/if}
	</div>

	{#if !$isSearching && $results.length > 0}
		<div class={`mt-3 ${resultsClass}`.trim()}>
			{#each $results.slice(0, maxResults) as book (book.open_library_key)}
				<slot name="result" {book} />
			{/each}
		</div>
	{:else if showEmpty && !$isSearching && $query.trim().length >= effectiveMinLength}
		<p class="mt-3 text-center text-sm text-muted-foreground">{emptyMessage}</p>
	{/if}
</div>
