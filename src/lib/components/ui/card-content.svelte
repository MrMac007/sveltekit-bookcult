<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    children: import('svelte').Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div
  data-slot="card-content"
  class={cn('px-6 pb-6', className)}
>
  {@render children()}
</div>
