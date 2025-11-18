import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  // Get wishlist books
  const { data: wishlistBooks, error: wishlistError } = await supabase
    .from('wishlists')
    .select(
      `
      id,
      added_at,
      books (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        published_date,
        page_count,
        categories,
        isbn_10,
        isbn_13
      )
    `
    )
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (wishlistError) {
    console.error('Error fetching wishlist:', wishlistError)
  }

  // Filter out any items where books is null
  const validWishlistBooks = wishlistBooks?.filter((item: any) => item.books !== null) || []

  // Get currently reading books
  const { data: currentlyReading, error: currentlyReadingError } = await supabase
    .from('currently_reading')
    .select(
      `
      id,
      started_at,
      books (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        published_date,
        page_count,
        categories,
        isbn_10,
        isbn_13
      )
    `
    )
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  if (currentlyReadingError) {
    console.error('Error fetching currently reading:', currentlyReadingError)
  }

  const validCurrentlyReading = currentlyReading?.filter((item: any) => item.books !== null) || []

  // Get completed books with ratings
  const { data: completedBooks, error: completedBooksError } = await supabase
    .from('completed_books')
    .select(
      `
      id,
      completed_at,
      books (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        published_date,
        page_count,
        categories,
        isbn_10,
        isbn_13
      )
    `
    )
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  if (completedBooksError) {
    console.error('Error fetching completed books:', completedBooksError)
  }

  const validCompletedBooks = completedBooks?.filter((item: any) => item.books !== null) || []

  // Get ratings for completed books
  const completedBookIds = validCompletedBooks.map((cb: any) => cb.books.id)
  const { data: ratings } = await supabase
    .from('ratings')
    .select('book_id, rating, review, created_at')
    .eq('user_id', user.id)
    .in('book_id', completedBookIds.length > 0 ? completedBookIds : [''])

  // Map ratings to completed books
  const ratingsMap = new Map(ratings?.map((r) => [r.book_id, r]) || [])
  const completedWithRatings = validCompletedBooks.map((cb: any) => ({
    ...cb,
    rating: ratingsMap.get(cb.books.id) || null,
  }))

  return {
    wishlistBooks: validWishlistBooks,
    currentlyReading: validCurrentlyReading,
    completedBooks: completedWithRatings,
  }
}
