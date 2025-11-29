import { getOrFetchBook } from '$lib/api/book-cache'
import { createClient } from '$lib/supabase/server'
import { isValidUUID } from '$lib/utils/validation'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

interface DbBookId {
  id: string
}

/**
 * Check if an ID is an Open Library key (e.g., OL12345W)
 */
function isOpenLibraryKey(id: string): boolean {
  return /^OL\d+[WM]$/.test(id)
}

export const GET: RequestHandler = async (event) => {
  const bookId = event.url.searchParams.get('id')
  const source = event.url.searchParams.get('source') // 'openlib' or 'google' (auto-detected if not specified)

  if (!bookId) {
    return json({ error: 'Book ID is required' }, { status: 400 })
  }

  const supabase = createClient(event)

  try {
    // Detect source from ID format if not specified
    const detectedSource = (source || (isOpenLibraryKey(bookId) ? 'openlib' : 'google')) as 'openlib' | 'google'

    const book = (await getOrFetchBook(bookId, supabase, detectedSource)) as any

    if (!book) {
      return json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.id && isValidUUID(book.id)) {
      return json(book)
    }

    // Try to find in database by the appropriate key
    let dbQuery = supabase.from('books').select('id')

    if (detectedSource === 'openlib') {
      dbQuery = dbQuery.eq('open_library_key', bookId)
    } else {
      dbQuery = dbQuery.eq('google_books_id', bookId)
    }

    const { data: dbBook, error } = await dbQuery.single()

    if (error || !dbBook) {
      console.error('[API] Database query error:', error?.message)
      return json({ error: 'Book created but database ID not found' }, { status: 500 })
    }

    const typedDbBook = dbBook as DbBookId

    return json({
      ...book,
      id: typedDbBook.id,
    })
  } catch (err) {
    console.error('[API] Error fetching book:', err)
    return json(
      { error: err instanceof Error ? err.message : 'Failed to fetch book' },
      { status: 500 }
    )
  }
}
