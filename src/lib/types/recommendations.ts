export interface Recommendation {
  google_books_id: string
  title: string
  authors: string[]
  cover_url?: string
  reason: string
  blurb: string
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
  fromCache: boolean
  error?: string
}
