// @ts-nocheck
import { createClient } from '$lib/supabase/server'
import type { RequestEvent } from '@sveltejs/kit'
import { generateBookRecommendations, type BookRecommendation } from '$lib/ai/gemini'
import { searchBooks } from '$lib/api/book-cache'
import type { Recommendation, RecommendationsResponse } from '$lib/types/recommendations'

interface RecommendationsCache {
  recommendations: Recommendation[]
  generated_at: string
  expires_at: string
  wishlist_adds_since_generation: number
  last_auto_refresh_at?: string | null
}

const CACHE_DURATION_DAYS = 5
const MIN_AUTO_REFRESH_DAYS = 7
const WISHLIST_ADDS_THRESHOLD = 3

export async function getRecommendations(
  event: RequestEvent,
  forceRefresh = false
): Promise<RecommendationsResponse> {
  try {
    const supabase = createClient(event)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        recommendations: [],
        fromCache: false,
        error: 'Not authenticated',
      }
    }

    if (!forceRefresh) {
      const cachedRecs = await getValidCache(supabase, user.id)
      if (cachedRecs) {
        return {
          recommendations: cachedRecs,
          fromCache: true,
        }
      }
    }

    const newRecommendations = await generateNewRecommendations(supabase, user.id)

    if (newRecommendations.length === 0) {
      const { count: highRatingCount } = await supabase
        .from('ratings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('rating', 4.0)

      if (!highRatingCount || highRatingCount < 3) {
        return {
          recommendations: [],
          fromCache: false,
          error: `Rate at least 3 books with 4+ stars to get personalized recommendations. You currently have ${highRatingCount || 0}.`,
        }
      } else {
        return {
          recommendations: [],
          fromCache: false,
          error: 'Unable to generate recommendations at this time. Please try again later.',
        }
      }
    }

    return {
      recommendations: newRecommendations,
      fromCache: false,
    }
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return {
      recommendations: [],
      fromCache: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendations',
    }
  }
}

export async function trackWishlistAdd(event: RequestEvent, bookId: string): Promise<void> {
  try {
    const supabase = createClient(event)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: cache } = await supabase
      .from('recommendations_cache')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!cache) return

    const recommendations = cache.recommendations as Recommendation[]
    const wasRecommended = recommendations.some((rec) => rec.open_library_key === bookId)

    if (!wasRecommended) return

    await supabase
      .from('recommendations_cache')
      .update({
        wishlist_adds_since_generation: cache.wishlist_adds_since_generation + 1,
      })
      .eq('user_id', user.id)
  } catch (error) {
    console.error('Error tracking wishlist add:', error)
  }
}

