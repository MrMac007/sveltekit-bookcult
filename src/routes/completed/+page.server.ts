import { createClient } from '$lib/supabase/server'
import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  const { data: completedBooks, error } = await supabase
    .from('completed_books')
    .select(
      `
      id,
      completed_at,
      date_confirmed,
      books (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        published_date,
        page_count,
        categories
      )
    `
    )
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching completed books:', error)
  }

  const completedList = (completedBooks || []) as any[]
  const validBooks = completedList.filter((item) => item.books !== null)
  const bookIds = validBooks.map((item) => item.books.id)

  const { data: ratings } = await supabase
    .from('ratings')
    .select('book_id, rating, review')
    .eq('user_id', user.id)
    .in('book_id', bookIds.length ? bookIds : [''])

  const ratingRows = (ratings || []) as any[]
  const ratingsMap = new Map(ratingRows.map((r) => [r.book_id, r]))

  const booksWithRatings = validBooks.map((item) => ({
    ...item,
    rating: ratingsMap.get(item.books.id) || null,
  }))

  return {
    completedBooks: booksWithRatings,
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
    const bookId = formData.get('bookId')

    if (!bookId || typeof bookId !== 'string') {
      return fail(400, { error: 'Missing book id' })
    }

    try {
      // Delete rating and completed_books entry in parallel (independent operations)
      await Promise.all([
        supabase.from('ratings').delete().eq('user_id', user.id).eq('book_id', bookId),
        supabase.from('completed_books').delete().eq('user_id', user.id).eq('book_id', bookId)
      ])
      return { success: true }
    } catch (err) {
      console.error('Error removing completed book:', err)
      return fail(500, { error: 'Failed to remove book' })
    }
  },

  updateDate: async (event) => {
    const supabase = createClient(event)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect(303, '/login')
    }

    const formData = await event.request.formData()
    const bookId = formData.get('bookId')
    const completedAt = formData.get('completedAt')

    if (!bookId || typeof bookId !== 'string') {
      return fail(400, { error: 'Missing book id' })
    }

    if (!completedAt || typeof completedAt !== 'string') {
      return fail(400, { error: 'Missing completion date' })
    }

    try {
      const { error } = await (supabase as any)
        .from('completed_books')
        .update({
          completed_at: completedAt,
          date_confirmed: true
        })
        .eq('user_id', user.id)
        .eq('book_id', bookId)

      if (error) throw error

      return { success: true }
    } catch (err) {
      console.error('Error updating completion date:', err)
      return fail(500, { error: 'Failed to update date' })
    }
  },
}
