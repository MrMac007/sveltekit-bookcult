import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import * as bookActions from '$lib/actions/books'

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

  return {
    profile,
    userId: user.id,
  }
}

export const actions: Actions = {
  addToWishlist: bookActions.addToWishlist,
  markComplete: bookActions.markComplete,
  startReading: bookActions.startReading,
}
