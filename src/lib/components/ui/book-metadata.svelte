<script lang="ts">
	interface Props {
		publishedDate?: string | null;
		pageCount?: number | null;
		publisher?: string | null;
		class?: string;
	}

	let { publishedDate = null, pageCount = null, publisher = null, class: className = '' }: Props = $props();

	const getYear = (dateString?: string | null) => {
		if (!dateString) return null;
		return new Date(dateString).getFullYear();
	};

	const year = $derived(getYear(publishedDate));
	const hasAnyData = $derived(year || pageCount || publisher);
</script>

{#if hasAnyData}
	<div class="flex items-center gap-2 text-xs text-muted-foreground {className}">
		{#if publisher}
			<span>{publisher}</span>
		{/if}
		{#if year && publisher}
			<span>•</span>
		{/if}
		{#if year}
			<span>{year}</span>
		{/if}
		{#if pageCount && (year || publisher)}
			<span>•</span>
		{/if}
		{#if pageCount}
			<span>{pageCount} pages</span>
		{/if}
	</div>
{/if}
