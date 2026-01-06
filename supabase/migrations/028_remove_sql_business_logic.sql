-- Migration 028: Remove SQL Business Logic
-- Business logic has been migrated to TypeScript (services/leagueEngine.ts)
-- Supabase is now used purely for data storage and authentication
-- Date: January 6, 2026

-- ============================================
-- IMPORTANT: This migration removes ALL SQL functions and triggers
-- that contained business logic. All logic is now in the application layer.
-- ============================================

-- ============================================
-- STEP 1: Drop ALL Triggers
-- ============================================

-- Points calculation trigger (now done in app: leagueEngine.ts)
DROP TRIGGER IF EXISTS weekly_scores_calculate_points ON weekly_scores;

-- League capacity check trigger (now done in app: supabase.ts joinLeagueByCode)
DROP TRIGGER IF EXISTS check_league_capacity_trigger ON league_members;

-- Creator as admin trigger (now done in app: createLeague sets is_admin=true)
DROP TRIGGER IF EXISTS trigger_set_creator_admin ON leagues;

-- Scoring config snapshot trigger (now done in app: supabase.ts & admin.ts set season_scoring_config)
DROP TRIGGER IF EXISTS snapshot_scoring_config_trigger ON leagues;

-- Auto-create profile trigger (now done in app: useAuthStore.ts createProfile)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- STEP 2: Drop Business Logic Functions
-- All moved to services/leagueEngine.ts
-- ============================================

-- Matchup generation (moved to generateMatchups in leagueEngine.ts)
DROP FUNCTION IF EXISTS generate_matchups(UUID);

-- Week finalization (moved to finalizeWeek in leagueEngine.ts)
DROP FUNCTION IF EXISTS finalize_week(UUID, INTEGER);

-- Playoff generation (moved to generatePlayoffs in leagueEngine.ts)
DROP FUNCTION IF EXISTS generate_playoffs(UUID);

-- Playoff match finalization (moved to finalizePlayoffMatch in leagueEngine.ts)
DROP FUNCTION IF EXISTS finalize_playoff_match(UUID);

-- Points calculation - all overloads (moved to calculateTotalPoints in leagueEngine.ts)
DROP FUNCTION IF EXISTS calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL, INTEGER, JSONB);
DROP FUNCTION IF EXISTS calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL, JSONB);
DROP FUNCTION IF EXISTS calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL);

-- ============================================
-- STEP 3: Drop Trigger Functions
-- ============================================

-- Points auto-calculation trigger function
DROP FUNCTION IF EXISTS auto_calculate_points();

-- League capacity check trigger function
DROP FUNCTION IF EXISTS check_league_capacity();

-- Creator as admin trigger function
DROP FUNCTION IF EXISTS set_creator_as_admin();

-- Scoring config snapshot trigger function
DROP FUNCTION IF EXISTS snapshot_scoring_config_on_start();

-- Profile creation trigger function
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================
-- STEP 4: Drop Validation/Helper Functions
-- ============================================

-- Matchup validation (validation now in generateMatchups in leagueEngine.ts)
DROP FUNCTION IF EXISTS validate_matchup_no_duplicates(UUID, INTEGER);

-- Join code generation (now done in app: supabase.ts generateJoinCode)
DROP FUNCTION IF EXISTS generate_join_code();

-- Updated_at trigger function (keeping for now - harmless utility)
-- DROP FUNCTION IF EXISTS update_updated_at();

-- ============================================
-- STEP 5: Keep RLS Helper Function
-- This is required for Row Level Security policies to work
-- ============================================

-- KEEP: is_league_member(UUID, UUID) - Used by RLS policies
-- Without this function, RLS policies would break and users couldn't access their data

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE leagues IS 'League data. All business logic (matchup generation, week finalization, playoffs) is handled in TypeScript: services/leagueEngine.ts';
COMMENT ON TABLE league_members IS 'League membership data. Admin flag set in app on creation. Stats updated by leagueEngine.ts';
COMMENT ON TABLE matchups IS 'Weekly matchup data. Generated and finalized by services/leagueEngine.ts';
COMMENT ON TABLE weekly_scores IS 'Player weekly fitness scores. Points calculated in-app by services/leagueEngine.ts before insert';
COMMENT ON TABLE playoffs IS 'Playoff bracket data. Generated and finalized by services/leagueEngine.ts';
COMMENT ON TABLE users IS 'User profiles. Created by app on auth (useAuthStore.ts) not by database trigger';

-- ============================================
-- MIGRATION NOTES
-- ============================================
--
-- The following functions are KEPT because they are needed:
-- - is_league_member(UUID, UUID): Required for RLS policies
-- - update_updated_at(): Simple utility for updated_at timestamps (optional, can be removed)
--
-- All business logic has been moved to:
-- - services/leagueEngine.ts: Competition logic (matchups, finalization, playoffs)
-- - services/supabase.ts: Data access and league joining
-- - services/admin.ts: Admin actions (starting leagues)
-- - store/useAuthStore.ts: Profile creation on auth
--
