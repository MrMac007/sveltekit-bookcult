/**
 * Server actions for group book suggestions feature
 */

import { createClient } from '$lib/supabase/server'
import { fail, type RequestEvent } from '@sveltejs/kit'
import { findOrCreateBook } from '$lib/api/book-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Helper to check membership and get role
async function getMembership(db: SupabaseClient, groupId: string, userId: string) {
	const { data } = await (db as any)
		.from('group_members')
		.select('role')
		.eq('group_id', groupId)
		.eq('user_id', userId)
		.single()
	return data as { role: 'member' | 'admin' } | null
}

// Helper to get or create active suggestion round
async function getOrCreateRound(db: SupabaseClient, groupId: string) {
	const client = db as any

	// First try to get existing round
	const { data: existing } = await client
		.from('group_suggestion_rounds')
		.select('*')
		.eq('group_id', groupId)
		.single()

	if (existing) return existing

	// Create new round
	const { data: newRound, error } = await client
		.from('group_suggestion_rounds')
		.insert({ group_id: groupId, status: 'open' })
		.select()
		.single()

	if (error) throw error
	return newRound
}

interface SuggestionRound {
	id: string
	group_id: string
	status: 'open' | 'revealed'
	created_at: string
	revealed_at: string | null
}

interface UserSuggestion {
	id: string
	rank: number
	book_id: string
	books: {
		id: string
		title: string
		authors: string[]
		cover_url: string | null
	} | null
}

interface SuggestionResult {
	id: string
	final_rank: number
	base_score: number
	overlap_bonus: number
	total_score: number
	member_count: number
	book_id: string
	books: {
		id: string
		title: string
		authors: string[]
		cover_url: string | null
	} | null
}

/**
 * Get current suggestion round and user's suggestions
 */
export async function getSuggestionRoundData(
	db: SupabaseClient,
	groupId: string,
	userId: string
): Promise<{
	round: SuggestionRound | null
	userSuggestions: UserSuggestion[]
	results: SuggestionResult[]
}> {
	const client = db as any

	// Get the round
	const { data: round } = await client
		.from('group_suggestion_rounds')
		.select('*')
		.eq('group_id', groupId)
		.maybeSingle()

	if (!round) {
		return { round: null, userSuggestions: [], results: [] }
	}

	// Get user's suggestions with book data
	const { data: userSuggestions } = await client
		.from('group_suggestions')
		.select(`
			id,
			rank,
			book_id,
			books (
				id,
				title,
				authors,
				cover_url
			)
		`)
		.eq('round_id', round.id)
		.eq('user_id', userId)
		.order('rank', { ascending: true })

	// If revealed, get results
	let results: SuggestionResult[] = []
	if (round.status === 'revealed') {
		const { data: resultData } = await client
			.from('group_suggestion_results')
			.select(`
				id,
				final_rank,
				base_score,
				overlap_bonus,
				total_score,
				member_count,
				book_id,
				books (
					id,
					title,
					authors,
					cover_url
				)
			`)
			.eq('round_id', round.id)
			.order('final_rank', { ascending: true })
		results = resultData || []
	}

	return {
		round,
		userSuggestions: userSuggestions || [],
		results
	}
}

/**
 * Add a book suggestion (member action)
 */
export async function addSuggestion(event: RequestEvent) {
	const supabase = createClient(event)
	const client = supabase as any
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return fail(401, { error: 'Not authenticated' })
	}

	const formData = await event.request.formData()
	const groupId = formData.get('groupId') as string
	const bookData = JSON.parse(formData.get('bookData') as string)
	const rank = parseInt(formData.get('rank') as string, 10)

	if (rank < 1 || rank > 5) {
		return fail(400, { error: 'Rank must be between 1 and 5' })
	}

	try {
		// Check membership
		const membership = await getMembership(supabase, groupId, user.id)
		if (!membership) {
			return fail(403, { error: 'You must be a group member' })
		}

		// Get or create round
		const round = await getOrCreateRound(supabase, groupId)

		if (round.status === 'revealed') {
			return fail(400, { error: 'Suggestions are locked. Wait for admin to start a new round.' })
		}

		// Check user's current suggestion count
		const { count } = await client
			.from('group_suggestions')
			.select('*', { count: 'exact', head: true })
			.eq('round_id', round.id)
			.eq('user_id', user.id)

		if (count && count >= 5) {
			return fail(400, { error: 'Maximum 5 suggestions allowed' })
		}

		// Find or create book
		const bookId = await findOrCreateBook(bookData, supabase)
		if (!bookId) {
			return fail(500, { error: 'Failed to process book' })
		}

		// Check if rank is already used
		const { data: existingRank } = await client
			.from('group_suggestions')
			.select('id')
			.eq('round_id', round.id)
			.eq('user_id', user.id)
			.eq('rank', rank)
			.maybeSingle()

		if (existingRank) {
			return fail(400, { error: `You already have a book at rank ${rank}` })
		}

		// Check if book already suggested by user
		const { data: existingBook } = await client
			.from('group_suggestions')
			.select('id')
			.eq('round_id', round.id)
			.eq('user_id', user.id)
			.eq('book_id', bookId)
			.maybeSingle()

		if (existingBook) {
			return fail(400, { error: 'You have already suggested this book' })
		}

		// Insert suggestion
		const { error } = await client.from('group_suggestions').insert({
			round_id: round.id,
			user_id: user.id,
			book_id: bookId,
			rank
		})

		if (error) throw error

		return { success: true, message: 'Suggestion added' }
	} catch (error) {
		console.error('Error adding suggestion:', error)
		return fail(500, { error: 'Failed to add suggestion' })
	}
}

