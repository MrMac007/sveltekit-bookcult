# Missing Features - Detailed Breakdown

This document provides a comprehensive breakdown of the 4 missing components and 2 missing server-side features needed to achieve 100% parity with the Next.js version.

---

## 📊 Summary

- **4 Missing UI Components** (8% of total components)
- **6 Missing Server Actions** (currently reading operations)
- **Estimated Time to Complete:** 4-6 hours
- **Priority Level:** High for full parity, Medium for production deployment

---

## 🚨 Missing Components

### 1. book-detail.svelte

**Priority:** HIGH
**Estimated Time:** 1.5-2 hours
**Next.js Source:** `/components/books/book-detail.tsx`

#### What It Does
Comprehensive book detail component that displays all book information, user status, and actions.

#### Features Required
- **Book Header Section:**
  - Large book cover (160px width, 240px height)
  - Title and authors
  - Category badges (up to 3)

- **Stats Grid (3 cards):**
  - Pages count
  - Publication year
  - Total ratings count

- **About This Book Card:**
  - Book description (with AI-enhanced badge)
  - "Enhance with AI" button (if not enhanced)
  - Additional info: publisher, language, ISBN-13, ISBN-10

- **User Status Card:**
  - Shows if book is in wishlist
  - Shows if completed
  - Displays user's rating with edit button
  - "Add Rating" button if not rated

- **Group Ratings Section:**
  - List of ratings from group members
  - Username, rating stars, review text
  - Date of rating

- **Action Buttons:**
  - Integrates `book-actions.svelte` component

#### Component Props
```typescript
interface BookDetailProps {
  user: User;
  book: BookCardData & {
    publisher?: string;
    language?: string;
    ai_enhanced?: boolean;
    ai_enhanced_at?: string;
  };
  isInWishlist: boolean;
  isCompleted: boolean;
  isCurrentlyReading?: boolean;
  userRating?: {
    rating: number;
    review?: string;
    created_at: string;
  } | null;
  groupRatings: Array<{
    id: string;
    rating: number;
    review?: string;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      avatar_url?: string;
    } | null;
  }>;
}
```

#### Implementation Notes
- Use existing UI components (Card, Badge, Button, StarRating)
- Handle AI enhancement action with loading states
- Refresh page data after actions complete
- Mobile-responsive layout

---

### 2. book-actions.svelte

**Priority:** HIGH
**Estimated Time:** 1-1.5 hours
**Next.js Source:** `/components/books/book-actions.tsx`

#### What It Does
Reusable action button set for managing book status (wishlist, reading, completed).

#### Features Required
- **Three Action Buttons:**
  1. "Want to Read" (adds to wishlist)
  2. "Mark as Reading" / "Currently Reading" (toggle)
  3. "Mark as Complete" (redirects to rating page)

- **Button States:**
  - Disabled when loading
  - Hidden based on book status
  - Visual feedback for current state

- **Actions:**
  - Add to wishlist (client-side with Supabase)
  - Toggle currently reading status
  - Mark complete (removes from wishlist, adds to completed, redirects)

#### Component Props
```typescript
interface BookActionsProps {
  user: User;
  book: BookCardData;
  isInWishlist?: boolean;
  isCompleted?: boolean;
  isCurrentlyReading?: boolean;
  onStatusChange?: () => void; // Callback for refreshing parent
}
```

#### Implementation Notes
- Uses `$state` for local button states
- Calls Supabase client directly (client-side component)
- Uses `findOrCreateBook` helper to ensure book exists in DB
- Shows toast notifications for success/error
- Updates local state optimistically

---

### 3. currently-reading-section.svelte

**Priority:** HIGH
**Estimated Time:** 1 hour
**Next.js Source:** `/components/profile/currently-reading-section.tsx`

#### What It Does
Displays the user's currently reading books on their profile page, with group context.

#### Features Required
- **Section Header:**
  - "Currently Reading" title
  - Book count badge

- **Book List:**
  - Book cover thumbnails
  - Book title and authors
  - "Reading with [Group Name]" badge (if in group context)
  - Remove button (X icon)

