/**
 * Shared book actions for adding to wishlist, marking complete, etc.
 * Can be used from any page/route that needs these operations.
 */

import { createClient } from '$lib/supabase/server'
import { redirect, type RequestEvent } from '@sveltejs/kit'
import { findOrCreateBook } from '$lib/api/book-helpers'
import type { BookCardData } from '$lib/types/api'
import { isDuplicateKeyError } from '$lib/utils/postgres-errors'

// ================== INTERNAL HELPERS ==================
// Core operations that work with (db, userId, bookId)

async function _addToWishlist(db: any, userId: string, bookId: string) {
  const { error } = await db.from('wishlists').insert({
    user_id: userId,
    book_id: bookId,
  })

  if (error) {
    if (isDuplicateKeyError(error)) {
      return { success: true, message: 'Book already in wishlist' }
    }
    throw error
  }

  return { success: true, message: 'Added to wishlist!' }
}

async function _removeFromWishlist(db: any, userId: string, bookId: string) {
  const { error } = await db
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId)

  if (error) throw error

  return { success: true, message: 'Removed from wishlist' }
}

async function _startReading(db: any, userId: string, bookId: string, groupId: string | null = null) {
  const { error } = await db.from('currently_reading').insert({
    user_id: userId,
    book_id: bookId,
    group_id: groupId,
  })

  if (error) {
    if (isDuplicateKeyError(error)) {
      return { success: true, message: 'Already reading this book' }
    }
    throw error
  }

  return { success: true, message: 'Started reading!' }
}

async function _stopReading(db: any, userId: string, bookId: string) {
  const { error } = await db
    .from('currently_reading')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId)

  if (error) throw error

  return { success: true, message: 'Stopped reading' }
}

interface MarkCompleteResult {
  success: boolean
  bookId: string
  alreadyCompleted?: boolean
  error?: string
}

async function _markComplete(
  db: any,
  userId: string,
  bookId: string,
  completedAt?: string
): Promise<MarkCompleteResult> {
  const dateToUse = completedAt || new Date().toISOString().split('T')[0]

  // Check if already completed
  const { data: existing } = await db
    .from('completed_books')
    .select('id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single()

  if (existing) {
    // Update the existing record with new date if provided
    const { error } = await db
      .from('completed_books')
      .update({
        completed_at: dateToUse,
        date_confirmed: true,
      })
      .eq('user_id', userId)
      .eq('book_id', bookId)

    if (error) {
      return { success: false, bookId, error: error.message }
    }

    return { success: true, bookId, alreadyCompleted: true }
  }

  // ALWAYS remove from wishlist and currently reading
  await Promise.all([
    db.from('wishlists').delete().eq('user_id', userId).eq('book_id', bookId),
    db.from('currently_reading').delete().eq('user_id', userId).eq('book_id', bookId),
  ])

  // Add to completed books with ALWAYS confirmed date
  const { error } = await db.from('completed_books').insert({
    user_id: userId,
    book_id: bookId,
    completed_at: dateToUse,
    date_confirmed: true,
  })

  if (error) {
    return { success: false, bookId, error: error.message }
  }

  return { success: true, bookId }
}

// ================== HELPER UTILITIES ==================

async function getAuthenticatedUser(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion needed for Supabase relational queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, db, user }
}

function parseBookData(formData: FormData): BookCardData | null {
  try {
    return JSON.parse(formData.get('bookData') as string) as BookCardData
  } catch {
    return null
  }
}

// ================== PUBLIC FORM-BASED ACTIONS ==================
// These work with form data containing bookData JSON

/**
 * Add a book to the user's wishlist
 */