/**
 * Remove a suggestion (member action)
 */
export async function removeSuggestion(event: RequestEvent) {
	const supabase = createClient(event)
	const client = supabase as any
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return fail(401, { error: 'Not authenticated' })
	}

	const formData = await event.request.formData()
	const groupId = formData.get('groupId') as string
	const suggestionId = formData.get('suggestionId') as string

	try {
		// Check membership
		const membership = await getMembership(supabase, groupId, user.id)
		if (!membership) {
			return fail(403, { error: 'You must be a group member' })
		}

		// Get round and check status
		const { data: round } = await client
			.from('group_suggestion_rounds')
			.select('status')
			.eq('group_id', groupId)
			.single()

		if (round?.status === 'revealed') {
			return fail(400, { error: 'Suggestions are locked' })
		}

		// Delete (only if it belongs to the user)
		const { error } = await client
			.from('group_suggestions')
			.delete()
			.eq('id', suggestionId)
			.eq('user_id', user.id)

		if (error) throw error

		return { success: true, message: 'Suggestion removed' }
	} catch (error) {
		console.error('Error removing suggestion:', error)
		return fail(500, { error: 'Failed to remove suggestion' })
	}
}

/**
 * Update suggestion rank (member action)
 */
export async function updateSuggestionRank(event: RequestEvent) {
	const supabase = createClient(event)
	const client = supabase as any
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return fail(401, { error: 'Not authenticated' })
	}

	const formData = await event.request.formData()
	const groupId = formData.get('groupId') as string
	const suggestionId = formData.get('suggestionId') as string
	const newRank = parseInt(formData.get('newRank') as string, 10)

	if (newRank < 1 || newRank > 5) {
		return fail(400, { error: 'Rank must be between 1 and 5' })
	}

	try {
		// Check membership and round status
		const membership = await getMembership(supabase, groupId, user.id)
		if (!membership) {
			return fail(403, { error: 'You must be a group member' })
		}

		const { data: round } = await client
			.from('group_suggestion_rounds')
			.select('id, status')
			.eq('group_id', groupId)
			.single()

		if (round?.status === 'revealed') {
			return fail(400, { error: 'Suggestions are locked' })
		}

		// Check if new rank is taken by another suggestion
		const { data: existingRank } = await client
			.from('group_suggestions')
			.select('id')
			.eq('round_id', round.id)
			.eq('user_id', user.id)
			.eq('rank', newRank)
			.neq('id', suggestionId)
			.maybeSingle()

		if (existingRank) {
			return fail(400, { error: `Rank ${newRank} is already used` })
		}

		// Update
		const { error } = await client
			.from('group_suggestions')
			.update({ rank: newRank })
			.eq('id', suggestionId)
			.eq('user_id', user.id)

		if (error) throw error

		return { success: true, message: 'Rank updated' }
	} catch (error) {
		console.error('Error updating rank:', error)
		return fail(500, { error: 'Failed to update rank' })
	}
}

/**
 * Reveal suggestions and calculate results (admin action)
 */
