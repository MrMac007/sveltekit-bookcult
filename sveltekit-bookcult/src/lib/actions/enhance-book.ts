'use server'

import { createClient } from '$lib/supabase/server'
import { enhanceBookMetadata, validateEnhancedMetadata } from '$lib/ai/book-enhancer'
import { revalidatePath } from 'next/cache'

export interface EnhanceBookResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Server action to enhance a book's metadata using AI
 * @param bookId - The database UUID of the book to enhance
 */
export async function enhanceBook(bookId: string): Promise<EnhanceBookResult> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to enhance books',
      }
    }

    // Fetch the current book data
    const { data: book, error: fetchError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (fetchError || !book) {
      if (fetchError) {
        console.error('[enhance-book] Error fetching book:', fetchError)
      }
      return {
        success: false,
        error: 'Book not found',
      }
    }

    // Check if already enhanced
    if (book.ai_enhanced) {
      return {
        success: false,
        error: 'This book has already been AI-enhanced',
      }
    }

    // Call AI enhancement
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

    // Validate the enhanced metadata
    if (!validateEnhancedMetadata(enhanced)) {
      console.error('[enhance-book] Enhanced metadata failed validation')
      return {
        success: false,
        error: 'AI enhancement produced invalid metadata',
      }
    }

    // Update the book in the database
    const { error: updateError } = await supabase
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

    // Revalidate the book page to show updated data
    revalidatePath(`/book/${book.google_books_id}`)
    revalidatePath('/discover')
    revalidatePath('/wishlist')

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
