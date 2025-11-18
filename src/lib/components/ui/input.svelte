<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    type?: string;
    value?: string | number;
    placeholder?: string;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder,
    id,
    name,
    required = false,
    disabled = false,
    class: className,
    oninput,
    onchange
  }: Props = $props();
</script>

<input
  {type}
  bind:value
  {placeholder}
  {id}
  {name}
  {required}
  {disabled}
  {oninput}
  {onchange}
  class={cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
    'text-sm ring-offset-background file:border-0 file:bg-transparent',
    'file:text-sm file:font-medium placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
/>
