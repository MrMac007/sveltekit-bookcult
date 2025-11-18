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

  // Get user's group memberships with group details
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select(
      `
      id,
      role,
      groups (
        id,
        name,
        description
      )
    `
    )
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching groups:', error)
  }

  // Get member counts for each group
  const groupIds = memberships?.map((m: any) => m.groups.id).filter(Boolean) || []
  const { data: memberCounts } = await supabase
    .from('group_members')
    .select('group_id')
    .in('group_id', groupIds.length > 0 ? groupIds : [''])

  // Count members per group
  const countsMap = new Map<string, number>()
  memberCounts?.forEach((m: any) => {
    countsMap.set(m.group_id, (countsMap.get(m.group_id) || 0) + 1)
  })

  // Transform data for component
  const groups =
    memberships
      ?.filter((m: any) => m.groups !== null)
      .map((m: any) => ({
        id: m.groups.id,
        name: m.groups.name,
        description: m.groups.description,
        memberCount: countsMap.get(m.groups.id) || 0,
        isAdmin: m.role === 'admin',
      })) || []

  return {
    groups,
  }
}
