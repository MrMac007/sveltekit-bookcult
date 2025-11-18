# Architecture Guide - BookCult SvelteKit

Comprehensive guide to the architecture, patterns, and structure of the BookCult SvelteKit application.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Routing & Pages](#routing--pages)
5. [Data Loading Patterns](#data-loading-patterns)
6. [State Management](#state-management)
7. [Component Architecture](#component-architecture)
8. [API Integration](#api-integration)
9. [Authentication](#authentication)
10. [Database Layer](#database-layer)
11. [AI Features](#ai-features)
12. [Styling System](#styling-system)

---

## Overview

BookCult SvelteKit is a full-stack social reading platform built with modern web technologies. It uses:

- **SvelteKit** for the framework (SSR, routing, API)
- **Svelte 5** for reactive UI components (runes)
- **Supabase** for database, auth, and real-time features
- **Google Books API** for book data
- **Google Gemini** for AI recommendations
- **Tailwind CSS v4** for styling

---

## Tech Stack

### Frontend
- **SvelteKit 2.x** - Full-stack framework
- **Svelte 5** - Component framework with runes
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **bits-ui** - Accessible component primitives

### Backend
- **SvelteKit Server** - SSR and API routes
- **Supabase** - PostgreSQL database with Row Level Security
- **Supabase Auth** - Authentication provider

### External Services
- **Google Books API** - Book metadata and search
- **Google Gemini 2.5 Flash** - AI recommendations and enhancements

### Development Tools
- **Vite** - Build tool and dev server
- **svelte-check** - TypeScript checking
- **lucide-svelte** - Icon library
- **mode-watcher** - Dark mode management
- **svelte-sonner** - Toast notifications

---

## Project Structure

```
sveltekit-bookcult/
├── src/
│   ├── lib/                          # Shared library code
│   │   ├── actions/                  # Server-side form actions
│   │   │   ├── books.ts             # Book-related actions
│   │   │   ├── follows.ts           # Follow/unfollow actions
│   │   │   ├── groups.ts            # Group management actions
│   │   │   └── recommendations.ts   # AI recommendation actions
│   │   ├── ai/                       # AI integration
│   │   │   ├── gemini.ts            # Gemini API client
│   │   │   ├── book-enhancer.ts     # Book metadata enhancement
│   │   │   └── env-bridge.ts        # Environment variable bridge
│   │   ├── api/                      # External API integrations
│   │   │   ├── google-books.ts      # Google Books API client
│   │   │   ├── book-cache.ts        # Book caching layer
│   │   │   └── book-helpers.ts      # Book utility functions
│   │   ├── components/               # Reusable Svelte components
│   │   │   ├── ui/                  # Base UI components (34 components)
│   │   │   ├── layout/              # Layout components
│   │   │   ├── books/               # Book components
│   │   │   ├── groups/              # Group components
│   │   │   ├── feed/                # Activity feed components
│   │   │   └── profile/             # Profile components
│   │   ├── supabase/                 # Database client setup
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   └── server.ts            # Server Supabase client
│   │   ├── types/                    # TypeScript definitions
│   │   │   ├── database.ts          # Generated Supabase types
│   │   │   └── api.ts               # API response types
│   │   └── utils/                    # Utility functions
│   │       ├── index.ts             # General utilities
│   │       ├── validation.ts        # Data validation
│   │       └── group-activities.ts  # Activity grouping logic
│   ├── routes/                       # SvelteKit file-based routing
│   │   ├── (auth)/                  # Auth route group (no layout)
│   │   │   ├── login/               # Login page
│   │   │   └── signup/              # Signup page
│   │   ├── auth/                     # Auth API routes
│   │   │   ├── callback/            # OAuth callback handler
│   │   │   └── signout/             # Sign out handler
│   │   ├── api/                      # API endpoints
│   │   │   ├── books/               # Book-related APIs
│   │   │   └── recommendations/     # Recommendation APIs
│   │   ├── discover/                 # Discovery page
│   │   ├── feed/                     # Activity feed page
│   │   ├── profile/                  # User profile pages
│   │   ├── my-books/                 # User's book collections
│   │   ├── wishlist/                 # Wishlist page
│   │   ├── completed/                # Completed books page
│   │   ├── currently-reading/        # Currently reading page
│   │   ├── book/[bookId]/           # Book detail pages
│   │   ├── rate/[bookId]/           # Rating pages
│   │   ├── groups/                   # Group pages
│   │   ├── users/[userId]/          # Public user profiles
│   │   ├── +layout.svelte           # Root layout
│   │   ├── +layout.server.ts        # Root layout data
│   │   └── +page.svelte             # Landing page
│   ├── app.html                      # HTML template
│   ├── app.css                       # Global styles & Tailwind config
│   ├── app.d.ts                      # SvelteKit type declarations
│   └── hooks.server.ts               # Server-side hooks (middleware)
├── static/                           # Static assets
├── .env                              # Environment variables (gitignored)
├── .env.example                      # Environment template
├── package.json                      # Dependencies
├── svelte.config.js                  # SvelteKit configuration
├── tsconfig.json                     # TypeScript configuration
└── vite.config.ts                    # Vite configuration
```

---

## Routing & Pages

### File-Based Routing

SvelteKit uses file-based routing. Each folder in `src/routes/` becomes a URL path.

```
src/routes/
├── +page.svelte                  → /
├── discover/+page.svelte         → /discover
├── book/[bookId]/+page.svelte    → /book/:bookId
└── groups/[groupId]/reading-list/+page.svelte
                                  → /groups/:groupId/reading-list
```

### Route Types

#### 1. Regular Pages
```
+page.svelte        → UI component
+page.server.ts     → Server-side data loading & actions
```

#### 2. Layout Routes
```
+layout.svelte      → Shared layout for nested routes
+layout.server.ts   → Shared data for nested routes
```

#### 3. API Routes
```
+server.ts          → API endpoint (GET, POST, etc.)
```

#### 4. Route Groups
```
(auth)/login/+page.svelte    → /login (no /auth in URL)
```
Parentheses create organizational groups without affecting the URL.

### Example: Book Detail Page

```
src/routes/book/[bookId]/
├── +page.svelte        # UI component
└── +page.server.ts     # Data loading
```

**File: +page.server.ts**
```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { bookId } = params;

  // Fetch book from database
  const { data: book } = await locals.supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  // Return data to page component
  return { book };
};
```

**File: +page.svelte**
```svelte
<script lang="ts">
  import type { PageData } from './$types';

  // Reactive props from load function
  let { data }: { data: PageData } = $props();
</script>

<h1>{data.book.title}</h1>
<p>{data.book.description}</p>
```

---

## Data Loading Patterns

### Server-Side Loading

Use `load` functions in `+page.server.ts` for:
- Database queries
- Protected data
- SEO-critical content

```typescript
export const load: PageServerLoad = async ({ locals, params }) => {
  // Always runs on server
  const { data: books } = await locals.supabase
    .from('books')
    .select('*')
    .limit(20);

  return { books };
};
```

### Client-Side Loading

Use `load` functions in `+page.ts` for:
- Public APIs
- Client-only data
- Non-critical content

```typescript
export const load: PageLoad = async ({ fetch, params }) => {
  // Can run on server OR browser
  const response = await fetch('/api/books/search?q=svelte');
  const books = await response.json();

  return { books };
};
```

### When to Use Each

| Use Case | File | Runs |
|----------|------|------|
| Database queries | `+page.server.ts` | Server only |
| Auth-protected data | `+page.server.ts` | Server only |
| Public API calls | `+page.ts` | Server + Browser |
| SEO content | `+page.server.ts` | Server only |
| User preferences | `+page.ts` | Server + Browser |

---

## State Management

### Svelte 5 Runes

BookCult uses Svelte 5's new reactivity system with runes.

#### Reactive State
```svelte
<script lang="ts">
  // Create reactive state
  let count = $state(0);

  // Derived state (auto-updates)
  let doubled = $derived(count * 2);

  // Side effects
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>

<button onclick={() => count++}>
  {count} (doubled: {doubled})
</button>
```

#### Component Props
```svelte
<script lang="ts">
  // Props are read-only by default
  let { book, user } = $props();

  // Make props bindable (two-way)
  let { value = $bindable() } = $props();
</script>
```

#### Event Handlers
```svelte
<script lang="ts">
  let { onclick } = $props();
</script>

<button {onclick}>Click me</button>
```

### Form State Management

Use SvelteKit's form actions for mutations:

```typescript
// +page.server.ts
export const actions = {
  addToWishlist: async ({ request, locals }) => {
    const formData = await request.formData();
    const bookId = formData.get('bookId') as string;

    const { error } = await locals.supabase
      .from('wishlists')
      .insert({
        user_id: locals.session!.user.id,
        book_id: bookId
      });

    if (error) {
      return fail(500, { error: error.message });
    }

    return { success: true };
  }
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<form method="POST" action="?/addToWishlist" use:enhance>
  <input type="hidden" name="bookId" value={book.id} />
  <button type="submit">Add to Wishlist</button>
</form>
```

---

## Component Architecture

### Component Hierarchy

```
App Layout
└── Page Component
    ├── Feature Components
    │   ├── UI Components
    │   └── Data Components
    └── Shared Components
```

### Component Patterns

#### 1. Presentational Components

Pure UI, no business logic:

```svelte
<!-- button.svelte -->
<script lang="ts">
  let { variant = 'default', ...props } = $props();
</script>

<button
  class={cn('base-styles', variantStyles[variant])}
  {...props}
>
  {@render children?.()}
</button>
```

#### 2. Container Components

Handle data and logic:

```svelte
<!-- book-search.svelte -->
<script lang="ts">
  import { searchBooks } from '$lib/api/book-cache';

  let query = $state('');
  let results = $state([]);

  async function handleSearch() {
    results = await searchBooks(query);
  }
</script>

<input bind:value={query} />
<button onclick={handleSearch}>Search</button>

{#each results as book}
  <BookCard {book} />
{/each}
```

#### 3. Layout Components

Provide structure:

```svelte
<!-- app-layout.svelte -->
<script lang="ts">
  let { session } = $props();
</script>

<div class="min-h-screen">
  <AppHeader {session} />

  <main class="container mx-auto px-4 py-6">
    {@render children?.()}
  </main>

  <BottomNav />
</div>
```

### Component Communication

#### Parent to Child (Props)
```svelte
<!-- Parent -->
<BookCard book={selectedBook} />

<!-- Child -->
<script lang="ts">
  let { book } = $props();
</script>
```

#### Child to Parent (Callbacks)
```svelte
<!-- Parent -->
<BookSearch onSelect={(book) => selectedBook = book} />

<!-- Child -->
<script lang="ts">
  let { onSelect } = $props();
</script>
<button onclick={() => onSelect(book)}>Select</button>
```

#### Sibling to Sibling (Shared State)
```svelte
<!-- Parent -->
<script>
  let selectedBook = $state(null);
</script>

<BookSearch bind:selected={selectedBook} />
<BookDetail book={selectedBook} />
```

---

## API Integration

### API Routes (+server.ts)

Create API endpoints in `src/routes/api/`:

```typescript
// src/routes/api/books/search/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
  const query = url.searchParams.get('q');

  // Search database
  const { data: books } = await locals.supabase
    .from('books')
    .select('*')
    .textSearch('search_vector', query)
    .limit(10);

  return json({ books });
};
```

### Calling APIs from Components

```svelte
<script lang="ts">
  async function searchBooks(query: string) {
    const response = await fetch(`/api/books/search?q=${query}`);
    const { books } = await response.json();
    return books;
  }
</script>
```

### External API Integration

Example: Google Books API

```typescript
// src/lib/api/google-books.ts
export class GoogleBooksAPI {
  private apiKey: string;

  async searchBooks(query: string) {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url);
    return await response.json();
  }
}
```

---

## Authentication

### Architecture

```
Browser → SvelteKit → Supabase Auth
   ↓          ↓            ↓
Session   Middleware   PostgreSQL
Storage     (Hooks)      (Users)
```

### Flow

1. **User signs up/in** → Supabase creates session
2. **Session stored** → Cookies (server-side)
3. **Middleware validates** → Every request through hooks
4. **Protected routes** → Redirect if no session
5. **Data access** → Row Level Security enforces permissions

### Implementation

**hooks.server.ts** (Middleware):
```typescript
export const handle = async ({ event, resolve }) => {
  // Create Supabase client
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    { cookies: event.cookies }
  );

  // Get session
  const { data: { session } } = await event.locals.supabase.auth.getSession();
  event.locals.session = session;

  // Protect routes
  const protectedPaths = ['/discover', '/profile', '/groups'];
  if (protectedPaths.some(path => event.url.pathname.startsWith(path))) {
    if (!session) {
      throw redirect(303, '/login');
    }
  }

  return resolve(event);
};
```

**Login component**:
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST" use:enhance>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Sign In</button>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}
</form>
```

**Login action**:
```typescript
export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    throw redirect(303, '/discover');
  }
};
```

---

## Database Layer

### Supabase Client Setup

**Browser client** (`lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
  );
}
```

**Server client** (`lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr';

export function createClient(event: RequestEvent) {
  return createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => event.cookies.set(key, value, options),
        remove: (key, options) => event.cookies.delete(key, options),
      }
    }
  );
}
```

### Query Patterns

**Simple query**:
```typescript
const { data, error } = await locals.supabase
  .from('books')
  .select('*')
  .limit(10);
```

**With joins**:
```typescript
const { data } = await locals.supabase
  .from('wishlists')
  .select(`
    id,
    added_at,
    books:book_id (
      id,
      title,
      authors,
      cover_url
    )
  `)
  .eq('user_id', userId);
```

**Insert**:
```typescript
const { error } = await locals.supabase
  .from('wishlists')
  .insert({
    user_id: userId,
    book_id: bookId
  });
```

**Update**:
```typescript
const { error } = await locals.supabase
  .from('ratings')
  .update({ rating: 4.5, review: 'Great book!' })
  .eq('id', ratingId);
```

**Delete**:
```typescript
const { error } = await locals.supabase
  .from('wishlists')
  .delete()
  .eq('id', wishlistId);
```

### Row Level Security

All queries automatically respect RLS policies:

```sql
-- Users can only see their own wishlist
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

-- Group members can see each other's ratings
CREATE POLICY "Group members can view each other's ratings"
  ON ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = ratings.user_id
    )
  );
