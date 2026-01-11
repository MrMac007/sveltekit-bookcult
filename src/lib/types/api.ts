// Legacy Google Books types (kept for reference, no longer used)
export interface GoogleBooksVolume {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
    pageCount?: number
    categories?: string[]
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    language?: string
    averageRating?: number
    ratingsCount?: number
  }
}

export interface GoogleBooksResponse {
  kind: string
  totalItems: number
  items?: GoogleBooksVolume[]
}

// Normalized book type for our database
export interface Book {
  id?: string
  google_books_id?: string  // Legacy field, no longer used for new books
  open_library_key?: string
  isbn_13?: string
  isbn_10?: string
  title: string
  authors: string[]
  publisher?: string
  published_date?: string
  description?: string
  page_count?: number
  cover_url?: string
  categories: string[]
  language?: string
  last_updated?: string
  ai_enhanced?: boolean
  ai_enhanced_at?: string
  // Open Library engagement fields
  edition_count?: number
  ratings_average?: number
  ratings_count?: number
  want_to_read_count?: number
  currently_reading_count?: number
  already_read_count?: number
  popularity_score?: number
  first_publish_year?: number
}

// Book card data type for UI components
export interface BookCardData {
  id: string
  google_books_id?: string | null
  open_library_key?: string | null
  title: string
  authors: string[]
  cover_url?: string | null
  description?: string | null
  published_date?: string | null
  page_count?: number | null
  categories?: string[] | null
  isbn_10?: string | null
  isbn_13?: string | null
  /** Source of the book data - for debugging/testing */
  source?: 'openlib' | 'google' | 'database'
}

// Re-export Open Library types from the API module
export type {
  OpenLibrarySearchDoc,
  OpenLibrarySearchResponse,
  OpenLibraryWork,
  OpenLibraryAuthor,
  OpenLibraryEdition,
  NormalizedBook as OpenLibraryNormalizedBook
} from '$lib/api/open-library';
