-- Migration: Add Open Library key column to books table
-- This supports the hybrid search approach using Open Library as primary source

-- Add the open_library_key column
ALTER TABLE books
ADD COLUMN IF NOT EXISTS open_library_key TEXT;

-- Create index for faster lookups by Open Library key
CREATE INDEX IF NOT EXISTS idx_books_open_library_key
ON books (open_library_key)
WHERE open_library_key IS NOT NULL;

-- Add a unique constraint on open_library_key (allowing nulls)
-- This prevents duplicate Open Library entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_open_library_key_unique
ON books (open_library_key)
WHERE open_library_key IS NOT NULL;

-- Update the upsert conflict handling to also consider open_library_key
-- Note: This creates a partial unique index for deduplication

COMMENT ON COLUMN books.open_library_key IS 'Open Library work key (e.g., OL12345W). Primary source for book metadata.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'books'
  AND column_name = 'open_library_key';

