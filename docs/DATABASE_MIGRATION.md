# Database Migration: Add display_order to group_books

## Date
2025-11-18

## Description
Add a `display_order` column to the `group_books` table to support drag-and-drop reordering of books in the "Up Next" section.

## Migration SQL

### Part 1: Add Column and Index

```sql
-- Add display_order column to group_books table
ALTER TABLE group_books 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_group_books_display_order 
ON group_books(group_id, display_order);

-- Optional: Set initial display_order values based on added_at
-- This gives existing books an order based on when they were added
UPDATE group_books 
SET display_order = sub.row_num - 1
FROM (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY added_at) as row_num
  FROM group_books
  WHERE display_order IS NULL
) sub
WHERE group_books.id = sub.id;
```

### Part 2: RLS Policies (REQUIRED)

```sql
-- Enable RLS on group_books table
ALTER TABLE group_books ENABLE ROW LEVEL SECURITY;

-- Allow group admins to update group books
DROP POLICY IF EXISTS "Group admins can update group books" ON group_books;

CREATE POLICY "Group admins can update group books"
ON group_books
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_books.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_books.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Allow group members to view group books
DROP POLICY IF EXISTS "Group members can view group books" ON group_books;

CREATE POLICY "Group members can view group books"
ON group_books
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_books.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Allow group admins to insert books
DROP POLICY IF EXISTS "Group admins can add books" ON group_books;

CREATE POLICY "Group admins can add books"
ON group_books
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_books.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Allow group admins to delete books
DROP POLICY IF EXISTS "Group admins can delete books" ON group_books;

CREATE POLICY "Group admins can delete books"
ON group_books
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_books.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);
```

## Rollback SQL

```sql
-- Remove the display_order column
ALTER TABLE group_books 
DROP COLUMN IF EXISTS display_order;

-- Remove the index
DROP INDEX IF EXISTS idx_group_books_display_order;
```

## Changes Made

### New Features
1. **Fixed Group Books Display**: Group books now only shows books that are:
   - On the group's reading list (in `group_books` table)
   - Have at least one rating from a group member

2. **Up Next Section**: New section displaying books on the reading list that haven't been rated yet
   - Shows books in order based on `display_order` field
   - Falls back to `added_at` date if `display_order` is null

3. **Admin Drag-and-Drop**: Admins can reorder books in the "Up Next" section
   - Drag-and-drop interface with visual feedback
   - Automatically saves the new order
   - Updates `display_order` values in `group_books` table

### Files Modified
- `src/routes/groups/[groupId]/+page.server.ts` - Updated to fetch reading list and filter ratings
- `src/lib/actions/groups.ts` - Added `reorderReadingList` action
- `src/lib/types/database.ts` - Added `group_books` table type definition
- `src/routes/groups/[groupId]/+page.svelte` - Added UpNext component

### Files Created
- `src/lib/components/groups/up-next-section.svelte` - New component for unrated books with drag-and-drop

## Usage

### For Admins
1. Navigate to your group page
2. In the sidebar, you'll see the "Up Next" section below the current book
3. Drag books up or down to reorder them
4. The order saves automatically

### For Members
1. View the "Up Next" section to see what books the group plans to read
2. Books are shown in the order set by admins

## Notes
- The `display_order` column is nullable to support legacy data
- Books without a `display_order` value will be sorted by `added_at` date
- The feature is backward compatible - existing groups will work without running the migration
- Running the migration is recommended for optimal performance

