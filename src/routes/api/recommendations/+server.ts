import { getRecommendations } from '$lib/actions/recommendations'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async (event) => {
  const forceRefresh = event.url.searchParams.get('forceRefresh') === '1'
  const result = await getRecommendations(event, forceRefresh)
  return json(result)
}
