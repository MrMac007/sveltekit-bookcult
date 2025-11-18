<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    children: import('svelte').Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div
  data-slot="card-title"
  class={cn('leading-none font-semibold', className)}
>
  {@render children()}
</div>
