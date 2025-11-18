<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Button from '$lib/components/ui/button/button.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardDescription from '$lib/components/ui/card/card-description.svelte';
  import CardFooter from '$lib/components/ui/card/card-footer.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import { BookOpen, Mail, Lock, User, Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  let { data } = $props();

  let email = $state('');
  let password = $state('');
  let username = $state('');
  let loading = $state(false);

  const supabase = data.supabase;

  function sanitizeUsername(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  async function handleEmailSignUp(e: Event) {
    e.preventDefault();
    loading = true;

    // Basic validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      loading = false;
      return;
    }

    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      loading = false;
      return;
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            display_name: username
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (authData.user) {
        // Check if email confirmation is required
        if (authData.user.identities && authData.user.identities.length === 0) {
          toast.error('This email is already registered. Please sign in instead.');
          return;
        }

        if (authData.session) {
          // User is automatically signed in
          toast.success('Account created successfully!');
          await goto('/discover');
        } else {
          // Email confirmation required
          toast.success('Please check your email to verify your account!');
          await goto('/login');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      loading = false;
    }
  }

  async function handleGoogleSignUp() {
    loading = true;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast.error(error.message);
        loading = false;
      }
      // Don't set loading to false here - user is being redirected
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
      loading = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center px-6 py-12">
  <!-- Background gradient -->
  <div class="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />

  <Card class="w-full max-w-md">
    <CardHeader class="space-y-1 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <BookOpen class="h-6 w-6 text-primary" />
      </div>
      <CardTitle class="text-2xl font-bold">Create an account</CardTitle>
      <CardDescription>
        Join BookCult and start your reading journey
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <form onsubmit={handleEmailSignUp} class="space-y-4">
        <div class="space-y-2">
          <Label for="username">Username</Label>
          <div class="relative">
            <User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="username"
              type="text"
              placeholder="bookworm"
              class="pl-9"
              bind:value={username}
              oninput={(e) => {username = sanitizeUsername(e.currentTarget.value);}}
              required
              disabled={loading}
              minlength={3}
              maxlength={20}
            />
          </div>
          <p class="text-xs text-muted-foreground">
            3-20 characters, lowercase letters, numbers, and underscores only
          </p>
        </div>
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <div class="relative">
            <Mail class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              class="pl-9"
              bind:value={email}
              required
              disabled={loading}
            />
          </div>
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <div class="relative">
            <Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              class="pl-9"
              bind:value={password}
              required
              disabled={loading}
              minlength={6}
            />
          </div>
          <p class="text-xs text-muted-foreground">
            At least 6 characters
          </p>
        </div>
        <Button
          type="submit"
          class="w-full tap-target"
          disabled={loading}
        >
          {#if loading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          {:else}
            Create Account
          {/if}
        </Button>
      </form>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        class="w-full tap-target"
        onclick={handleGoogleSignUp}
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
    </CardContent>
    <CardFooter>
      <p class="text-center text-sm text-muted-foreground w-full">
        Already have an account?{' '}
        <a href="/login" class="font-semibold text-primary hover:underline">
          Sign in
        </a>
      </p>
    </CardFooter>
  </Card>
</div>
