import { createClient } from '$lib/supabase/server'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async (event) => {
  const groupId = event.url.searchParams.get('groupId')

  if (!groupId) {
    return json({ error: 'Group ID is required' }, { status: 400 })
  }

  const supabase = createClient(event)

  try {
    const { data: groupBooks, error } = await supabase
      .from('group_books')
      .select(
        `
        book_id,
        books:book_id (
          id,
          title,
          authors,
          cover_url
        )
      `
      )
      .eq('group_id', groupId)

    if (error) {
      console.error('[API] Database error:', error.message)
      return json({ error: 'Failed to fetch group books' }, { status: 500 })
    }

    const books =
      groupBooks
        ?.map((item: any) => item.books)
        .filter(Boolean)
        .map((book: any) => ({
          id: book.id,
          title: book.title,
          authors: book.authors || [],
          cover_url: book.cover_url,
        })) || []

    return json(books)
  } catch (err) {
    console.error('[API] Error fetching group books:', err)
    return json(
      { error: err instanceof Error ? err.message : 'Failed to fetch group books' },
      { status: 500 }
    )
  }
}