```

---

## AI Features

### Google Gemini Integration

**Generate recommendations**:
```typescript
import { generateBookRecommendations } from '$lib/ai/gemini';

const recommendations = await generateBookRecommendations(topRatedBooks);
```

**Enhance book metadata**:
```typescript
import { enhanceBookMetadata } from '$lib/ai/book-enhancer';

const enhanced = await enhanceBookMetadata(book);
```

### Caching Strategy

**Recommendations cache** (5 days):
```typescript
// Check cache first
const { data: cached } = await supabase
  .from('recommendations_cache')
  .select('*')
  .eq('user_id', userId)
  .gt('expires_at', new Date().toISOString())
  .single();

if (cached) {
  return cached.recommendations;
}

// Generate new if cache miss
const recommendations = await generateBookRecommendations(books);

// Store in cache
await supabase.from('recommendations_cache').upsert({
  user_id: userId,
  recommendations,
  expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
});
```

---

## Styling System

### Tailwind CSS v4

**Configuration** (in `app.css`):
```css
@theme {
  --color-background: #f5f3f0;
  --color-primary: #0f766e;
  --radius-lg: 0.5rem;
}
```

**Usage**:
```svelte
<div class="bg-background text-foreground rounded-lg p-4">
  <h1 class="text-2xl font-bold">Title</h1>
