import { createClient } from '$lib/supabase/server'
import { groupActivitiesByBook } from '$lib/utils/group-activities'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  const { data: activities, error } = await supabase
    .from('activities')
    .select(
      `
      id,
      user_id,
      activity_type,
      created_at,
      book_id,
      metadata,
      profiles:user_id (
        id,
        username,
        display_name
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching activities:', error)
  }

  const feedItems = groupActivitiesByBook((activities || []) as any)

  return {
    feedItems,
  }
}
