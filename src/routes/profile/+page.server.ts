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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw redirect(303, '/login')
  }

  // Get wishlist count
  const { count: wishlistCount } = await supabase
    .from('wishlists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Get completed count
  const { count: completedCount } = await supabase
    .from('completed_books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Get currently reading count
  const { count: currentlyReadingCount } = await supabase
    .from('currently_reading')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Get currently reading books with details (for display section)
  const { data: currentlyReading } = await supabase
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
    .limit(6)

  const currentlyReadingItems = (currentlyReading as CurrentlyReadingItem[] | null)?.filter((item) => item.books !== null) ?? []

  return {
    profile: profile as Profile,
    wishlistCount: wishlistCount || 0,
    completedCount: completedCount || 0,
    currentlyReadingCount: currentlyReadingCount || 0,
    currentlyReading: currentlyReadingItems,
  }
}
