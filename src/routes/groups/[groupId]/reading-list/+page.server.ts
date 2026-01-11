import { createClient } from '$lib/supabase/server'
import { error, redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { findOrCreateBook } from '$lib/api/book-helpers'

interface GroupBasic {
  id: string
  name: string
  current_book_id: string | null
}

interface GroupBookItem {
  id: string
  added_at: string
  books: {
    id: string
    google_books_id: string | null
    open_library_key: string | null
    title: string
    authors: string[]
    cover_url: string | null
    published_date: string | null
    page_count: number | null
  } | null
}

interface MembershipRole {
  role: 'member' | 'admin'
}

export const load: PageServerLoad = async (event) => {
  const supabase = createClient(event)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect(303, '/login')
  }

  const groupId = event.params.groupId

  // Get group details
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, current_book_id')
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    throw error(404, 'Group not found')
  }

  const typedGroup = group as GroupBasic

  // Check if user is admin
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  const typedMembership = membership as MembershipRole | null

  if (!typedMembership || typedMembership.role !== 'admin') {
    throw error(403, 'Only admins can manage the reading list')
  }

  // Get current reading list
  const { data: readingList } = await supabase
    .from('group_books')
    .select(
      `
      id,
      added_at,
      books (
        id,
        google_books_id,
        open_library_key,
        title,
        authors,
        cover_url,
        published_date,
        page_count
      )
    `
    )
    .eq('group_id', groupId)
    .order('added_at', { ascending: false })

  const typedReadingList = (readingList || []) as unknown as GroupBookItem[]

  const books = typedReadingList
    .filter((item) => item.books !== null)
    .map((item) => ({
      groupBookId: item.id,
      addedAt: item.added_at,
      ...item.books,
    }))

  return {
    group: {
      id: typedGroup.id,
      name: typedGroup.name,
      currentBookId: typedGroup.current_book_id,
    },
    books,
  }
}

export const actions: Actions = {
  addBook: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Not authenticated' })
    }

    const groupId = event.params.groupId

    // Verify admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    const typedMembership = membership as MembershipRole | null

    if (!typedMembership || typedMembership.role !== 'admin') {
      return fail(403, { error: 'Only admins can add books' })
    }

    const formData = await event.request.formData()
    const bookData = JSON.parse(formData.get('bookData') as string)

    try {
      // Find or create the book in the books table
      const bookId = await findOrCreateBook(bookData, supabase)
      if (!bookId) {
        return fail(500, { error: 'Failed to create book' })
      }

      // Add to group_books
      const { error: insertError } = await supabase.from('group_books').insert({
        group_id: groupId,
        book_id: bookId,
        added_by: user.id,
      } as any)

      if (insertError) {
        if (insertError.code === '23505') {
          return fail(400, { error: 'Book already in reading list' })
        }
        throw insertError
      }

      return { success: true, message: 'Book added to reading list' }
    } catch (error) {
      console.error('Error adding book to reading list:', error)
      return fail(500, { error: 'Failed to add book' })
    }
  },

  removeBook: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Not authenticated' })
    }

    const groupId = event.params.groupId

    // Verify admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    const typedMembership = membership as MembershipRole | null

    if (!typedMembership || typedMembership.role !== 'admin') {
      return fail(403, { error: 'Only admins can remove books' })
    }

    const formData = await event.request.formData()
    const groupBookId = formData.get('groupBookId') as string

    try {
      const { error: deleteError } = await supabase
        .from('group_books')
        .delete()
        .eq('id', groupBookId)
        .eq('group_id', groupId)

      if (deleteError) throw deleteError

      return { success: true, message: 'Book removed from reading list' }
    } catch (error) {
      console.error('Error removing book:', error)
      return fail(500, { error: 'Failed to remove book' })
    }
  },

  setAsCurrentBook: async (event) => {
    const supabase = createClient(event)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail(401, { error: 'Not authenticated' })
    }

    const groupId = event.params.groupId

    // Verify admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    const typedMembership = membership as MembershipRole | null

    if (!typedMembership || typedMembership.role !== 'admin') {
      return fail(403, { error: 'Only admins can set current book' })
    }

    const formData = await event.request.formData()
    const bookId = formData.get('bookId') as string

    try {
      // Type assertion needed because Supabase types don't properly infer the groups table
      const { error: updateError } = await (supabase as any)
        .from('groups')
        .update({ current_book_id: bookId })
        .eq('id', groupId)

      if (updateError) throw updateError

      return { success: true, message: 'Current book updated' }
    } catch (err) {
      console.error('Error setting current book:', err)
      return fail(500, { error: 'Failed to set current book' })
    }
  },
}
