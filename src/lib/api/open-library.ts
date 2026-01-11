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

// UK publishers to prioritize for best edition selection
const UK_PUBLISHERS = [
	'scholastic children\'s books',
	'scholastic uk',
	'bloomsbury',
	'bloomsbury publishing',
	'bloomsbury children\'s books',
	'puffin',
	'puffin books',
	'penguin uk',
	'penguin books ltd',
	'harpercollins uk',
	'harpercollins children\'s books',
	'macmillan children\'s books',
	'faber & faber',
	'faber and faber',
	'orion',
	'orion children\'s books',
	'hodder',
	'hodder & stoughton',
	'hodder children\'s books',
	'transworld',
	'random house uk',
	'random house children\'s books',
	'vintage uk',
	'walker books',
	'usborne',
	'hot key books',
	'nosy crow'
];

// High-quality international publishers (fallback if no UK edition)
const QUALITY_PUBLISHERS = [
	'scholastic',
	'penguin',
	'penguin random house',
	'harpercollins',
	'random house',
	'simon & schuster',
	'simon and schuster',
	'macmillan',
	'knopf',
	'doubleday',
	'little, brown',
	'hachette'
];

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
	google_books_id?: string;  // Legacy field, no longer used
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
	// Open Library engagement data
	edition_count?: number;
	ratings_average?: number;
	ratings_count?: number;
	want_to_read_count?: number;
	currently_reading_count?: number;
	already_read_count?: number;
	popularity_score?: number;
	first_publish_year?: number;
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
 * Adding ?default=false makes Open Library return 404 for missing covers
 * instead of a 1x1 transparent pixel (which doesn't trigger onerror)
 */
function getCoverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | undefined {
	if (!coverId) return undefined;
	return `${COVERS_API_URL}/b/id/${coverId}-${size}.jpg?default=false`;
}

/**
 * Get fallback cover URL using cover_edition_key or ISBN when cover_i is not available
 * Note: OLID covers only work with Edition IDs (OL...M), not Work keys (OL...W)
 */
function getFallbackCoverUrl(
	coverEditionKey?: string,
	isbn13?: string,
	isbn10?: string,
	size: 'S' | 'M' | 'L' = 'M'
): string | undefined {
	// cover_edition_key is an edition OLID that has a cover - most reliable fallback
	if (coverEditionKey) {
		return `${COVERS_API_URL}/b/olid/${coverEditionKey}-${size}.jpg?default=false`;
	}
	if (isbn13) {
		return `${COVERS_API_URL}/b/isbn/${isbn13}-${size}.jpg?default=false`;
	}
	if (isbn10) {
		return `${COVERS_API_URL}/b/isbn/${isbn10}-${size}.jpg?default=false`;
	}
	return undefined;
}

/**
 * Extract Open Library key ID from full path
 * e.g., "/works/OL45804W" -> "OL45804W"
 */
function extractKeyId(key: string): string {
	return key.split('/').pop() || key;
}

/**
 * Calculate normalized popularity score using logarithmic scaling.
 * This allows very popular books to score high without completely dominating.
 *
 * Scale: 0-1000 points
 * - Score of ~100 raw → ~333 normalized
 * - Score of ~10,000 raw → ~666 normalized
 * - Score of ~1,000,000 raw → ~1000 normalized (capped)
 */
function calculateNormalizedPopularity(doc: OpenLibrarySearchDoc): number {
	const rawScore =
		(doc.edition_count || 0) * 10 +
		(doc.already_read_count || 0) * 5 +
		(doc.currently_reading_count || 0) * 3 +
		(doc.want_to_read_count || 0) * 2 +
		(doc.ratings_count || 0);

	if (rawScore <= 0) return 0;

	// Two-tier scaling to better distinguish popular books
	// Low popularity (raw < 1000): moderate growth
	// High popularity (raw >= 1000): continues growing faster
	const logScore = Math.log10(rawScore + 1);

	if (rawScore < 1000) {
		// log10(1000) ≈ 3, so max here is ~500
		return Math.min(500, logScore * 166);
	} else {
		// Popular books get 500 base + bonus for extreme popularity
		// log10(1000)=3, log10(10000)=4, log10(100000)=5
		// rawScore 17958 → logScore ≈ 4.25 → bonus = 1.25 * 400 = 500
		return Math.min(1200, 500 + (logScore - 3) * 400);
	}
}

/**
 * Detect if a book belongs to a series that matches the search query.
 * Open Library stores series info in subjects with various patterns:
 * - "series:Harry_Potter" (underscore-separated)
 * - "Hunger Games Series"
 * - "nyt:series_books=2010-08-21"
 * - "Harry Potter (Fictitious character)" (character names)
 */
function detectSeriesFromSubjects(subjects: string[] | undefined, query: string): boolean {
	if (!subjects || subjects.length === 0) return false;

	const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
	const queryWords = normalizedQuery.split(/\s+/);
	// Also create underscore version for series:Name_Name patterns
	const queryUnderscore = queryWords.join('_');

	for (const subject of subjects) {
		const normalizedSubject = subject.toLowerCase();

		// Pattern 1: "series:Harry_Potter" style
		if (normalizedSubject.startsWith('series:')) {
			const seriesName = normalizedSubject.slice(7).replace(/_/g, ' ');
			if (seriesName.includes(normalizedQuery) || normalizedQuery.includes(seriesName)) {
				return true;
			}
			// Also check underscore version
			if (normalizedSubject.includes(queryUnderscore)) {
				return true;
			}
		}

		// Pattern 2: "nyt:series_books" indicates NYT bestseller series
		if (normalizedSubject.startsWith('nyt:series_books')) {
			// This book is part of a series - check if title/other subjects match query
			// We'll return true for these if other checks pass below
		}

		// Pattern 3: Series-related keywords
		const isSeriesSubject =
			normalizedSubject.includes('series') ||
			normalizedSubject.includes('trilogy') ||
			normalizedSubject.includes('saga');

		if (isSeriesSubject) {
			const matchesQuery = queryWords.every(word => normalizedSubject.includes(word));
			if (matchesQuery) return true;
		}

		// Pattern 4: Character name patterns like "Harry Potter (Fictitious character)"
		// These indicate the book features this character prominently
		if (normalizedSubject.includes('(fictitious character)') ||
			normalizedSubject.includes('(fictional character)') ||
			normalizedSubject.includes('(personnage fictif)')) {
			// Extract character name (everything before the parenthesis)
			const charName = normalizedSubject.split('(')[0].trim();
			// Check if query matches character name
			if (queryWords.every(word => charName.includes(word))) {
				return true;
			}
		}

		// Pattern 5: Direct subject match (e.g., subject is exactly "Harry Potter")
		const subjectClean = normalizedSubject.replace(/[^a-z0-9\s]/g, '').trim();
		if (queryWords.length >= 2 && subjectClean === normalizedQuery) {
			return true;
		}
	}

	return false;
}

/**
 * Extract year from a date string like "2008", "March 2008", "2008-03-15"
 */
function extractYear(dateStr: string): number | null {
	const match = dateStr.match(/\b(19|20)\d{2}\b/);
	return match ? parseInt(match[0], 10) : null;
}

// Premium UK publishers - these get the highest priority for consistent series covers
const PREMIUM_UK_PUBLISHERS = [
	'bloomsbury',          // Harry Potter, many literary fiction
	'scholastic',          // Hunger Games, many children's books
	'puffin',              // Classic children's books
	'penguin',             // Wide range
];

/**
 * Score an edition for UK market preference.
 * Returns 0 for unusable editions (no cover, non-English).
 * Prioritizes premium UK publishers for consistent series covers.
 */
function scoreEditionForUK(edition: OpenLibraryEdition): number {
	let score = 0;

	// Must have cover
	if (!edition.covers || edition.covers.length === 0 || edition.covers[0] <= 0) {
		return 0;
	}
	const coverId = edition.covers[0];
	score += 100; // Base score for having a cover

	// Bonus for higher cover IDs (newer uploads, more likely to be current editions)
	// Cover IDs range from ~1 to ~15,000,000+
	// Give up to 30 points for covers in the top range
	if (coverId > 10000000) {
		score += 30;
	} else if (coverId > 5000000) {
		score += 20;
	} else if (coverId > 1000000) {
		score += 10;
	}

	// Must be English
	const isEnglish = edition.languages?.some(l => l.key === '/languages/eng') ??
		// If no language specified, assume English (most books on Open Library)
		(!edition.languages || edition.languages.length === 0);
	if (!isEnglish) {
		return 0;
	}
	score += 50;

	// Publisher scoring - premium UK publishers get big bonus for consistency
	const publisherLower = (edition.publishers?.[0] || '').toLowerCase();

	// Premium UK publishers (best for consistent series covers)
	if (PREMIUM_UK_PUBLISHERS.some(p => publisherLower.includes(p))) {
		score += 80; // Big bonus for premium publishers
	}
	// Other UK publishers
	else if (UK_PUBLISHERS.some(p => publisherLower.includes(p))) {
		score += 50;
	}
	// Quality international publishers
	else if (QUALITY_PUBLISHERS.some(p => publisherLower.includes(p))) {
		score += 30;
	}

	// ISBN availability (indicates proper trade edition)
	if (edition.isbn_13 && edition.isbn_13.length > 0) {
		score += 15;
	}
	if (edition.isbn_10 && edition.isbn_10.length > 0) {
		score += 5;
	}

	// Publication recency (newer editions often have better/consistent covers)
	if (edition.publish_date) {
		const year = extractYear(edition.publish_date);
		if (year) {
			const age = new Date().getFullYear() - year;
			if (age <= 3) score += 30;      // Very recent - likely current edition
			else if (age <= 5) score += 25;
			else if (age <= 10) score += 15;
			else if (age <= 15) score += 5;
		}
	}

	// Has page count (indicates complete, not abridged edition)
	if (edition.number_of_pages && edition.number_of_pages > 50) {
		score += 10;
	}

	return score;
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
		// NOTE: Removed sort=editions as it prioritizes edition count globally, not relevance
		// Instead, let Open Library return relevance-sorted results, then apply our own scoring
		// which balances title match, popularity, and series detection

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
	 * Get all editions of a work with covers for user selection
	 * Returns editions sorted by relevance (English, has cover, has ISBN)
	 */
	async getEditionsWithCovers(workKey: string): Promise<Array<{
		key: string;
		title: string;
		cover_url?: string;
		cover_id?: number;
		publisher?: string;
		publish_date?: string;
		isbn_13?: string;
		isbn_10?: string;
		language?: string;
	}>> {
		const key = extractKeyId(workKey);
		const url = `${OPEN_LIBRARY_API_URL}/works/${key}/editions.json?limit=30`;

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'BookCult/1.0 (book-tracking-app)'
			}
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		const editions: OpenLibraryEdition[] = data.entries || [];

		// Filter and transform editions
		const editionsWithCovers = editions
			.filter(e => e.covers && e.covers.length > 0 && e.covers[0] > 0)
			.map(edition => {
				const coverId = edition.covers?.[0];
				const isEnglish = edition.languages?.some(l => l.key === '/languages/eng') ?? true;

				return {
					key: extractKeyId(edition.key),
					title: edition.title,
					cover_url: coverId ? `${COVERS_API_URL}/b/id/${coverId}-M.jpg?default=false` : undefined,
					cover_id: coverId,
					publisher: edition.publishers?.[0],
					publish_date: edition.publish_date,
					isbn_13: edition.isbn_13?.[0],
					isbn_10: edition.isbn_10?.[0],
					language: edition.languages?.[0]?.key?.replace('/languages/', ''),
					_isEnglish: isEnglish,
					_hasIsbn: !!(edition.isbn_13?.length || edition.isbn_10?.length)
				};
			})
			// Sort: English first, then by has ISBN, then by publish date (newest first)
			.sort((a: any, b: any) => {
				if (a._isEnglish !== b._isEnglish) return a._isEnglish ? -1 : 1;
				if (a._hasIsbn !== b._hasIsbn) return a._hasIsbn ? -1 : 1;
				return 0;
			})
			// Remove internal sorting fields
			.map(({ _isEnglish, _hasIsbn, ...edition }: any) => edition);

		return editionsWithCovers;
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
	 * Get the best edition for UK market with quality cover.
	 * Prioritizes UK publishers, English language, and recent editions with good covers.
	 *
	 * @returns The best edition with its cover URL, or null if none found
	 */
	async getBestEditionForUK(workKey: string): Promise<{
		edition: OpenLibraryEdition;
		coverUrl: string;
	} | null> {
		const key = extractKeyId(workKey);
		const url = `${OPEN_LIBRARY_API_URL}/works/${key}/editions.json?limit=50`;

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

		// Score all editions using UK market preferences
		const scoredEditions = editions
			.map((edition) => ({
				edition,
				score: scoreEditionForUK(edition)
			}))
			.filter((e) => e.score > 0) // Filter out unusable editions
			.sort((a, b) => b.score - a.score);

		if (scoredEditions.length > 0) {
			const best = scoredEditions[0].edition;
			const coverUrl = `${COVERS_API_URL}/b/id/${best.covers![0]}-M.jpg?default=false`;
			return { edition: best, coverUrl };
		}

		// Fallback: return first edition with any cover
		const withCover = editions.find((e) => e.covers?.[0] && e.covers[0] > 0);
		if (withCover) {
			const coverUrl = `${COVERS_API_URL}/b/id/${withCover.covers![0]}-M.jpg?default=false`;
			return { edition: withCover, coverUrl };
		}

		return null;
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

		// Get cover URL with fallback to cover_edition_key or ISBN-based cover
		const coverUrl = getCoverUrl(doc.cover_i, 'M') || getFallbackCoverUrl(doc.cover_edition_key, isbn13, isbn10, 'M');

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
			cover_url: coverUrl,
			categories,
			language: doc.language?.[0] || 'en',
			// Open Library engagement data
			edition_count: doc.edition_count,
			ratings_average: doc.ratings_average,
			ratings_count: doc.ratings_count,
			want_to_read_count: doc.want_to_read_count,
			currently_reading_count: doc.currently_reading_count,
			already_read_count: doc.already_read_count,
			popularity_score: popularityScore,
			first_publish_year: doc.first_publish_year
		};
	}

	/**
	 * Search and normalize results with smart ranking.
	 *
	 * Scoring weights (rebalanced to prioritize popular books and series):
	 * - Title exact match: 1000
	 * - Title starts with: 800
	 * - Title contains: 400
	 * - Popularity: up to 1000 via logarithmic scale
	 * - Series match: +500 for books in a matching series
	 * - Related popular book: +150 for popular books with query words
	 * - Author match: +200 exact, +100 partial
	 * - Rating boost: up to 50
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

		// Score results for relevance
		const normalizedQuery = query.toLowerCase().trim();
		const normalizedAuthor = author?.toLowerCase().trim() || '';

		const scoredBooks = response.docs.map((doc) => {
			const book = this.normalizeSearchDoc(doc);
			const titleLower = (book.title || '').toLowerCase();
			let matchScore = 0;

			// Title matching - narrow gaps so popularity can differentiate
			// "The Hunger Games" should score nearly as well as "Hunger Games"
			if (titleLower === normalizedQuery) {
				matchScore = 500; // Exact match
			} else if (titleLower.startsWith(normalizedQuery)) {
				matchScore = 450;
			} else {
				const titleWithoutArticle = titleLower.replace(/^(the|a|an)\s+/, '');
				if (titleWithoutArticle === normalizedQuery) {
					matchScore = 480; // Near-exact after removing article
				} else if (titleWithoutArticle.startsWith(normalizedQuery)) {
					matchScore = 420;
				} else if (titleLower.includes(normalizedQuery)) {
					matchScore = 300;
				}
			}

			// Series detection boost - only for books with decent popularity
			// This prevents obscure academic books from getting series boost
			const isSeriesMatch = detectSeriesFromSubjects(doc.subject, query);
			const hasMinPopularity = (doc.edition_count || 0) >= 20;
			if (isSeriesMatch && hasMinPopularity) {
				matchScore += 300; // Moderate boost for series matches with popularity
			}

			// Popularity boost using logarithmic scaling (can now be up to 1000)
			// This allows very popular books to rise above obscure exact matches
			const popularityBoost = calculateNormalizedPopularity(doc);
			matchScore += popularityBoost;

			// Author matching boost
			if (normalizedAuthor && book.authors.length > 0) {
				const authorsLower = book.authors.map((a) => a.toLowerCase());
				if (authorsLower.some((a) => a === normalizedAuthor)) {
					matchScore += 200;
				} else if (authorsLower.some((a) => a.includes(normalizedAuthor))) {
					matchScore += 100;
				}
			}

			// Additional series heuristic: popular books by known series authors
			// If a book is very popular AND shares author with high-scoring books, boost it
			// This helps catch sequels like "Catching Fire" when searching "hunger games"
			const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
			const isPopularBook = (doc.edition_count || 0) > 30;

			if (isPopularBook && !isSeriesMatch && matchScore < 800) {
				// Check if any author's other works might be related
				// For now, just give a small boost to popular books that have
				// ANY of the query words in title or subject
				const hasQueryWordInTitle = queryWords.some(w => titleLower.includes(w));
				const hasQueryWordInSubjects = queryWords.some(w =>
					(doc.subject || []).some(s => s.toLowerCase().includes(w))
				);

				if (hasQueryWordInTitle || hasQueryWordInSubjects) {
					matchScore += 150; // Moderate boost for potentially related popular books
				}
			}

			// Rating boost (moderate - rewards well-rated books)
			if (book.ratings_count && book.ratings_count > 10) {
				matchScore += Math.min((book.ratings_average || 0) * 10, 50);
			}

			return { ...book, matchScore };
		});

		// Sort by match score
		const sorted = scoredBooks.sort((a, b) => b.matchScore - a.matchScore);

		// Remove matchScore before returning
		return sorted.slice(0, maxResults).map(({ matchScore, ...book }) => book);
	}

	/**
	 * Get detailed book info by work key, enriching with UK-preferred edition data
	 */
	async getBookDetails(workKey: string): Promise<NormalizedBook | null> {
		try {
			// Use UK edition selection for best cover and metadata
			const [work, ukEditionResult] = await Promise.all([
				this.getWork(workKey),
				this.getBestEditionForUK(workKey)
			]);

			const edition = ukEditionResult?.edition || null;
			const coverUrlFromEdition = ukEditionResult?.coverUrl;

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
			const isbn13 = edition?.isbn_13?.[0];
			const isbn10 = edition?.isbn_10?.[0];

			// Prefer UK edition cover, fall back to work cover, then ISBN-based
			const coverUrl = coverUrlFromEdition
				|| getCoverUrl(work.covers?.[0], 'M')
				|| getFallbackCoverUrl(undefined, isbn13, isbn10, 'M');

			return {
				id: key,
				open_library_key: key,
				isbn_13: isbn13,
				isbn_10: isbn10,
				title: work.title,
				authors: authorNames,
				publisher: edition?.publishers?.[0],
				published_date: work.first_publish_date || edition?.publish_date,
				description,
				page_count: edition?.number_of_pages,
				cover_url: coverUrl,
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

