import { followUser, unfollowUser } from '$lib/actions/follows'
import { createClient } from '$lib/supabase/server'
import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  type FollowingWithProfile = {
    id: string
    created_at: string
    following_id: string
    profiles: {
      id: string
      username: string
      display_name: string | null
      avatar_url: string | null
      bio: string | null
    } | null
  }

  const result = await supabase
    .from('follows')
    .select(
      `
      id,
      created_at,
      following_id,
      profiles:following_id (
        id,
        username,
        display_name,
        avatar_url,
        bio
      )
    `
    )
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false })

  const { data: following, error } = result as { data: FollowingWithProfile[] | null; error: any }

  if (error) {
    console.error('Error fetching following list:', error)
  }

  return {
    following: following || [],
  }
}

export const actions: Actions = {
  follow: async (event) => {
    const formData = await event.request.formData()
    const targetUserId = formData.get('targetUserId')

    if (!targetUserId || typeof targetUserId !== 'string') {
      return fail(400, { error: 'Missing user id' })
    }

    const result = await followUser(event, targetUserId)
    if (!result.success) {
      return fail(400, { error: result.error })
    }

    return { success: true }
  },
  unfollow: async (event) => {
    const formData = await event.request.formData()
    const targetUserId = formData.get('targetUserId')

    if (!targetUserId || typeof targetUserId !== 'string') {
      return fail(400, { error: 'Missing user id' })
    }

    const result = await unfollowUser(event, targetUserId)
    if (!result.success) {
      return fail(400, { error: result.error })
    }

    return { success: true }
  },
}
