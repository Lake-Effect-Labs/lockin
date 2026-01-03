# Scoring Calculation Audit Report
**Date:** 2026-01-03  
**Issue:** Matchup screen scoring accuracy verification

## Summary

Found **2 critical mismatches** between database and frontend scoring calculations that were causing incorrect scores to be displayed and stored.

---

## Issue #1: Workout Scoring (100x Inflation) 🔴 CRITICAL

### The Problem
- **Database SQL** (`calculate_points` in `001_initial_schema.sql`):
  ```sql
  POINTS_PER_WORKOUT CONSTANT DECIMAL := 20;
  total := ... + p_workouts * POINTS_PER_WORKOUT
  ```
  - Treats `workouts` as a **count** (e.g., 2 workouts = 40 points)

- **Frontend TypeScript** (`services/scoring.ts`):
  ```typescript
  POINTS_PER_WORKOUT_MINUTE: 0.2,  // 1 point per 5 minutes
  workoutsPoints = safe.workouts * scoringConfig.POINTS_PER_WORKOUT_MINUTE;
  ```
  - Treats `workouts` as **minutes** (e.g., 30 minutes = 6 points)

### The Impact
When health data syncs from HealthKit:
1. Frontend fetches workout duration: **30 minutes**
2. Stores in DB: `workouts: 30`
3. DB trigger calculates: `30 × 20 = 600 points` ❌ (100x too high!)
4. User sees inflated score: **600 points** instead of **6 points**

### Example Score Inflation
User with 30-minute workout:
- **Expected score:** 6 points
- **Actual database score:** 600 points
- **Inflation factor:** 100x

---

## Issue #2: Stand Hours Not Calculated 🔴 CRITICAL

### The Problem
- `stand_hours` column was added to `weekly_scores` table in migration 015
- But the SQL `calculate_points()` function was **never updated** to include it
- Frontend calculates: `standHours × 5 points/hour`
- Database calculates: **0 points** (ignored completely)

### The Impact
User with 12 stand hours:
- **Expected score:** 60 points
- **Actual database score:** 0 points
- **Missing points:** 60 points per user per week

---

## Scoring Flow (Current Architecture)

### How Scores Are Calculated

```
HealthKit Data → Frontend Fetch
       ↓
services/health.ts
  - getDailySteps() → count
  - getDailySleep() → hours
  - getDailyCalories() → kcal
  - getDailyWorkouts() → MINUTES
  - getDailyStandHours() → hours
  - getDailyDistance() → miles
       ↓
services/dailySync.ts
  - Aggregates daily → weekly totals
  - Stores in weekly_scores table
       ↓
DATABASE TRIGGER (weekly_scores)
  - auto_calculate_points() fires on INSERT/UPDATE
  - Calls calculate_points(steps, sleep, calories, workouts, distance)
  - Sets total_points column
       ↓
Frontend Display
  - Option 1: Use stored total_points (❌ WRONG if DB calc is wrong)
  - Option 2: Recalculate locally with getPointsBreakdown() (✅ CORRECT)
```

### Current Display Logic

**League Dashboard** (`app/(app)/league/[leagueId]/index.tsx`):
```typescript
// Recalculates points locally for accuracy
breakdown = getPointsBreakdown({
  steps: userScore.steps || 0,
  sleepHours: userScore.sleep_hours || 0,
  calories: userScore.calories || 0,
  workouts: userScore.workouts || 0,
  standHours: userScore.stand_hours || 0,
  distance: userScore.distance || 0,
}, leagueScoringConfig);

// Uses recalculated total
const myScore = breakdown?.totalPoints ?? userScore?.total_points;
```

**Matchup Card** (`components/MatchupCard.tsx`):
```typescript
// Priority: calculated > stored > matchup
const myScore = calculatedMyScore ?? userScore?.total_points ?? matchup.player1_score;
```

This means the **frontend display is actually correct** because it recalculates locally, but the **database-stored values are wrong**, which affects:
- Week finalization (uses DB scores)
- Historical data
- Any queries that rely on `total_points` column

---

## The Fix

Created migration `019_fix_workout_scoring_calculation.sql`:

### 1. Fixed `calculate_points()` function
```sql
CREATE OR REPLACE FUNCTION calculate_points(
    p_steps INTEGER,
    p_sleep_hours DECIMAL,
    p_calories INTEGER,
    p_workouts INTEGER,
    p_distance DECIMAL,
    p_stand_hours INTEGER DEFAULT 0  -- ✅ Added
)
RETURNS DECIMAL AS $$
DECLARE
    POINTS_PER_WORKOUT_MINUTE CONSTANT DECIMAL := 0.2;  -- ✅ Changed from 20
    POINTS_PER_STAND_HOUR CONSTANT DECIMAL := 5;        -- ✅ Added
BEGIN
    total := (p_steps / 1000.0) * 1
           + p_sleep_hours * 2
           + (p_calories / 100.0) * 5
           + p_workouts * 0.2               -- ✅ Now treats as minutes
           + COALESCE(p_stand_hours, 0) * 5 -- ✅ Now includes stand hours
           + p_distance * 3;
    RETURN ROUND(total, 2);
END;
```

