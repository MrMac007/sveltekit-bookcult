<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Redirect to discover if authenticated
  $effect(() => {
    if (data.session) {
      goto('/discover');
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
  <div class="max-w-4xl mx-auto px-4 py-16 text-center">
    <h1 class="text-6xl font-bold brand-title mb-6">
      BookCult
    </h1>

    <p class="text-sm text-muted-foreground mb-12 max-w-xl mx-auto">
      A calm, modern reading space where you can track your books, share soft thoughts, and discover new worlds that feel like home.
    </p>

    <div class="space-y-4 max-w-md mx-auto">
      <Button href="/login" class="w-full" size="lg">
        Sign In
      </Button>

      <Button href="/signup" variant="outline" class="w-full" size="lg">
        Create Account
      </Button>
    </div>

    <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
      <div class="p-6 bg-card rounded-xl">
        <div class="text-4xl mb-4">📚</div>
        <h3 class="font-semibold text-lg mb-2">Discover Books</h3>
        <p class="text-muted-foreground">
          Search millions of books and get AI-powered recommendations
        </p>
      </div>

      <div class="p-6 bg-card rounded-xl">
        <div class="text-4xl mb-4">👥</div>
        <h3 class="font-semibold text-lg mb-2">Join Groups</h3>
        <p class="text-muted-foreground">
          Create reading groups and share your journey with friends
        </p>
      </div>

      <div class="p-6 bg-card rounded-xl">
        <div class="text-4xl mb-4">⭐</div>
        <h3 class="font-semibold text-lg mb-2">Track Progress</h3>
        <p class="text-muted-foreground">
          Rate books, track your reading, and see what friends are reading
        </p>
      </div>
    </div>
  </div>
</div>
