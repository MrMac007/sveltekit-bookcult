import { createClient } from '$lib/supabase/server'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)
  const db = supabase as any // Type assertion for Supabase relational queries

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  // Get user's group memberships with group details
  const { data: memberships, error } = await db
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

  // Get member counts for each group in a single query
  const groupIds = memberships?.map((m: any) => m.groups?.id).filter(Boolean) || []
  const countsMap = new Map<string, number>()

  if (groupIds.length > 0) {
    const { data: memberRows } = await db
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)

    // Count members per group client-side (single query, minimal data transfer)
    memberRows?.forEach((row: { group_id: string }) => {
      countsMap.set(row.group_id, (countsMap.get(row.group_id) || 0) + 1)
    })
  }

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
