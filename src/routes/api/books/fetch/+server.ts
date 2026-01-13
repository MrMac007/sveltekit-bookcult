import { getOrFetchBook } from '$lib/api/book-cache'
import { createClient } from '$lib/supabase/server'
import { isValidUUID } from '$lib/utils/validation'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

interface DbBookId {
  id: string
}

/**
 * Fetch a book by Open Library key, creating it in the database if needed.
 * Book covers are automatically selected using UK-preferred editions.
 */
export const GET: RequestHandler = async (event) => {
  const bookId = event.url.searchParams.get('id')

  if (!bookId) {
    return json({ error: 'Book ID is required' }, { status: 400 })
  }

  const supabase = createClient(event)

  try {
    // Fetch book with auto-selected best UK edition cover
    const book = (await getOrFetchBook(bookId, supabase)) as any

    if (!book) {
      return json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.id && isValidUUID(book.id)) {
      return json(book, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      })
    }

    // Try to find in database by Open Library key
    const { data: dbBook, error } = await supabase
      .from('books')
      .select('id')
      .eq('open_library_key', bookId)
      .single()

    if (error || !dbBook) {
      console.error('[API] Database query error:', error?.message)
      return json({ error: 'Book created but database ID not found' }, { status: 500 })
    }

    const typedDbBook = dbBook as DbBookId

    return json({
      ...book,
      id: typedDbBook.id,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    })
  } catch (err) {
    console.error('[API] Error fetching book:', err)
    return json(
      { error: err instanceof Error ? err.message : 'Failed to fetch book' },
      { status: 500 }
    )
  }
}
