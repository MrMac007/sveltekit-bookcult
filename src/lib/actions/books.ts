/**
 * Shared book actions for adding to wishlist, marking complete, etc.
 * Can be used from any page/route that needs these operations.
 */

import { createClient } from '$lib/supabase/server'
import { redirect, type RequestEvent } from '@sveltejs/kit'
import { findOrCreateBook } from '$lib/api/book-helpers'
import type { BookCardData } from '$lib/types/api'

/**
 * Add a book to the user's wishlist
 */
export async function addToWishlist(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookData = JSON.parse(formData.get('bookData') as string) as BookCardData

  try {
    const bookId = await findOrCreateBook(bookData, supabase)
    if (!bookId) {
      return { success: false, error: 'Failed to create book' }
    }

    const { error } = await db.from('wishlists').insert({
      user_id: user.id,
      book_id: bookId,
    })

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: true, message: 'Book already in wishlist' }
      }
      throw error
    }

    return { success: true, message: 'Added to wishlist!' }
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return { success: false, error: 'Failed to add to wishlist' }
  }
}

/**
 * Remove a book from the user's wishlist
 */
export async function removeFromWishlist(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookId = formData.get('bookId') as string

  try {
    const { error } = await db
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
}

/**
 * Mark a book as complete (redirects to rating page)
 */
export async function markComplete(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookData = JSON.parse(formData.get('bookData') as string) as BookCardData

  try {
    const bookId = await findOrCreateBook(bookData, supabase)
    if (!bookId) {
      return { success: false, error: 'Failed to create book' }
    }

    // Check if already completed
    const { data: existing } = await db
      .from('completed_books')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single()

    if (existing) {
      // Already completed, redirect to rate page
      throw redirect(303, `/rate/${bookId}`)
    }

    // Remove from wishlist if it exists
    await db.from('wishlists').delete().eq('user_id', user.id).eq('book_id', bookId)

    // Remove from currently reading if it exists
    await db
      .from('currently_reading')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    // Add to completed books
    const { error } = await db.from('completed_books').insert({
      user_id: user.id,
      book_id: bookId,
    })

    if (error) throw error

    // Redirect to rating page
    throw redirect(303, `/rate/${bookId}`)
  } catch (error) {
    if (error instanceof Response) throw error // Re-throw redirects
    console.error('Error marking as complete:', error)
    return { success: false, error: 'Failed to mark as complete' }
  }
}

/**
 * Mark a book as currently reading
 */
export async function startReading(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookData = JSON.parse(formData.get('bookData') as string) as BookCardData
  const groupId = formData.get('groupId') as string | null

  try {
    const bookId = await findOrCreateBook(bookData, supabase)
    if (!bookId) {
      return { success: false, error: 'Failed to create book' }
    }

    const { error } = await db.from('currently_reading').insert({
      user_id: user.id,
      book_id: bookId,
      group_id: groupId || null,
    })

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: true, message: 'Already reading this book' }
      }
      throw error
    }

    return { success: true, message: 'Started reading!' }
  } catch (error) {
    console.error('Error starting reading:', error)
    return { success: false, error: 'Failed to start reading' }
  }
}

/**
 * Stop reading a book (remove from currently reading)
 */
export async function stopReading(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookId = formData.get('bookId') as string

  try {
    const { error } = await db
      .from('currently_reading')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) throw error

    return { success: true, message: 'Stopped reading' }
  } catch (error) {
    console.error('Error stopping reading:', error)
    return { success: false, error: 'Failed to stop reading' }
  }
}

// ================== ACTIONS FOR BOOK DETAIL PAGE ==================
// These versions work with bookId from route params instead of form data

/**
 * Add a book to wishlist using bookId from route params
 */
export async function addToWishlistById(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId

  try {
    const { error: insertError } = await db.from('wishlists').insert({
      user_id: user.id,
      book_id: bookId,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: true, message: 'Already in wishlist' }
      }
      throw insertError
    }

    return { success: true, message: 'Added to wishlist!' }
  } catch (err) {
    console.error('Error adding to wishlist:', err)
    return { success: false, error: 'Failed to add to wishlist' }
  }
}

/**
 * Remove a book from wishlist using bookId from route params
 */
export async function removeFromWishlistById(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId

  try {
    const { error } = await db
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) throw error

    return { success: true, message: 'Removed from wishlist' }
  } catch (err) {
    console.error('Error removing from wishlist:', err)
    return { success: false, error: 'Failed to remove from wishlist' }
  }
}

/**
 * Start reading a book using bookId from route params
 */
export async function startReadingById(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId

  try {
    const { error: insertError } = await db.from('currently_reading').insert({
      user_id: user.id,
      book_id: bookId,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: true, message: 'Already in currently reading' }
      }
      throw insertError
    }

    return { success: true, message: 'Started reading!' }
  } catch (err) {
    console.error('Error starting reading:', err)
    return { success: false, error: 'Failed to start reading' }
  }
}

/**
 * Stop reading a book using bookId from route params
 */
export async function stopReadingById(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId

  try {
    const { error } = await db
      .from('currently_reading')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) throw error

    return { success: true, message: 'Stopped reading' }
  } catch (err) {
    console.error('Error stopping reading:', err)
    return { success: false, error: 'Failed to stop reading' }
  }
}

/**
 * Mark book as complete using bookId from route params
 */
export async function markCompleteById(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId

  try {
    // Check if already completed
    const { data: existing } = await db
      .from('completed_books')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single()

    if (existing) {
      // Already completed, redirect to rate page
      throw redirect(303, `/rate/${bookId}`)
    }

    // Remove from wishlist if it exists
    await db
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    // Remove from currently reading if it exists
    await db
      .from('currently_reading')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    // Add to completed books
    const { error: insertError } = await db.from('completed_books').insert({
      user_id: user.id,
      book_id: bookId,
    })

    if (insertError) throw insertError

    // Redirect to rating page
    throw redirect(303, `/rate/${bookId}`)
  } catch (err) {
    if (err instanceof Response) throw err // Re-throw redirects
    console.error('Error marking as complete:', err)
    return { success: false, error: 'Failed to mark as complete' }
  }
}
