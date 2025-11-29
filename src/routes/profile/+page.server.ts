import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import type { Database } from '$lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface CurrentlyReadingItem {
  id: string
  started_at: string
  group_id: string | null
  books: {
    id: string
    title: string
    authors: string[]
    cover_url: string | null
    description: string | null
    page_count: number | null
    published_date: string | null
  } | null
  groups: {
    id: string
    name: string
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

  // Run all queries in parallel for faster loading
  const [
    profileResult,
    wishlistCountResult,
    completedCountResult,
    currentlyReadingCountResult,
    currentlyReadingResult,
  ] = await Promise.all([
    // Get user profile
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    // Get wishlist count
    supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Get completed count
    supabase
      .from('completed_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Get currently reading count
    supabase
      .from('currently_reading')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Get currently reading books with details (for display section)
    supabase
      .from('currently_reading')
      .select(
        `
        id,
        started_at,
        group_id,
        books:book_id (
          id,
          title,
          authors,
          cover_url,
          description,
          page_count,
          published_date
        ),
        groups:group_id (
          id,
          name
        )
      `
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(6),
  ])

  if (!profileResult.data) {
    throw redirect(303, '/login')
  }

  const currentlyReadingItems =
    (currentlyReadingResult.data as CurrentlyReadingItem[] | null)?.filter(
      (item) => item.books !== null
    ) ?? []

  return {
    profile: profileResult.data as Profile,
    wishlistCount: wishlistCountResult.count || 0,
    completedCount: completedCountResult.count || 0,
    currentlyReadingCount: currentlyReadingCountResult.count || 0,
    currentlyReading: currentlyReadingItems,
  }
}
