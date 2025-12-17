import { getOrFetchBook, getOrFetchBookWithCover } from '$lib/api/book-cache'
import { createClient } from '$lib/supabase/server'
import { isValidUUID } from '$lib/utils/validation'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

interface DbBookId {
  id: string
}

export const GET: RequestHandler = async (event) => {
  const bookId = event.url.searchParams.get('id')
  const coverUrl = event.url.searchParams.get('cover_url')

  if (!bookId) {
    return json({ error: 'Book ID is required' }, { status: 400 })
  }

  const supabase = createClient(event)

  try {
    // Use the cover-aware version if a cover URL is provided (from edition picker)
    const book = coverUrl
      ? (await getOrFetchBookWithCover(bookId, supabase, coverUrl)) as any
      : (await getOrFetchBook(bookId, supabase)) as any

    if (!book) {
      return json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.id && isValidUUID(book.id)) {
      return json(book)
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
    })
  } catch (err) {
    console.error('[API] Error fetching book:', err)
    return json(
      { error: err instanceof Error ? err.message : 'Failed to fetch book' },
      { status: 500 }
    )
  }
}
