-- Migration 028: Remove SQL Business Logic
-- Business logic has been migrated to TypeScript (services/leagueEngine.ts)
-- Supabase is now used purely for data storage and authentication
-- Date: January 6, 2026

-- ============================================
-- IMPORTANT: This migration removes SQL functions that are no longer used
-- All business logic is now handled in the application layer
-- ============================================

-- ============================================
-- STEP 1: Drop Triggers
-- These triggers are no longer needed as we calculate values in-app
-- ============================================

-- Drop the auto-calculate points trigger
DROP TRIGGER IF EXISTS weekly_scores_calculate_points ON weekly_scores;

-- Drop the league capacity check trigger (validation now done in-app)
DROP TRIGGER IF EXISTS check_league_capacity_trigger ON league_members;

-- ============================================
-- STEP 2: Drop Business Logic Functions
-- These functions have been moved to services/leagueEngine.ts
-- ============================================

-- Drop matchup generation (moved to generateMatchups in leagueEngine.ts)
DROP FUNCTION IF EXISTS generate_matchups(UUID);

-- Drop week finalization (moved to finalizeWeek in leagueEngine.ts)
DROP FUNCTION IF EXISTS finalize_week(UUID, INTEGER);

-- Drop playoff generation (moved to generatePlayoffs in leagueEngine.ts)
DROP FUNCTION IF EXISTS generate_playoffs(UUID);

-- Drop playoff match finalization (moved to finalizePlayoffMatch in leagueEngine.ts)
DROP FUNCTION IF EXISTS finalize_playoff_match(UUID);

-- Drop points calculation (moved to calculateTotalPoints in leagueEngine.ts)
DROP FUNCTION IF EXISTS calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL, JSONB);
DROP FUNCTION IF EXISTS calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL);

-- Drop trigger functions
DROP FUNCTION IF EXISTS auto_calculate_points();
DROP FUNCTION IF EXISTS check_league_capacity();

-- ============================================
-- STEP 3: Keep Utility Functions
-- These are still useful and don't contain business logic
-- ============================================

-- Keep: generate_join_code() - simple utility
-- Keep: update_updated_at() - simple trigger for updated_at timestamps

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE leagues IS 'League data. Business logic (matchup generation, week finalization, playoffs) is handled in services/leagueEngine.ts';
COMMENT ON TABLE matchups IS 'Weekly matchup data. Generated and finalized by services/leagueEngine.ts';
COMMENT ON TABLE weekly_scores IS 'Player weekly fitness scores. Points calculated in-app by services/leagueEngine.ts before insert';
COMMENT ON TABLE playoffs IS 'Playoff bracket data. Generated and finalized by services/leagueEngine.ts';