</div>
```

### Component Styling Pattern

**Base component with variants**:
```svelte
<script lang="ts">
  import { cn } from '$lib/utils';

  let {
    variant = 'default',
    size = 'md',
    class: className,
    ...props
  } = $props();

  const variants = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-input bg-background',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };
</script>

<button
  class={cn(
    'inline-flex items-center justify-center rounded-md',
    variants[variant],
    sizes[size],
    className
  )}
  {...props}
>
  {@render children?.()}
</button>
```

---

## Best Practices

### 1. Server vs Client Code

- **Server**: Database queries, secrets, auth checks
- **Client**: UI interactions, local state, browser APIs

### 2. Type Safety

Always use generated types:
```typescript
import type { Database } from '$lib/types/database';
import type { PageServerLoad } from './$types';
```

### 3. Error Handling

```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const { data, error } = await locals.supabase
    .from('books')
    .select('*');

  if (error) {
    throw error(500, 'Failed to load books');
  }

  return { books: data };
};
```

### 4. Performance

- Use server-side loading for initial data
- Cache expensive operations
- Lazy load heavy components
- Optimize images with proper sizing

### 5. Security

- Never expose secrets in client code
- Always validate user input
- Use RLS for data access control
- Sanitize user-generated content

---

## Next Steps

- Read [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current state
- Check [MISSING_FEATURES.md](./MISSING_FEATURES.md) for remaining work
- See [SETUP.md](./SETUP.md) for installation guide

---

**Architecture Version:** 1.0
**Last Updated:** November 18, 2024
