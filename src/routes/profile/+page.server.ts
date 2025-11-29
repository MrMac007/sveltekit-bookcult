import { createClient } from '$lib/supabase/server'
import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import type { Database, WallStyle } from '$lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface BookBasic {
  id: string
  title: string
  authors: string[]
  cover_url: string | null
}

interface CurrentlyReadingItem {
  id: string
  started_at: string
  group_id: string | null
  books: {
    id: string
    title: string
    authors: string[]
    cover_url: string | null
    description: string | null
    page_count: number | null
    published_date: string | null
  } | null
  groups: {
    id: string
    name: string
  } | null
}

interface UserQuoteWithBook {
  id: string
  quote_text: string
  page_number: number | null
  display_order: number
  books: BookBasic | null
}

interface FavoriteBookWithDetails {
  id: string
  display_order: number
  books: BookBasic | null
}

interface WishlistWithBook {
  id: string
  books: BookBasic | null
}

interface CompletedWithBook {
  id: string
  books: BookBasic | null
}

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  // Get user profile
  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!profileData) {
    throw redirect(303, '/login')
  }

  const profile = profileData as Profile

  // Run remaining queries in parallel for faster loading
  const [
    wishlistCountResult,
    completedCountResult,
    currentlyReadingCountResult,
    currentlyReadingResult,
    userQuotesResult,
    favoriteBooksResult,
    wishlistBooksResult,
    completedBooksResult,
  ] = await Promise.all([
    // Get wishlist count
    supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Get completed count
    supabase
      .from('completed_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Get currently reading count
    supabase
      .from('currently_reading')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Get currently reading books with details (for display section)
    supabase
      .from('currently_reading')
      .select(
        `
        id,
        started_at,
        group_id,
        books:book_id (
          id,
          title,
          authors,
          cover_url,
          description,
          page_count,
          published_date
        ),
        groups:group_id (
          id,
          name
        )
      `
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(6),

    // Get user quotes for quote wall
    supabase
      .from('user_quotes')
      .select(
        `
        id,
        quote_text,
        page_number,
        display_order,
        books:book_id (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })
      .limit(10),

    // Get favorite books for quote wall
    supabase
      .from('favorite_books')
      .select(
        `
        id,
        display_order,
        books:book_id (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })
      .limit(3),

    // Get wishlist books (for editor selection)
    supabase
      .from('wishlists')
      .select(
        `
        id,
        books:book_id (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', user.id),

    // Get completed books (for editor selection)
    supabase
      .from('completed_books')
      .select(
        `
        id,
        books:book_id (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', user.id),
  ])

  const currentlyReadingItems =
    (currentlyReadingResult.data as CurrentlyReadingItem[] | null)?.filter(
      (item) => item.books !== null
    ) ?? []

  // Process quotes
  const typedQuotes = (userQuotesResult.data || []) as unknown as UserQuoteWithBook[]
  const quotesWithBooks = typedQuotes
    .filter((q) => q.books !== null)
    .map((q) => ({
      id: q.id,
      quote_text: q.quote_text,
      page_number: q.page_number,
      book: q.books!,
    }))

  // Process favorites
  const typedFavorites = (favoriteBooksResult.data || []) as unknown as FavoriteBookWithDetails[]
  const favoriteBooksWithDetails = typedFavorites
    .filter((f) => f.books !== null)
    .map((f) => ({
      id: f.id,
      display_order: f.display_order,
      book: f.books!,
    }))

  // Combine wishlist and completed books for available books (deduped)
  const typedWishlist = (wishlistBooksResult.data || []) as unknown as WishlistWithBook[]
  const typedCompleted = (completedBooksResult.data || []) as unknown as CompletedWithBook[]
  
  const bookMap = new Map<string, BookBasic>()
  for (const w of typedWishlist) {
    if (w.books) bookMap.set(w.books.id, w.books)
  }
  for (const c of typedCompleted) {
    if (c.books) bookMap.set(c.books.id, c.books)
  }
  const availableBooks = Array.from(bookMap.values()).sort((a, b) => a.title.localeCompare(b.title))

  return {
    profile,
    wishlistCount: wishlistCountResult.count || 0,
    completedCount: completedCountResult.count || 0,
    currentlyReadingCount: currentlyReadingCountResult.count || 0,
    currentlyReading: currentlyReadingItems,
    userQuotes: quotesWithBooks,
    favoriteBooks: favoriteBooksWithDetails,
    availableBooks,
    wallStyle: (profile.wall_style || 'sticky-notes') as WallStyle,
  }
}

const VALID_WALL_STYLES: WallStyle[] = ['sticky-notes', 'typewriter', 'constellation']

export const actions: Actions = {
  setWallStyle: async (event) => {
    const supabase = createClient(event)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Unauthorized' })
    }

    const formData = await event.request.formData()
    const wallStyle = formData.get('wallStyle') as string

    if (!wallStyle || !VALID_WALL_STYLES.includes(wallStyle as WallStyle)) {
      return fail(400, { error: 'Invalid wall style' })
    }

    const { error } = await (supabase
      .from('profiles') as any)
      .update({ wall_style: wallStyle })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating wall style:', error)
      return fail(500, { error: 'Failed to update wall style' })
    }

    return { success: true }
  },

  setFavoriteBooks: async (event) => {
    const supabase = createClient(event)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Unauthorized' })
    }

    const formData = await event.request.formData()
    const favorite1 = formData.get('favorite1') as string
    const favorite2 = formData.get('favorite2') as string
    const favorite3 = formData.get('favorite3') as string

    // Delete all existing favorites first
    const { error: deleteError } = await supabase
      .from('favorite_books')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting favorites:', deleteError)
      return fail(500, { error: 'Failed to update favorites' })
    }

    // Insert new favorites
    const favorites = [
      { book_id: favorite1, display_order: 1 },
      { book_id: favorite2, display_order: 2 },
      { book_id: favorite3, display_order: 3 },
    ].filter(f => f.book_id) // Only include non-empty selections

    if (favorites.length > 0) {
      const { error: insertError } = await supabase
        .from('favorite_books')
        .insert(favorites.map(f => ({
          user_id: user.id,
          book_id: f.book_id,
          display_order: f.display_order,
        })) as any)

      if (insertError) {
        console.error('Error inserting favorites:', insertError)
        return fail(500, { error: 'Failed to update favorites' })
      }
    }

    return { success: true }
  },

  addQuote: async (event) => {
    const supabase = createClient(event)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Unauthorized' })
    }

    const formData = await event.request.formData()
    const bookId = formData.get('bookId') as string
    const quoteText = formData.get('quoteText') as string
    const pageNumberStr = formData.get('pageNumber') as string

    if (!bookId || !quoteText?.trim()) {
      return fail(400, { error: 'Book and quote text are required' })
    }

    if (quoteText.length > 500) {
      return fail(400, { error: 'Quote must be 500 characters or less' })
    }

    // Check quote count
    const { count } = await supabase
      .from('user_quotes')
      .select('*', { head: true, count: 'exact' })
      .eq('user_id', user.id)

    if (count && count >= 10) {
      return fail(400, { error: 'Maximum of 10 quotes reached' })
    }

    const pageNumber = pageNumberStr ? parseInt(pageNumberStr, 10) : null

    const { error } = await supabase
      .from('user_quotes')
      .insert({
        user_id: user.id,
        book_id: bookId,
        quote_text: quoteText.trim(),
        page_number: pageNumber,
        display_order: (count || 0) + 1,
      } as any)

    if (error) {
      console.error('Error adding quote:', error)
      return fail(500, { error: 'Failed to add quote' })
    }

    return { success: true }
  },

  deleteQuote: async (event) => {
    const supabase = createClient(event)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Unauthorized' })
    }

    const formData = await event.request.formData()
    const quoteId = formData.get('quoteId') as string

    if (!quoteId) {
      return fail(400, { error: 'Quote ID is required' })
    }

    const { error } = await supabase
      .from('user_quotes')
      .delete()
      .eq('id', quoteId)
      .eq('user_id', user.id) // Ensure user can only delete their own

    if (error) {
      console.error('Error deleting quote:', error)
      return fail(500, { error: 'Failed to delete quote' })
    }

    return { success: true }
  },
}
