<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    children: import('svelte').Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div
  class={cn(
    'rounded-xl border border-border/70 bg-card text-card-foreground',
    className
  )}
>
  {@render children()}
</div>
