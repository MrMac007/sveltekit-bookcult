-- Fix Group Ratings RLS Policy
-- This allows users to see ratings for books on their group's reading lists

-- First, drop the old policy (if it exists)
DROP POLICY IF EXISTS "Users can view own ratings and group members ratings" ON ratings;

-- Create new policy that allows viewing ratings for books in group reading lists
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
