-- Add Open Library engagement and metadata fields to books table
-- These fields store additional data from Open Library for display and future use

-- Edition count (number of editions available)
ALTER TABLE books ADD COLUMN IF NOT EXISTS edition_count integer;

-- Open Library ratings data
ALTER TABLE books ADD COLUMN IF NOT EXISTS ratings_average numeric(3,2);
ALTER TABLE books ADD COLUMN IF NOT EXISTS ratings_count integer;

-- Open Library engagement metrics (reader counts)
ALTER TABLE books ADD COLUMN IF NOT EXISTS want_to_read_count integer;
ALTER TABLE books ADD COLUMN IF NOT EXISTS currently_reading_count integer;
ALTER TABLE books ADD COLUMN IF NOT EXISTS already_read_count integer;

-- Derived popularity score for sorting/ranking
ALTER TABLE books ADD COLUMN IF NOT EXISTS popularity_score integer;

-- First publish year (more precise than published_date for some books)
ALTER TABLE books ADD COLUMN IF NOT EXISTS first_publish_year integer;

-- Add comments explaining the fields
COMMENT ON COLUMN books.edition_count IS 'Number of editions available on Open Library';
COMMENT ON COLUMN books.ratings_average IS 'Average rating from Open Library (1-5 scale)';
COMMENT ON COLUMN books.ratings_count IS 'Number of ratings on Open Library';
COMMENT ON COLUMN books.want_to_read_count IS 'Number of users who want to read this on Open Library';
COMMENT ON COLUMN books.currently_reading_count IS 'Number of users currently reading on Open Library';
COMMENT ON COLUMN books.already_read_count IS 'Number of users who have read this on Open Library';
COMMENT ON COLUMN books.popularity_score IS 'Calculated popularity score based on engagement metrics';
COMMENT ON COLUMN books.first_publish_year IS 'Year the book was first published';
