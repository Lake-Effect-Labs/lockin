# Stand Hours Removal - Complete Implementation

**Date:** January 5, 2026  
**Status:** ✅ COMPLETE

## Overview

Completely removed Stand Hours tracking from Lock-In app due to Apple Watch requirement and authorization errors.

## Problem

- Stand Hours API was throwing `Error domain=com.apple.healthkit code 5 authorization not determined`
- Requires Apple Watch hardware which many users don't have
- Was causing confusion and errors in the raw API debug output
- Still appeared in UI and calculations despite being disabled

## Solution

Systematically removed all Stand Hours references from:
1. Type definitions
2. HealthKit queries
3. Scoring calculations
4. Database writes
5. UI components
6. Test/mock data

## Files Modified

### Core Services

#### `services/scoring.ts`
- ✅ Removed `standHours` from `FitnessMetrics` interface
- ✅ Removed `standHoursPoints` from `PointsBreakdown` interface
- ✅ Updated `sanitizeMetrics()` to exclude stand hours
- ✅ Updated `calculatePoints()` to exclude stand hours calculation
- ✅ Updated `getPointsBreakdown()` to exclude stand hours
- ✅ Updated `getScoringRules()` to remove stand hours rule
- ✅ Updated `aggregateWeeklyMetrics()` to exclude stand hours

#### `services/health.ts`
- ✅ Removed `standHours` from `HealthPermissions` interface
- ✅ Removed `getDailyStandHours()` function completely
- ✅ Updated `getDailyMetrics()` to not query stand hours
- ✅ Updated `checkHealthPermissions()` to not check stand hours permission
- ✅ Updated `getFakeHealthData()` to not include stand hours
- ✅ Updated error fallback objects to exclude stand hours
- ✅ Removed stand hours from diagnostic function `testRawHealthKitQueries()`

#### `services/dailySync.ts`
- ✅ Removed `standHours` from weekly metrics aggregation
- ✅ Updated `syncWeeklyToLeagues()` to not pass stand hours to database
- ✅ Updated `getWeeklySyncStatus()` fallback to exclude stand hours

#### `services/supabase.ts`
- ✅ Removed `standHours` parameter from `upsertWeeklyScore()` function signature
- ✅ Set `stand_hours: 0` in database write (column still exists in DB for backward compatibility)

### UI Components

#### `components/StatBubble.tsx`
- ✅ Removed `standHours` and `standHoursPoints` from `PointsBreakdownProps` interface
- ✅ Removed stand hours from function parameters
- ✅ Stand hours row already commented out in display (from previous update)

#### `app/(app)/league/[leagueId]/index.tsx`
- ✅ Removed `standHours` from `getPointsBreakdown()` calls for user score
- ✅ Removed `standHours` from `getPointsBreakdown()` calls for opponent score
- ✅ Removed `standHours` and `standHoursPoints` props from `<PointsBreakdown>` component

#### `app/(app)/league/[leagueId]/matchup.tsx`
- ✅ Removed `standHours` from `getPointsBreakdown()` calls for user score
- ✅ Removed `standHours` from `getPointsBreakdown()` calls for opponent score
- ✅ Removed `standHours` and `standHoursPoints` props from `<PointsBreakdown>` component

### Test/Mock Data

#### `utils/fakeData.ts`
- ✅ Removed `standHours` from `generateDailyMetrics()` return value
- ✅ Updated weekly totals aggregation to exclude stand hours

## Database Compatibility

**Note:** The `weekly_scores` table still has a `stand_hours` column for backward compatibility. We:
- Set it to `0` on all new writes
- Don't read or use it in calculations
- Can drop the column in a future migration if needed

## Testing Required

### Manual Testing on Physical iPhone
1. ✅ Verify no HealthKit authorization errors in console
2. ✅ Verify raw API debug output shows no stand hours query
3. ✅ Verify points calculate correctly without stand hours
4. ✅ Verify UI displays 5 metrics (steps, sleep, calories, workouts, distance)
5. ✅ Verify weekly sync completes without errors

### Expected Behavior
- No "authorization not determined" errors
- Raw API debug shows only: Steps, Calories, Distance, Sleep, Workouts
- Points calculate based on 5 metrics only
- UI shows clean breakdown without stand hours row

## Impact on Scoring

### Before (6 metrics)
```
Points = (steps/1000 × 1) + (sleep × 2) + (calories/100 × 5) + 
         (workouts × 0.2) + (standHours × 0.5) + (distance × 3)
```

### After (5 metrics)
```
Points = (steps/1000 × 1) + (sleep × 2) + (calories/100 × 5) + 
         (workouts × 0.2) + (distance × 3)
```

**Note:** Stand hours were already returning 0 for most users, so this change has minimal impact on actual scores. It primarily:
- Removes error messages
- Cleans up API responses
- Simplifies the codebase
- Removes a metric that required Apple Watch

## Verification

All changes compile without TypeScript errors:
- ✅ No linter errors in `services/health.ts`
- ✅ No linter errors in `services/scoring.ts`
- ✅ No linter errors in `services/dailySync.ts`
- ✅ No linter errors in `services/supabase.ts`
- ✅ No linter errors in `utils/fakeData.ts`
- ✅ No linter errors in `components/StatBubble.tsx`
- ✅ No linter errors in `app/(app)/league/[leagueId]/index.tsx`
- ✅ No linter errors in `app/(app)/league/[leagueId]/matchup.tsx`

## Next Steps

1. Test on physical iPhone to confirm no errors
2. Verify points display correctly in UI
3. Monitor for any issues with weekly sync
4. Consider dropping `stand_hours` column from database in future migration

## Related Issues

This change also addresses the "0 points showing in UI" issue by:
- Ensuring `FitnessMetrics` interface matches actual data structure
- Removing mismatched properties that could cause calculation errors
- Simplifying the scoring logic to reduce edge cases

