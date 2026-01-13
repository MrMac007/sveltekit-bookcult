import { createClient } from '$lib/supabase/server'
import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

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
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

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
    const supabase = createClient(event)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect(303, '/login')
    }

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
  markComplete: async (event) => {
    const supabase = createClient(event)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect(303, '/login')
    }

    const formData = await event.request.formData()
    const bookId = formData.get('bookId')
    const completedAt = formData.get('completedAt') as string | null

    if (!bookId || typeof bookId !== 'string') {
      return fail(400, { error: 'Missing book id' })
    }

    try {
      const { data: existing } = await supabase
        .from('completed_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single()

      if (existing) {
        throw redirect(303, `/rate/${bookId}`)
      }

      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('book_id', bookId)
      await supabase.from('currently_reading').delete().eq('user_id', user.id).eq('book_id', bookId)

      // Add to completed books with optional date
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        book_id: bookId,
      }

      if (completedAt) {
        insertData.completed_at = completedAt
        insertData.date_confirmed = true
      }

      const { error: insertError } = await supabase.from('completed_books').insert(insertData as any)

      if (insertError) {
        throw insertError
      }

      throw redirect(303, `/rate/${bookId}`)
    } catch (err) {
      if (err instanceof Response) throw err
      console.error('Error marking book complete:', err)
      return fail(500, { error: 'Failed to mark book as complete' })
    }
  },
}
