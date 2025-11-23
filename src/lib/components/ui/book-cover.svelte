<script lang="ts">
	import { BookMarked } from 'lucide-svelte';

	interface Props {
		coverUrl?: string | null;
		title: string;
		bookId?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		clickable?: boolean;
		class?: string;
	}

	let {
		coverUrl = null,
		title,
		bookId,
		size = 'md',
		clickable = true,
		class: className = ''
	}: Props = $props();

	const sizeClasses = {
		sm: 'h-20 w-14',
		md: 'h-32 w-24',
		lg: 'h-48 w-32 sm:h-60 sm:w-40',
		xl: 'h-60 w-40'
	};

	const iconSizes = {
		sm: 'h-6 w-6',
		md: 'h-10 w-10',
		lg: 'h-12 w-12 sm:h-16 sm:w-16',
		xl: 'h-16 w-16'
	};

	const coverElement = () => {
		return `
			<div class="relative ${sizeClasses[size]} overflow-hidden rounded-lg bg-muted ${className}">
				${
					coverUrl
						? `<img src="${coverUrl}" alt="Cover of ${title}" class="h-full w-full object-cover" />`
						: `<div class="flex h-full w-full items-center justify-center">
								<BookMarked class="${iconSizes[size]} text-muted-foreground" />
							</div>`
				}
			</div>
		`;
	};
</script>

{#if clickable && bookId}
	<a href="/book/{bookId}" class="block transition-transform hover:scale-105">
		<div class="relative {sizeClasses[size]} overflow-hidden rounded-lg bg-muted {className}">
			{#if coverUrl}
				<img src={coverUrl} alt="Cover of {title}" class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center">
					<BookMarked class={iconSizes[size] + ' text-muted-foreground'} />
				</div>
			{/if}
		</div>
	</a>
{:else}
	<div class="relative {sizeClasses[size]} overflow-hidden rounded-lg bg-muted {className}">
		{#if coverUrl}
			<img src={coverUrl} alt="Cover of {title}" class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<BookMarked class={iconSizes[size] + ' text-muted-foreground'} />
			</div>
		{/if}
	</div>
{/if}
