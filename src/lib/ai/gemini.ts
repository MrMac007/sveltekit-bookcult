// Google Gemini API client for AI-powered book recommendations
import './env-bridge';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { GOOGLE_GENERATIVE_AI_API_KEY } from '$env/static/private';

export interface BookRecommendation {
	google_books_id: string;
	title: string;
	authors: string[];
	reason: string;
	blurb: string;
}

export interface RecommendationPromptData {
	userId: string;
	topRatedBooks: Array<{
		title: string;
		authors: string[];
		categories?: string[];
		rating: number;
	}>;
}

/**
 * Generate book recommendations using Google Gemini 1.5 Flash (free tier)
 */
export async function generateBookRecommendations(
	data: RecommendationPromptData
): Promise<BookRecommendation[]> {
	if (!GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error('[Gemini] API key not configured');
		throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
	}

	if (!data.topRatedBooks || data.topRatedBooks.length === 0) {
		throw new Error('No rated books provided for recommendations');
	}

	const prompt = buildRecommendationPrompt(data);

	try {
		console.log('[Gemini] Generating recommendations for', data.topRatedBooks.length, 'books');
		const result = await generateText({
			model: google('gemini-2.5-flash'),
			prompt,
			temperature: 0.5
		});

		console.log('[Gemini] Got response, parsing...');
		const recommendations = parseRecommendationsResponse(result.text);
		console.log('[Gemini] Parsed', recommendations.length, 'recommendations');
		return recommendations;
	} catch (error) {
		console.error('[Gemini] Error generating recommendations:', error);
		throw new Error('Failed to generate recommendations');
	}
}

function buildRecommendationPrompt(data: RecommendationPromptData): string {
	const booksList = data.topRatedBooks
		.map(
			(book, i) =>
				`${i + 1}. "${book.title}" by ${book.authors.join(', ')} (Rating: ${book.rating}/5)${
					book.categories ? ` - Categories: ${book.categories.join(', ')}` : ''
				}`
		)
		.join('\n');

	// Extract unique authors the user has rated highly
	const favoriteAuthors = [...new Set(data.topRatedBooks.flatMap((book) => book.authors))];
	const authorsSection =
		favoriteAuthors.length > 0
			? `\nFAVORITE AUTHORS: ${favoriteAuthors.slice(0, 5).join(', ')}`
			: '';

	return `You are a book recommendation expert specializing in popular, well-known books. Based on the following books that a user has highly rated, recommend 5 books they would enjoy.

USER'S TOP-RATED BOOKS:
${booksList}
${authorsSection}

CRITICAL REQUIREMENTS - POPULARITY FOCUS:
- ONLY recommend well-known, popular books that readers would recognize
- Prioritize: New York Times bestsellers, award winners (Hugo, Nebula, Booker, Pulitzer), BookTok favorites
- Choose books with high Goodreads ratings (4.0+) and many reviews (10,000+)
- Recommend books commonly found in major bookstores (Barnes & Noble, Waterstones)
- Include at least 2 books by the same authors listed above OR authors of similar popularity/style

AUTHOR-BASED RECOMMENDATIONS:
- If the user rated Sarah J. Maas highly → recommend her other series or similar authors (Jennifer L. Armentrout, Holly Black)
- If the user rated Brandon Sanderson → recommend his other works or similar authors (Robert Jordan, Patrick Rothfuss)
- Prioritize established, bestselling authors over debut/obscure authors

INSTRUCTIONS:
1. Recommend exactly 5 books that match the user's taste
2. At least 3 must be from widely-known bestselling authors
3. DO NOT recommend books already in the list above
4. DO NOT recommend obscure or hard-to-find books
5. For each recommendation, provide:
   - title: The exact, correct book title
   - authors: Array of author names
   - reason: A short, personal reason (max 10 words) referencing their rated books
   - blurb: A 2-3 sentence explanation of why this popular book matches their taste

RESPOND IN VALID JSON FORMAT ONLY (no markdown, no code blocks):
{
  "recommendations": [
    {
      "title": "Book Title",
      "authors": ["Author Name"],
      "reason": "Because you loved [book]",
      "blurb": "This bestselling book explores similar themes. It's a fan favorite with millions of readers worldwide."
    }
  ]
}

Respond with ONLY the JSON object, nothing else.`;
}

function parseRecommendationsResponse(responseText: string): BookRecommendation[] {
	try {
		let cleanedText = responseText.trim();
		cleanedText = cleanedText.replace(/^```json\s*/i, '');
		cleanedText = cleanedText.replace(/^```\s*/i, '');
		cleanedText = cleanedText.replace(/```\s*$/i, '');
		cleanedText = cleanedText.trim();

		const parsed = JSON.parse(cleanedText);

		if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
			throw new Error('Invalid response format: missing recommendations array');
		}

		const recommendations: BookRecommendation[] = parsed.recommendations.map((rec: any) => ({
			google_books_id: '',
			title: rec.title || '',
			authors: Array.isArray(rec.authors) ? rec.authors : [rec.authors || 'Unknown'],
			reason: rec.reason || 'Recommended for you',
			blurb: rec.blurb || ''
		}));

		return recommendations.slice(0, 5);
	} catch (error) {
		console.error('Error parsing Gemini response:', error);
		console.error('Raw response:', responseText);
		throw new Error('Failed to parse AI recommendations response');
	}
}