async function getValidCache(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Recommendation[] | null> {
  const { data: cache, error } = await supabase
    .from('recommendations_cache')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !cache) return null

  const now = new Date()
  const expiresAt = new Date(cache.expires_at)
  const lastAutoRefresh = cache.last_auto_refresh_at ? new Date(cache.last_auto_refresh_at) : null

  if (now > expiresAt) return null

  if (cache.wishlist_adds_since_generation >= WISHLIST_ADDS_THRESHOLD) {
    const daysSinceLastRefresh = lastAutoRefresh
      ? (now.getTime() - lastAutoRefresh.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    if (daysSinceLastRefresh >= MIN_AUTO_REFRESH_DAYS) {
      return null
    }
  }

  return (cache as RecommendationsCache).recommendations
}

async function generateNewRecommendations(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Recommendation[]> {
  const { count: highRatingCount, error: countError } = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('rating', 4.0)

  if (countError) {
    console.error('[Recommendations] Error checking rating count:', countError)
    return []
  }

  if (!highRatingCount || highRatingCount < 3) {
    return []
  }

  const { data: ratings, error: ratingsError } = await supabase
    .from('ratings')
    .select('rating, books(id, open_library_key, google_books_id, title, authors, categories)')
    .eq('user_id', userId)
    .gte('rating', 4.0)
    .order('rating', { ascending: false })
    .limit(20)

  if (ratingsError || !ratings || ratings.length < 3) {
    if (ratingsError) {
      console.error('[Recommendations] Error fetching ratings:', ratingsError)
    }
    return []
  }

  // Filter out ratings where book data is missing
  const validRatings = ratings.filter((r: any) => r.books?.title && r.books?.authors)
  if (validRatings.length < 3) {
    console.error('[Recommendations] Not enough valid rated books with complete data')
    return []
  }

  const [{ data: wishlistBooks }, { data: completedBooks }] = await Promise.all([
    supabase.from('wishlists').select('books(id, open_library_key, google_books_id)').eq('user_id', userId),
    supabase.from('completed_books').select('books(id, open_library_key, google_books_id)').eq('user_id', userId),
  ])

  // Collect all book identifiers to exclude (filter out null/undefined)
  const excludeIds = new Set<string>()
  for (const r of validRatings) {
    const book = r.books as any
    if (book?.id) excludeIds.add(book.id)
    if (book?.open_library_key) excludeIds.add(book.open_library_key)
    if (book?.google_books_id) excludeIds.add(book.google_books_id)
  }
  for (const w of wishlistBooks || []) {
    const book = (w as any).books
    if (book?.id) excludeIds.add(book.id)
    if (book?.open_library_key) excludeIds.add(book.open_library_key)
    if (book?.google_books_id) excludeIds.add(book.google_books_id)
  }
  for (const c of completedBooks || []) {
    const book = (c as any).books
    if (book?.id) excludeIds.add(book.id)
    if (book?.open_library_key) excludeIds.add(book.open_library_key)
    if (book?.google_books_id) excludeIds.add(book.google_books_id)
  }

  const topRatedBooks = validRatings.map((r: any) => ({
    title: r.books.title,
    authors: r.books.authors || [],
    categories: r.books.categories || [],
    rating: r.rating,
  }))

  console.log('[Recommendations] Calling AI with', topRatedBooks.length, 'rated books')

  let aiRecommendations: BookRecommendation[]
  try {
    aiRecommendations = await generateBookRecommendations({
      userId,
      topRatedBooks,
    })
    console.log('[Recommendations] AI returned', aiRecommendations.length, 'recommendations')
  } catch (aiError) {
    console.error('[Recommendations] AI generation failed:', aiError)
    // Re-throw with details so the error message shows in the UI
    throw new Error(`AI generation failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`)
  }

  const enrichedRecommendations: Recommendation[] = []

  for (const rec of aiRecommendations) {
    try {
      if (!rec.authors?.length) continue
      const searchQuery = `${rec.title} ${rec.authors[0]}`
      const results = await searchBooks(searchQuery, supabase, 3)

      if (!results || results.length === 0) {
        continue
      }

      const book =
        results.find((b) => b.title.toLowerCase() === rec.title.toLowerCase()) || results[0]

      // Check if this book should be excluded (already rated/in wishlist/completed)
      const isExcluded =
        (book.id && excludeIds.has(book.id)) ||
        (book.open_library_key && excludeIds.has(book.open_library_key)) ||
        (book.google_books_id && excludeIds.has(book.google_books_id))

      if (!book.open_library_key || isExcluded) {
        continue
      }

      enrichedRecommendations.push({
        open_library_key: book.open_library_key,
        title: book.title,
        authors: book.authors,
        cover_url: book.cover_url,
        reason: rec.reason,
        blurb: rec.blurb,
      })

      if (enrichedRecommendations.length >= 5) break
    } catch (error) {
      console.error(`Error fetching book "${rec.title}":`, error)
      continue
    }
  }

  if (enrichedRecommendations.length > 0) {
    await cacheRecommendations(supabase, userId, enrichedRecommendations)
  }

  return enrichedRecommendations
}

async function cacheRecommendations(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  recommendations: Recommendation[]
) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000)

  const { data: existingCache } = await supabase
    .from('recommendations_cache')
    .select('wishlist_adds_since_generation')
    .eq('user_id', userId)
    .single()

  const isAutoRefresh =
    existingCache && existingCache.wishlist_adds_since_generation >= WISHLIST_ADDS_THRESHOLD

  await supabase
    .from('recommendations_cache')
    .upsert(
      {
        user_id: userId,
        recommendations,
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        wishlist_adds_since_generation: 0,
        last_auto_refresh_at: isAutoRefresh ? now.toISOString() : existingCache?.last_auto_refresh_at || null,
      },
      { onConflict: 'user_id' }
    )
}
