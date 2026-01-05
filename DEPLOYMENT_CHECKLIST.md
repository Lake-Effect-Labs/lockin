# Lock-In Competition System Fix - Deployment Checklist

**Date:** January 5, 2026  
**Status:** Ready for Deployment  
**Estimated Time:** 30-45 minutes

---

## Pre-Deployment Checklist

### ☐ 1. Review Implementation
- [ ] Read `IMPLEMENTATION_COMPLETE.md` for full details
- [ ] Read `FIX_IMPLEMENTATION_SUMMARY.md` for quick reference
- [ ] Understand all 7 invariants being enforced
- [ ] Review rollback plan

### ☐ 2. Backup Database
```bash
# Create full database backup
pg_dump -h your-supabase-host.supabase.co -U postgres -d postgres > lockin_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file created
ls -lh lockin_backup_*.sql
```

### ☐ 3. Prepare Test Environment
- [ ] Create test league with 4+ users
- [ ] Prepare concurrent test scripts
- [ ] Set up monitoring/logging

---

## Deployment Steps

### Phase 1: Database Migrations (Critical - Do Not Skip)

#### ☐ Step 1: Migration 020 - Add Columns & Backfill
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/020_fix_critical_race_conditions.sql

-- Expected: 7 new columns added, existing data backfilled
-- Time: ~5 seconds
-- Verify:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'matchups' AND column_name = 'points_added';
-- Should return: points_added
```

#### ☐ Step 2: Migration 021 - Fix finalize_week()
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/021_fix_finalize_week_idempotency.sql

-- Expected: finalize_week() function replaced
-- Time: ~2 seconds
-- Verify:
SELECT proname FROM pg_proc WHERE proname = 'finalize_week';
-- Should return: finalize_week
```

#### ☐ Step 3: Migration 022 - Fix RLS Security
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/022_fix_rls_security_holes.sql

-- Expected: 5 policies dropped, 3 policies created
-- Time: ~2 seconds
-- Verify:
SELECT policyname FROM pg_policies WHERE tablename = 'league_members';
-- Should return: "Users cannot modify competition data", "Users can join leagues", etc.
```

#### ☐ Step 4: Migration 023 - Fix Playoffs Idempotency
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/023_fix_playoffs_idempotency.sql

-- Expected: generate_playoffs() function replaced
-- Time: ~2 seconds
-- Verify:
SELECT proname FROM pg_proc WHERE proname = 'generate_playoffs';
-- Should return: generate_playoffs
```

#### ☐ Step 5: Migration 024 - Fix Playoff Tiebreaker
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/024_fix_playoff_tiebreaker.sql

-- Expected: finalize_playoff_match() function replaced
-- Time: ~2 seconds
-- Verify:
SELECT proname FROM pg_proc WHERE proname = 'finalize_playoff_match';
-- Should return: finalize_playoff_match
```

#### ☐ Step 6: Migration 025 - Fix Scoring Config Freeze
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/025_fix_scoring_config_freeze.sql

-- Expected: auto_calculate_points(), calculate_points() updated, trigger created
-- Time: ~3 seconds
-- Verify:
SELECT proname FROM pg_proc WHERE proname = 'snapshot_scoring_config_on_start';
-- Should return: snapshot_scoring_config_on_start
```

#### ☐ Step 7: Migration 026 - Fix Workout Units
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/026_fix_workout_units.sql

-- Expected: Existing leagues updated with new key name
-- Time: ~3 seconds
-- Verify:
SELECT scoring_config FROM leagues WHERE scoring_config ? 'points_per_workout_minute' LIMIT 1;
-- Should return: scoring_config with points_per_workout_minute key
```

#### ☐ Step 8: Migration 027 - Add Constraints
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/027_add_constraints.sql

-- Expected: CHECK constraint added, generate_matchups() updated, validation function created
-- Time: ~3 seconds
-- Verify:
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'leagues' AND constraint_name = 'start_date_must_be_monday';
-- Should return: start_date_must_be_monday
```

---

### Phase 2: Frontend Deployment

#### ☐ Step 9: Deploy Frontend Changes
```bash
# Frontend changes already in utils/dates.ts
# No additional code changes needed

# Build and deploy
npm run build

# Or deploy to Expo
eas build --platform all
```

---

### Phase 3: Verification

#### ☐ Step 10: Verify Database State
```sql
-- Check all new columns exist
SELECT 
  table_name, 
  column_name 
FROM information_schema.columns 
WHERE table_name IN ('matchups', 'leagues', 'league_members')
AND column_name IN (
  'points_added', 'p1_points_snapshot', 'p2_points_snapshot', 'finalized_at',
  'season_scoring_config', 'last_week_finalized_at',
  'playoff_tiebreaker_points'
)
ORDER BY table_name, column_name;

-- Expected: 7 rows (all new columns)
```

```sql
-- Check all constraints exist
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'leagues' 
AND constraint_name = 'start_date_must_be_monday';

-- Expected: 1 row
```

