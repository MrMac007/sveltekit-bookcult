/**
 * Central constants file for BookCult
 *
 * Consolidates magic numbers and configuration values
 * that are used across multiple files.
 */

// =============================================================================
// API URLs
// =============================================================================

export const OPEN_LIBRARY_API_URL = 'https://openlibrary.org';
export const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
export const COVERS_API_URL = 'https://covers.openlibrary.org';

// =============================================================================
// API Configuration
// =============================================================================

/** Default timeout for external API requests (10 seconds) */
export const API_TIMEOUT_MS = 10000;

/** Maximum retry attempts for failed API requests */
export const MAX_RETRIES = 3;

/** Initial delay before retrying a failed request (1 second) */
export const INITIAL_RETRY_DELAY_MS = 1000;

/** Maximum concurrent requests to external APIs */
export const MAX_CONCURRENT_REQUESTS = 5;

// =============================================================================
// Cache Configuration
// =============================================================================

/** How long recommendations stay valid (5 days) */
export const RECOMMENDATIONS_CACHE_DAYS = 5;

/** Minimum days between auto-refresh of recommendations (7 days) */
export const MIN_AUTO_REFRESH_DAYS = 7;

/** Number of wishlist adds from recommendations before triggering refresh */
export const WISHLIST_ADDS_THRESHOLD = 3;

/** Default cache duration for book data (30 days in seconds) */
export const BOOK_CACHE_SECONDS = 30 * 24 * 60 * 60;

// =============================================================================
// UI Limits
// =============================================================================

/** Default number of search results to show */
export const DEFAULT_SEARCH_LIMIT = 20;

/** Maximum authors to fetch details for */
export const MAX_AUTHORS_TO_FETCH = 5;

/** Maximum categories/subjects to include */
export const MAX_CATEGORIES = 5;

// =============================================================================
// Recommendations
// =============================================================================

/** Minimum number of 4+ star ratings required for recommendations */
export const MIN_RATINGS_FOR_RECOMMENDATIONS = 3;

/** Minimum rating to consider a book "highly rated" */
export const HIGH_RATING_THRESHOLD = 4.0;

/** Maximum recommendations to generate */
export const MAX_RECOMMENDATIONS = 5;
