import { requireUser } from '$lib/server/auth'
import type { PageServerLoad, Actions } from './$types'
import { markComplete, removeFromWishlist } from '$lib/actions/books'

interface WishlistItem {
  id: string
  added_at: string
  books: {
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
  } | null
}

export const load: PageServerLoad = async (event) => {
  const { supabase, user } = await requireUser(event)

  // Get user's wishlist with book details
  const { data: wishlistBooks, error } = await supabase
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

  const typedWishlist = (wishlistBooks || []) as unknown as WishlistItem[]

  return {
    wishlistBooks: typedWishlist.filter(item => item.books !== null),
  }
}

// Use unified actions from lib/actions/books.ts
export const actions: Actions = {
  removeFromWishlist,
  markComplete,
}
