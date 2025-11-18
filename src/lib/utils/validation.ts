/**
 * Validation utilities for common data types
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
	return UUID_REGEX.test(value);
}

export function isValidISBN10(isbn: string): boolean {
	const cleaned = isbn.replace(/[-\s]/g, '');

	if (cleaned.length !== 10) return false;

	let sum = 0;
	for (let i = 0; i < 9; i++) {
		if (!/\d/.test(cleaned[i])) return false;
		sum += parseInt(cleaned[i]) * (10 - i);
	}

	const checkDigit = cleaned[9];
	if (checkDigit !== 'X' && !/\d/.test(checkDigit)) return false;

	sum += checkDigit === 'X' ? 10 : parseInt(checkDigit);

	return sum % 11 === 0;
}

export function isValidISBN13(isbn: string): boolean {
	const cleaned = isbn.replace(/[-\s]/g, '');

	if (cleaned.length !== 13) return false;
	if (!/^\d{13}$/.test(cleaned)) return false;

	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 3);
	}

	const checkDigit = parseInt(cleaned[12]);
	const calculatedCheck = (10 - (sum % 10)) % 10;

	return checkDigit === calculatedCheck;
}

export function isValidISBN(isbn: string): boolean {
	return isValidISBN10(isbn) || isValidISBN13(isbn);
}

export function isValidRating(rating: number): boolean {
	if (rating < 0.5 || rating > 5.0) return false;
	return (rating * 2) % 1 === 0;
}

export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
