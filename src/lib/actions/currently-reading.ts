/**
 * Server actions for managing currently reading books.
 * Used for tracking what users are currently reading, optionally with group context.
 */

import { createClient } from '$lib/supabase/server'
import type { RequestEvent } from '@sveltejs/kit'

export interface CurrentlyReadingBook {
  id: string
  started_at: string
  group_id: string | null
  books: {
    id: string
    title: string
    authors: string[]
    cover_url: string | null
    google_books_id: string | null
  }
  groups: {
    id: string
    name: string
  } | null
}

export interface CurrentlyReadingMember {
  id: string
  started_at: string
  profiles: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

/**
 * Add a book to the user's currently reading list
 */
export async function addToCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  groupId?: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  try {
    // Check if book exists
    const { data: book, error: bookError } = await db
      .from('books')
      .select('id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return { error: 'Book not found' }
    }

    // Check if already reading
    const { data: existing } = await db
      .from('currently_reading')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (existing) {
      return { error: 'Book is already in your currently reading list' }
    }

    // If group is specified, verify membership
    if (groupId) {
      const { data: membership } = await db
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) {
        return { error: 'You must be a group member to read with this group' }
      }
    }

    // Insert into currently reading
    const { error: insertError } = await db.from('currently_reading').insert({
      user_id: user.id,
      book_id: bookId,
      group_id: groupId || null,
    })

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return { success: true }
      }
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error('Error adding to currently reading:', error)
    return { error: 'Failed to add book to currently reading' }
  }
}

/**
 * Remove a book from the user's currently reading list
 */
export async function removeFromCurrentlyReading(
  event: RequestEvent,
  bookId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  try {
    const { error } = await db
      .from('currently_reading')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error removing from currently reading:', error)
    return { error: 'Failed to remove book from currently reading' }
  }
}

/**
 * Toggle a book's currently reading status
 * Adds if not reading, removes if reading
 */
export async function toggleCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  groupId?: string | null
): Promise<{ success?: boolean; error?: string; isReading?: boolean }> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  try {
    // Check if already reading
    const { data: existing } = await db
      .from('currently_reading')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (existing) {
      // Remove from currently reading
      const result = await removeFromCurrentlyReading(event, bookId)
      return { ...result, isReading: false }
    } else {
      // Add to currently reading
      const result = await addToCurrentlyReading(event, bookId, groupId)
      return { ...result, isReading: true }
    }
  } catch (error) {
    console.error('Error toggling currently reading:', error)
    return { error: 'Failed to update reading status' }
  }
}

/**
 * Get currently reading books for a user
 * Includes book details and optional group context
 */
export async function getCurrentlyReading(
  event: RequestEvent,
  userId?: string
): Promise<{ data: CurrentlyReadingBook[]; error?: string }> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Use provided userId or fall back to current user
  const targetUserId = userId || user?.id

  if (!targetUserId) {
    return { data: [], error: 'No user specified' }
  }

  try {
    const { data, error } = await db
      .from('currently_reading')
      .select(`
        id,
        started_at,
        group_id,
        books:book_id (
          id,
          title,
          authors,
          cover_url,
          google_books_id
        ),
        groups:group_id (
          id,
          name
        )
      `)
      .eq('user_id', targetUserId)
      .order('started_at', { ascending: false })

    if (error) throw error

    return { data: data || [] }
  } catch (error) {
    console.error('Error getting currently reading:', error)
    return { data: [], error: 'Failed to load currently reading books' }
  }
}

/**
 * Check if a user is currently reading a specific book
 */
export async function isCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  userId?: string
): Promise<{ isReading: boolean; groupId?: string | null }> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Use provided userId or fall back to current user
  const targetUserId = userId || user?.id

  if (!targetUserId) {
    return { isReading: false }
  }

  try {
    const { data } = await db
      .from('currently_reading')
      .select('id, group_id')
      .eq('user_id', targetUserId)
      .eq('book_id', bookId)
      .maybeSingle()

    return {
      isReading: !!data,
      groupId: data?.group_id || null,
    }
  } catch (error) {
    console.error('Error checking currently reading status:', error)
    return { isReading: false }
  }
}

/**
 * Get all group members who are currently reading a specific book
 */
export async function getMembersReading(
  event: RequestEvent,
  groupId: string,
  bookId: string
): Promise<{ data: CurrentlyReadingMember[]; error?: string }> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: 'You must be logged in' }
  }

  try {
    // First verify the user is a member of this group
    const { data: membership } = await db
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return { data: [], error: 'You must be a group member to view this' }
    }

    // Get all members reading this book in this group
    const { data, error } = await db
      .from('currently_reading')
      .select(`
        id,
        started_at,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .eq('book_id', bookId)
      .order('started_at', { ascending: true })

    if (error) throw error

    return { data: data || [] }
  } catch (error) {
    console.error('Error getting members reading:', error)
    return { data: [], error: 'Failed to load members reading this book' }
  }
}
