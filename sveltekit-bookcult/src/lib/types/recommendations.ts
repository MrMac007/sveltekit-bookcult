/**
 * Centralized type definitions for the AI recommendations system
 */

/**
 * A single book recommendation with AI-generated reason and blurb
 */
export interface Recommendation {
  google_books_id: string
  title: string
  authors: string[]
  cover_url?: string
  reason: string
  blurb: string
}

/**
 * Cached recommendations stored in database
 * (Alias for Recommendation - they have the same structure)
 */
export type CachedRecommendation = Recommendation

/**
 * Response from getRecommendations server action
 */
export interface RecommendationsResponse {
  recommendations: Recommendation[]
  fromCache: boolean
  error?: string
}
