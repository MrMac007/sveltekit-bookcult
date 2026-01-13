import { createClient } from '$lib/supabase/server'
import type { RequestEvent } from '@sveltejs/kit'

export async function setReadingGoal(event: RequestEvent, year: number, target: number) {
  const supabase = createClient(event)
  const db = supabase as any

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (target < 1 || target > 365) {
    return { success: false, error: 'Target must be between 1 and 365' }
  }

  // Try to upsert the goal
  const { error } = await db
    .from('reading_goals')
    .upsert(
      {
        user_id: user.id,
        year,
        target,
      },
      { onConflict: 'user_id,year' }
    )

  if (error) {
    console.error('Error setting reading goal:', error)
    return { success: false, error: 'Failed to set reading goal' }
  }

  return { success: true }
}

export async function deleteReadingGoal(event: RequestEvent, year: number) {
  const supabase = createClient(event)
  const db = supabase as any

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await db
    .from('reading_goals')
    .delete()
    .eq('user_id', user.id)
    .eq('year', year)

  if (error) {
    console.error('Error deleting reading goal:', error)
    return { success: false, error: 'Failed to delete reading goal' }
  }

  return { success: true }
}

export async function getReadingGoalProgress(
  db: any,
  userId: string,
  year: number
): Promise<{ target: number | null; completed: number }> {
  // Get the goal for the year
  const { data: goal } = await db
    .from('reading_goals')
    .select('target')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle()

  // Count completed books with confirmed dates in the year
  const startOfYear = `${year}-01-01`
  const startOfNextYear = `${year + 1}-01-01`

  const { count } = await db
    .from('completed_books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('date_confirmed', true)
    .gte('completed_at', startOfYear)
    .lt('completed_at', startOfNextYear)

  return {
    target: goal?.target || null,
    completed: count || 0,
  }
}

// Group reading goals
export async function setGroupReadingGoal(
  event: RequestEvent,
  groupId: string,
  year: number,
  target: number
) {
  const supabase = createClient(event)
  const db = supabase as any

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin of the group
  const { data: membership } = await db
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.role !== 'admin') {
    return { success: false, error: 'Only admins can set group goals' }
  }

  if (target < 1 || target > 365) {
    return { success: false, error: 'Target must be between 1 and 365' }
  }

  const { error } = await db
    .from('group_reading_goals')
    .upsert(
      {
        group_id: groupId,
        year,
        target,
      },
      { onConflict: 'group_id,year' }
    )

  if (error) {
    console.error('Error setting group reading goal:', error)
    return { success: false, error: 'Failed to set group reading goal' }
  }

  return { success: true }
}

export async function deleteGroupReadingGoal(event: RequestEvent, groupId: string, year: number) {
  const supabase = createClient(event)
  const db = supabase as any

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin of the group
  const { data: membership } = await db
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.role !== 'admin') {
    return { success: false, error: 'Only admins can delete group goals' }
  }

  const { error } = await db
    .from('group_reading_goals')
    .delete()
    .eq('group_id', groupId)
    .eq('year', year)

  if (error) {
    console.error('Error deleting group reading goal:', error)
    return { success: false, error: 'Failed to delete group reading goal' }
  }

  return { success: true }
}

export async function getGroupGoalProgress(
  db: any,
  groupId: string,
  year: number
): Promise<{ target: number | null; completed: number }> {
  // Get the goal for the year
  const { data: goal } = await db
    .from('group_reading_goals')
    .select('target')
    .eq('group_id', groupId)
    .eq('year', year)
    .maybeSingle()

  // Get all books from group's reading list
  const { data: groupBooks } = await db.from('group_books').select('book_id').eq('group_id', groupId)

  // Get all group member IDs
  const { data: members } = await db.from('group_members').select('user_id').eq('group_id', groupId)

  if (!groupBooks?.length || !members?.length) {
    return { target: goal?.target || null, completed: 0 }
  }

  const bookIds = groupBooks.map((b: { book_id: string }) => b.book_id)
  const memberIds = members.map((m: { user_id: string }) => m.user_id)

  // Count completions of group books by members this year
  const startOfYear = `${year}-01-01`
  const startOfNextYear = `${year + 1}-01-01`

  const { count } = await db
    .from('completed_books')
    .select('*', { count: 'exact', head: true })
    .in('book_id', bookIds)
    .in('user_id', memberIds)
    .eq('date_confirmed', true)
    .gte('completed_at', startOfYear)
    .lt('completed_at', startOfNextYear)

  return {
    target: goal?.target || null,
    completed: count || 0,
  }
}
