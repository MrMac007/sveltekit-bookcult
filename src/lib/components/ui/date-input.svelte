<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		value?: string;
		max?: string;
		min?: string;
		name?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		max,
		min,
		name,
		id,
		required = false,
		disabled = false,
		class: className,
		onchange
	}: Props = $props();

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		console.log('DateInput handleChange - new value:', value, 'has onchange:', !!onchange);
		if (onchange) {
			console.log('DateInput calling onchange callback...');
			onchange(value);
			console.log('DateInput onchange callback completed');
		}
	}
</script>

<input
	type="date"
	bind:value
	{max}
	{min}
	{name}
	{id}
	{required}
	{disabled}
	onchange={handleChange}
	class={cn(
		'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
		'text-base ring-offset-background',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
/>
