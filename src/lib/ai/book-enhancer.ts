// AI-powered book metadata enhancement using Google Gemini
import './env-bridge';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { GOOGLE_GENERATIVE_AI_API_KEY } from '$env/static/private';

export interface EnhancedBookMetadata {
	categories: string[];
	description: string;
	published_date: string;
	publisher?: string;
}

export interface BookEnhancementInput {
	title: string;
	authors: string[];
	description?: string;
	categories?: string[];
	published_date?: string;
	publisher?: string;
	isbn_13?: string;
	isbn_10?: string;
}

export async function enhanceBookMetadata(
	book: BookEnhancementInput
): Promise<EnhancedBookMetadata> {
	if (!GOOGLE_GENERATIVE_AI_API_KEY) {
		throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
	}

	const prompt = buildEnhancementPrompt(book);

	try {
		const result = await generateText({
			model: google('gemini-2.0-flash'),
			prompt,
			temperature: 0.3
		});

		const enhanced = parseEnhancementResponse(result.text);
		return enhanced;
	} catch (error) {
		console.error('[AI-Enhancer] Error enhancing book metadata:', error);
		throw new Error('Failed to enhance book metadata with AI');
	}
}

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
   - Be specific but not overly niche
   - If this is Young Adult, include that as one tag

2. DESCRIPTION (150-200 words):
   - Write a clean, engaging book blurb IN ENGLISH
   - If the current description is in another language, translate and enhance it to English
   - Focus on the main plot/themes without spoilers
   - Keep it between 150-200 words (flexible: 100-250 words acceptable)
   - No HTML tags, no special formatting
   - Make it compelling and informative

3. PUBLISHED_DATE (YYYY format):
   - Find the ORIGINAL first publication year (not reprints or special editions)
   - Format as 4-digit year only (e.g., "1960" not "1960-07-11")
   - If exact year unknown, provide best estimate

4. PUBLISHER (optional):
   - Provide the major publisher name (normalized)
   - Use standard publisher names
   - If unknown or unclear, omit this field

RESPOND IN VALID JSON FORMAT ONLY (no markdown, no code blocks):
{
  "categories": ["Genre1", "Genre2", "Genre3"],
  "description": "Your 150-200 word book description here...",
  "published_date": "YYYY",
  "publisher": "Publisher Name"
}

IMPORTANT:
- Respond with ONLY the JSON object, nothing else
- Ensure the description is in ENGLISH (translate if necessary)
- Aim for 150-200 words in the description (100-250 acceptable)`;
}

function parseEnhancementResponse(responseText: string): EnhancedBookMetadata {
	try {
		let cleanedText = responseText.trim();
		cleanedText = cleanedText.replace(/^```json\s*/i, '');
		cleanedText = cleanedText.replace(/^```\s*/i, '');
		cleanedText = cleanedText.replace(/```\s*$/i, '');
		cleanedText = cleanedText.trim();

		const parsed = JSON.parse(cleanedText);

		if (
			!Array.isArray(parsed.categories) ||
			parsed.categories.length < 2 ||
			parsed.categories.length > 3
		) {
			throw new Error('Invalid categories: must be array of 2-3 items');
		}

		if (!parsed.description || typeof parsed.description !== 'string') {
			throw new Error('Invalid description: must be a string');
		}

		const wordCount = parsed.description.split(/\s+/).length;
		if (wordCount < 100 || wordCount > 250) {
			console.warn(
				`[AI-Enhancer] Description word count (${wordCount}) outside acceptable range (100-250)`
			);
		}

		if (!parsed.published_date || typeof parsed.published_date !== 'string') {
			throw new Error('Invalid published_date: must be a string');
		}

		if (!/^\d{4}$/.test(parsed.published_date)) {
			throw new Error('Invalid published_date format: must be YYYY');
		}

		return {
			categories: parsed.categories.slice(0, 3),
			description: parsed.description.trim(),
			published_date: parsed.published_date,
			publisher: parsed.publisher ? String(parsed.publisher).trim() : undefined
		};
	} catch (error) {
		console.error('[AI-Enhancer] Error parsing Gemini response:', error);
		console.error('[AI-Enhancer] Raw response:', responseText);
		throw new Error('Failed to parse AI enhancement response');
	}
}

export function validateEnhancedMetadata(metadata: EnhancedBookMetadata): boolean {
	if (metadata.categories.length < 2 || metadata.categories.length > 3) {
		console.error('[AI-Enhancer] Invalid categories count:', metadata.categories.length);
		return false;
	}

	const wordCount = metadata.description.split(/\s+/).length;
	// Relaxed validation: accept 100-250 words (AI sometimes produces slightly shorter/longer)
	if (wordCount < 100 || wordCount > 250) {
		console.error('[AI-Enhancer] Description word count out of range:', wordCount);
		return false;
	}

	if (!/^\d{4}$/.test(metadata.published_date)) {
		console.error('[AI-Enhancer] Invalid year format:', metadata.published_date);
		return false;
	}

	return true;
}
