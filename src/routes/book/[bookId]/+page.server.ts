import { createClient } from '$lib/supabase/server'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import * as bookActions from '$lib/actions/books'
import { enhanceBook } from '$lib/actions/enhance-book'
import { getOrFetchBook } from '$lib/api/book-cache'
import { isValidUUID } from '$lib/utils/validation'
import type { Database } from '$lib/types/database'

type Book = Database['public']['Tables']['books']['Row']

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  const bookId = event.params.bookId
  let book: Book | null = null

  // First, try to fetch by UUID (primary key)
  if (isValidUUID(bookId)) {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()
    book = data as Book | null
  }

  // If not found by UUID, try by open_library_key
  if (!book) {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('open_library_key', bookId)
      .single()
    book = data as Book | null
  }

  // If still not found, try fetching from Open Library API
  if (!book) {
    const fetchedBook = await getOrFetchBook(bookId, supabase)
    book = fetchedBook as Book | null
  }

  if (!book) {
    throw error(404, 'Book not found')
  }

  let typedBook = book

  const dbBookId = typedBook.id

  // Check if book is in user's wishlist
  const { data: wishlistItem } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', dbBookId)
    .maybeSingle()

  // Check if book is completed by user
  const { data: completedBook } = await supabase
    .from('completed_books')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('book_id', dbBookId)
    .maybeSingle()

  // Check if book is in user's currently reading
  const { data: currentlyReadingItem } = await supabase
    .from('currently_reading')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', dbBookId)
    .maybeSingle()

  // Fetch user's rating if exists
  const { data: userRating } = await supabase
    .from('ratings')
    .select('rating, review, created_at')
    .eq('user_id', user.id)
    .eq('book_id', dbBookId)
    .maybeSingle()

  // Fetch group ratings (only from groups user is a member of - RLS will handle this)
  const { data: ratingsData } = await supabase
    .from('ratings')
    .select(
      `
      id,
      rating,
      review,
      created_at,
      user_id,
      profiles!ratings_user_id_fkey (
        id,
        username,
        avatar_url
      )
    `
    )
    .eq('book_id', dbBookId)
    .neq('user_id', user.id) // Exclude user's own rating
    .order('created_at', { ascending: false })

  if (!typedBook.ai_enhanced) {
    const result = await enhanceBook(event, dbBookId)
    if (result.success) {
      const { data: refreshed } = await supabase
        .from('books')
        .select('*')
        .eq('id', dbBookId)
        .single()
      if (refreshed) {
        typedBook = refreshed as Book
      }
    }
  }

  // Transform the data to match the expected type
  const groupRatings =
    (ratingsData as any[])?.map((rating) => ({
      id: rating.id,
      rating: rating.rating,
      review: rating.review,
      created_at: rating.created_at,
      profiles: rating.profiles || null,
    })) || []

  return {
    book: typedBook,
    user,
    isInWishlist: !!wishlistItem,
    isCompleted: !!completedBook,
    isCurrentlyReading: !!currentlyReadingItem,
    userRating,
    groupRatings,
  }
}

export const actions: Actions = {
  addToWishlist: bookActions.addToWishlistById,
  removeFromWishlist: bookActions.removeFromWishlistById,
  startReading: bookActions.startReadingById,
  stopReading: bookActions.stopReadingById,
  markComplete: bookActions.markCompleteById,
}
