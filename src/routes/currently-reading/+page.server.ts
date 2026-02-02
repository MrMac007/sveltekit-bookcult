import { fail } from '@sveltejs/kit'
import { requireUser } from '$lib/server/auth'
import type { PageServerLoad, Actions } from './$types'
import { markComplete } from '$lib/actions/books'

interface CurrentlyReadingItem {
  id: string
  started_at: string
  group_id: string | null
  books: {
    id: string
    google_books_id: string | null
    title: string
    authors: string[]
    cover_url: string | null
    description: string | null
    page_count: number | null
    published_date: string | null
  } | null
}

export const load: PageServerLoad = async (event) => {
  const { supabase, user } = await requireUser(event)

  const { data: currentlyReading, error } = await supabase
    .from('currently_reading')
    .select(
      `
      id,
      started_at,
      group_id,
      books:book_id (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        page_count,
        published_date
      )
    `
    )
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching currently reading:', error)
  }

  const items = (currentlyReading as CurrentlyReadingItem[] | null)?.filter((item) => item.books !== null) ?? []

  return {
    currentlyReading: items,
  }
}

export const actions: Actions = {
  remove: async (event) => {
    const { supabase, user } = await requireUser(event)

    const formData = await event.request.formData()
    const recordId = formData.get('recordId')

    if (!recordId || typeof recordId !== 'string') {
      return fail(400, { error: 'Missing record id' })
    }

    const { error } = await supabase
      .from('currently_reading')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error removing currently reading record:', error)
      return fail(500, { error: 'Failed to remove book' })
    }

    return { success: true }
  },
  // Use unified action from lib/actions/books.ts
  markComplete,
}
