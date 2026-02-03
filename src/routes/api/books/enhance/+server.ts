import { enhanceBook } from '$lib/actions/enhance-book'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { GOOGLE_GENERATIVE_AI_API_KEY } from '$env/static/private'
import type { BookEnhancementInput } from '$lib/ai/book-enhancer'

export const POST: RequestHandler = async (event) => {
  const body = await event.request.json().catch(() => null)
  const bookId = body?.bookId
  const input = body?.input as Partial<BookEnhancementInput> | undefined

  if (!bookId || typeof bookId !== 'string') {
    return json({ error: 'Book ID is required' }, { status: 400 })
  }

  if (!GOOGLE_GENERATIVE_AI_API_KEY) {
    return json({ 
      success: false,
      error: 'AI enhancement is not configured. Please contact the administrator.' 
    }, { status: 503 })
  }

  try {
    const result = await enhanceBook(event, bookId, input)
    const status = result.success ? 200 : 400
    return json(result, { status })
  } catch (error) {
    console.error('[API] Enhance book error:', error)
    return json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enhance book'
    }, { status: 500 })
  }
}
