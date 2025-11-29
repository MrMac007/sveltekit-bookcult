/**
 * Open Library API Client
 *
 * Open Library uses a "works" concept which is perfect for finding canonical books:
 * - A "work" represents the abstract book (e.g., "The Great Gatsby")
 * - "Editions" are specific publications (hardcover, paperback, translations, etc.)
 *
 * This helps us return the "main" version users expect rather than random editions.
 */

const OPEN_LIBRARY_API_URL = 'https://openlibrary.org';
const COVERS_API_URL = 'https://covers.openlibrary.org';

export interface OpenLibrarySearchDoc {
	key: string; // e.g., "/works/OL45804W"
	title: string;
	author_name?: string[];
	author_key?: string[];
	first_publish_year?: number;
	publish_year?: number[];
	isbn?: string[];
	cover_i?: number; // Cover ID for the work
	cover_edition_key?: string;
	edition_count?: number;
	number_of_pages_median?: number;
	publisher?: string[];
	subject?: string[];
	language?: string[];
	ratings_average?: number;
	ratings_count?: number;
	want_to_read_count?: number;
	currently_reading_count?: number;
	already_read_count?: number;
}

export interface OpenLibrarySearchResponse {
	numFound: number;
	start: number;
	numFoundExact: boolean;
	docs: OpenLibrarySearchDoc[];
}

export interface OpenLibraryWork {
	key: string;
	title: string;
	description?: string | { type: string; value: string };
	covers?: number[];
	subjects?: string[];
	subject_places?: string[];
	subject_times?: string[];
	first_publish_date?: string;
	authors?: Array<{
		author: { key: string };
		type: { key: string };
	}>;
}

export interface OpenLibraryAuthor {
	key: string;
	name: string;
	birth_date?: string;
	bio?: string | { type: string; value: string };
}

export interface OpenLibraryEdition {
	key: string;
	title: string;
	publishers?: string[];
	publish_date?: string;
	number_of_pages?: number;
	isbn_13?: string[];
	isbn_10?: string[];
	covers?: number[];
	languages?: Array<{ key: string }>;
	works?: Array<{ key: string }>;
}

export interface NormalizedBook {
	id: string;
	open_library_key: string;
	google_books_id?: string;
	isbn_13?: string;
	isbn_10?: string;
	title: string;
	authors: string[];
	publisher?: string;
	published_date?: string;
	description?: string;
	page_count?: number;
	cover_url?: string;
	categories: string[];
	language?: string;
	edition_count?: number;
	ratings_average?: number;
	ratings_count?: number;
	popularity_score?: number;
}

/**
 * Get text value from Open Library description field
 * (can be string or { type: string, value: string })
 */
function getTextValue(field: string | { type: string; value: string } | undefined): string | undefined {
	if (!field) return undefined;
	if (typeof field === 'string') return field;
	return field.value;
}

/**
 * Get cover URL from Open Library cover ID
 */
function getCoverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | undefined {
	if (!coverId) return undefined;
	return `${COVERS_API_URL}/b/id/${coverId}-${size}.jpg`;
}

/**
 * Extract Open Library key ID from full path
 * e.g., "/works/OL45804W" -> "OL45804W"
 */
function extractKeyId(key: string): string {
	return key.split('/').pop() || key;
}

export class OpenLibraryAPI {
	/**
	 * Search for books by query string
	 * Uses the search API which returns work-level results (not individual editions)
	 */
	async searchBooks(
		query: string,
		limit: number = 20,
		author?: string
	): Promise<OpenLibrarySearchResponse> {
		const url = new URL(`${OPEN_LIBRARY_API_URL}/search.json`);

		// Build search query
		let searchQuery = query;
		if (author && author.trim()) {
			searchQuery = `${query} author:${author.trim()}`;
		}

		url.searchParams.set('q', searchQuery);
		url.searchParams.set('limit', limit.toString());
		url.searchParams.set('fields', [
			'key',
			'title',
			'author_name',
			'author_key',
			'first_publish_year',
			'publish_year',
			'isbn',
			'cover_i',
			'cover_edition_key',
			'edition_count',
			'number_of_pages_median',
			'publisher',
			'subject',
			'language',
			'ratings_average',
			'ratings_count',
			'want_to_read_count',
			'currently_reading_count',
			'already_read_count'
		].join(','));
		// Sort by editions (popularity proxy) - books with more editions are more well-known
		url.searchParams.set('sort', 'editions');
		// NOTE: Removed language=eng filter as it's too restrictive and doesn't work well with Open Library

		const response = await fetch(url.toString(), {
			headers: {
				'User-Agent': 'BookCult/1.0 (book-tracking-app)'
			}
		});

		if (!response.ok) {
			throw new Error(`Open Library API error: ${response.statusText}`);
		}

		const data = await response.json();
		return data;
	}

