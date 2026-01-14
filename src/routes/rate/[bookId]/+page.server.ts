import { createClient } from '$lib/supabase/server'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

interface BookBasic {
  id: string
  title: string
  authors: string[]
  cover_url: string | null
}

interface ExistingRating {
  rating: number
  review: string | null
}

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

  // Fetch existing rating and completion date in parallel
  const [ratingResult, completionResult] = await Promise.all([
    supabase
      .from('ratings')
      .select('rating, review')
      .eq('user_id', user.id)
      .eq('book_id', event.params.bookId)
      .maybeSingle(),
    supabase
      .from('completed_books')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('book_id', event.params.bookId)
      .maybeSingle(),
  ])

  // Format completion date as YYYY-MM-DD if it exists
  let existingCompletionDate: string | null = null
  const completionData = completionResult.data as { completed_at: string } | null
  if (completionData?.completed_at) {
    existingCompletionDate = new Date(completionData.completed_at).toISOString().split('T')[0]
  }

  return {
    book: book as BookBasic,
    existingRating: ratingResult.data as ExistingRating | null,
    existingCompletionDate,
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
    const completionDate = formData.get('completionDate') as string

    if (rating === 0 || isNaN(rating)) {
      return { success: false, error: 'Please select a rating' }
    }

    const db = supabase as any

    try {
      // Upsert rating (insert or update)
      const { error: upsertError } = await db.from('ratings').upsert(
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

      // Upsert completion date (mark as completed with confirmed date)
      if (completionDate) {
        const { error: completionError } = await db.from('completed_books').upsert(
          {
            user_id: user.id,
            book_id: event.params.bookId,
            completed_at: completionDate,
            date_confirmed: true,
          },
          {
            onConflict: 'user_id,book_id',
          }
        )

        if (completionError) throw completionError
      }

      // Redirect to profile or completed books page
      throw redirect(303, '/profile')
    } catch (err) {
      if (err instanceof Response) throw err // Re-throw redirects
      console.error('Error submitting rating:', err)
      return { success: false, error: 'Failed to submit rating' }
    }
  },
}
