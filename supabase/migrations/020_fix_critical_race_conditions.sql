-- Migration 020: Fix Critical Race Conditions
-- Fix Plan Phase 1 - Trust Killers
-- Addresses: INV-1, INV-2, INV-3, INV-4, INV-5
-- Date: January 5, 2026

-- ============================================
-- PART 1: Add New Columns for Audit & Idempotency
-- ============================================

-- Add columns to matchups table for idempotent point accumulation
ALTER TABLE matchups 
ADD COLUMN IF NOT EXISTS points_added BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS p1_points_snapshot DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS p2_points_snapshot DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Add columns to leagues table for scoring freeze and audit
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS season_scoring_config JSONB,
ADD COLUMN IF NOT EXISTS last_week_finalized_at TIMESTAMPTZ;

-- Add column to league_members for playoff tiebreaker snapshot
ALTER TABLE league_members
ADD COLUMN IF NOT EXISTS playoff_tiebreaker_points DECIMAL(10,2);

-- ============================================
-- PART 2: Backfill Existing Data
-- ============================================

-- Backfill points_added flag for all existing finalized matchups
-- This ensures that if finalize_week() is called again on old weeks,
-- points won't be double-counted
UPDATE matchups
SET points_added = TRUE
WHERE is_finalized = TRUE AND points_added = FALSE;

-- Backfill season_scoring_config for all leagues that have started
-- (start_date is not NULL means league has started)
UPDATE leagues
SET season_scoring_config = scoring_config
WHERE start_date IS NOT NULL AND season_scoring_config IS NULL;

-- ============================================
-- PART 3: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN matchups.points_added IS 'Flag: TRUE if this matchup''s points have been added to league_members.total_points. Prevents double-counting on retry.';
COMMENT ON COLUMN matchups.p1_points_snapshot IS 'Audit: The exact points added for player1 when matchup was finalized.';
COMMENT ON COLUMN matchups.p2_points_snapshot IS 'Audit: The exact points added for player2 when matchup was finalized.';
COMMENT ON COLUMN matchups.finalized_at IS 'Audit: Timestamp when this matchup was finalized.';
COMMENT ON COLUMN leagues.season_scoring_config IS 'Frozen scoring config at season start. Used for all scoring calculations during the season. Prevents mid-season config changes from affecting fairness.';
COMMENT ON COLUMN leagues.last_week_finalized_at IS 'Audit: Timestamp when the last week was finalized.';
COMMENT ON COLUMN league_members.playoff_tiebreaker_points IS 'Frozen total_points snapshot at playoff generation. Used for playoff tiebreakers to prevent late health syncs from affecting playoff outcomes.';

