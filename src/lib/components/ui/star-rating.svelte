<script lang="ts">
	import { Star } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		value?: number;
		onchange?: (rating: number) => void;
		readonly?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { value = 0, onchange, readonly = false, size = 'md' }: Props = $props();

	let hoverRating = $state<number | null>(null);

	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8'
	};

	const displayRating = $derived(hoverRating !== null ? hoverRating : value);

	function handleClick(starIndex: number, isHalf: boolean) {
		if (readonly || !onchange) return;
		const newRating = starIndex + (isHalf ? 0.5 : 1);
		onchange(newRating);
	}

	function handleMouseMove(starIndex: number, e: MouseEvent) {
		if (readonly) return;
		const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		const isHalf = x < rect.width / 2;
		hoverRating = starIndex + (isHalf ? 0.5 : 1);
	}

	function handleMouseLeave() {
		hoverRating = null;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (readonly || !onchange) return;

		const step = e.shiftKey ? 0.5 : 1; // Hold Shift for half-star increments
		let newRating = value;

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				e.preventDefault();
				newRating = Math.min(5, value + step);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				e.preventDefault();
				newRating = Math.max(0, value - step);
				break;
			case 'Home':
				e.preventDefault();
				newRating = 0;
				break;
			case 'End':
				e.preventDefault();
				newRating = 5;
				break;
			default:
				return;
		}

		if (newRating !== value) {
			onchange(newRating);
		}
	}
</script>

<div
	class="flex items-center gap-1"
	role={readonly ? 'img' : 'slider'}
	aria-label={readonly ? `Rating: ${value} out of 5 stars` : 'Star rating'}
	aria-valuemin={readonly ? undefined : 0}
	aria-valuemax={readonly ? undefined : 5}
	aria-valuenow={readonly ? undefined : value}
	aria-valuetext={`${value} out of 5 stars`}
	tabindex={readonly ? undefined : 0}
	onkeydown={handleKeyDown}
>
	{#each [0, 1, 2, 3, 4] as starIndex}
		{@const fillPercentage = Math.max(0, Math.min(1, displayRating - starIndex))}
		{@const isHalf = fillPercentage > 0 && fillPercentage < 1}
		{@const isFull = fillPercentage === 1}

		<button
			type="button"
			disabled={readonly}
			tabindex={-1}
			aria-hidden="true"
			onmousemove={(e) => handleMouseMove(starIndex, e)}
			onmouseleave={handleMouseLeave}
			onclick={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const isHalfClick = x < rect.width / 2;
				handleClick(starIndex, isHalfClick);
			}}
			class={cn(
				'relative transition-transform',
				!readonly && 'hover:scale-110 cursor-pointer',
				readonly && 'cursor-default'
			)}
		>
			<Star class={cn(sizeClasses[size], 'text-muted-foreground transition-colors')} />
			{#if isFull || isHalf}
				<div class="absolute inset-0 overflow-hidden" style="width: {fillPercentage * 100}%">
					<Star class={cn(sizeClasses[size], 'fill-primary text-primary')} />
				</div>
			{/if}
		</button>
	{/each}
	{#if !readonly}
		<span class="ml-2 text-sm text-muted-foreground" aria-hidden="true">
			{displayRating.toFixed(1)}
		</span>
	{/if}
	{#if readonly && value > 0}
		<span class="ml-2 text-sm font-medium" aria-hidden="true">
			{value.toFixed(1)}
		</span>
	{/if}
</div>
