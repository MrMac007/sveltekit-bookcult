import { getRecommendations } from '$lib/actions/recommendations'
import { json } from '@sveltejs/kit'
import { createClient } from '$lib/supabase/server'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async (event) => {
  const supabase = createClient(event)
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return json({ error: 'Authentication required' }, { status: 401 })
  }

  const forceRefresh = event.url.searchParams.get('forceRefresh') === '1'
  const result = await getRecommendations(event, forceRefresh)
  return json(result)
}
