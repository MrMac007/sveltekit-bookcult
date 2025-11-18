import { followUser, unfollowUser } from '$lib/actions/follows'
import { createClient } from '$lib/supabase/server'
import { redirect, fail, type Actions, type PageServerLoad } from '@sveltejs/kit'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)
  const userId = event.params.userId

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    throw redirect(303, '/login')
  }

  if (currentUser.id === userId) {
    throw redirect(303, '/profile')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw redirect(303, '/discover')
  }

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('*', { head: true, count: 'exact' }).eq('following_id', userId),
    supabase.from('follows').select('*', { head: true, count: 'exact' }).eq('follower_id', userId),
  ])

  const { data: followData } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUser.id)
    .eq('following_id', userId)
    .maybeSingle()

  const [
    { count: wishlistCount },
    { count: completedCount },
    { count: ratingsCount },
    { data: recentRatings },
    { data: wishlistBooks },
    { data: completedBooks },
    { data: currentlyReading },
  ] = await Promise.all([
    supabase.from('wishlists').select('*', { head: true, count: 'exact' }).eq('user_id', userId),
    supabase.from('completed_books').select('*', { head: true, count: 'exact' }).eq('user_id', userId),
    supabase.from('ratings').select('*', { head: true, count: 'exact' }).eq('user_id', userId),
    supabase
      .from('ratings')
      .select(
        `
        id,
        rating,
        review,
        created_at,
        books (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('wishlists')
      .select(
        `
        id,
        added_at,
        books (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(10),
    supabase
      .from('completed_books')
      .select(
        `
        id,
        completed_at,
        books (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(10),
    supabase
      .from('currently_reading')
      .select(
        `
        id,
        started_at,
        books:book_id (
          id,
          title,
          authors,
          cover_url,
          google_books_id
        )
      `
      )
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  return {
    profile,
    followerCount: followerCount || 0,
    followingCount: followingCount || 0,
    isFollowing: !!followData,
    wishlistCount: wishlistCount || 0,
    completedCount: completedCount || 0,
    ratingsCount: ratingsCount || 0,
    recentRatings: recentRatings || [],
    wishlistBooks: (wishlistBooks || []).filter((w) => w.books !== null),
    completedBooks: (completedBooks || []).filter((c) => c.books !== null),
    currentlyReading: (currentlyReading || []).filter((c) => c.books !== null),
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
