import { trackWishlistAdd } from '$lib/actions/recommendations'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async (event) => {
  const body = await event.request.json().catch(() => null)
  const bookId = body?.bookId

  if (!bookId || typeof bookId !== 'string') {
    return json({ error: 'Book ID is required' }, { status: 400 })
  }

  await trackWishlistAdd(event, bookId)
  return json({ success: true })
}
