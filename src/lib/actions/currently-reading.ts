/**
 * Centralized actions for managing currently reading books
 * Provides reusable server actions for adding, removing, and querying currently reading status
 */

import { createClient } from '$lib/supabase/server'
import type { RequestEvent } from '@sveltejs/kit'

/**
 * Add a book to currently reading
 * @param event - SvelteKit request event
 * @param bookId - ID of the book to add
 * @param groupId - Optional group ID to associate with this reading session
 */
export async function addToCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  groupId?: string | null
) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
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
    console.error('Error adding to currently reading:', error)
    return { success: false, error: 'Failed to add to currently reading' }
  }
}

/**
 * Remove a book from currently reading
 * @param event - SvelteKit request event
 * @param bookId - ID of the book to remove
 */
export async function removeFromCurrentlyReading(event: RequestEvent, bookId: string) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const { error } = await db
      .from('currently_reading')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) throw error

    return { success: true, message: 'Stopped reading' }
  } catch (error) {
    console.error('Error removing from currently reading:', error)
    return { success: false, error: 'Failed to remove from currently reading' }
  }
}

/**
 * Remove a currently reading record by its ID (useful when there might be multiple entries)
 * @param event - SvelteKit request event
 * @param recordId - ID of the currently_reading record to remove
 */
export async function removeCurrentlyReadingRecord(event: RequestEvent, recordId: string) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const { error } = await db
      .from('currently_reading')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id)

    if (error) throw error

    return { success: true, message: 'Stopped reading' }
  } catch (error) {
    console.error('Error removing currently reading record:', error)
    return { success: false, error: 'Failed to remove from currently reading' }
  }
}

/**
 * Toggle currently reading status for a book
 * @param event - SvelteKit request event
 * @param bookId - ID of the book to toggle
 * @param groupId - Optional group ID to associate with this reading session
 */
export async function toggleCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  groupId?: string | null
) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
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
      // Remove if exists
      const { error } = await db
        .from('currently_reading')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', user.id)

      if (error) throw error
      return { success: true, message: 'Stopped reading', isReading: false }
    } else {
      // Add if doesn't exist
      const { error } = await db.from('currently_reading').insert({
        user_id: user.id,
        book_id: bookId,
        group_id: groupId || null,
      })

      if (error) throw error
      return { success: true, message: 'Started reading!', isReading: true }
    }
  } catch (error) {
    console.error('Error toggling currently reading:', error)
    return { success: false, error: 'Failed to update reading status' }
  }
}

/**
 * Get all currently reading books for a user
 * @param event - SvelteKit request event
 * @param userId - Optional user ID (defaults to authenticated user)
 */
export async function getCurrentlyReading(event: RequestEvent, userId?: string) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !userId) {
    return { success: false, error: 'Not authenticated' }
  }

  const targetUserId = userId || user?.id

  try {
    const { data, error } = await db
      .from('currently_reading')
      .select(
        `
        id,
        started_at,
        group_id,
        books:book_id (
          id,
          google_books_id,
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
      .eq('user_id', targetUserId)
      .order('started_at', { ascending: false })

    if (error) throw error

    const items = data?.filter((item: any) => item.books !== null) ?? []

    return { success: true, data: items }
  } catch (error) {
    console.error('Error fetching currently reading:', error)
    return { success: false, error: 'Failed to fetch currently reading books' }
  }
}

/**
 * Check if a user is currently reading a specific book
 * @param event - SvelteKit request event
 * @param bookId - ID of the book to check
 * @param userId - Optional user ID (defaults to authenticated user)
 */
export async function isCurrentlyReading(
  event: RequestEvent,
  bookId: string,
  userId?: string
): Promise<boolean> {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !userId) {
    return false
  }

  const targetUserId = userId || user?.id

  try {
    const { data } = await db
      .from('currently_reading')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('book_id', bookId)
      .maybeSingle()

    return !!data
  } catch (error) {
    console.error('Error checking currently reading status:', error)
    return false
  }
}

/**
 * Get group members who are currently reading a specific book
 * @param event - SvelteKit request event
 * @param groupId - ID of the group
 * @param bookId - ID of the book
 */
export async function getMembersReading(event: RequestEvent, groupId: string, bookId: string) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const { data, error } = await db
      .from('currently_reading')
      .select(
        `
        id,
        started_at,
        user_id,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq('group_id', groupId)
      .eq('book_id', bookId)
      .order('started_at', { ascending: true })

    if (error) throw error

    const members = data?.filter((item: any) => item.profiles !== null) ?? []

    return { success: true, data: members }
  } catch (error) {
    console.error('Error fetching members reading:', error)
    return { success: false, error: 'Failed to fetch reading members' }
  }
}

/**
 * Get count of currently reading books for a user
 * @param event - SvelteKit request event
 * @param userId - Optional user ID (defaults to authenticated user)
 */
export async function getCurrentlyReadingCount(event: RequestEvent, userId?: string) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !userId) {
    return { success: false, error: 'Not authenticated', count: 0 }
  }

  const targetUserId = userId || user?.id

  try {
    const { count, error } = await db
      .from('currently_reading')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)

    if (error) throw error

    return { success: true, count: count || 0 }
  } catch (error) {
    console.error('Error fetching currently reading count:', error)
    return { success: false, error: 'Failed to fetch count', count: 0 }
  }
}
