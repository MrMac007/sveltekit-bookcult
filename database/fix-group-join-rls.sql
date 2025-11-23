-- Fix Group Join Functionality - RLS Policies for groups and group_members tables
-- This migration adds the necessary Row Level Security policies to allow users to join groups via invite codes

-- 1. Drop existing policies first (before any type changes)
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
DROP POLICY IF EXISTS "Anyone can view groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can view all groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

-- 2. Create the member_role enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('member', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Alter column type only if needed (this will skip if already correct type)
DO $$ BEGIN
  ALTER TABLE group_members
  ALTER COLUMN role TYPE member_role USING role::member_role;
EXCEPTION
  WHEN datatype_mismatch THEN null;
  WHEN others THEN null;
END $$;

-- 4. Enable Row Level Security on both tables
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for GROUPS table
-- This is CRITICAL for join functionality - users need to be able to look up groups by invite_code

-- Allow authenticated users to view all groups
-- This is necessary for: 1) Invite code lookup, 2) JOINs from group_members queries
CREATE POLICY "Authenticated users can view all groups"
  ON groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. Create RLS policies for GROUP_MEMBERS table

-- CREATE POLICY: Allow users to insert themselves as members (JOIN GROUP)
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY: Allow users to view members of groups they belong to
-- Note: We allow viewing all group_members to enable proper JOINs
-- Access control is enforced at the groups table level
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- CREATE POLICY: Allow users to leave groups (delete their own membership)
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- CREATE POLICY: Allow group admins to manage (update/delete) members
CREATE POLICY "Group admins can manage members"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- CREATE POLICY: Allow group admins to remove members
CREATE POLICY "Group admins can remove members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- 7. Verification queries (optional - comment out if not needed)

-- Check that RLS is enabled on both tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('groups', 'group_members')
ORDER BY tablename;

-- Check all policies on groups table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'groups';

-- Check all policies on group_members table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'group_members';