- **Empty State:**
  - Shows message when no books being read
  - CTA to browse books

- **Actions:**
  - Remove from currently reading
  - Click book to navigate to detail page
  - Click group badge to navigate to group

#### Component Props
```typescript
interface CurrentlyReadingSectionProps {
  books: Array<{
    id: string;
    started_at: string;
    group_id?: string;
    books: {
      id: string;
      title: string;
      authors: string[];
      cover_url?: string;
      google_books_id?: string;
    };
    groups?: {
      id: string;
      name: string;
    } | null;
  }>;
  onRemove?: (bookId: string) => void;
}
```

#### Implementation Notes
- Horizontal scrollable carousel on mobile
- Grid layout on desktop
- Uses currently reading server actions
- Optimistic UI updates

---

### 4. manage-reading-list.svelte

**Priority:** MEDIUM
**Estimated Time:** 1.5 hours
**Next.js Source:** `/components/groups/manage-reading-list.tsx`

#### What It Does
Admin-only interface for managing a group's reading list (add/remove books).

#### Features Required
- **Admin Check:**
  - Only visible to group admins
  - Shows permission error for non-admins

- **Add Books Section:**
  - Book search input
  - Search results dropdown
  - "Add to Group" button for each result

- **Current Reading List:**
  - List of books in group
  - Remove button for each book
  - Set as "Current Reading Book" button

- **Actions:**
  - Search books (database + Open Library API)
  - Add book to group reading list
  - Remove book from group
  - Set/unset current reading book for group

#### Component Props
```typescript
interface ManageReadingListProps {
  group: {
    id: string;
    name: string;
    admin_id: string;
    current_book_id?: string;
  };
  userId: string;
  initialBooks: Array<{
    id: string;
    title: string;
    authors: string[];
    cover_url?: string;
  }>;
}
```

#### Implementation Notes
- Uses book search API endpoint
- Calls group server actions for mutations
- Real-time updates with optimistic UI
- Admin-only guard

---

## 🔧 Missing Server Actions

### Currently Reading Actions

**Priority:** HIGH
**Estimated Time:** 1.5 hours
**Next.js Source:** `/app/actions/currently-reading.ts`

Create new file: `/src/lib/actions/currently-reading.ts`

#### Required Functions

1. **addToCurrentlyReading**
```typescript
async function addToCurrentlyReading(
  bookId: string,
  groupId?: string | null
): Promise<{ success?: boolean; error?: string }>
```
- Adds book to user's currently reading list
- Optional group context
- Checks if already reading
- Returns success/error

2. **removeFromCurrentlyReading**
```typescript
async function removeFromCurrentlyReading(
  bookId: string
): Promise<{ success?: boolean; error?: string }>
```
- Removes book from currently reading
- Cleans up group context if present

3. **toggleCurrentlyReading**
```typescript
async function toggleCurrentlyReading(
  bookId: string,
  groupId?: string | null
): Promise<{ success?: boolean; error?: string }>
```
- Adds if not reading, removes if reading
- Convenience wrapper for the above two

4. **getCurrentlyReading**
```typescript
async function getCurrentlyReading(
  userId?: string
): Promise<{ data: any[]; error?: string }>
```
- Fetches currently reading books for a user
- Defaults to current user if no userId provided
- Includes book details and group context

5. **isCurrentlyReading**
```typescript
async function isCurrentlyReading(
  bookId: string,
  userId?: string
): Promise<{ isReading: boolean }>
```
- Checks if user is currently reading a specific book
- Used for button states

6. **getMembersReading**
```typescript
async function getMembersReading(
  groupId: string,
  bookId: string
): Promise<{ data: any[]; error?: string }>
```
- Gets list of group members reading a specific book
- Includes user profiles
- Used in group book displays

