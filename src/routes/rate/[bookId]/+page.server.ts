import { createClient } from '$lib/supabase/server'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  // Fetch book data
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, authors, cover_url')
    .eq('id', event.params.bookId)
    .single()

  if (bookError || !book) {
    throw error(404, 'Book not found')
  }

  // Fetch existing rating if it exists
  const { data: existingRating } = await supabase
    .from('ratings')
    .select('rating, review')
    .eq('user_id', user.id)
    .eq('book_id', event.params.bookId)
    .maybeSingle()

  return {
    book,
    existingRating,
  }
}

export const actions: Actions = {
  default: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const formData = await event.request.formData()
    const rating = parseFloat(formData.get('rating') as string)
    const review = formData.get('review') as string

    if (rating === 0 || isNaN(rating)) {
      return { success: false, error: 'Please select a rating' }
    }

    try {
      // Upsert rating (insert or update)
      const { error: upsertError } = await supabase.from('ratings').upsert(
        {
          user_id: user.id,
          book_id: event.params.bookId,
          rating,
          review: review?.trim() || null,
        },
        {
          onConflict: 'user_id,book_id',
        }
      )

      if (upsertError) throw upsertError

      // Redirect to profile or completed books page
      throw redirect(303, '/profile')
    } catch (err) {
      if (err instanceof Response) throw err // Re-throw redirects
      console.error('Error submitting rating:', err)
      return { success: false, error: 'Failed to submit rating' }
    }
  },
}
