/**
 * Book Data Refresh Script
 *
 * This script updates existing books in the database with better data from Open Library.
 * It's designed to run incrementally and safely - it won't overwrite AI-enhanced data.
 *
 * Usage:
 *   npx tsx scripts/refresh-book-data.ts [--dry-run] [--limit=N] [--force]
 *
 * Options:
 *   --dry-run   Preview changes without updating the database
 *   --limit=N   Only process N books (useful for testing)
 *   --force     Update all fields, even if they already have values
 *   --missing   Only update books missing key data (page_count, description)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';

// Open Library API helper (simplified version for CLI)
const OPEN_LIBRARY_API = 'https://openlibrary.org';
const COVERS_API = 'https://covers.openlibrary.org';

interface OpenLibrarySearchDoc {
	key: string;
	title: string;
	author_name?: string[];
	first_publish_year?: number;
	isbn?: string[];
	cover_i?: number;
	number_of_pages_median?: number;
	publisher?: string[];
	subject?: string[];
}

interface RefreshResult {
	bookId: string;
	title: string;
	status: 'updated' | 'skipped' | 'error' | 'not_found';
	changes?: string[];
	error?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const missingOnly = args.includes('--missing');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Error: Missing Supabase credentials.');
	console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
	process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Search Open Library by ISBN
 */
async function searchByISBN(isbn: string): Promise<OpenLibrarySearchDoc | null> {
	try {
		const url = new URL(`${OPEN_LIBRARY_API}/search.json`);
		url.searchParams.set('isbn', isbn);
		url.searchParams.set('limit', '1');
		url.searchParams.set('fields', 'key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median,publisher,subject');

		const response = await fetch(url.toString(), {
			headers: { 'User-Agent': 'BookCult/1.0 (book-refresh-script)' }
		});

		if (!response.ok) return null;

		const data = await response.json();
		return data.docs?.[0] || null;
	} catch {
		return null;
	}
}

/**
 * Search Open Library by title and author
 */
