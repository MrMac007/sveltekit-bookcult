export interface Recommendation {
  open_library_key: string
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
