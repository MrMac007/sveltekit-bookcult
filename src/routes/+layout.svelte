<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { createClient } from '$lib/supabase/client';
  import { Toaster } from 'svelte-sonner';

  // Create Supabase client
  const supabase = createClient();

  // Listen for auth state changes
  onMount(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        invalidate('supabase:auth');
      }
    });

    return () => subscription.unsubscribe();
  });

  let { children, data } = $props();
</script>

<svelte:head>
  <title>BookCult - Social Reading Platform</title>
  <meta name="description" content="Discover, track, and share your reading journey" />
</svelte:head>

<Toaster richColors position="top-center" />
{@render children()}
