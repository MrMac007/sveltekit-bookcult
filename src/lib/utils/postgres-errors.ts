/**
 * PostgreSQL error codes and utilities
 */

export const POSTGRES_UNIQUE_VIOLATION = '23505';

interface PostgresError {
  code: string;
  message?: string;
}

/**
 * Type guard to check if an error is a Postgres unique constraint violation (duplicate key)
 */
export function isDuplicateKeyError(error: unknown): error is PostgresError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PostgresError).code === POSTGRES_UNIQUE_VIOLATION
  );
}