```sql
-- Check all functions updated
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'finalize_week',
  'generate_playoffs',
  'finalize_playoff_match',
  'generate_matchups',
  'auto_calculate_points',
  'calculate_points',
  'snapshot_scoring_config_on_start',
  'validate_matchup_no_duplicates'
)
ORDER BY proname;

-- Expected: 8 rows (all functions)
```

```sql
-- Check RLS policies updated
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'league_members', 'matchups', 'playoffs')
ORDER BY tablename, policyname;

-- Expected: Restrictive policies, no bot creation, no competition data modification
```

---

### Phase 4: Functional Testing

#### ☐ Test 1: Idempotent Week Finalization
```sql
-- Create test league with matchups
-- Call finalize_week() multiple times
SELECT finalize_week('test-league-uuid', 1);
SELECT finalize_week('test-league-uuid', 1);
SELECT finalize_week('test-league-uuid', 1);

-- Verify week advanced exactly once
SELECT current_week FROM leagues WHERE id = 'test-league-uuid';
-- Expected: 2 (not 4)

-- Verify points added exactly once
SELECT 
  user_id,
  total_points,
  (SELECT SUM(total_points) FROM weekly_scores WHERE league_id = 'test-league-uuid' AND user_id = league_members.user_id) as weekly_sum
FROM league_members 
WHERE league_id = 'test-league-uuid';
-- Expected: total_points = weekly_sum for all users
```

#### ☐ Test 2: Idempotent Playoff Generation
```sql
-- Call generate_playoffs() multiple times
SELECT generate_playoffs('test-league-uuid');
SELECT generate_playoffs('test-league-uuid');
SELECT generate_playoffs('test-league-uuid');

-- Verify playoffs generated exactly once
SELECT COUNT(*) FROM playoffs WHERE league_id = 'test-league-uuid';
-- Expected: 2 (semifinals only)

SELECT COUNT(*) FROM league_members 
WHERE league_id = 'test-league-uuid' AND playoff_seed IS NOT NULL;
-- Expected: 4 (top 4 players)
```

#### ☐ Test 3: RLS Security
```sql
-- As regular user (not service role), try to modify competition data
-- This should FAIL with policy violation
UPDATE league_members SET total_points = 9999 WHERE user_id = auth.uid();
-- Expected: ERROR: new row violates row-level security policy

-- Try to create bot user
-- This should FAIL with policy violation
INSERT INTO users (id, email) VALUES (gen_random_uuid(), 'bot@test.com');
-- Expected: ERROR: new row violates row-level security policy
```

#### ☐ Test 4: Scoring Config Freeze
```sql
-- Start a league
UPDATE leagues SET start_date = CURRENT_DATE WHERE id = 'test-league-uuid';

-- Verify season_scoring_config populated
SELECT season_scoring_config FROM leagues WHERE id = 'test-league-uuid';
-- Expected: Non-null, equals scoring_config

-- Change scoring_config
UPDATE leagues SET scoring_config = '{"points_per_1000_steps": 10}' WHERE id = 'test-league-uuid';

-- Insert new weekly_score
INSERT INTO weekly_scores (league_id, user_id, week_number, steps) 
VALUES ('test-league-uuid', 'test-user-uuid', 1, 10000);

-- Verify uses frozen config (not new config)
SELECT total_points FROM weekly_scores 
WHERE league_id = 'test-league-uuid' AND user_id = 'test-user-uuid' AND week_number = 1;
-- Expected: 10 points (1 point per 1000 steps), not 100 points
```

#### ☐ Test 5: Playoff Tiebreaker Snapshot
```sql
-- Generate playoffs
SELECT generate_playoffs('test-league-uuid');

-- Record playoff_tiebreaker_points
SELECT user_id, playoff_tiebreaker_points, total_points 
FROM league_members 
WHERE league_id = 'test-league-uuid' AND playoff_seed IS NOT NULL;

-- Sync late health data (updates total_points)
INSERT INTO weekly_scores (league_id, user_id, week_number, steps) 
VALUES ('test-league-uuid', 'test-user-uuid', 6, 20000);

-- Verify playoff_tiebreaker_points unchanged
SELECT user_id, playoff_tiebreaker_points, total_points 
FROM league_members 
WHERE league_id = 'test-league-uuid' AND playoff_seed IS NOT NULL;
-- Expected: playoff_tiebreaker_points same as before, total_points updated
```

#### ☐ Test 6: Monday Constraint
```sql
-- Try to set start_date to Tuesday
UPDATE leagues SET start_date = '2026-01-07' WHERE id = 'test-league-uuid';
-- Expected: ERROR: new row violates check constraint "start_date_must_be_monday"

-- Try to set start_date to Monday
UPDATE leagues SET start_date = '2026-01-06' WHERE id = 'test-league-uuid';
-- Expected: Success
```

