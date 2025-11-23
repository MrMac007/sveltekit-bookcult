/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "January 1, 2024")
 */
export function formatDate(dateString?: string | null): string {
	if (!dateString) return '';
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/**
 * Formats a date string to show relative time from today
 * @param dateString - ISO date string
 * @returns Relative time string (e.g., "Started today", "Started 3 days ago")
 */
export function formatRelativeTime(dateString?: string | null): string {
	if (!dateString) return '';

	const now = new Date();
	const start = new Date(dateString);
	const diffInDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

	if (diffInDays === 0) return 'Started today';
	if (diffInDays === 1) return 'Started yesterday';
	if (diffInDays < 7) return `Started ${diffInDays} days ago`;
	if (diffInDays < 30) {
		const weeks = Math.floor(diffInDays / 7);
		return `Started ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
	}
	if (diffInDays < 365) {
		const months = Math.floor(diffInDays / 30);
		return `Started ${months} ${months === 1 ? 'month' : 'months'} ago`;
	}
	const years = Math.floor(diffInDays / 365);
	return `Started ${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Gets the year from a date string
 * @param dateString - ISO date string
 * @returns Year as number or null
 */
export function getYear(dateString?: string | null): number | null {
	if (!dateString) return null;
	return new Date(dateString).getFullYear();
}

/**
 * Formats a date to short format (e.g., "Jan 1, 2024")
 * @param dateString - ISO date string
 * @returns Short formatted date string
 */
export function formatShortDate(dateString?: string | null): string {
	if (!dateString) return '';
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}
