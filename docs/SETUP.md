# Setup Guide - BookCult SvelteKit

Complete installation and configuration guide for the BookCult SvelteKit application.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm
- **Supabase Account** (free tier works fine)
- **Google Books API Key** (optional but recommended)
- **Google Gemini API Key** (optional, for AI features)
- **Git** (for cloning the repository)

---

## Quick Start (5 minutes)

```bash
# 1. Navigate to project
cd sveltekit-bookcult

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Run development server
npm run dev

# 5. Open browser
# Visit http://localhost:5173
```

---

## Detailed Setup

### 1. Install Dependencies

```bash
cd sveltekit-bookcult
npm install
```

This installs all required packages:
- SvelteKit & Svelte 5
- Supabase client libraries
- Tailwind CSS v4
- UI components (bits-ui)
- AI SDK (@ai-sdk/google)
- Icons (lucide-svelte)
- And more...

### 2. Database Setup

#### Option A: Using Existing Database

If you already have the BookCult database from the Next.js version:

1. **Reuse the same Supabase project** - The schema is identical
2. **Get your credentials:**
   - Project URL: `https://[your-project].supabase.co`
   - Anon key: Found in Project Settings > API

#### Option B: Create New Database

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Run Database Migrations:**

   Navigate to SQL Editor in Supabase Dashboard and run these files in order:

   ```
   From the parent Next.js project:
   1. database/schema.sql
   2. database/migrations/supabase-migration-001.sql
   3. database/migrations/supabase-migration-002.sql
   ... (continue through all migration files in order)
   ```

   Or use Supabase CLI:
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login
   supabase login

   # Link to your project
   supabase link --project-ref [your-project-id]

   # Push migrations (if you have them in a migrations folder)
   supabase db push
   ```

3. **Verify Database:**

   Check that these 11 tables exist:
   - profiles
   - books
   - wishlists
   - completed_books
   - currently_reading
   - ratings
   - groups
   - group_members
   - follows
   - activities
   - recommendations_cache

### 3. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# ========================================
# REQUIRED - Supabase Configuration
# ========================================
PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ========================================
# OPTIONAL - Google Books API
# ========================================
# Get free API key at: https://console.cloud.google.com/apis/credentials
# Enables better book search results and metadata
GOOGLE_BOOKS_API_KEY=your_google_books_api_key

# ========================================
# OPTIONAL - Google Gemini AI
# ========================================
# Get free API key at: https://ai.google.dev/
# Enables AI-powered recommendations and book enhancements
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# ========================================
# OPTIONAL - App Configuration
# ========================================
# Required for OAuth callback URLs in production
PUBLIC_APP_URL=http://localhost:5173
```

#### Getting API Keys

**Google Books API Key (Free):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable "Books API"
4. Go to Credentials > Create Credentials > API Key
5. Copy the API key

