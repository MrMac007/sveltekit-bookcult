-- Complete RLS Policies for Ratings Table
-- This includes all CRUD operations for ratings

-- Enable RLS on ratings table
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own ratings and group members ratings" ON ratings;
DROP POLICY IF EXISTS "Users can view ratings in their groups" ON ratings;
DROP POLICY IF EXISTS "Users can create their own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON ratings;

-- Policy 1: SELECT - Users can view their own ratings and ratings from group members
CREATE POLICY "Users can view ratings in their groups" ON ratings
  FOR SELECT
  USING (
    -- Users can always see their own ratings
    user_id = auth.uid()
    OR
    -- Users can see ratings for books that are on reading lists of groups they're in
    EXISTS (
      SELECT 1
      FROM group_books gb
      INNER JOIN group_members gm ON gb.group_id = gm.group_id
      WHERE gb.book_id = ratings.book_id
        AND gm.user_id = auth.uid()
    )
  );

-- Policy 2: INSERT - Users can create their own ratings
CREATE POLICY "Users can create their own ratings" ON ratings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE - Users can update their own ratings
CREATE POLICY "Users can update their own ratings" ON ratings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE - Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON ratings
  FOR DELETE
  USING (auth.uid() = user_id);
