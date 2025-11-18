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
  createGroup: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Not authenticated' })
    }

    const formData = await event.request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const inviteCode = formData.get('inviteCode') as string

    if (!name || !inviteCode) {
      return fail(400, { error: 'Name and invite code are required' })
    }

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description: description || null,
          admin_id: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single()

      if (groupError) {
        if (groupError.code === '23505') {
          // Unique constraint violation on invite code
          return fail(400, { error: 'This invite code is already in use. Please try again.' })
        }
        throw groupError
      }

      // Add creator as admin member
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })

      if (memberError) throw memberError

      // Redirect to the new group page
      throw redirect(303, `/groups/${group.id}`)
    } catch (error) {
      if (error instanceof Response) throw error // Re-throw redirects
      console.error('Error creating group:', error)
      return fail(500, { error: 'Failed to create group' })
    }
  },
}
