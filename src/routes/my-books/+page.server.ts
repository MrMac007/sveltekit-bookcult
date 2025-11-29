import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

interface BookData {
  id: string
  google_books_id: string | null
  title: string
  authors: string[]
  cover_url: string | null
  description: string | null
  published_date: string | null
  page_count: number | null
  categories: string[]
  isbn_10: string | null
  isbn_13: string | null
}

interface WishlistItem {
  id: string
  added_at: string
  books: BookData | null
}

interface CurrentlyReadingItem {
  id: string
  started_at: string
  books: BookData | null
}

interface CompletedBookItem {
  id: string
  completed_at: string
  books: BookData | null
}

interface RatingData {
  book_id: string
  rating: number
  review: string | null
  created_at: string
}

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  // Run all three queries in parallel for faster loading
  const [wishlistResult, currentlyReadingResult, completedBooksResult] = await Promise.all([
    // Get wishlist books
    supabase
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
      .order('added_at', { ascending: false }),

    // Get currently reading books
    supabase
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
      .order('started_at', { ascending: false }),

    // Get completed books
    supabase
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
      .order('completed_at', { ascending: false }),
  ])

  if (wishlistResult.error) {
    console.error('Error fetching wishlist:', wishlistResult.error)
  }
  if (currentlyReadingResult.error) {
    console.error('Error fetching currently reading:', currentlyReadingResult.error)
  }
  if (completedBooksResult.error) {
    console.error('Error fetching completed books:', completedBooksResult.error)
  }

  // Filter out any items where books is null
  const typedWishlist = (wishlistResult.data || []) as unknown as WishlistItem[]
  const validWishlistBooks = typedWishlist.filter((item) => item.books !== null)

  const typedCurrentlyReading = (currentlyReadingResult.data || []) as unknown as CurrentlyReadingItem[]
  const validCurrentlyReading = typedCurrentlyReading.filter((item) => item.books !== null)

  const typedCompleted = (completedBooksResult.data || []) as unknown as CompletedBookItem[]
  const validCompletedBooks = typedCompleted.filter((item) => item.books !== null)

  // Get ratings for completed books (depends on completed books data)
  const completedBookIds = validCompletedBooks.map((cb) => cb.books!.id)
  const { data: ratings } = await supabase
    .from('ratings')
    .select('book_id, rating, review, created_at')
    .eq('user_id', user.id)
    .in('book_id', completedBookIds.length > 0 ? completedBookIds : [''])

  const typedRatings = (ratings || []) as RatingData[]

  // Map ratings to completed books
  const ratingsMap = new Map(typedRatings.map((r) => [r.book_id, r]))
  const completedWithRatings = validCompletedBooks.map((cb) => ({
    ...cb,
    rating: ratingsMap.get(cb.books!.id) || null,
  }))

  return {
    wishlistBooks: validWishlistBooks,
    currentlyReading: validCurrentlyReading,
    completedBooks: completedWithRatings,
  }
}
