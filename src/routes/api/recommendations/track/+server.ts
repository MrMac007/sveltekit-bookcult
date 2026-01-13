import { trackWishlistAdd } from '$lib/actions/recommendations'
import { json } from '@sveltejs/kit'
import { createClient } from '$lib/supabase/server'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async (event) => {
  const supabase = createClient(event)
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await event.request.json().catch(() => null)
  const bookId = body?.bookId

  if (!bookId || typeof bookId !== 'string') {
    return json({ error: 'Book ID is required' }, { status: 400 })
  }

  await trackWishlistAdd(event, bookId)
  return json({ success: true })
}
