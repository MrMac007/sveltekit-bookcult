-- Group Suggestions Feature Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLE: group_suggestion_rounds
-- Tracks the state of suggestion rounds per group
-- ============================================
CREATE TABLE group_suggestion_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'revealed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revealed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_active_round UNIQUE (group_id)
);

CREATE INDEX idx_suggestion_rounds_group ON group_suggestion_rounds(group_id);

-- ============================================
-- TABLE: group_suggestions
-- Individual member's ranked book suggestions
-- ============================================
CREATE TABLE group_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES group_suggestion_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_suggestion_per_user_book UNIQUE (round_id, user_id, book_id),
  CONSTRAINT unique_rank_per_user UNIQUE (round_id, user_id, rank)
);

CREATE INDEX idx_suggestions_round ON group_suggestions(round_id);
CREATE INDEX idx_suggestions_user ON group_suggestions(user_id);

-- ============================================
-- TABLE: group_suggestion_results
-- Calculated top 5 after reveal
-- ============================================
CREATE TABLE group_suggestion_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES group_suggestion_rounds(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  final_rank INTEGER NOT NULL CHECK (final_rank >= 1 AND final_rank <= 5),
  base_score INTEGER NOT NULL,
  overlap_bonus INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  member_count INTEGER NOT NULL,
  CONSTRAINT unique_result_per_book UNIQUE (round_id, book_id),
  CONSTRAINT unique_final_rank UNIQUE (round_id, final_rank)
);

CREATE INDEX idx_results_round ON group_suggestion_results(round_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- group_suggestion_rounds policies
ALTER TABLE group_suggestion_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rounds" ON group_suggestion_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_suggestion_rounds.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert rounds" ON group_suggestion_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_suggestion_rounds.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update rounds" ON group_suggestion_rounds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_suggestion_rounds.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete rounds" ON group_suggestion_rounds
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_suggestion_rounds.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- group_suggestions policies
ALTER TABLE group_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions" ON group_suggestions
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all suggestions in rounds for their groups (needed for reveal calculation)
CREATE POLICY "Admins can view all suggestions in their groups" ON group_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_suggestion_rounds r
      JOIN group_members gm ON gm.group_id = r.group_id
      WHERE r.id = group_suggestions.round_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own suggestions" ON group_suggestions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own suggestions" ON group_suggestions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own suggestions" ON group_suggestions
  FOR DELETE USING (user_id = auth.uid());

-- group_suggestion_results policies
ALTER TABLE group_suggestion_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view results when revealed" ON group_suggestion_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_suggestion_rounds r
      JOIN group_members gm ON gm.group_id = r.group_id
      WHERE r.id = group_suggestion_results.round_id
      AND gm.user_id = auth.uid()
      AND r.status = 'revealed'
    )
  );

-- Allow inserts (for when admin reveals - server handles auth)
CREATE POLICY "Allow result inserts" ON group_suggestion_results
  FOR INSERT WITH CHECK (true);
