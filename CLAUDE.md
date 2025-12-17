# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type-check with svelte-check
npm run check:watch  # Type-check in watch mode
```

## Architecture Overview

BookCult is a SvelteKit book tracking application with social features, deployed to Vercel Edge.

### Tech Stack
- **Framework**: SvelteKit 2 with Svelte 5 (runes)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: Google Gemini 2.0 Flash via Vercel AI SDK for book recommendations
- **Book Data**: Open Library API (primary source)
- **Styling**: Tailwind CSS 4 with custom design tokens in `src/app.css`
- **UI Components**: Custom components using bits-ui primitives

### Key Directories

```
src/
├── routes/              # SvelteKit file-based routing
├── lib/
│   ├── actions/         # Server actions for books, groups, follows, recommendations
│   ├── api/             # Open Library API client and book helpers
│   ├── ai/              # Gemini integration for AI recommendations
│   ├── components/
│   │   ├── ui/          # Base UI components (button, card, dialog, etc.)
│   │   ├── books/       # Book-specific components (search, detail, actions)
│   │   ├── groups/      # Book club group components
│   │   ├── profile/     # User profile components
│   │   ├── feed/        # Activity feed components
│   │   └── layout/      # App header, nav, layout wrappers
│   ├── supabase/        # Supabase client factories (server.ts and client.ts)
│   ├── types/           # TypeScript types (database.ts is the source of truth)
│   └── utils/           # Utility functions
```

### Data Flow

1. **Authentication**: Supabase Auth with session in `hooks.server.ts`. Protected routes defined there.
2. **Database Types**: `src/lib/types/database.ts` defines all Supabase table schemas.
3. **Server Actions**: `src/lib/actions/*.ts` contain reusable server-side operations imported into `+page.server.ts` files.
4. **API Routes**: `src/routes/api/` for client-callable endpoints (book search, enhance, recommendations).

### Path Aliases
- `$lib` → `src/lib`
- `$components` → `src/lib/components`

### Environment Variables
Required in `.env`:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` (for AI recommendations)

### Design System
Custom theme tokens in `src/app.css` with light/dark mode support:
- Primary: teal
- Secondary: violet
- Uses CSS custom properties mapped to Tailwind classes
- Utility classes: `.brand-title`, `.page-heading`, `.meta-label`, `.card-elevated`
