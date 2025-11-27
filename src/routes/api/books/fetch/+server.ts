import { getOrFetchBook } from '$lib/api/book-cache'
import { createClient } from '$lib/supabase/server'
import { isValidUUID } from '$lib/utils/validation'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

interface DbBookId {
  id: string
}

export const GET: RequestHandler = async (event) => {
  const googleBooksId = event.url.searchParams.get('id')

  if (!googleBooksId) {
    return json({ error: 'Google Books ID is required' }, { status: 400 })
  }

  const supabase = createClient(event)

  try {
    const book = (await getOrFetchBook(googleBooksId, supabase)) as any

    if (!book) {
      return json({ error: 'Book not found in Google Books' }, { status: 404 })
    }

    if (book.id && isValidUUID(book.id)) {
      return json(book)
    }

    const { data: dbBook, error } = await supabase
      .from('books')
      .select('id')
      .eq('google_books_id', googleBooksId)
      .single()

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
