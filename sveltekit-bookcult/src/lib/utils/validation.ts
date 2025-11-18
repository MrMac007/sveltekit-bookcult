/**
 * Validation utilities for common data types
 */

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Check if a string is a valid UUID (v4)
 * @param value - The string to validate
 * @returns true if the string is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * Check if a string is a valid ISBN-10
 * @param isbn - The ISBN to validate
 * @returns true if the ISBN-10 is valid
 */
export function isValidISBN10(isbn: string): boolean {
  // Remove hyphens and spaces
  const cleaned = isbn.replace(/[-\s]/g, '')

  if (cleaned.length !== 10) return false

  // ISBN-10 checksum validation
  let sum = 0
  for (let i = 0; i < 9; i++) {
    if (!/\d/.test(cleaned[i])) return false
    sum += parseInt(cleaned[i]) * (10 - i)
  }

  const checkDigit = cleaned[9]
  if (checkDigit !== 'X' && !/\d/.test(checkDigit)) return false

  sum += (checkDigit === 'X' ? 10 : parseInt(checkDigit))

  return sum % 11 === 0
}

/**
 * Check if a string is a valid ISBN-13
 * @param isbn - The ISBN to validate
 * @returns true if the ISBN-13 is valid
 */
export function isValidISBN13(isbn: string): boolean {
  // Remove hyphens and spaces
  const cleaned = isbn.replace(/[-\s]/g, '')

  if (cleaned.length !== 13) return false
  if (!/^\d{13}$/.test(cleaned)) return false

  // ISBN-13 checksum validation
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = parseInt(cleaned[12])
  const calculatedCheck = (10 - (sum % 10)) % 10

  return checkDigit === calculatedCheck
}

/**
 * Check if a string is a valid ISBN (either ISBN-10 or ISBN-13)
 * @param isbn - The ISBN to validate
 * @returns true if the ISBN is valid
 */
export function isValidISBN(isbn: string): boolean {
  return isValidISBN10(isbn) || isValidISBN13(isbn)
}

/**
 * Check if a rating value is valid (0.5 to 5.0 in 0.5 increments)
 * @param rating - The rating value to validate
 * @returns true if the rating is valid
 */
export function isValidRating(rating: number): boolean {
  if (rating < 0.5 || rating > 5.0) return false
  // Check if it's a multiple of 0.5
  return (rating * 2) % 1 === 0
}

/**
 * Check if an email address is valid (basic validation)
 * @param email - The email to validate
 * @returns true if the email appears valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