export async function addToWishlist(event: RequestEvent) {
  const { supabase, db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookData = parseBookData(formData)
  if (!bookData) {
    return { success: false, error: 'Invalid book data' }
  }

  try {
    const bookId = await findOrCreateBook(bookData, supabase)
    if (!bookId) {
      return { success: false, error: 'Failed to create book' }
    }

    return await _addToWishlist(db, user.id, bookId)
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return { success: false, error: 'Failed to add to wishlist' }
  }
}

/**
 * Remove a book from the user's wishlist
 */
export async function removeFromWishlist(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookId = formData.get('bookId') as string

  try {
    return await _removeFromWishlist(db, user.id, bookId)
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return { success: false, error: 'Failed to remove from wishlist' }
  }
}

/**
 * Mark a book as complete (redirects to rating page)
 * Accepts either bookData JSON or bookId directly, plus optional completedAt date
 */
export async function markComplete(event: RequestEvent) {
  const { supabase, db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const completedAt = formData.get('completedAt') as string | null

  // Support both bookData (from discover) and bookId (from wishlist/currently-reading)
  let bookId: string
  const bookIdFromForm = formData.get('bookId') as string | null

  if (bookIdFromForm) {
    bookId = bookIdFromForm
  } else {
    const bookData = parseBookData(formData)
    if (!bookData) {
      return { success: false, error: 'Invalid book data' }
    }
    const createdId = await findOrCreateBook(bookData, supabase)
    if (!createdId) {
      return { success: false, error: 'Failed to create book' }
    }
    bookId = createdId
  }

  try {
    const result = await _markComplete(db, user.id, bookId, completedAt || undefined)

    if (result.success) {
      throw redirect(303, `/rate/${bookId}`)
    }

    return { success: false, error: result.error || 'Failed to mark as complete' }
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
  const { supabase, db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookData = parseBookData(formData)
  if (!bookData) {
    return { success: false, error: 'Invalid book data' }
  }
  const groupId = formData.get('groupId') as string | null

  try {
    const bookId = await findOrCreateBook(bookData, supabase)
    if (!bookId) {
      return { success: false, error: 'Failed to create book' }
    }

    return await _startReading(db, user.id, bookId, groupId || null)
  } catch (error) {
    console.error('Error starting reading:', error)
    return { success: false, error: 'Failed to start reading' }
  }
}

/**
 * Stop reading a book (remove from currently reading)
 */
export async function stopReading(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const formData = await event.request.formData()
  const bookId = formData.get('bookId') as string

  try {
    return await _stopReading(db, user.id, bookId)
  } catch (error) {
    console.error('Error stopping reading:', error)
    return { success: false, error: 'Failed to stop reading' }
  }
}

// ================== PUBLIC ID-BASED ACTIONS ==================
// These work with bookId from route params (for book detail pages)

/**
 * Add a book to wishlist using bookId from route params
 */
export async function addToWishlistById(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId as string

  try {
    return await _addToWishlist(db, user.id, bookId)
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return { success: false, error: 'Failed to add to wishlist' }
  }
}

/**
 * Remove a book from wishlist using bookId from route params
 */
export async function removeFromWishlistById(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId as string

  try {
    return await _removeFromWishlist(db, user.id, bookId)
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return { success: false, error: 'Failed to remove from wishlist' }
  }
}

/**
 * Start reading a book using bookId from route params
 */
export async function startReadingById(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId as string

  try {
    return await _startReading(db, user.id, bookId)
  } catch (error) {
    console.error('Error starting reading:', error)
    return { success: false, error: 'Failed to start reading' }
  }
}

/**
 * Stop reading a book using bookId from route params
 */
export async function stopReadingById(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId as string

  try {
    return await _stopReading(db, user.id, bookId)
  } catch (error) {
    console.error('Error stopping reading:', error)
    return { success: false, error: 'Failed to stop reading' }
  }
}

/**
 * Mark book as complete using bookId from route params
 */
export async function markCompleteById(event: RequestEvent) {
  const { db, user } = await getAuthenticatedUser(event)

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const bookId = event.params.bookId as string

  try {
    const result = await _markComplete(db, user.id, bookId)

    if (result.success) {
      throw redirect(303, `/rate/${bookId}`)
    }

    return { success: false, error: result.error || 'Failed to mark as complete' }
  } catch (error) {
    if (error instanceof Response) throw error // Re-throw redirects
    console.error('Error marking as complete:', error)
    return { success: false, error: 'Failed to mark as complete' }
  }
}

// ================== EXPORTS FOR API USE ==================
// Internal helpers exported for use in API routes

export {
  _addToWishlist as addToWishlistInternal,
  _removeFromWishlist as removeFromWishlistInternal,
  _startReading as startReadingInternal,
  _stopReading as stopReadingInternal,
  _markComplete as markCompleteInternal,
}
