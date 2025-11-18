import type { GoogleBooksResponse, GoogleBooksVolume, Book } from '$lib/types/api'

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'

/**
 * Strip HTML tags from a string and decode HTML entities
 */
function stripHtmlTags(html: string | undefined): string | undefined {
  if (!html) return html

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')

  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

export class GoogleBooksAPI {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_BOOKS_API_KEY || ''
  }

  /**
   * Search for books by query string
   * @param query - The search query (title search)
   * @param maxResults - Maximum number of results to return
   * @param author - Optional author name to filter by
   */
  async searchBooks(query: string, maxResults: number = 40, author?: string): Promise<GoogleBooksResponse> {
    const url = new URL(GOOGLE_BOOKS_API_URL)

    // Build search query - use intitle for targeted title search
    // When author is provided, combine both criteria
    let searchQuery = `intitle:${query}`
    if (author && author.trim()) {
      searchQuery += `+inauthor:${author.trim()}`
    }

    url.searchParams.set('q', searchQuery)
    url.searchParams.set('maxResults', maxResults.toString())
    url.searchParams.set('orderBy', 'relevance')
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey)
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get a specific book by Google Books ID
   */
  async getBookById(id: string): Promise<GoogleBooksVolume> {
    const url = new URL(`${GOOGLE_BOOKS_API_URL}/${id}`)
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey)
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Search books by ISBN
   */
  async searchByISBN(isbn: string): Promise<GoogleBooksResponse> {
    return this.searchBooks(`isbn:${isbn}`, 1)
  }

  /**
   * Convert Google Books volume to our Book format
   */
  normalizeVolume(volume: GoogleBooksVolume): any {
    const info = volume.volumeInfo
    const isbn13 = info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier
    const isbn10 = info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier

    // Prefer larger thumbnail, fall back to small
    const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail

    return {
      id: volume.id,
      google_books_id: volume.id,
      isbn_13: isbn13,
      isbn_10: isbn10,
      title: info.title,
      authors: info.authors || [],
      publisher: info.publisher,
      published_date: info.publishedDate,
      description: stripHtmlTags(info.description),
      page_count: info.pageCount,
      cover_url: coverUrl,
      categories: info.categories || [],
      language: info.language,
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
    }
  }

  /**
   * Search and normalize results
   * @param query - Search query string
   * @param maxResults - Number of results to return after scoring (default: 20)
   * @param author - Optional author name to filter by
   */
  async searchAndNormalize(query: string, maxResults: number = 20, author?: string): Promise<any[]> {
    // Fetch 2x maxResults to have more to score and filter from
    const response = await this.searchBooks(query, maxResults * 2, author)

    if (!response.items || response.items.length === 0) {
      return []
    }

    // Normalize all volumes
    const normalized = response.items.map(item => this.normalizeVolume(item))

    // Normalize query for comparison (lowercase, trim)
    const normalizedQuery = query.toLowerCase().trim()
    const normalizedAuthor = author ? author.toLowerCase().trim() : ''

    // Calculate match scores for each book
    const scoredBooks = normalized.map(book => {
      const titleLower = (book.title || '').toLowerCase()
      let matchScore = 0

      // Title scoring
      // Best match: title starts with exact query
      if (titleLower.startsWith(normalizedQuery)) {
        matchScore = 1000
      }
      // Good match: after removing leading "the", "a", "an", title starts with query
      else {
        const titleWithoutArticle = titleLower.replace(/^(the|a|an)\s+/, '')
        if (titleWithoutArticle.startsWith(normalizedQuery)) {
          matchScore = 900
        }
        // Decent match: contains the query somewhere in title
        else if (titleLower.includes(normalizedQuery)) {
          // Check if it's a substring match in a natural position (word boundary)
          const queryWords = normalizedQuery.split(/\s+/)
          const titleWords = titleLower.split(/\s+/)

          // Find if query appears as consecutive words in title
          for (let i = 0; i <= titleWords.length - queryWords.length; i++) {
            const titleSlice = titleWords.slice(i, i + queryWords.length).join(' ')
            if (titleSlice === normalizedQuery) {
              matchScore = 500 - (i * 50) // Earlier in title = better score
              break
            }
          }

          if (matchScore === 0) {
            matchScore = 100 // Weak match - words scattered in title
          }
        }
      }

      // Author scoring boost - only if author filter is provided
      if (normalizedAuthor && book.authors && book.authors.length > 0) {
        const authorsLower = book.authors.map((a: string) => a.toLowerCase())

        // Check for exact author match
        const hasExactMatch = authorsLower.some((a: string) => a === normalizedAuthor)
        if (hasExactMatch) {
          matchScore += 500 // Big boost for exact author match
        } else {
          // Check for partial author match (e.g., "sarah" matches "Sarah J. Maas")
          const hasPartialMatch = authorsLower.some((a: string) => {
            // Split author name into parts and check if any part starts with the query
            const authorParts = a.split(/\s+/)
            return authorParts.some(part => part.startsWith(normalizedAuthor))
          })

          if (hasPartialMatch) {
            matchScore += 400 // Good boost for partial author match
          } else {
            // Check if author query appears anywhere in author name
            const hasContainMatch = authorsLower.some((a: string) => a.includes(normalizedAuthor))
            if (hasContainMatch) {
              matchScore += 200 // Moderate boost for containing match
            }
          }
        }
      }

      return { ...book, matchScore }
    })

    // Sort by match score first, then by popularity
    const sorted = scoredBooks.sort((a, b) => {
      // 1. Sort by match score (higher is better)
      if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore

      // 2. Then sort by popularity: books with ratings come first
      const aRatings = a.ratingsCount || 0
      const bRatings = b.ratingsCount || 0

      if (aRatings > 0 && bRatings === 0) return -1
      if (aRatings === 0 && bRatings > 0) return 1

      // 3. Then sort by number of ratings (more popular)
      if (aRatings !== bRatings) return bRatings - aRatings

      // 4. If same ratings count, sort by average rating
      const aAvg = a.averageRating || 0
      const bAvg = b.averageRating || 0
      return bAvg - aAvg
    })

    // Return top maxResults after scoring and sorting
    return sorted.slice(0, maxResults)
  }
}

// Export a singleton instance
export const googleBooksAPI = new GoogleBooksAPI()
