import { createClient } from '$lib/supabase/server'
import { enhanceBookMetadata, validateEnhancedMetadata, type BookEnhancementInput } from '$lib/ai/book-enhancer'
import { openLibraryAPI } from '$lib/api/open-library'
import type { RequestEvent } from '@sveltejs/kit'

export interface EnhanceBookResult {
  success: boolean
  error?: string
  message?: string
}

function mergeWithFallback<T>(value: T | undefined, fallback: T | undefined): T | undefined {
  return value !== undefined && value !== null && value !== '' ? value : fallback
}

function cleanOverrides(overrides?: Partial<BookEnhancementInput>): Partial<BookEnhancementInput> | undefined {
  if (!overrides) return undefined

  const cleaned: Partial<BookEnhancementInput> = {}

  if (overrides.title && overrides.title.trim()) cleaned.title = overrides.title.trim()
  if (overrides.authors && overrides.authors.length > 0) {
    cleaned.authors = overrides.authors.map((a) => a.trim()).filter(Boolean)
  }
  if (overrides.description && overrides.description.trim()) cleaned.description = overrides.description.trim()
  if (overrides.categories && overrides.categories.length > 0) {
    cleaned.categories = overrides.categories.map((c) => c.trim()).filter(Boolean)
  }
  if (overrides.published_date && overrides.published_date.trim()) cleaned.published_date = overrides.published_date.trim()
  if (overrides.publisher && overrides.publisher.trim()) cleaned.publisher = overrides.publisher.trim()
  if (overrides.isbn_13 && overrides.isbn_13.trim()) cleaned.isbn_13 = overrides.isbn_13.trim()
  if (overrides.isbn_10 && overrides.isbn_10.trim()) cleaned.isbn_10 = overrides.isbn_10.trim()

  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

export async function enhanceBook(
  event: RequestEvent,
  bookId: string,
  overrides?: Partial<BookEnhancementInput>
): Promise<EnhanceBookResult> {
  try {
    const supabase = createClient(event)
    const db = supabase as any

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to enhance books',
      }
    }

    const { data: bookData, error: fetchError } = await db
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (fetchError || !bookData) {
      if (fetchError) {
        console.error('[enhance-book] Error fetching book:', fetchError)
      }
      return {
        success: false,
        error: 'Book not found',
      }
    }

    const book = bookData as any

    if (book.ai_enhanced) {
      return {
        success: false,
        error: 'This book has already been AI-enhanced',
      }
    }

    let baseInput: BookEnhancementInput = {
      title: book.title,
      authors: book.authors || [],
      description: book.description,
      categories: book.categories || [],
      published_date: book.published_date,
      publisher: book.publisher,
      isbn_13: book.isbn_13,
      isbn_10: book.isbn_10,
    }

    // Fill missing fields from Open Library (best-effort)
    if (book.open_library_key) {
      try {
        const olBook = await openLibraryAPI.getBookDetails(book.open_library_key)
        if (olBook) {
          baseInput = {
            title: mergeWithFallback(baseInput.title, olBook.title) || baseInput.title,
            authors: baseInput.authors?.length ? baseInput.authors : olBook.authors || [],
            description: mergeWithFallback(baseInput.description, olBook.description),
            categories: baseInput.categories?.length ? baseInput.categories : olBook.categories || [],
            published_date: mergeWithFallback(baseInput.published_date, olBook.published_date),
            publisher: mergeWithFallback(baseInput.publisher, olBook.publisher),
            isbn_13: mergeWithFallback(baseInput.isbn_13, olBook.isbn_13),
            isbn_10: mergeWithFallback(baseInput.isbn_10, olBook.isbn_10),
          }
        }
      } catch (error) {
        console.warn('[enhance-book] Failed to fetch Open Library details, continuing with local data')
      }
    }

    const cleanedOverrides = cleanOverrides(overrides)
    if (cleanedOverrides) {
      baseInput = {
        ...baseInput,
        ...cleanedOverrides,
      }
    }

    const enhanced = await enhanceBookMetadata(baseInput)

    if (!validateEnhancedMetadata(enhanced)) {
      console.error('[enhance-book] Enhanced metadata failed validation')
      return {
        success: false,
        error: 'AI enhancement produced invalid metadata',
      }
    }

    const { error: updateError } = await db
      .from('books')
      .update({
        categories: enhanced.categories,
        description: enhanced.description,
        published_date: enhanced.published_date,
        publisher: enhanced.publisher || book.publisher,
        ai_enhanced: true,
        ai_enhanced_at: new Date().toISOString(),
      })
      .eq('id', bookId)

    if (updateError) {
      console.error('[enhance-book] Error updating book:', updateError)
      return {
        success: false,
        error: 'Failed to save enhanced metadata',
      }
    }

    return {
      success: true,
      message: 'Book metadata successfully enhanced with AI',
    }
  } catch (error) {
    console.error('[enhance-book] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enhance book',
    }
  }
}
