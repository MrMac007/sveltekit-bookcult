// AI-powered book metadata enhancement using Google Gemini
// Normalizes book data to ensure consistency regardless of source

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { Book } from '$lib/types/api'

export interface EnhancedBookMetadata {
  categories: string[] // 2-3 consistent genre tags
  description: string // Clean 150-200 word blurb
  published_date: string // Original first publication year (YYYY format)
  publisher?: string // Normalized publisher name
}

export interface BookEnhancementInput {
  title: string
  authors: string[]
  description?: string
  categories?: string[]
  published_date?: string
  publisher?: string
  isbn_13?: string
  isbn_10?: string
}

/**
 * Enhance book metadata using Gemini AI
 * Generates consistent, normalized metadata for books
 */
export async function enhanceBookMetadata(
  book: BookEnhancementInput
): Promise<EnhancedBookMetadata> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured')
  }

  const prompt = buildEnhancementPrompt(book)

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent metadata
    })

    // Parse the JSON response
    const enhanced = parseEnhancementResponse(result.text)
    return enhanced
  } catch (error) {
    console.error('[AI-Enhancer] Error enhancing book metadata:', error)
    throw new Error('Failed to enhance book metadata with AI')
  }
}

/**
 * Build the prompt for Gemini to enhance book metadata
 */
function buildEnhancementPrompt(book: BookEnhancementInput): string {
  return `You are a book metadata expert. Your task is to normalize and enhance the following book's metadata to ensure consistency and accuracy.

BOOK INFORMATION:
Title: ${book.title}
Authors: ${book.authors.join(', ')}
${book.description ? `Current Description: ${book.description}` : 'Description: Not provided'}
${book.categories ? `Current Categories: ${book.categories.join(', ')}` : 'Categories: Not provided'}
${book.published_date ? `Current Published Date: ${book.published_date}` : 'Published Date: Not provided'}
${book.publisher ? `Current Publisher: ${book.publisher}` : 'Publisher: Not provided'}
${book.isbn_13 ? `ISBN-13: ${book.isbn_13}` : ''}
${book.isbn_10 ? `ISBN-10: ${book.isbn_10}` : ''}

YOUR TASK:
Generate normalized, consistent metadata for this book following these strict requirements:

1. CATEGORIES (2-3 genre tags only):
   - Provide exactly 2-3 primary genre tags
   - Use standard genres: Fiction, Fantasy, Science Fiction, Romance, Mystery, Thriller, Horror, Historical Fiction, Literary Fiction, Young Adult, Classics, Non-Fiction, Biography, History, Self-Help, Business, Science, Philosophy, etc.
   - Be specific but not overly niche (e.g., "Fantasy" not "Epic Fantasy Romance")
   - If this is Young Adult, include that as one tag

2. DESCRIPTION (150-200 words):
   - Write a clean, engaging book blurb
   - Focus on the main plot/themes without spoilers
   - Keep it between 150-200 words exactly
   - No HTML tags, no special formatting
   - Make it compelling and informative

3. PUBLISHED_DATE (YYYY format):
   - Find the ORIGINAL first publication year (not reprints or special editions)
   - Format as 4-digit year only (e.g., "1960" not "1960-07-11")
   - If exact year unknown, provide best estimate

4. PUBLISHER (optional):
   - Provide the major publisher name (normalized)
   - Use standard publisher names (e.g., "Penguin Random House" not "Penguin Random House LLC")
   - If unknown or unclear, omit this field

RESPOND IN VALID JSON FORMAT ONLY (no markdown, no code blocks):
{
  "categories": ["Genre1", "Genre2", "Genre3"],
  "description": "Your 150-200 word book description here...",
  "published_date": "YYYY",
  "publisher": "Publisher Name"
}

IMPORTANT: Respond with ONLY the JSON object, nothing else. Ensure the description is between 150-200 words.`
}

/**
 * Parse Gemini's response and extract enhanced metadata
 */
function parseEnhancementResponse(responseText: string): EnhancedBookMetadata {
  try {
    // Remove markdown code blocks if present
    let cleanedText = responseText.trim()
    cleanedText = cleanedText.replace(/^```json\s*/i, '')
    cleanedText = cleanedText.replace(/^```\s*/i, '')
    cleanedText = cleanedText.replace(/```\s*$/i, '')
    cleanedText = cleanedText.trim()

    const parsed = JSON.parse(cleanedText)

    // Validate required fields
    if (!Array.isArray(parsed.categories) || parsed.categories.length < 2 || parsed.categories.length > 3) {
      throw new Error('Invalid categories: must be array of 2-3 items')
    }

    if (!parsed.description || typeof parsed.description !== 'string') {
      throw new Error('Invalid description: must be a string')
    }

    // Validate description length (150-200 words)
    const wordCount = parsed.description.split(/\s+/).length
    if (wordCount < 140 || wordCount > 220) {
      console.warn(`[AI-Enhancer] Description word count (${wordCount}) outside ideal range (150-200)`)
    }

    if (!parsed.published_date || typeof parsed.published_date !== 'string') {
      throw new Error('Invalid published_date: must be a string')
    }

    // Validate year format (YYYY)
    if (!/^\d{4}$/.test(parsed.published_date)) {
      throw new Error('Invalid published_date format: must be YYYY')
    }

    return {
      categories: parsed.categories.slice(0, 3), // Ensure max 3
      description: parsed.description.trim(),
      published_date: parsed.published_date,
      publisher: parsed.publisher ? String(parsed.publisher).trim() : undefined,
    }
  } catch (error) {
    console.error('[AI-Enhancer] Error parsing Gemini response:', error)
    console.error('[AI-Enhancer] Raw response:', responseText)
    throw new Error('Failed to parse AI enhancement response')
  }
}

/**
 * Validate that enhanced metadata meets quality standards
 */
export function validateEnhancedMetadata(metadata: EnhancedBookMetadata): boolean {
  // Check categories
  if (metadata.categories.length < 2 || metadata.categories.length > 3) {
    console.error('[AI-Enhancer] Invalid categories count:', metadata.categories.length)
    return false
  }

  // Check description length
  const wordCount = metadata.description.split(/\s+/).length
  if (wordCount < 140 || wordCount > 220) {
    console.error('[AI-Enhancer] Description word count out of range:', wordCount)
    return false
  }

  // Check year format
  if (!/^\d{4}$/.test(metadata.published_date)) {
    console.error('[AI-Enhancer] Invalid year format:', metadata.published_date)
    return false
  }

  return true
}
