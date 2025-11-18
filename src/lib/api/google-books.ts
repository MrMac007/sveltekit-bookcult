import type { GoogleBooksResponse, GoogleBooksVolume, Book } from '$lib/types/api';
import { GOOGLE_BOOKS_API_KEY } from '$env/static/private';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Strip HTML tags from a string and decode HTML entities
 */
function stripHtmlTags(html: string | undefined): string | undefined {
	if (!html) return html;

	// Remove HTML tags
	let text = html.replace(/<[^>]*>/g, '');

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
		.replace(/&ndash;/g, '–');

	// Remove excessive whitespace
	text = text.replace(/\s+/g, ' ').trim();

	return text;
}

export class GoogleBooksAPI {
	private apiKey: string;

	constructor(apiKey?: string) {
		this.apiKey = apiKey || GOOGLE_BOOKS_API_KEY || '';
	}

	/**
	 * Search for books by query string
	 */
	async searchBooks(
		query: string,
		maxResults: number = 40,
		author?: string
	): Promise<GoogleBooksResponse> {
		const url = new URL(GOOGLE_BOOKS_API_URL);

		let searchQuery = `intitle:${query}`;
		if (author && author.trim()) {
			searchQuery += `+inauthor:${author.trim()}`;
		}

		url.searchParams.set('q', searchQuery);
		url.searchParams.set('maxResults', maxResults.toString());
		url.searchParams.set('orderBy', 'relevance');
		if (this.apiKey) {
			url.searchParams.set('key', this.apiKey);
		}

		const response = await fetch(url.toString());

		if (!response.ok) {
			throw new Error(`Google Books API error: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Get a specific book by Google Books ID
	 */
	async getBookById(id: string): Promise<GoogleBooksVolume> {
		const url = new URL(`${GOOGLE_BOOKS_API_URL}/${id}`);
		if (this.apiKey) {
			url.searchParams.set('key', this.apiKey);
		}

		const response = await fetch(url.toString());

		if (!response.ok) {
			throw new Error(`Google Books API error: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Search books by ISBN
	 */
	async searchByISBN(isbn: string): Promise<GoogleBooksResponse> {
		return this.searchBooks(`isbn:${isbn}`, 1);
	}

	/**
	 * Convert Google Books volume to our Book format
	 */
	normalizeVolume(volume: GoogleBooksVolume): any {
		const info = volume.volumeInfo;
		const isbn13 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier;
		const isbn10 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier;

		const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;

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
			ratingsCount: info.ratingsCount
		};
	}

	/**
	 * Search and normalize results
	 */
	async searchAndNormalize(
		query: string,
		maxResults: number = 20,
		author?: string
	): Promise<any[]> {
		const response = await this.searchBooks(query, maxResults * 2, author);

		if (!response.items || response.items.length === 0) {
			return [];
		}

		const normalized = response.items.map((item) => this.normalizeVolume(item));

		const normalizedQuery = query.toLowerCase().trim();
		const normalizedAuthor = author ? author.toLowerCase().trim() : '';

		const scoredBooks = normalized.map((book) => {
			const titleLower = (book.title || '').toLowerCase();
			let matchScore = 0;

			if (titleLower.startsWith(normalizedQuery)) {
				matchScore = 1000;
			} else {
				const titleWithoutArticle = titleLower.replace(/^(the|a|an)\s+/, '');
				if (titleWithoutArticle.startsWith(normalizedQuery)) {
					matchScore = 900;
				} else if (titleLower.includes(normalizedQuery)) {
					const queryWords = normalizedQuery.split(/\s+/);
					const titleWords = titleLower.split(/\s+/);

					for (let i = 0; i <= titleWords.length - queryWords.length; i++) {
						const titleSlice = titleWords.slice(i, i + queryWords.length).join(' ');
						if (titleSlice === normalizedQuery) {
							matchScore = 500 - i * 50;
							break;
						}
					}

					if (matchScore === 0) {
						matchScore = 100;
					}
				}
			}

			if (normalizedAuthor && book.authors && book.authors.length > 0) {
				const authorsLower = book.authors.map((a: string) => a.toLowerCase());

				const hasExactMatch = authorsLower.some((a: string) => a === normalizedAuthor);
				if (hasExactMatch) {
					matchScore += 500;
				} else {
					const hasPartialMatch = authorsLower.some((a: string) => {
						const authorParts = a.split(/\s+/);
						return authorParts.some((part) => part.startsWith(normalizedAuthor));
					});

					if (hasPartialMatch) {
						matchScore += 400;
					} else {
						const hasContainMatch = authorsLower.some((a: string) => a.includes(normalizedAuthor));
						if (hasContainMatch) {
							matchScore += 200;
						}
					}
				}
			}

			return { ...book, matchScore };
		});

		const sorted = scoredBooks.sort((a, b) => {
			if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;

			const aRatings = a.ratingsCount || 0;
			const bRatings = b.ratingsCount || 0;

			if (aRatings > 0 && bRatings === 0) return -1;
			if (aRatings === 0 && bRatings > 0) return 1;

			if (aRatings !== bRatings) return bRatings - aRatings;

			const aAvg = a.averageRating || 0;
			const bAvg = b.averageRating || 0;
			return bAvg - aAvg;
		});

		return sorted.slice(0, maxResults);
	}
}

// Export a singleton instance
export const googleBooksAPI = new GoogleBooksAPI();
