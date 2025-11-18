<script lang="ts">
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/supabase/client';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Label from '$lib/components/ui/label.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import { BookOpen, Mail, Lock, Loader2 } from 'lucide-svelte';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  const supabase = createClient();

  async function handleEmailLogin(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = '';

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        error = signInError.message;
        return;
      }

      if (data.user) {
        goto('/discover');
      }
    } catch (err) {
      error = 'An unexpected error occurred';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function handleGoogleLogin() {
    loading = true;
    error = '';

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (oauthError) {
        error = oauthError.message;
        loading = false;
      }
    } catch (err) {
      error = 'An unexpected error occurred';
      console.error(err);
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - BookCult</title>
  <meta name="application-name" content="BookCult" />
  <meta property="og:site_name" content="BookCult" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-6 py-12">
  <!-- Background gradient -->
  <div class="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-accent/5 to-background"></div>

  <Card class="w-full max-w-md">
    <div class="space-y-1 text-center p-6 pb-0">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <BookOpen class="h-6 w-6 text-primary" />
      </div>
      <h1 class="page-heading text-2xl">Welcome back to BookCult</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Continue your reading journey where you left off.
      </p>
    </div>

    <div class="p-6 space-y-4">
      {#if error}
        <div class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      {/if}

      <form onsubmit={handleEmailLogin} class="space-y-4" name="bookcult-login" data-form-type="bookcult-auth">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <div class="relative">
            <Mail class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              name="bookcult-email"
              placeholder="name@bookcult.com"
              class="pl-9"
              bind:value={email}
              required
              disabled={loading}
              autocomplete="username"
            />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="password">Password</Label>
            <a
              href="/forgot-password"
              class="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot?
            </a>
          </div>
          <div class="relative">
            <Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              name="bookcult-password"
              placeholder="••••••••"
              class="pl-9"
              bind:value={password}
              required
              disabled={loading}
              autocomplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" class="w-full tap-target" disabled={loading}>
          {#if loading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          {:else}
            Sign In
          {/if}
        </Button>
      </form>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t"></span>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        class="w-full tap-target"
        onclick={handleGoogleLogin}
        disabled={loading}
      >
        <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>
    </div>

    <div class="p-6 pt-0">
      <p class="text-center text-sm text-muted-foreground w-full">
        Don't have an account?
        <a href="/signup" class="font-semibold text-primary hover:underline">
          Sign up
        </a>
      </p>
    </div>
  </Card>
</div>
