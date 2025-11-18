import { createClient } from '$lib/supabase/server'
import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  return {}
}

export const actions: Actions = {
  joinGroup: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Not authenticated' })
    }

    const formData = await event.request.formData()
    const inviteCode = (formData.get('inviteCode') as string)?.toUpperCase().trim()

    if (!inviteCode) {
      return fail(400, { error: 'Invite code is required' })
    }

    if (inviteCode.length !== 8) {
      return fail(400, { error: 'Invite code must be 8 characters' })
    }

    try {
      // Find group by invite code
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()

      if (groupError || !group) {
        return fail(404, { error: 'Invalid invite code' })
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        // Already a member, just redirect
        throw redirect(303, `/groups/${group.id}`)
      }

      // Add user to group
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      })

      if (memberError) throw memberError

      // Redirect to group page
      throw redirect(303, `/groups/${group.id}`)
    } catch (error) {
      if (error instanceof Response) throw error // Re-throw redirects
      console.error('Error joining group:', error)
      return fail(500, { error: 'Failed to join group' })
    }
  },
}
