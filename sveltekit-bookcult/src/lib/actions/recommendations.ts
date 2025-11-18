
import { generateBookRecommendations, BookRecommendation } from '$lib/ai/gemini'
import { searchBooks } from '$lib/api/book-cache'
import { Recommendation, RecommendationsResponse } from '$lib/types/recommendations'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RecommendationsCache {
  recommendations: Recommendation[]
  generated_at: string
  expires_at: string
  wishlist_adds_since_generation: number
}

const CACHE_DURATION_DAYS = 5
const MIN_AUTO_REFRESH_DAYS = 7
const WISHLIST_ADDS_THRESHOLD = 3

/**
 * Get book recommendations for the current user
 * Uses smart caching:
 * - Cache for 5 days
 * - Auto-refresh if 3+ books added to wishlist since last generation
 * - Minimum 1 week between auto-refreshes
 */
export async function getRecommendations(supabase: SupabaseClient, forceRefresh = false): Promise<RecommendationsResponse> {
  try {
    // Get current user
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

    // Check for valid cache (unless force refresh)
    if (!forceRefresh) {
      const cachedRecs = await getValidCache(supabase, user.id)
      if (cachedRecs) {
        return {
          recommendations: cachedRecs,
          fromCache: true,
        }
      }
    }

    // Generate new recommendations
    const newRecommendations = await generateNewRecommendations(supabase, user.id)

    if (newRecommendations.length === 0) {
      // Check if the issue is lack of ratings or API failure
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

/**
 * Track when a recommended book is added to wishlist
 * Increments the counter to potentially trigger auto-refresh
 */
export async function trackWishlistAdd(supabase: SupabaseClient, bookId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Get current cache
    const { data: cache } = await supabase
      .from('recommendations_cache')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!cache) return

    // Check if this book was in the recommendations
    const recommendations = cache.recommendations as Recommendation[]
    const wasRecommended = recommendations.some((rec) => rec.google_books_id === bookId)

    if (!wasRecommended) return

    // Increment wishlist adds counter
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

/**
 * Get valid cache if it exists
 */
async function getValidCache(
  supabase: any,
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
  const lastAutoRefresh = cache.last_auto_refresh_at
    ? new Date(cache.last_auto_refresh_at)
    : null

  // Check if cache is expired
  if (now > expiresAt) return null

  // Check if we should auto-refresh based on wishlist adds
  if (cache.wishlist_adds_since_generation >= WISHLIST_ADDS_THRESHOLD) {
    // Only auto-refresh if it's been at least 1 week since last auto-refresh
    const daysSinceLastRefresh = lastAutoRefresh
      ? (now.getTime() - lastAutoRefresh.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    if (daysSinceLastRefresh >= MIN_AUTO_REFRESH_DAYS) {
      return null // Trigger new recommendations
    }
  }

  return cache.recommendations as Recommendation[]
}

/**
 * Generate new recommendations using Gemini
 */
async function generateNewRecommendations(
  supabase: any,
  userId: string
): Promise<Recommendation[]> {
  // Early validation: Check if user has enough highly-rated books
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

  // Get user's top-rated books (4+ stars)
  const { data: ratings, error: ratingsError } = await supabase
    .from('ratings')
    .select('rating, books(google_books_id, title, authors, categories)')
    .eq('user_id', userId)
    .gte('rating', 4.0)
    .order('rating', { ascending: false })
    .limit(20) // Use up to 20 top-rated books for context

  if (ratingsError || !ratings || ratings.length < 3) {
    if (ratingsError) {
      console.error('[Recommendations] Error fetching ratings:', ratingsError)
    }
    return [] // Need at least 3 highly-rated books
  }

  // Get user's wishlist and completed books to exclude
  const [{ data: wishlistBooks }, { data: completedBooks }] = await Promise.all([
    supabase
      .from('wishlists')
      .select('books(google_books_id)')
      .eq('user_id', userId),
    supabase
      .from('completed_books')
      .select('books(google_books_id)')
      .eq('user_id', userId),
  ])

  const excludeIds = new Set<string>([
    ...ratings.map((r: any) => r.books.google_books_id),
    ...(wishlistBooks || []).map((w: any) => w.books.google_books_id),
    ...(completedBooks || []).map((c: any) => c.books.google_books_id),
  ])

  // Generate recommendations using Gemini
  const topRatedBooks = ratings.map((r: any) => ({
    title: r.books.title,
    authors: r.books.authors,
    categories: r.books.categories,
    rating: r.rating,
  }))

  const aiRecommendations = await generateBookRecommendations({
    userId,
    topRatedBooks,
  })

  // Look up each recommended book via Google Books API
  const enrichedRecommendations: Recommendation[] = []

  for (const rec of aiRecommendations) {
    try {
      // Search for the book by title and author
      const searchQuery = `${rec.title} ${rec.authors[0]}`
      const results = await searchBooks(searchQuery, 3)

      if (!results || results.length === 0) {
        continue // Skip if not found
      }

      // Find the best match (exact title match preferred)
      const book = results.find(
        (b) => b.title.toLowerCase() === rec.title.toLowerCase()
      ) || results[0]

      if (!book.google_books_id || excludeIds.has(book.google_books_id)) {
        continue // Skip if no ID or already in user's lists
      }

      enrichedRecommendations.push({
        google_books_id: book.google_books_id,
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

  // Cache the recommendations
  if (enrichedRecommendations.length > 0) {
    await cacheRecommendations(supabase, userId, enrichedRecommendations)
  }

  return enrichedRecommendations
}

/**
 * Save recommendations to cache
 */
async function cacheRecommendations(
  supabase: any,
  userId: string,
  recommendations: Recommendation[]
): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000)

  // Check if we're doing an auto-refresh
  const { data: existingCache } = await supabase
    .from('recommendations_cache')
    .select('wishlist_adds_since_generation')
    .eq('user_id', userId)
    .single()

  const isAutoRefresh =
    existingCache && existingCache.wishlist_adds_since_generation >= WISHLIST_ADDS_THRESHOLD

  const cacheData = {
    user_id: userId,
    recommendations,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    wishlist_adds_since_generation: 0, // Reset counter
    last_auto_refresh_at: isAutoRefresh ? now.toISOString() : null,
  }

  // Upsert cache
  await supabase
    .from('recommendations_cache')
    .upsert(cacheData, { onConflict: 'user_id' })
}
