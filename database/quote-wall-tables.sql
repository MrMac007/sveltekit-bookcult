-- Quote Wall Feature Migration
-- Creates tables for user quotes and favorite books, plus adds wall_style to profiles

-- Add wall_style column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS wall_style TEXT DEFAULT 'sticky-notes' 
CHECK (wall_style IN ('sticky-notes', 'typewriter', 'constellation'));

-- Create user_quotes table
CREATE TABLE IF NOT EXISTS user_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    quote_text TEXT NOT NULL CHECK (char_length(quote_text) <= 500),
    page_number INTEGER,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Limit to 10 quotes per user via application logic
    UNIQUE(user_id, book_id, quote_text)
);

-- Create favorite_books table
CREATE TABLE IF NOT EXISTS favorite_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL CHECK (display_order BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Each user can only have one book per display order slot
    UNIQUE(user_id, display_order),
    -- Each book can only be favorited once per user
    UNIQUE(user_id, book_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_quotes_user_id ON user_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotes_book_id ON user_quotes(book_id);
CREATE INDEX IF NOT EXISTS idx_favorite_books_user_id ON favorite_books(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_books_book_id ON favorite_books(book_id);

-- Enable Row Level Security
ALTER TABLE user_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_quotes
-- Anyone can view quotes (they're public on profiles)
CREATE POLICY "user_quotes_select_policy" ON user_quotes
    FOR SELECT USING (true);

-- Users can only insert their own quotes
CREATE POLICY "user_quotes_insert_policy" ON user_quotes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own quotes
CREATE POLICY "user_quotes_update_policy" ON user_quotes
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own quotes
CREATE POLICY "user_quotes_delete_policy" ON user_quotes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for favorite_books
-- Anyone can view favorite books (they're public on profiles)
CREATE POLICY "favorite_books_select_policy" ON favorite_books
    FOR SELECT USING (true);

-- Users can only insert their own favorites
CREATE POLICY "favorite_books_insert_policy" ON favorite_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own favorites
CREATE POLICY "favorite_books_update_policy" ON favorite_books
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own favorites
CREATE POLICY "favorite_books_delete_policy" ON favorite_books
    FOR DELETE USING (auth.uid() = user_id);

