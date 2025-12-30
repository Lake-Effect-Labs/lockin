# Health Data Debugging Guide

## Current Issue
Your phone shows:
- **3,603 steps** today
- **9hr 10min sleep** today
- **487 calories** today
- **1hr 1min workout** today
- **Stood most of the day**
- **0 miles** today

But the app shows:
- **7,500 steps** (labeled "Today's Stats")
- **30.0h sleep**
- **487 calories** ✅ Correct!
- **0m workouts**
- **0h stand hours**
- **0.0 miles** ✅ Correct!

## Root Cause Analysis

### The Problem
The app is displaying **weekly cumulative totals** instead of **today's individual stats**.

### Why This Happens
1. The home screen calls `syncWeekData()` which fetches Monday-Sunday data
2. It sets `todayData` to the last element of the week array
3. However, the HealthKit queries might be:
   - Not filtering by date correctly
   - Returning cumulative data instead of daily data
   - Using the wrong date range

### Evidence
- Steps: 7,500 (roughly 2x what phone shows) = likely 2 days of data
- Sleep: 30.0h (roughly 3-4 days of sleep) = definitely cumulative
- Calories: 487 ✅ matches exactly = this one is working!
- Workouts: 0m but phone shows 1hr 1min = not being captured
- Stand hours: 0h but phone shows "most of the day" = not being captured

## What I Fixed

### 1. Added Detailed Logging
The app now logs:
```
📊 [Steps] Filtering samples:
  dayStart: 2025-12-29T00:00:00.000Z
  dayEnd: 2025-12-29T23:59:59.999Z
  totalSamples: 100

📊 [Steps] Filtered samples: 15

📊 [Steps] Total calculated: 3603 from 15 samples
```

This will help us see:
- If the date filtering is working
- How many samples are being included
- What the actual total is

### 2. Fixed Database Schema
- Added `stand_hours` column to database
- Fixed all code to use correct field names
- This should fix the "0h stand hours" issue

### 3. Removed Clutter
- Removed the mini stats icons from matchup cards
- UI is now cleaner

## Next Steps for Debugging

### Step 1: Check the Logs
1. Open the app
2. Pull to refresh on home screen
3. Look at the console/terminal output
4. Find the lines that say `[Steps] Filtering samples`
5. Share those logs with me

### Step 2: Check What You'll See
Look for these specific log lines:

```
📊 [Steps] Query:
  from: ...
  to: ...

📊 [Steps] Raw response:
  isArray: true
  length: 100
  firstSample: {...}

📊 [Steps] Filtering samples:
  dayStart: ...
  dayEnd: ...
  totalSamples: 100

📊 [Steps] Filtered samples: 15

📊 [Steps] Total calculated: 3603 from 15 samples
```

### Step 3: Interpret the Results

**If `Filtered samples` is HIGH (50+):**
- The date filtering isn't working
- Samples from multiple days are being included
- Need to fix the date comparison logic

**If `Filtered samples` is LOW (10-20):**
- Date filtering is working
- But the samples might contain cumulative data
- Need to check the sample structure

**If `Total calculated` matches your phone:**
- ✅ Everything is working!
- The issue was just the database schema

**If `Total calculated` is still wrong:**
- The samples themselves contain wrong data
- Need to investigate HealthKit sample structure

## Possible Solutions

### Solution A: Use Different Query Method
Instead of `queryQuantitySamples` with filtering, use a statistics query:
```typescript
const result = await module.queryStatisticsForQuantity(
  'HKQuantityTypeIdentifierStepCount',
  {
    from: dayStart,
    to: dayEnd,
    statisticsType: 'cumulativeSum'
  }
);
```

### Solution B: Query with Date Range
Pass the date range directly to the query instead of filtering afterwards:
```typescript
const samples = await module.queryQuantitySamples(
  'HKQuantityTypeIdentifierStepCount',
  {
    from: dayStart,
    to: dayEnd,
  }
);
```

### Solution C: Use Today's Data Function
Instead of using the last element of the week array, call `syncTodayData()` separately:
```typescript
// In home screen
useEffect(() => {
  syncTodayData(); // Get today's data specifically
  syncWeekData();  // Get week data for totals
}, []);
```

## Testing Checklist

After the next build:
- [ ] Pull to refresh on home screen
- [ ] Check console logs for filtering info
- [ ] Compare steps with phone's Health app
- [ ] Compare sleep with phone's Health app
- [ ] Compare workouts with phone's Health app
- [ ] Compare stand hours with phone's Health app
- [ ] Verify "Today's Stats" shows TODAY not WEEK
- [ ] Verify "This Week's Stats" shows WEEK totals
- [ ] Run speed run test (should pass now)
- [ ] Check matchup cards (should be cleaner)

## Quick Reference: Where Data Comes From

### Home Screen "Today's Stats"
- Source: `useHealthStore().todayData`
- Set by: `syncWeekData()` → last element of week array
- **Issue**: Should use `syncTodayData()` instead

### Home Screen "This Week's Stats"  
- Source: `useHealthStore().weeklyTotals`
- Set by: `syncWeekData()` → aggregates all days
- **Status**: ✅ This should be correct

### League Dashboard "Your Week X Stats"
- Source: `weekly_scores` table in database
- Set by: `syncToAllLeagues()` → syncs week totals
- **Status**: ✅ Should be correct after database fix

### Matchup Screen "Your Week X Stats"
- Source: `weekly_scores` table in database
- Calculated by: `getPointsBreakdown()` from stored metrics
- **Status**: ✅ Should be correct after database fix

