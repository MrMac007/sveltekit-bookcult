// @ts-nocheck
import { createClient } from '$lib/supabase/server'
import type { RequestEvent } from '@sveltejs/kit'

export async function followUser(event: RequestEvent, targetUserId: string) {
  const supabase = createClient(event)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (user.id === targetUserId) {
    return { success: false, error: 'You cannot follow yourself' }
  }

  const { data: targetUser, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .single()

  if (targetError || !targetUser) {
    return { success: false, error: 'User not found' }
  }

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: targetUserId,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Already following this user' }
    }
    return { success: false, error: 'Failed to follow user' }
  }

  return { success: true }
}

export async function unfollowUser(event: RequestEvent, targetUserId: string) {
  const supabase = createClient(event)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  if (error) {
    return { success: false, error: 'Failed to unfollow user' }
  }

  return { success: true }
}
