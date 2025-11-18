import { createClient } from '$lib/supabase/server'
import { enhanceBookMetadata, validateEnhancedMetadata } from '$lib/ai/book-enhancer'
import type { RequestEvent } from '@sveltejs/kit'

export interface EnhanceBookResult {
  success: boolean
  error?: string
  message?: string
}

export async function enhanceBook(event: RequestEvent, bookId: string): Promise<EnhanceBookResult> {
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

    const enhanced = await enhanceBookMetadata({
      title: book.title,
      authors: book.authors || [],
      description: book.description,
      categories: book.categories || [],
      published_date: book.published_date,
      publisher: book.publisher,
      isbn_13: book.isbn_13,
      isbn_10: book.isbn_10,
    })

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
