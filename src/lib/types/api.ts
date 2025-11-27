// Google Books API types
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
  google_books_id?: string
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
}

// Book card data type for UI components
export interface BookCardData {
  id: string
  google_books_id: string | null
  title: string
  authors: string[]
  cover_url?: string | null
  description?: string | null
  published_date?: string | null
  page_count?: number | null
  categories?: string[] | null
  isbn_10?: string | null
  isbn_13?: string | null
}

// Open Library API types
export interface OpenLibraryWork {
  key: string
  title: string
  authors?: Array<{
    author: {
      key: string
    }
    type: {
      key: string
    }
  }>
  covers?: number[]
  first_publish_year?: number
  isbn?: string[]
  subject?: string[]
}

export interface OpenLibraryResponse {
  numFound: number
  docs: OpenLibraryWork[]
}
