/**
 * Shared group actions for member management, current book, etc.
 */

import { createClient } from '$lib/supabase/server'
import { fail, type RequestEvent } from '@sveltejs/kit'

/**
 * Remove a member from a group (admin only)
 */
export async function removeMember(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion needed for Supabase relational queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string
  const userId = formData.get('userId') as string

  try {
    // Check if current user is admin
    const { data: membership } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return fail(403, { error: 'Only admins can remove members' })
    }

    // Check if target user is the last admin
    const { data: targetMember } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (targetMember?.role === 'admin') {
      const { count } = await db
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('role', 'admin')

      if (count === 1) {
        return fail(400, { error: 'Cannot remove the last admin' })
      }
    }

    // Remove the member
    const { error } = await db
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true, message: 'Member removed' }
  } catch (error) {
    console.error('Error removing member:', error)
    return fail(500, { error: 'Failed to remove member' })
  }
}

/**
 * Update a member's role (admin only)
 */
export async function updateMemberRole(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion needed for Supabase relational queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string
  const userId = formData.get('userId') as string
  const newRole = formData.get('newRole') as 'member' | 'admin'

  try {
    // Check if current user is admin
    const { data: membership } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return fail(403, { error: 'Only admins can change roles' })
    }

    // If demoting from admin, check if they're the last admin
    if (newRole === 'member') {
      const { data: currentMember } = await db
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single()

      if (currentMember?.role === 'admin') {
        const { count } = await db
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .eq('role', 'admin')

        if (count === 1) {
          return fail(400, { error: 'Cannot demote the last admin' })
        }
      }
    }

    // Update the role
    const { error } = await db
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true, message: `Member ${newRole === 'admin' ? 'promoted' : 'demoted'}` }
  } catch (error) {
    console.error('Error updating member role:', error)
    return fail(500, { error: 'Failed to update role' })
  }
}

/**
 * Set or clear the group's current reading book (admin only)
 */
export async function setCurrentReadingBook(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion needed for Supabase relational queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string
  const bookId = (formData.get('bookId') as string) || null

  try {
    // Check if current user is admin
    const { data: membership } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return fail(403, { error: 'Only admins can set the current book' })
    }

    // If setting a book, verify it exists
    if (bookId) {
      const { data: book } = await db.from('books').select('id').eq('id', bookId).single()

      if (!book) {
        return fail(404, { error: 'Book not found' })
      }
    }

    // Update the group's current book
    const { error } = await db
      .from('groups')
      .update({ current_book_id: bookId })
      .eq('id', groupId)

    if (error) throw error

    return { success: true, message: bookId ? 'Current book set' : 'Current book cleared' }
  } catch (error) {
    console.error('Error setting current book:', error)
    return fail(500, { error: 'Failed to set current book' })
  }
}

/**
 * Toggle user's reading status for a group book
 */
export async function toggleGroupBookReading(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion needed for Supabase relational queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string
  const bookId = formData.get('bookId') as string

  try {
    // Check if user is a member
    const { data: membership } = await db
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return fail(403, { error: 'You must be a group member' })
    }

    // Check if already reading
    const { data: existing } = await db
      .from('currently_reading')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (existing) {
      // Remove from currently reading
      const { error } = await db
        .from('currently_reading')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId)

      if (error) throw error

      return { success: true, message: 'Stopped reading', isReading: false }
    } else {
      // Add to currently reading
      const { error } = await db.from('currently_reading').insert({
        user_id: user.id,
        book_id: bookId,
        group_id: groupId,
      })

      if (error) throw error

      return { success: true, message: 'Started reading', isReading: true }
    }
  } catch (error) {
    console.error('Error toggling reading status:', error)
    return fail(500, { error: 'Failed to update reading status' })
  }
}

/**
 * Reorder books in the group's reading list (admin only)
 */
export async function reorderReadingList(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion needed for Supabase relational queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string
  const bookOrdersJson = formData.get('bookOrders') as string

  try {
    // Check if current user is admin
    const { data: membership } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return fail(403, { error: 'Only admins can reorder books' })
    }

    // Parse book orders: array of {groupBookId, displayOrder}
    let bookOrders: Array<{ groupBookId: string; displayOrder: number }>
    try {
      bookOrders = JSON.parse(bookOrdersJson)
    } catch {
      return fail(400, { error: 'Invalid book order data' })
    }

    // Update each book's display order
    for (const { groupBookId, displayOrder } of bookOrders) {
      const { error } = await db
        .from('group_books')
        .update({ display_order: displayOrder })
        .eq('id', groupBookId)
        .eq('group_id', groupId)

      if (error) {
        console.error(`Error updating book ${groupBookId}:`, error)
        throw error
      }
    }

    return { success: true, message: 'Reading list reordered' }
  } catch (error: any) {
    console.error('Error reordering reading list:', error)
    return fail(500, { error: error?.message || 'Failed to reorder reading list' })
  }
}

/**
 * Set a deadline for the current reading book (admin only)
 */
export async function setCurrentBookDeadline(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string
  const deadline = formData.get('deadline') as string

  try {
    // Check if current user is admin
    const { data: membership } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return fail(403, { error: 'Only admins can set deadlines' })
    }

    // Update the group's deadline
    const { error } = await db
      .from('groups')
      .update({ current_book_deadline: deadline })
      .eq('id', groupId)

    if (error) throw error

    return { success: true, message: 'Deadline set' }
  } catch (error) {
    console.error('Error setting deadline:', error)
    return fail(500, { error: 'Failed to set deadline' })
  }
}

/**
 * Clear the deadline for the current reading book (admin only)
 */
export async function clearCurrentBookDeadline(event: RequestEvent) {
  const supabase = createClient(event)
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'Not authenticated' })
  }

  const formData = await event.request.formData()
  const groupId = formData.get('groupId') as string

  try {
    // Check if current user is admin
    const { data: membership } = await db
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return fail(403, { error: 'Only admins can clear deadlines' })
    }

    // Clear the group's deadline
    const { error } = await db
      .from('groups')
      .update({ current_book_deadline: null })
      .eq('id', groupId)

    if (error) throw error

    return { success: true, message: 'Deadline cleared' }
  } catch (error) {
    console.error('Error clearing deadline:', error)
    return fail(500, { error: 'Failed to clear deadline' })
  }
}