### 2. Updated trigger to pass `stand_hours`
```sql
CREATE OR REPLACE FUNCTION auto_calculate_points()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_points := calculate_points(
        NEW.steps,
        NEW.sleep_hours,
        NEW.calories,
        NEW.workouts,
        NEW.distance,
        COALESCE(NEW.stand_hours, 0)  -- ✅ Now passed to function
    );
    RETURN NEW;
END;
```

---

## Verification Steps

After running migration 019:

1. **Test new score inserts:**
   ```typescript
   // Sync health data with known values
   await syncUserScore(leagueId, userId, currentWeek, {
     steps: 10000,      // Should give: 10 points
     sleepHours: 8,     // Should give: 16 points
     calories: 500,     // Should give: 25 points
     workouts: 30,      // Should give: 6 points (not 600!)
     standHours: 12,    // Should give: 60 points (not 0!)
     distance: 5,       // Should give: 15 points
   });
   // Expected total_points: 132 points
   ```

2. **Check database calculation:**
   ```sql
   SELECT 
     steps, sleep_hours, calories, workouts, stand_hours, distance,
     total_points,
     calculate_points(steps, sleep_hours, calories, workouts, distance, stand_hours) as recalculated
   FROM weekly_scores
   WHERE user_id = 'xxx' AND week_number = Y;
   ```

3. **Verify matchup display:**
   - Open league dashboard
   - Check that your score matches opponent score display format
   - Check that breakdown shows correct points per category
   - Verify workout points are reasonable (< 100 for typical 30-60 min workouts)
   - Verify stand hours contribute to total

---

## Impact on Existing Data

⚠️ **IMPORTANT:** This migration does **NOT** recalculate existing `weekly_scores` rows.

### Why?
- Trigger only fires on INSERT/UPDATE
- Existing rows remain unchanged

### Options for Existing Data

**Option 1:** Leave as-is (recommended for active leagues)
- Historical data stays "wrong" but consistent
- New data will be correct going forward
- Avoids mid-season disruption

**Option 2:** Recalculate all scores (use with caution)
```sql
-- This will trigger auto_calculate_points for all rows
UPDATE weekly_scores 
SET total_points = calculate_points(
  steps, 
  sleep_hours, 
  calories, 
  workouts, 
  distance, 
  COALESCE(stand_hours, 0)
);

-- Then update all matchup scores from recalculated weekly_scores
UPDATE matchups m
SET 
  player1_score = (
    SELECT total_points FROM weekly_scores 
    WHERE league_id = m.league_id 
    AND user_id = m.player1_id 
    AND week_number = m.week_number
  ),
  player2_score = (
    SELECT total_points FROM weekly_scores 
    WHERE league_id = m.league_id 
    AND user_id = m.player2_id 
    AND week_number = m.week_number
  );
```

---

## Scoring Formula Reference

### Default Scoring (per day, then aggregated weekly)

| Metric | Formula | Example | Points |
|--------|---------|---------|--------|
| Steps | `steps / 1000 × 1` | 10,000 steps | 10 |
| Sleep | `hours × 2` | 8 hours | 16 |
| Calories | `calories / 100 × 5` | 500 cal | 25 |
| Workouts | `minutes × 0.2` | 30 min | 6 |
| Stand Hours | `hours × 5` | 12 hours | 60 |
| Distance | `miles × 3` | 5 miles | 15 |
| **TOTAL** | | | **132** |

### Weekly Totals
Daily metrics are aggregated Monday-Sunday, then points calculated:
- Steps: sum across 7 days
- Sleep: sum across 7 days
- Calories: sum across 7 days
- Workouts: sum across 7 days
- Stand Hours: sum across 7 days
- Distance: sum across 7 days

---

## Related Files

- `supabase/migrations/001_initial_schema.sql` - Original (broken) `calculate_points()`
- `supabase/migrations/015_add_stand_hours_column.sql` - Added column but didn't update function
- `supabase/migrations/019_fix_workout_scoring_calculation.sql` - **This fix**
- `services/scoring.ts` - Frontend scoring logic (correct)
- `services/health.ts` - Health data fetching
- `services/dailySync.ts` - Weekly aggregation
- `app/(app)/league/[leagueId]/index.tsx` - Dashboard display
- `components/MatchupCard.tsx` - Matchup display

---

## Conclusion

✅ **Database scoring now matches frontend scoring**  
✅ **Workout points will be 100x lower (correct)**  
✅ **Stand hours now contribute to scores**  
✅ **New syncs will have accurate total_points**  

⚠️ **Existing data NOT recalculated** (requires manual UPDATE if desired)