**Google Gemini API Key (Free):**
1. Go to [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Create new key or use existing
4. Copy the API key
5. Free tier: 60 requests/minute

### 4. Configure Supabase Authentication

#### Enable Email Authentication

1. Go to Supabase Dashboard
2. Navigate to Authentication > Providers
3. Enable "Email" provider
4. Configure:
   - Enable email confirmations (optional)
   - Set site URL: `http://localhost:5173` (development)

#### Enable Google OAuth (Optional)

1. **Create Google OAuth Client:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://[your-project].supabase.co/auth/v1/callback
     ```

2. **Configure in Supabase:**
   - Authentication > Providers > Google
   - Enable Google provider
   - Add Client ID and Client Secret
   - Set authorized redirect URL

3. **Update Environment:**
   ```bash
   # In production, set:
   PUBLIC_APP_URL=https://your-domain.com
   ```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at: `http://localhost:5173`

### 6. Verify Installation

Test these features:

- [ ] Landing page loads
- [ ] Can create account with email
- [ ] Can sign in with email
- [ ] Can sign in with Google (if configured)
- [ ] Can search for books
- [ ] Can add book to wishlist
- [ ] AI recommendations appear (if Gemini key configured)

---

## Build & Deploy

### Build for Production

```bash
# Type check
npm run check

# Build
npm run build

# Preview production build locally
npm run preview
```

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Add all variables from `.env`
   - Set `PUBLIC_APP_URL` to your production domain

4. **Update Supabase OAuth:**
   - Add production URL to OAuth redirect URIs
   - Update site URL in Supabase Authentication settings

### Deploy to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

3. **Configure Environment Variables:**
   - Netlify Dashboard > Site Settings > Environment Variables
   - Add all variables from `.env`

### Deploy to Other Platforms

The app uses `@sveltejs/adapter-auto` which automatically detects your deployment platform. Supported platforms:

- Vercel
- Netlify
- Cloudflare Pages
- AWS (with adapter-aws)
- Azure Static Web Apps
- And more...

---

## Troubleshooting

### Common Issues

#### "Cannot read properties of undefined (reading 'from')"

**Problem:** Supabase client not initialized properly

**Solution:**
```typescript
// In +page.server.ts, always use:
export const load = async ({ locals }) => {
  const { data } = await locals.supabase.from('books').select('*');
  // NOT: const supabase = createClient()
};
```

#### "Auth session missing" errors

**Problem:** User session not being passed correctly

**Solution:**
- Check `hooks.server.ts` is properly set up
- Verify `locals.session` is populated
- Check protected routes have session checks

#### AI Features Not Working

**Problem:** Gemini API key missing or invalid

**Solutions:**
1. Check `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`
2. Verify key is valid at [AI Studio](https://ai.google.dev/)
3. Check you haven't exceeded free tier limits (60 req/min)

#### Books Not Found in Search

**Problem:** Google Books API not configured

**Solutions:**
1. Add `GOOGLE_BOOKS_API_KEY` to `.env`
2. Or search database-only by using source filter
3. Verify API key is enabled for Books API

#### OAuth Redirect Errors

**Problem:** Callback URL mismatch

**Solutions:**
1. Check `PUBLIC_APP_URL` matches your domain
2. Verify redirect URI in Google OAuth settings
3. Update Supabase site URL for your environment

### TypeScript Errors

If you see TypeScript errors:

```bash
# Regenerate types
npm run check

# If using Supabase types, regenerate:
npx supabase gen types typescript --project-id [your-project-id] > src/lib/types/database.ts
```

### Port Already in Use

If port 5173 is in use:

```bash
# Use different port
npm run dev -- --port 3000
```

---

## Development Workflow

### Recommended VS Code Extensions

- **Svelte for VS Code** - Syntax highlighting and IntelliSense
- **Tailwind CSS IntelliSense** - Class name suggestions
- **ESLint** - Code linting
- **Prettier** - Code formatting

### Useful Commands

```bash
# Development server with hot reload
npm run dev

# Type checking (finds TS errors)
npm run check

# Type checking in watch mode
npm run check -- --watch

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package-name

# Update all packages
npm update
```

### Project Structure Tips

```
src/
├── lib/
│   ├── components/      # Put all reusable components here
│   │   ├── ui/         # Base UI components (Button, Card, etc.)
│   │   ├── books/      # Book-specific components
│   │   ├── groups/     # Group components
│   │   └── ...
│   ├── actions/        # Server-side mutations
│   ├── api/            # External API integrations
│   └── utils/          # Utility functions
└── routes/             # File-based routing (pages)
    ├── +page.svelte    # Homepage
    ├── +layout.svelte  # App layout
    └── api/            # API endpoints
```

---

## Testing

### Manual Testing Checklist

Before deploying, test these workflows:

#### Authentication
- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Sign out
- [ ] OAuth login (if configured)
- [ ] Protected routes redirect to login
- [ ] Session persists across page reloads

#### Book Features
- [ ] Search books (database + Google Books)
- [ ] View book details
- [ ] Add to wishlist
- [ ] Mark as currently reading
- [ ] Mark as completed
- [ ] Rate completed book
- [ ] Edit existing rating
- [ ] AI book enhancement (if configured)

#### Social Features
- [ ] Follow another user
- [ ] Unfollow user
- [ ] View activity feed
- [ ] View other user's profile
- [ ] See followers/following lists

#### Group Features
- [ ] Create reading group
- [ ] Join group with invite code
- [ ] View group details
- [ ] Add books to group reading list
- [ ] Rate books in group
- [ ] View group member ratings

#### AI Features (if configured)
- [ ] View AI recommendations
- [ ] Refresh recommendations
- [ ] Add recommended book to wishlist
- [ ] Enhance book metadata with AI

---

## Next Steps

Once set up, you can:

1. **Customize the theme** - Edit `src/app.css` theme variables
2. **Add missing features** - See [MISSING_FEATURES.md](./MISSING_FEATURES.md)
3. **Deploy to production** - Use Vercel or Netlify
4. **Monitor usage** - Check Supabase dashboard for activity
5. **Add features** - Build on top of the solid foundation

---

## Getting Help

### Resources

- **SvelteKit Docs:** https://kit.svelte.dev/docs
- **Svelte 5 Docs:** https://svelte.dev/docs
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Google Books API:** https://developers.google.com/books
- **Google Gemini:** https://ai.google.dev/docs

### Common Questions

**Q: Can I run this alongside the Next.js version?**
A: Yes! Both versions can share the same Supabase database.

**Q: Do I need all the API keys?**
A: No. Only Supabase is required. Google Books and Gemini are optional enhancements.

**Q: How do I add new pages?**
A: Create `+page.svelte` files in `src/routes/`. See existing pages for examples.

**Q: Where do I put server-side code?**
A: In `+page.server.ts` files or `+server.ts` for API routes.

**Q: How do I deploy?**
A: Run `npm run build` then deploy the `.svelte-kit/output` folder to your host.

---

**Setup Complete!** 🎉

You should now have a fully functional BookCult SvelteKit application running locally. Check out [PROJECT_STATUS.md](./PROJECT_STATUS.md) to see what's implemented and what's missing.
