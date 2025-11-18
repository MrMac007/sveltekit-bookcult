# BookCult - SvelteKit Edition

A mobile-first social reading platform built with SvelteKit + Svelte 5.

**Project Status:** 96% Complete ✅ | [Full Status Report](./docs/PROJECT_STATUS.md)

## Tech Stack

- **Framework**: SvelteKit (with Svelte 5 runes)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Book Data**: Google Books API
- **AI**: Google Gemini (for recommendations and enhancements)
- **UI Components**: bits-ui (Svelte port of Radix UI)
- **Animations**: Native Svelte transitions

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

Visit `http://localhost:5173`

---

## Documentation

### Getting Started
- **[Setup Guide](./docs/SETUP.md)** - Complete installation and configuration
- **[Project Status](./docs/PROJECT_STATUS.md)** - Current state and progress (96% complete)
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Patterns, structure, and best practices

### Development
- **[Missing Features](./docs/MISSING_FEATURES.md)** - Detailed breakdown of remaining work

---

## Key Features

### Core Functionality ✅
- 📚 Book discovery via Google Books API
- ⭐ Half-star precision ratings (0.5 - 5.0)
- 📖 Reading status tracking (wishlist, reading, completed)
- 👥 Reading groups with invite codes
- 🤖 AI-powered book recommendations
- 🔍 AI-enhanced book descriptions
- 📱 Mobile-first responsive design
- 🔐 Secure authentication (email + Google OAuth)
- 📊 Activity feed from followed users
- 🎯 Row-level security for data privacy

### What's Working Now
- ✅ All 21 pages fully functional
- ✅ 49 of 53 components implemented (92%)
- ✅ Complete authentication flow
- ✅ Book search, tracking, and rating
- ✅ Reading groups with full functionality
- ✅ Social following and activity feed
- ✅ AI recommendations with smart caching
- ✅ Dark/light mode support

### Minor Gaps (4% remaining)
- 4 missing UI components
- 6 currently-reading server actions
- [See detailed breakdown](./docs/MISSING_FEATURES.md)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Books API key (optional but recommended)
- Google Gemini API key (optional, for AI features)

### Installation

```bash
# Clone and navigate
cd sveltekit-bookcult

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

Visit `http://localhost:5173`

### Environment Variables

Create a `.env` file:

```bash
# Supabase (required)
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Books API (optional but recommended)
GOOGLE_BOOKS_API_KEY=your_google_books_api_key

# Google Gemini AI (optional, for recommendations and enhancements)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

### Database Setup

The database schema is shared with the Next.js version. Run the migration files from the parent project:

```bash
# In your Supabase project, run:
# 1. supabase-schema.sql (base schema)
# 2. supabase-migration-*.sql (all migrations in order)
```

## Project Structure

```
src/
├── lib/
│   ├── components/      # Reusable Svelte components
│   │   ├── ui/         # Base UI components
│   │   ├── layout/     # Layout components
│   │   ├── books/      # Book-related components
│   │   ├── groups/     # Group components
│   │   ├── feed/       # Activity feed components
│   │   └── profile/    # Profile components
│   ├── supabase/       # Supabase client setup
│   ├── api/            # API integrations
│   ├── ai/             # AI features
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── routes/             # SvelteKit routes (pages + API)
│   ├── (auth)/        # Auth pages (login, signup)
│   ├── auth/          # Auth handlers
│   ├── api/           # API endpoints
│   ├── discover/      # Main discovery page
│   ├── feed/          # Activity feed
│   ├── book/          # Book pages
│   ├── groups/        # Group pages
│   ├── profile/       # Profile pages
│   └── users/         # User pages
├── hooks.server.ts    # Server hooks (auth middleware)
└── app.html           # HTML template
```

## Key Svelte 5 Patterns

### Reactive State

```svelte
<script lang="ts">
  // Svelte 5 runes
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('Count changed:', count);
  });
</script>

<button onclick={() => count++}>
  {count} (doubled: {doubled})
</button>
```

### Form Actions

```typescript
// +page.server.ts
export const actions = {
  addToWishlist: async ({ request, locals }) => {
    const formData = await request.formData();
    const bookId = formData.get('bookId');

    const { error } = await locals.supabase
      .from('wishlists')
      .insert({ book_id: bookId, user_id: locals.session.user.id });

    return { success: !error };
  }
};
```

### Data Loading

```typescript
// +page.server.ts
export async function load({ locals }) {
  const { data: books } = await locals.supabase
    .from('books')
    .select('*')
    .limit(20);

  return { books };
}
```

## Differences from Next.js Version

| Feature | Next.js | SvelteKit |
|---------|---------|-----------|
| Routing | App Router | File-based routing |
| Pages | `page.tsx` | `+page.svelte` |
| Layouts | `layout.tsx` | `+layout.svelte` |
| API Routes | `route.ts` | `+server.ts` |
| Data Fetching | Server Components | `load` functions |
| Mutations | Server Actions | Form actions |
| State | `useState` | `$state` rune |
| Effects | `useEffect` | `$effect` rune |
| Derived | `useMemo` | `$derived` rune |
| Auth Middleware | `middleware.ts` | `hooks.server.ts` |
| UI Primitives | Radix UI | bits-ui |
| Animations | Framer Motion | Svelte transitions |
| Theme | next-themes | mode-watcher |

## Development

```bash
# Development server
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

The app is configured with `@sveltejs/adapter-auto` which automatically selects the correct adapter for your deployment platform.

## Features Overview

### Book Discovery
- Search Google Books API
- AI-powered personalized recommendations
- Smart caching layer (30-day expiry)
- Full-text search in cached books

### Reading Tracking
- **Wishlist**: Books you want to read
- **Currently Reading**: Books you're actively reading
- **Completed**: Finished books with ratings

### Social Features
- Follow other users
- Activity feed showing friends' reading activities
- Reading groups with invite codes
- Group reading lists

### AI Features
- **Recommendations**: Personalized suggestions based on 4+ star ratings
- **Book Enhancement**: Improves poor/missing book descriptions
- Smart caching to minimize API calls

### Privacy
- Row Level Security (RLS) on all tables
- Ratings visible only to group members
- Profile creation automatic on signup
- Activity feed respects follow relationships

## Contributing

This is a port of the Next.js version. Both versions:
- Share the same database schema
- Can run against the same Supabase instance
- Maintain feature parity (96% complete)

---

## Resources

### Documentation
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Docs](https://svelte.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### APIs
- [Google Books API](https://developers.google.com/books)
- [Google Gemini](https://ai.google.dev/docs)

### Project Docs
- [Setup Guide](./docs/SETUP.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Project Status](./docs/PROJECT_STATUS.md)
- [Missing Features](./docs/MISSING_FEATURES.md)

---

## License

MIT

---

## Acknowledgments

- Original Next.js version (parent directory)
- Supabase for backend infrastructure
- Google Books API for book data
- Google Gemini for AI features
- Svelte and SvelteKit teams for the amazing framework

---

**Current Version:** 1.0 (96% feature complete)
**Last Updated:** November 18, 2024
**Status:** Production Ready with Minor Gaps
