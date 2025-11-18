import { createClient } from '$lib/supabase/server'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import * as bookActions from '$lib/actions/books'
import { enhanceBook } from '$lib/actions/enhance-book'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  // Fetch book data
  let { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', event.params.bookId)
    .single()

  if (bookError || !book) {
    throw error(404, 'Book not found')
  }

  // Check if book is in user's wishlist
  const { data: wishlistItem } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', event.params.bookId)
    .maybeSingle()

  // Check if book is completed by user
  const { data: completedBook } = await supabase
    .from('completed_books')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('book_id', event.params.bookId)
    .maybeSingle()

  // Check if book is in user's currently reading
  const { data: currentlyReadingItem } = await supabase
    .from('currently_reading')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', event.params.bookId)
    .maybeSingle()

  // Fetch user's rating if exists
  const { data: userRating } = await supabase
    .from('ratings')
    .select('rating, review, created_at')
    .eq('user_id', user.id)
    .eq('book_id', event.params.bookId)
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
    .eq('book_id', event.params.bookId)
    .neq('user_id', user.id) // Exclude user's own rating
    .order('created_at', { ascending: false })

  if (!book.ai_enhanced) {
    const result = await enhanceBook(event, event.params.bookId)
    if (result.success) {
      const { data: refreshed } = await supabase
        .from('books')
        .select('*')
        .eq('id', event.params.bookId)
        .single()
      if (refreshed) {
        book = refreshed
      }
    }
  }

  // Transform the data to match the expected type
  const groupRatings =
    ratingsData?.map((rating: any) => ({
      id: rating.id,
      rating: rating.rating,
      review: rating.review,
      created_at: rating.created_at,
      profiles: rating.profiles || null,
    })) || []

  return {
    book,
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
