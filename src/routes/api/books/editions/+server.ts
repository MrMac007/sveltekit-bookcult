import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { openLibraryAPI } from '$lib/api/open-library'

export const GET: RequestHandler = async ({ url }) => {
  const workKey = url.searchParams.get('workKey')

  if (!workKey) {
    return json({ error: 'Work key is required' }, { status: 400 })
  }

  try {
    const editions = await openLibraryAPI.getEditionsWithCovers(workKey)

    return json({
      editions,
      count: editions.length
    })
  } catch (error) {
    console.error('[API] Error fetching editions:', error)
    return json(
      { error: 'Failed to fetch editions' },
      { status: 500 }
    )
  }
}