#### ☐ Test 7: UTC Week Calculations
```typescript
// In frontend console or test file
import { getWeekNumber, getDaysRemainingInWeek, isResultsDay } from './utils/dates';

// Test week number calculation
const startDate = new Date('2026-01-06T00:00:00Z'); // Monday in UTC
const currentDate = new Date('2026-01-12T23:59:59Z'); // Sunday in UTC
console.log(getWeekNumber(startDate, currentDate)); // Expected: 1

const currentDate2 = new Date('2026-01-13T00:00:00Z'); // Monday in UTC
console.log(getWeekNumber(startDate, currentDate2)); // Expected: 2

// Test days remaining
console.log(getDaysRemainingInWeek(startDate, 1)); // Should be consistent across timezones

// Test Results Day
const sunday = new Date('2026-01-12T00:00:00Z');
console.log(isResultsDay(sunday)); // Expected: true

const monday = new Date('2026-01-13T00:00:00Z');
console.log(isResultsDay(monday)); // Expected: false
```

---

### Phase 5: Monitoring

#### ☐ Step 11: Set Up Monitoring
```sql
-- Monitor for policy violations
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%violates row-level security%' 
ORDER BY last_exec DESC LIMIT 10;

-- Monitor advisory lock wait times
SELECT * FROM pg_stat_activity 
WHERE wait_event_type = 'Lock' 
AND wait_event = 'advisory';

-- Monitor for duplicate week advancements (should be 0)
SELECT league_id, COUNT(*) as finalization_count
FROM (
  SELECT DISTINCT league_id, week_number, finalized_at
  FROM matchups
  WHERE is_finalized = TRUE
) sub
GROUP BY league_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

---

## Post-Deployment Checklist

### ☐ 1. Verify All Tests Passed
- [ ] Test 1: Idempotent week finalization ✅
- [ ] Test 2: Idempotent playoff generation ✅
- [ ] Test 3: RLS security ✅
- [ ] Test 4: Scoring config freeze ✅
- [ ] Test 5: Playoff tiebreaker snapshot ✅
- [ ] Test 6: Monday constraint ✅
- [ ] Test 7: UTC week calculations ✅

### ☐ 2. Monitor Production for 24 Hours
- [ ] No policy violation errors
- [ ] No duplicate week advancements
- [ ] No duplicate playoff generation
- [ ] Advisory lock wait times < 100ms
- [ ] All audit timestamps being set

### ☐ 3. Update Documentation
- [ ] Mark deployment date in `IMPLEMENTATION_COMPLETE.md`
- [ ] Update README with new invariants
- [ ] Document any production issues encountered

### ☐ 4. Notify Team
- [ ] Inform team that fixes are deployed
- [ ] Share `FIX_IMPLEMENTATION_SUMMARY.md`
- [ ] Provide contact for any issues

---

## Rollback Procedure (If Needed)

### Option 1: Rollback Migrations
```sql
-- Run rollback scripts in REVERSE order
-- 8. Drop constraints from 027
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS start_date_must_be_monday;
DROP FUNCTION IF EXISTS validate_matchup_no_duplicates(UUID, INTEGER);
-- Restore old generate_matchups()

-- 7. Revert workout unit changes from 026
-- (No rollback needed - just key name changes)

-- 6. Revert scoring config changes from 025
-- Restore old auto_calculate_points(), calculate_points()

-- 5. Revert playoff tiebreaker from 024
-- Restore old finalize_playoff_match()

-- 4. Revert playoff idempotency from 023
-- Restore old generate_playoffs()

-- 3. Revert RLS changes from 022
-- Restore old policies

-- 2. Revert finalize_week from 021
-- Restore old finalize_week()

-- 1. Drop new columns from 020
ALTER TABLE matchups DROP COLUMN IF EXISTS points_added;
ALTER TABLE matchups DROP COLUMN IF EXISTS p1_points_snapshot;
ALTER TABLE matchups DROP COLUMN IF EXISTS p2_points_snapshot;
ALTER TABLE matchups DROP COLUMN IF EXISTS finalized_at;
ALTER TABLE leagues DROP COLUMN IF EXISTS season_scoring_config;
ALTER TABLE leagues DROP COLUMN IF EXISTS last_week_finalized_at;
ALTER TABLE league_members DROP COLUMN IF EXISTS playoff_tiebreaker_points;
```

### Option 2: Restore from Backup
```bash
# Stop all connections to database
# Restore from backup
psql -h your-supabase-host.supabase.co -U postgres -d postgres < lockin_backup_YYYYMMDD_HHMMSS.sql
```

---

## Success Criteria

### Before Deployment ❌
- Week could advance multiple times
- Points could be double-counted
- Scoring config could change mid-season
- Playoffs could be generated multiple times
- Playoff outcomes affected by late syncs
- Users could modify competition data
- Week boundaries varied by timezone

### After Deployment ✅
- Week advances exactly once
- Points counted exactly once
- Scoring config frozen at season start
- Playoffs generated exactly once
- Playoff outcomes deterministic
- Competition data protected by RLS
- Week boundaries consistent (UTC)

---

## Support

For issues during deployment:
1. Check `IMPLEMENTATION_COMPLETE.md` for detailed explanations
2. Review `docs/FIX_PLAN.md` for original specifications
3. Review rollback procedure above
4. Contact: [Your contact info]

---

**Status:** Ready for Deployment  
**Risk Level:** Low (all changes are additive or restrictive)  
**Estimated Downtime:** 0 minutes (migrations are non-blocking)

**The Lock-In competition system is ready to be trustworthy.**

