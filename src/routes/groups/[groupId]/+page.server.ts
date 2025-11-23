import { createClient } from '$lib/supabase/server'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import * as groupActions from '$lib/actions/groups'

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  const groupId = event.params.groupId

  // Get group details with current book
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select(
      `
      id,
      name,
      description,
      invite_code,
      current_book_id,
      books (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        published_date,
        page_count
      )
    `
    )
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    throw error(404, 'Group not found')
  }

  // Check if user is a member
  const { data: userMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!userMembership) {
    throw error(403, 'You are not a member of this group')
  }

  // Get all group members with profiles
  const { data: members } = await supabase
    .from('group_members')
    .select(
      `
      id,
      role,
      joined_at,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  // Check if current user is reading the current book
  let isCurrentUserReading = false
  let readingMembers: any[] = []

  if (group.current_book_id) {
    const { data: reading } = await supabase
      .from('currently_reading')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', group.current_book_id)
      .maybeSingle()

    isCurrentUserReading = !!reading

    // Get members currently reading this book
    const { data: readers } = await supabase
      .from('currently_reading')
      .select(
        `
        id,
        user_id,
        started_at,
        profiles (
          id,
          username,
          display_name
        )
      `
      )
      .eq('book_id', group.current_book_id)
      .eq('group_id', groupId)

    readingMembers = readers || []
  }

  // Get group reading list
  const { data: readingList } = await supabase
    .from('group_books')
    .select(
      `
      id,
      book_id,
      added_at,
      display_order,
      books (
        id,
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        published_date,
        page_count
      )
    `
    )
    .eq('group_id', groupId)
    .order('display_order', { ascending: true, nullsLast: true })
    .order('added_at', { ascending: false })

  const readingListBookIds = readingList?.map((item: any) => item.book_id) || []

  // Get group ratings (only for books on the reading list)
  const { data: ratingsData } = await supabase
    .from('ratings')
    .select(
      `
      id,
      rating,
      review,
      created_at,
      book_id,
      books (
        id,
        title,
        authors,
        cover_url
      ),
      profiles (
        id,
        username,
        display_name
      )
    `
    )
    .in('book_id', readingListBookIds.length > 0 ? readingListBookIds : ['']) // Filter by reading list books
    .order('created_at', { ascending: false })

  // Transform ratings for the component
  const ratings =
    ratingsData?.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      created_at: r.created_at,
      book_id: r.book_id,
      book_title: r.books?.title || '',
      book_authors: r.books?.authors || [],
      book_cover_url: r.books?.cover_url || null,
      profiles: r.profiles,
    })) || []

  // Get book IDs that have ratings
  const ratedBookIds = new Set(ratings.map((r) => r.book_id))

  // Separate reading list into rated and unrated books
  const upNextBooks =
    readingList
      ?.filter((item: any) => item.books !== null && !ratedBookIds.has(item.book_id))
      .map((item: any) => ({
        groupBookId: item.id,
        addedAt: item.added_at,
        displayOrder: item.display_order,
        ...item.books,
      })) || []

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      invite_code: group.invite_code,
      current_book_id: group.current_book_id,
      currentBook: group.books,
      isAdmin: userMembership.role === 'admin',
      memberCount: members?.length || 0,
      isCurrentUserReading,
      readingMembers,
    },
    members: members || [],
    ratings,
    upNextBooks,
    currentUserId: user.id,
  }
}

export const actions: Actions = {
  removeMember: groupActions.removeMember,
  updateMemberRole: groupActions.updateMemberRole,
  setCurrentReadingBook: groupActions.setCurrentReadingBook,
  toggleGroupBookReading: groupActions.toggleGroupBookReading,
  reorderReadingList: groupActions.reorderReadingList,
}