	/**
	 * Get detailed work information
	 */
	async getWork(workKey: string): Promise<OpenLibraryWork> {
		const key = extractKeyId(workKey);
		const url = `${OPEN_LIBRARY_API_URL}/works/${key}.json`;

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'BookCult/1.0 (book-tracking-app)'
			}
		});

		if (!response.ok) {
			throw new Error(`Open Library API error: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Get author information
	 */
	async getAuthor(authorKey: string): Promise<OpenLibraryAuthor> {
		const key = extractKeyId(authorKey);
		const url = `${OPEN_LIBRARY_API_URL}/authors/${key}.json`;

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'BookCult/1.0 (book-tracking-app)'
			}
		});

		if (!response.ok) {
			throw new Error(`Open Library API error: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Get the best edition of a work (most complete data)
	 */
	async getBestEdition(workKey: string): Promise<OpenLibraryEdition | null> {
		const key = extractKeyId(workKey);
		const url = `${OPEN_LIBRARY_API_URL}/works/${key}/editions.json?limit=10`;

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'BookCult/1.0 (book-tracking-app)'
			}
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		const editions: OpenLibraryEdition[] = data.entries || [];

		if (editions.length === 0) return null;

		// Score editions to find the "best" one
		// Prefer: has ISBN, has page count, has cover, English
		const scoredEditions = editions.map((edition) => {
			let score = 0;

			// Has ISBN-13 (preferred)
			if (edition.isbn_13 && edition.isbn_13.length > 0) score += 10;
			// Has ISBN-10
			if (edition.isbn_10 && edition.isbn_10.length > 0) score += 5;
			// Has page count
			if (edition.number_of_pages) score += 5;
			// Has cover
			if (edition.covers && edition.covers.length > 0) score += 5;
			// English language
			if (edition.languages?.some((l) => l.key === '/languages/eng')) score += 3;
			// Has publisher
			if (edition.publishers && edition.publishers.length > 0) score += 2;

			return { edition, score };
		});

		// Sort by score descending
		scoredEditions.sort((a, b) => b.score - a.score);

		return scoredEditions[0]?.edition || editions[0];
	}

	/**
	 * Search by ISBN
	 */
	async searchByISBN(isbn: string): Promise<OpenLibrarySearchResponse> {
		const url = new URL(`${OPEN_LIBRARY_API_URL}/search.json`);
		url.searchParams.set('isbn', isbn);
		url.searchParams.set('limit', '1');

		const response = await fetch(url.toString(), {
			headers: {
				'User-Agent': 'BookCult/1.0 (book-tracking-app)'
			}
		});

		if (!response.ok) {
			throw new Error(`Open Library API error: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Normalize a search result to our Book format
	 */
	normalizeSearchDoc(doc: OpenLibrarySearchDoc): NormalizedBook {
		// Calculate popularity score based on reader engagement
		const popularityScore =
			(doc.edition_count || 0) * 10 +
			(doc.already_read_count || 0) * 5 +
			(doc.currently_reading_count || 0) * 3 +
			(doc.want_to_read_count || 0) * 2 +
			(doc.ratings_count || 0);

		// Get the best ISBN (prefer ISBN-13)
		const isbns = doc.isbn || [];
		const isbn13 = isbns.find((isbn) => isbn.length === 13);
		const isbn10 = isbns.find((isbn) => isbn.length === 10);

		// Get first publish year as date
		const publishedDate = doc.first_publish_year?.toString();

		// Get categories from subjects (take top 5 most relevant)
		const categories = (doc.subject || [])
			.filter((s) => s.length < 50) // Filter out overly long subject strings
			.slice(0, 5);

		const workKey = extractKeyId(doc.key);

		return {
			id: workKey, // Use work key as temporary ID until saved to DB
			open_library_key: workKey,
			isbn_13: isbn13,
			isbn_10: isbn10,
			title: doc.title,
			authors: doc.author_name || [],
			publisher: doc.publisher?.[0],
			published_date: publishedDate,
			page_count: doc.number_of_pages_median,
			cover_url: getCoverUrl(doc.cover_i, 'M'),
			categories,
			language: doc.language?.[0] || 'en',
			edition_count: doc.edition_count,
			ratings_average: doc.ratings_average,
			ratings_count: doc.ratings_count,
			popularity_score: popularityScore
		};
	}

	/**
	 * Search and normalize results with smart ranking
	 */
	async searchAndNormalize(
		query: string,
		maxResults: number = 20,
		author?: string
	): Promise<NormalizedBook[]> {
		const response = await this.searchBooks(query, maxResults * 2, author);

		if (!response.docs || response.docs.length === 0) {
			return [];
		}

		const normalized = response.docs.map((doc) => this.normalizeSearchDoc(doc));

		// Score results for relevance
		const normalizedQuery = query.toLowerCase().trim();
		const normalizedAuthor = author?.toLowerCase().trim() || '';

		const scoredBooks = normalized.map((book) => {
			const titleLower = (book.title || '').toLowerCase();
			let matchScore = 0;

			// Title matching
			if (titleLower === normalizedQuery) {
				matchScore = 2000; // Exact match
			} else if (titleLower.startsWith(normalizedQuery)) {
				matchScore = 1500;
			} else {
				const titleWithoutArticle = titleLower.replace(/^(the|a|an)\s+/, '');
				if (titleWithoutArticle.startsWith(normalizedQuery)) {
					matchScore = 1400;
				} else if (titleLower.includes(normalizedQuery)) {
					matchScore = 500;
				}
			}

			// Author matching boost
			if (normalizedAuthor && book.authors.length > 0) {
				const authorsLower = book.authors.map((a) => a.toLowerCase());
				if (authorsLower.some((a) => a === normalizedAuthor)) {
					matchScore += 500;
				} else if (authorsLower.some((a) => a.includes(normalizedAuthor))) {
					matchScore += 300;
				}
			}

			// Popularity boost (scaled down to not overwhelm relevance)
			const popularityBoost = Math.min((book.popularity_score || 0) / 100, 200);
			matchScore += popularityBoost;

			// Rating boost
			if (book.ratings_count && book.ratings_count > 10) {
				matchScore += (book.ratings_average || 0) * 10;
			}

			return { ...book, matchScore };
		});

		// Sort by match score
		const sorted = scoredBooks.sort((a, b) => b.matchScore - a.matchScore);

		// Remove matchScore before returning
		return sorted.slice(0, maxResults).map(({ matchScore, ...book }) => book);
	}

	/**
	 * Get detailed book info by work key, enriching with edition data
	 */
	async getBookDetails(workKey: string): Promise<NormalizedBook | null> {
		try {
			const [work, edition] = await Promise.all([
				this.getWork(workKey),
				this.getBestEdition(workKey)
			]);

			// Get author names
			const authorNames: string[] = [];
			if (work.authors) {
				const authorPromises = work.authors
					.slice(0, 5) // Limit to 5 authors
					.map((a) => this.getAuthor(a.author.key).catch(() => null));
				const authors = await Promise.all(authorPromises);
				authorNames.push(...authors.filter(Boolean).map((a) => a!.name));
			}

			const key = extractKeyId(workKey);
			const description = getTextValue(work.description);

			return {
				id: key,
				open_library_key: key,
				isbn_13: edition?.isbn_13?.[0],
				isbn_10: edition?.isbn_10?.[0],
				title: work.title,
				authors: authorNames,
				publisher: edition?.publishers?.[0],
				published_date: work.first_publish_date || edition?.publish_date,
				description,
				page_count: edition?.number_of_pages,
				cover_url: getCoverUrl(work.covers?.[0] || edition?.covers?.[0], 'M'),
				categories: (work.subjects || []).slice(0, 5),
				language: edition?.languages?.[0]?.key?.replace('/languages/', '') || 'en'
			};
		} catch (error) {
			console.error('[open-library] Error fetching book details:', error);
			return null;
		}
	}
}

// Export singleton instance
export const openLibraryAPI = new OpenLibraryAPI();

