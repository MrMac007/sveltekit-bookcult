import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

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

  const currentlyReadingItems = currentlyReading?.filter((item) => item.books !== null) ?? []

  return {
    profile,
    wishlistCount: wishlistCount || 0,
    completedCount: completedCount || 0,
    currentlyReadingCount: currentlyReadingCount || 0,
    currentlyReading: currentlyReadingItems,
  }
}