async function searchByTitleAuthor(title: string, author?: string): Promise<OpenLibrarySearchDoc | null> {
	try {
		const url = new URL(`${OPEN_LIBRARY_API}/search.json`);
		let query = title;
		if (author) query += ` author:${author}`;

		url.searchParams.set('q', query);
		url.searchParams.set('limit', '5');
		url.searchParams.set('fields', 'key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median,publisher,subject');

		const response = await fetch(url.toString(), {
			headers: { 'User-Agent': 'BookCult/1.0 (book-refresh-script)' }
		});

		if (!response.ok) return null;

		const data = await response.json();

		// Find best match
		const titleLower = title.toLowerCase();
		const docs = data.docs || [];

		// Prefer exact title match
		const exactMatch = docs.find((d: OpenLibrarySearchDoc) =>
			d.title.toLowerCase() === titleLower
		);
		if (exactMatch) return exactMatch;

		// Fall back to first result if title is similar
		if (docs.length > 0 && docs[0].title.toLowerCase().includes(titleLower.substring(0, 10))) {
			return docs[0];
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Get cover URL from Open Library cover ID
 * Using ?default=false to get 404 instead of transparent pixel for missing covers
 */
function getCoverUrl(coverId: number | undefined): string | undefined {
	if (!coverId) return undefined;
	return `${COVERS_API}/b/id/${coverId}-M.jpg?default=false`;
}

/**
 * Extract Open Library key from full path
 */
function extractKey(key: string): string {
	return key.split('/').pop() || key;
}

/**
 * Refresh a single book's data
 */
async function refreshBook(book: Database['public']['Tables']['books']['Row']): Promise<RefreshResult> {
	const result: RefreshResult = {
		bookId: book.id,
		title: book.title,
		status: 'skipped',
		changes: []
	};

	try {
		// Try to find the book in Open Library
		let olDoc: OpenLibrarySearchDoc | null = null;

		// Try ISBN first (most reliable)
		if (book.isbn_13) {
			olDoc = await searchByISBN(book.isbn_13);
		}
		if (!olDoc && book.isbn_10) {
			olDoc = await searchByISBN(book.isbn_10);
		}

		// Fall back to title + author search
		if (!olDoc) {
			olDoc = await searchByTitleAuthor(book.title, book.authors?.[0]);
		}

		if (!olDoc) {
			result.status = 'not_found';
			return result;
		}

		// Build update object
		const updates: Partial<Database['public']['Tables']['books']['Update']> = {};

		// Open Library key (always update if found)
		const olKey = extractKey(olDoc.key);
		if (!book.open_library_key || force) {
			updates.open_library_key = olKey;
			result.changes!.push(`open_library_key: ${olKey}`);
		}

		// Page count (only if missing or force)
		if (olDoc.number_of_pages_median && (!book.page_count || force)) {
			updates.page_count = olDoc.number_of_pages_median;
			result.changes!.push(`page_count: ${olDoc.number_of_pages_median}`);
		}

		// Cover URL (only if missing or force)
		const coverUrl = getCoverUrl(olDoc.cover_i);
		if (coverUrl && (!book.cover_url || force)) {
			updates.cover_url = coverUrl;
			result.changes!.push('cover_url: updated');
		}

		// Publisher (only if missing or force)
		if (olDoc.publisher?.[0] && (!book.publisher || force)) {
			updates.publisher = olDoc.publisher[0];
			result.changes!.push(`publisher: ${olDoc.publisher[0]}`);
		}

		// Published date (only if missing or force)
		if (olDoc.first_publish_year && (!book.published_date || force)) {
			updates.published_date = olDoc.first_publish_year.toString();
			result.changes!.push(`published_date: ${olDoc.first_publish_year}`);
		}

		// Categories/subjects (only if empty or force, and not AI-enhanced)
		if (olDoc.subject && olDoc.subject.length > 0) {
			const categories = olDoc.subject.filter((s) => s.length < 50).slice(0, 5);
			if (categories.length > 0 && (book.categories.length === 0 || force) && !book.ai_enhanced) {
				updates.categories = categories;
				result.changes!.push(`categories: ${categories.join(', ')}`);
			}
		}

		// ISBN backfill (if missing)
		if (!book.isbn_13 && olDoc.isbn) {
			const isbn13 = olDoc.isbn.find((i) => i.length === 13);
			if (isbn13) {
				updates.isbn_13 = isbn13;
				result.changes!.push(`isbn_13: ${isbn13}`);
			}
		}
		if (!book.isbn_10 && olDoc.isbn) {
			const isbn10 = olDoc.isbn.find((i) => i.length === 10);
			if (isbn10) {
				updates.isbn_10 = isbn10;
				result.changes!.push(`isbn_10: ${isbn10}`);
			}
		}

		// Skip if no changes
		if (Object.keys(updates).length === 0) {
			result.status = 'skipped';
			return result;
		}

		// Update timestamp
		updates.last_updated = new Date().toISOString();

		// Apply update (or just report in dry-run mode)
		if (dryRun) {
			result.status = 'updated';
			console.log(`[DRY RUN] Would update "${book.title}":`, result.changes);
		} else {
			const { error } = await supabase
				.from('books')
				.update(updates)
				.eq('id', book.id);

			if (error) {
				result.status = 'error';
				result.error = error.message;
			} else {
				result.status = 'updated';
			}
		}

		return result;
	} catch (error) {
		result.status = 'error';
		result.error = error instanceof Error ? error.message : 'Unknown error';
		return result;
	}
}

/**
 * Main function
 */
async function main() {
	console.log('📚 Book Data Refresh Script');
	console.log('='.repeat(50));
	console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
	console.log(`Force update: ${force}`);
	console.log(`Missing data only: ${missingOnly}`);
	if (limit) console.log(`Limit: ${limit} books`);
	console.log('='.repeat(50));
	console.log('');

	// Build query
	let query = supabase
		.from('books')
		.select('*')
		.order('last_updated', { ascending: true }); // Oldest first

	// Filter to books missing key data if --missing flag
	if (missingOnly) {
		query = query.or('page_count.is.null,description.is.null,open_library_key.is.null');
	}

	// Apply limit
	if (limit) {
		query = query.limit(limit);
	}

	const { data: books, error } = await query;

	if (error) {
		console.error('Error fetching books:', error);
		process.exit(1);
	}

	if (!books || books.length === 0) {
		console.log('No books to process.');
		process.exit(0);
	}

	console.log(`Found ${books.length} books to process.\n`);

	// Process books with rate limiting
	const results: RefreshResult[] = [];
	let processed = 0;

	for (const book of books) {
		processed++;
		process.stdout.write(`\r[${processed}/${books.length}] Processing: ${book.title.substring(0, 40)}...`);

		const result = await refreshBook(book);
		results.push(result);

		// Rate limit: 1 request per second to be nice to Open Library
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	console.log('\n\n');

	// Summary
	const updated = results.filter((r) => r.status === 'updated').length;
	const skipped = results.filter((r) => r.status === 'skipped').length;
	const notFound = results.filter((r) => r.status === 'not_found').length;
	const errors = results.filter((r) => r.status === 'error').length;

	console.log('📊 Summary');
	console.log('='.repeat(50));
	console.log(`✅ Updated: ${updated}`);
	console.log(`⏭️  Skipped: ${skipped}`);
	console.log(`❓ Not found: ${notFound}`);
	console.log(`❌ Errors: ${errors}`);

	// Show errors if any
	if (errors > 0) {
		console.log('\n❌ Errors:');
		results
			.filter((r) => r.status === 'error')
			.forEach((r) => {
				console.log(`  - ${r.title}: ${r.error}`);
			});
	}

	// Show updated books
	if (updated > 0 && !dryRun) {
		console.log('\n✅ Updated books:');
		results
			.filter((r) => r.status === 'updated')
			.slice(0, 10)
			.forEach((r) => {
				console.log(`  - ${r.title}: ${r.changes?.join(', ')}`);
			});
		if (updated > 10) {
			console.log(`  ... and ${updated - 10} more`);
		}
	}
}

main().catch(console.error);

