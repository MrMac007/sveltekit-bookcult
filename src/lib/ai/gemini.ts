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
 * Generate book recommendations using Google Gemini 2.5 Flash
 */
export async function generateBookRecommendations(
	data: RecommendationPromptData
): Promise<BookRecommendation[]> {
	if (!GOOGLE_GENERATIVE_AI_API_KEY) {
		throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
	}

	if (!data.topRatedBooks || data.topRatedBooks.length === 0) {
		throw new Error('No rated books provided for recommendations');
	}

	const prompt = buildRecommendationPrompt(data);

	try {
		const result = await generateText({
			model: google('gemini-2.0-flash'),
			prompt,
			temperature: 0.7
		});

		const recommendations = parseRecommendationsResponse(result.text);
		return recommendations;
	} catch (error) {
		console.error('Error generating recommendations with Gemini:', error);
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

	return `You are a book recommendation expert. Based on the following books that a user has highly rated, recommend 5 books they would enjoy.

USER'S TOP-RATED BOOKS:
${booksList}

INSTRUCTIONS:
1. Recommend exactly 5 books that match the user's taste
2. Consider genres, themes, writing style, and author similarities
3. Provide diverse recommendations (not all from the same genre/author)
4. DO NOT recommend books that are already in the list above
5. For each recommendation, provide:
   - title: The book's title
   - authors: Array of author names
   - reason: A short, personal reason (max 10 words) like "Because you loved [Book Title]"
   - blurb: A 2-3 sentence explanation of why this book matches their taste

RESPOND IN VALID JSON FORMAT ONLY (no markdown, no code blocks):
{
  "recommendations": [
    {
      "title": "Book Title",
      "authors": ["Author Name"],
      "reason": "Because you loved [book]",
      "blurb": "This book explores similar themes to your favorites. The author's writing style and narrative approach will resonate with you."
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
