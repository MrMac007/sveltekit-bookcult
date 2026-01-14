import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

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
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

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

export const actions: Actions = {
  removeFromWishlist: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const formData = await event.request.formData()
    const bookId = formData.get('bookId') as string

    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId)

      if (error) throw error

      return { success: true, message: 'Removed from wishlist' }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      return { success: false, error: 'Failed to remove from wishlist' }
    }
  },

  markComplete: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const formData = await event.request.formData()
    const bookId = formData.get('bookId') as string
    const completedAt = formData.get('completedAt') as string | null

    try {
      // Check if already completed
      const { data: existing } = await supabase
        .from('completed_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single()

      if (existing) {
        // Already completed, redirect to rate page
        throw redirect(303, `/rate/${bookId}`)
      }

      // Remove from wishlist
      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('book_id', bookId)

      // Add to completed books with date - always confirm since this flow goes through the dialog
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        book_id: bookId,
        completed_at: completedAt || new Date().toISOString().split('T')[0],
        date_confirmed: true
      }

      const { error } = await supabase.from('completed_books').insert(insertData as any)

      if (error) throw error

      // Redirect to rating page
      throw redirect(303, `/rate/${bookId}`)
    } catch (error) {
      if (error instanceof Response) throw error // Re-throw redirects
      console.error('Error marking as complete:', error)
      return { success: false, error: 'Failed to mark as complete' }
    }
  },
}