#### Implementation Pattern
```typescript
// Example structure
import type { RequestEvent } from '@sveltejs/kit';

export async function addToCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  groupId?: string | null
) {
  const { locals } = event;

  if (!locals.session) {
    return { error: 'You must be logged in' };
  }

  // Check if book exists
  const { data: book, error: bookError } = await locals.supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    return { error: 'Book not found' };
  }

  // Check if already reading
  const { data: existing } = await locals.supabase
    .from('currently_reading')
    .select('id')
    .eq('user_id', locals.session.user.id)
    .eq('book_id', bookId)
    .single();

  if (existing) {
    return { error: 'Book is already in your currently reading list' };
  }

  // Insert
  const { error: insertError } = await locals.supabase
    .from('currently_reading')
    .insert({
      user_id: locals.session.user.id,
      book_id: bookId,
      group_id: groupId || null,
    });

  if (insertError) {
    return { error: 'Failed to add book to currently reading' };
  }

  return { success: true };
}
```

---

## 📝 Implementation Checklist

### Components
- [ ] Create `book-detail.svelte`
  - [ ] Book header section
  - [ ] Stats grid
  - [ ] About this book card
  - [ ] User status card
  - [ ] Group ratings section
  - [ ] Action buttons integration
  - [ ] AI enhancement handler

- [ ] Create `book-actions.svelte`
  - [ ] Want to Read button
  - [ ] Mark as Reading toggle
  - [ ] Mark as Complete button
  - [ ] Loading states
  - [ ] Toast notifications
  - [ ] Status callbacks

- [ ] Create `currently-reading-section.svelte`
  - [ ] Book list display
  - [ ] Group context badges
  - [ ] Remove functionality
  - [ ] Empty state
  - [ ] Mobile carousel layout

- [ ] Create `manage-reading-list.svelte`
  - [ ] Admin permission check
  - [ ] Book search interface
  - [ ] Add to group functionality
  - [ ] Remove from group
  - [ ] Current book management

### Server Actions
- [ ] Create `currently-reading.ts`
  - [ ] addToCurrentlyReading
  - [ ] removeFromCurrentlyReading
  - [ ] toggleCurrentlyReading
  - [ ] getCurrentlyReading
  - [ ] isCurrentlyReading
  - [ ] getMembersReading

### Integration
- [ ] Wire up `book-detail.svelte` to book pages
- [ ] Wire up `currently-reading-section.svelte` to profile
- [ ] Wire up `manage-reading-list.svelte` to group pages
- [ ] Test all currently reading flows
- [ ] Test group admin functionality
- [ ] Mobile responsive testing

---

## 🎯 Testing Requirements

After implementing missing features, verify:

### Currently Reading Flow
1. Add book to currently reading from book detail page
2. View currently reading books on profile
3. Remove book from currently reading
4. Add book with group context
5. View group members reading same book

### Book Detail Flow
1. View book details for all book states
2. Enhance book with AI (if not enhanced)
3. Add book to wishlist
4. Toggle currently reading status
5. Mark book as complete
6. Rate completed book
7. Edit existing rating

### Group Admin Flow
1. Add books to group reading list
2. Remove books from group
3. Set current reading book
4. View member reading status

---

## 📚 Reference Files

### Next.js Source Files
- `/components/books/book-detail.tsx`
- `/components/books/book-actions.tsx`
- `/components/profile/currently-reading-section.tsx`
- `/components/groups/manage-reading-list.tsx`
- `/app/actions/currently-reading.ts`

### SvelteKit Destinations
- `/src/lib/components/books/book-detail.svelte`
- `/src/lib/components/books/book-actions.svelte`
- `/src/lib/components/profile/currently-reading-section.svelte`
- `/src/lib/components/groups/manage-reading-list.svelte`
- `/src/lib/actions/currently-reading.ts`

### Related Files for Reference
- `/src/lib/components/books/book-card.svelte` - Similar structure
- `/src/lib/actions/books.ts` - Action pattern examples
- `/src/lib/api/book-helpers.ts` - Book creation helpers

---

**Total Remaining Work:** 4-6 hours for full parity
**Status:** Non-blocking for deployment, can be added incrementally
