<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    children: import('svelte').Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div
  data-slot="card-description"
  class={cn('text-muted-foreground text-sm', className)}
>
  {@render children()}
</div>
