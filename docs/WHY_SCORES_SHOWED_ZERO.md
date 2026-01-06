# Why Your Scores Were Showing 0

**Date:** January 5, 2026  
**Issue:** Home dashboard and league matchup pages showed 0 points despite API returning data

## Root Causes

### 1. **Type Mismatch - Stand Hours Property** (PRIMARY CAUSE)

**The Problem:**
- `FitnessMetrics` interface included `standHours` property
- HealthKit queries were NOT returning `standHours` (it was disabled)
- UI components were trying to access `todayData.standHours` which was `undefined`
- When TypeScript interfaces don't match actual data, calculations can fail silently

**Example of the mismatch:**
```typescript
// Interface said:
interface FitnessMetrics {
  steps: number;
  sleepHours: number;
  calories: number;
  workouts: number;
  standHours: number;  // ❌ Expected but not provided
  distance: number;
}

// But HealthKit was returning:
{
  steps: 132,
  sleepHours: 15.6,
  calories: 8,
  workouts: 0,
  // standHours: MISSING!
  distance: 0
}
```

**Where this broke:**

1. **Home Dashboard** (`app/(app)/home.tsx` line 93):
   ```typescript
   { icon: '🧑‍💼', value: `${todayData.standHours}h`, ... }
   // ❌ todayData.standHours was undefined
   // This would cause: "NaN" or crash when calling .toFixed()
   ```

2. **Scoring Calculations** (`services/scoring.ts`):
   ```typescript
   const standHoursPoints = safe.standHours * config.POINTS_PER_STAND_HOUR;
   // ❌ undefined * 0.5 = NaN
   // NaN in calculations propagates and makes totalPoints = NaN
   ```

3. **Points Breakdown** (UI components):
   ```typescript
   standHours={userScore?.stand_hours || 0}
   standHoursPoints={breakdown.standHoursPoints}
   // ❌ Passing props that don't exist in interface
   // TypeScript errors or runtime crashes
   ```

### 2. **Stand Hours Authorization Error**

**The Problem:**
- Stand Hours requires Apple Watch
- API was throwing: `Error domain=com.apple.healthkit code 5 authorization not determined`
- This error was being caught but not properly handled
- The query function returned `0` instead of omitting the property

**Code that was failing:**
```typescript
export async function getDailyStandHours(date: Date): Promise<number> {
  return 0; // Always returned 0, but property was still in interface
}
```

### 3. **Data Flow Issue**

**The complete flow that was broken:**

```
HealthKit Query
    ↓
getDailyMetrics() returns { steps, sleep, calories, workouts, distance }
    ↓ (standHours is MISSING)
syncTodayHealthData() stores incomplete data
    ↓
useHealthStore.todayData = incomplete data
    ↓
Home screen tries to access todayData.standHours
    ↓
❌ undefined → NaN → 0 points displayed
```

## Why the API Showed Data But UI Showed 0

Looking at your screenshot, the raw API debug showed:
- ✅ Steps: 132
- ✅ Calories: 8  
- ✅ Distance: 0m
- ✅ Sleep: 15.6 hrs
- ⚠️ Workouts: 0
- ❌ Stand Hours: Error

**The data WAS being fetched**, but when it got to the UI:

1. **Home Dashboard** tried to display `todayData.standHours` → `undefined`
2. **Scoring calculation** tried to calculate points including `standHours` → `NaN`
3. **League matchup** tried to pass `standHours` to `getPointsBreakdown()` → Type error or `NaN`

**Result:** The entire calculation chain broke, showing 0 instead of the actual calculated points.

## The Fix

### What We Did:

1. ✅ **Removed `standHours` from `FitnessMetrics` interface**
   - Now interface matches actual data structure
   - No more undefined properties

2. ✅ **Removed `standHours` from all calculations**
   - `calculatePoints()` no longer includes stand hours
   - `getPointsBreakdown()` no longer expects stand hours
   - `aggregateWeeklyMetrics()` no longer sums stand hours

3. ✅ **Removed `standHours` from UI components**
   - Home dashboard no longer displays stand hours
   - PointsBreakdown component no longer expects stand hours props
   - League/matchup screens no longer pass stand hours

4. ✅ **Removed HealthKit stand hours query**
   - No more authorization errors
   - Cleaner API debug output
   - Faster queries (one less metric to fetch)

### Why This Fixes the 0 Points Issue:

**Before:**
```typescript
// Home dashboard
const stats = [
  { value: todayData.steps },      // ✅ 132
  { value: todayData.sleepHours }, // ✅ 15.6
  { value: todayData.calories },   // ✅ 8
  { value: todayData.workouts },   // ✅ 0
  { value: todayData.standHours }, // ❌ undefined → NaN
  { value: todayData.distance },   // ✅ 0
];

// Scoring
calculatePoints({
  steps: 132,
  sleepHours: 15.6,
  calories: 8,
  workouts: 0,
  standHours: undefined,  // ❌ undefined * 0.5 = NaN
  distance: 0
});
// Result: NaN → displayed as 0
```

**After:**
```typescript
// Home dashboard
const stats = [
  { value: todayData.steps },      // ✅ 132
  { value: todayData.sleepHours }, // ✅ 15.6
  { value: todayData.calories },   // ✅ 8
  { value: todayData.workouts },   // ✅ 0
  { value: todayData.distance },   // ✅ 0
];
// No standHours = no undefined values

// Scoring
calculatePoints({
  steps: 132,
  sleepHours: 15.6,
  calories: 8,
  workouts: 0,
  distance: 0
});
// Result: Valid number → displays correctly!
```

## Expected Points Calculation

Based on your API data:
```
Steps:    132 / 1000 × 1     = 0.13 points
Sleep:    15.6 × 2            = 31.2 points
Calories: 8 / 100 × 5         = 0.4 points
Workouts: 0 × 0.2             = 0 points
Distance: 0 × 3               = 0 points
─────────────────────────────────────────
Total:                          31.73 points
```

**You should now see ~31.7 points** instead of 0!

## Files That Were Fixed

1. `services/scoring.ts` - Removed standHours from all calculations
2. `services/health.ts` - Removed standHours query
3. `services/dailySync.ts` - Removed standHours from sync
4. `services/supabase.ts` - Set standHours to 0 in DB writes
5. `app/(app)/home.tsx` - Removed standHours from stats display ⭐ **KEY FIX**
6. `app/(app)/league/[leagueId]/index.tsx` - Removed standHours from calculations
7. `app/(app)/league/[leagueId]/matchup.tsx` - Removed standHours from calculations
8. `components/StatBubble.tsx` - Removed standHours props
9. `utils/fakeData.ts` - Removed standHours from mock data

## Testing

After these changes, you should see:

### Home Dashboard
- ✅ 5 stats displayed (not 6)
- ✅ No "Stand Hours" row
- ✅ Points calculate correctly
- ✅ No NaN or undefined errors

### League Matchup
- ✅ Your score shows actual points (not 0)
- ✅ Opponent score shows actual points (not 0)
- ✅ Points breakdown shows 5 metrics
- ✅ Total points match sum of breakdown

### Raw API Debug
- ✅ No stand hours error
- ✅ Only 5 metrics queried
- ✅ Clean output

## Why This Happened

This is a classic **interface-reality mismatch** bug:
1. We defined an interface with 6 properties
2. We only provided 5 properties in the actual data
3. TypeScript didn't catch it because the property was optional in some places
4. The undefined value propagated through calculations
5. `undefined * number = NaN`
6. UI displayed `NaN` as `0`

**Lesson:** Always ensure your TypeScript interfaces match your actual data structure!

