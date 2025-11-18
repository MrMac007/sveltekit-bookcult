<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    children: import('svelte').Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div
  data-slot="card-footer"
  class={cn('flex items-center px-6 [.border-t]:pt-6', className)}
>
  {@render children()}
</div>
