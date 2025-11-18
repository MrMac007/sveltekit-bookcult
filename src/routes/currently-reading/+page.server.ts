import { createClient } from '$lib/supabase/server'
import { redirect, fail, type Actions, type PageServerLoad } from '@sveltejs/kit'

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

  const items = currentlyReading?.filter((item) => item.books !== null) ?? []

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

      const { error: insertError } = await supabase.from('completed_books').insert({
        user_id: user.id,
        book_id: bookId,
      })

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