export async function revealSuggestions(event: RequestEvent) {
	const supabase = createClient(event)
	const client = supabase as any
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return fail(401, { error: 'Not authenticated' })
	}

	const formData = await event.request.formData()
	const groupId = formData.get('groupId') as string

	try {
		// Check admin
		const membership = await getMembership(supabase, groupId, user.id)
		if (!membership || membership.role !== 'admin') {
			return fail(403, { error: 'Only admins can reveal suggestions' })
		}

		// Get round
		const { data: round } = await client
			.from('group_suggestion_rounds')
			.select('id, status')
			.eq('group_id', groupId)
			.single()

		if (!round) {
			return fail(400, { error: 'No suggestion round exists' })
		}

		if (round.status === 'revealed') {
			return fail(400, { error: 'Already revealed' })
		}

		// Get all suggestions for this round (using service role or bypassing RLS)
		// Since we're the admin, we need to fetch all users' suggestions
		// The server-side client should have access via service role
		const { data: allSuggestions } = await client
			.from('group_suggestions')
			.select('user_id, book_id, rank')
			.eq('round_id', round.id)

		if (!allSuggestions || allSuggestions.length === 0) {
			return fail(400, { error: 'No suggestions to reveal' })
		}

		// Get member count
		const { count: memberCount } = await client
			.from('group_members')
			.select('*', { count: 'exact', head: true })
			.eq('group_id', groupId)

		// Calculate scores
		const bookScores = calculateScores(allSuggestions, memberCount || 2)

		// Get top 5
		const top5 = bookScores.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5)

		// Insert results
		for (let i = 0; i < top5.length; i++) {
			const book = top5[i]
			await client.from('group_suggestion_results').insert({
				round_id: round.id,
				book_id: book.bookId,
				final_rank: i + 1,
				base_score: book.baseScore,
				overlap_bonus: book.overlapBonus,
				total_score: book.totalScore,
				member_count: book.memberCount
			})
		}

		// Update round status
		await client
			.from('group_suggestion_rounds')
			.update({ status: 'revealed', revealed_at: new Date().toISOString() })
			.eq('id', round.id)

		return { success: true, message: 'Suggestions revealed' }
	} catch (error) {
		console.error('Error revealing suggestions:', error)
		return fail(500, { error: 'Failed to reveal suggestions' })
	}
}

/**
 * Reopen suggestions (admin action) - clears all and starts fresh
 */
export async function reopenSuggestions(event: RequestEvent) {
	const supabase = createClient(event)
	const client = supabase as any
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return fail(401, { error: 'Not authenticated' })
	}

	const formData = await event.request.formData()
	const groupId = formData.get('groupId') as string

	try {
		// Check admin
		const membership = await getMembership(supabase, groupId, user.id)
		if (!membership || membership.role !== 'admin') {
			return fail(403, { error: 'Only admins can reopen suggestions' })
		}

		// Delete existing round (cascades to suggestions and results)
		await client.from('group_suggestion_rounds').delete().eq('group_id', groupId)

		// Create new round
		await client.from('group_suggestion_rounds').insert({
			group_id: groupId,
			status: 'open'
		})

		return { success: true, message: 'Suggestions reopened' }
	} catch (error) {
		console.error('Error reopening suggestions:', error)
		return fail(500, { error: 'Failed to reopen suggestions' })
	}
}

/**
 * Set a revealed book as current reading (admin action)
 */
export async function setRevealedBookAsCurrent(event: RequestEvent) {
	const supabase = createClient(event)
	const client = supabase as any
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return fail(401, { error: 'Not authenticated' })
	}

	const formData = await event.request.formData()
	const groupId = formData.get('groupId') as string
	const bookId = formData.get('bookId') as string

	try {
		// Check admin
		const membership = await getMembership(supabase, groupId, user.id)
		if (!membership || membership.role !== 'admin') {
			return fail(403, { error: 'Only admins can set current book' })
		}

		// Update group's current book
		const { error } = await client
			.from('groups')
			.update({ current_book_id: bookId })
			.eq('id', groupId)

		if (error) throw error

		return { success: true, message: 'Current book set' }
	} catch (error) {
		console.error('Error setting current book:', error)
		return fail(500, { error: 'Failed to set current book' })
	}
}

// --- Scoring Algorithm ---

interface SuggestionData {
	user_id: string
	book_id: string
	rank: number
}

interface BookScore {
	bookId: string
	baseScore: number
	overlapBonus: number
	totalScore: number
	memberCount: number
}

function calculateScores(suggestions: SuggestionData[], totalMembers: number): BookScore[] {
	// Group suggestions by book
	const bookMap = new Map<string, { ranks: number[]; userIds: Set<string> }>()

	for (const s of suggestions) {
		if (!bookMap.has(s.book_id)) {
			bookMap.set(s.book_id, { ranks: [], userIds: new Set() })
		}
		const entry = bookMap.get(s.book_id)!
		entry.ranks.push(s.rank)
		entry.userIds.add(s.user_id)
	}

	const results: BookScore[] = []

	for (const [bookId, data] of bookMap) {
		// Base score: sum of (6 - rank) for each suggestion
		// Rank 1 = 5pts, Rank 2 = 4pts, etc.
		const baseScore = data.ranks.reduce((sum, rank) => sum + (6 - rank), 0)

		// Overlap bonus
		const memberCount = data.userIds.size
		let overlapBonus = 0

		if (memberCount > 1) {
			if (totalMembers === 2) {
				// 2-member groups: +5 if both have the book
				overlapBonus = 5
			} else {
				// 3+ member groups: +N where N = number of members who included the book
				overlapBonus = memberCount
			}
		}

		results.push({
			bookId,
			baseScore,
			overlapBonus,
			totalScore: baseScore + overlapBonus,
			memberCount
		})
	}

	return results
}
