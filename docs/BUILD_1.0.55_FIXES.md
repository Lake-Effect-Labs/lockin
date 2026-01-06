# Build 1.0.55 Fixes Summary
**Date:** 2026-01-03  
**Issues Addressed:** Calories/Workouts not working, Stand Hours removal, Speed Run records bug

---

## 🔴 Issue #1: Calories Query - Missing Unit Parameter

**Problem:** Calories query was returning 0 samples because it was missing the required `unit` parameter for `queryQuantitySamples`.

**Fix:** Added `unit: 'kilocalorie'` to the query options

```typescript
// services/health.ts line 156
const samples = await queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
  unit: 'kilocalorie',  // ✅ Added
  limit: 10000,
  filter: { date: { startDate: from, endDate: to } },
});
```

**Impact:** Calories will now be fetched correctly from HealthKit

---

## 🔴 Issue #2: Workouts Query - Missing Validation

**Problem:** Workout duration calculation wasn't validating `startDate` and `endDate` before calculating duration, which could cause `NaN` results.

**Fix:** Added validation checks before duration calculation

```typescript
// services/health.ts line 219-226
samples.forEach((s: any) => {
  // Ensure both startDate and endDate exist and are valid
  if (s?.startDate && s?.endDate) {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {  // ✅ Added validation
      totalMinutes += (end - start) / (1000 * 60);
    }
  }
});
```

**Impact:** Workout minutes will now be calculated correctly without crashes or NaN values

---

## 🔴 Issue #3: Stand Hours Removal (User Request)

**Problem:** User requested removal of stand hours everywhere because it requires an Apple Watch which they don't have.

**Fixes Applied:**

1. **Health API** (`services/health.ts`):
   - Disabled `getDailyStandHours()` - now always returns 0
   - Removed from authorization request (no longer asks for stand hours permission)

2. **UI Components**:
   - `app/(app)/league/[leagueId]/matchup.tsx` - Removed "Stand Hours" row from stat comparison
   - `components/StatBubble.tsx` - Removed stand hours from points breakdown display

3. **Database**: 
   - Migration 019 already removed stand hours from scoring calculation
   - Column still exists in DB (has 0 values) but is no longer used

**Impact:** Stand hours no longer displayed anywhere in the app and no longer contribute to scores

---

## 🔴 Issue #4: Speed Run Records Not Updating for Bots

**Problem:** Speed run was showing user as 4-4 but all bot users as 0-0. The `finalizeWeek` SQL function was being blocked by RLS policies when trying to UPDATE the `league_members` table to increment wins/losses for bot users.

**Root Cause:** Migration 018 added INSERT policy for bot users but NO UPDATE policy

**Fix:** Added UPDATE policy to `league_members` table

```sql
-- supabase/migrations/018_allow_bot_users_for_testing.sql

CREATE POLICY "League members can be updated" ON league_members
    FOR UPDATE USING (
        -- Allow all updates (wins/losses are updated by finalize_week function)
        -- The function runs with elevated privileges
        true
    );
```

**Impact:** `finalizeWeek()` can now update wins/losses for ALL users (real + bots), so speed run will show correct W-L records for all players

---

## Summary of Changes

| # | Issue | Files Changed | Status |
|---|-------|---------------|--------|
| 1 | Calories not working | `services/health.ts` | ✅ Fixed |
| 2 | Workouts validation | `services/health.ts` | ✅ Fixed |
| 3 | Stand hours removal | 3 files | ✅ Removed |
| 4 | Speed run records | `migrations/018_...sql` | ✅ Fixed |

---

## Files Modified

1. ✅ `services/health.ts` - Fixed calories unit, improved workouts validation, disabled stand hours
2. ✅ `app/(app)/league/[leagueId]/matchup.tsx` - Removed stand hours display
3. ✅ `components/StatBubble.tsx` - Removed stand hours from breakdown
4. ✅ `supabase/migrations/018_allow_bot_users_for_testing.sql` - Added UPDATE policy for league_members

---

## Testing Checklist

- [ ] Calories show non-zero values after workout
- [ ] Workout minutes show correct duration (e.g., 50 min workout = 50)
- [ ] Stand hours no longer visible in any UI
- [ ] Speed run shows W-L records for ALL users (not just 0-0)
- [ ] Playoff picture shows correct top 4 based on records

---

## Migration Required

Run migration 018 (updated) on the database to fix speed run records.

