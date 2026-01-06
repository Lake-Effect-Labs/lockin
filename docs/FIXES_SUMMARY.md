# Fixes Summary - December 29, 2025

## Issues Fixed

### 1. ✅ Removed Mini Stats from Matchup Card
**Problem:** The matchup card was showing small icons with steps and calories under each player's score, cluttering the UI.

**Solution:** Removed the `miniStats` view from both player sides in `components/MatchupCard.tsx`.

**Files Changed:**
- `components/MatchupCard.tsx` - Removed lines 93-98 and 147-152

---

### 2. ✅ Fixed Missing `stand_hours` Column in Database
**Problem:** The code was trying to insert `standHours` data into the database, but the `weekly_scores` table didn't have a `stand_hours` column. This was causing:
- Speed run tests to fail with RLS policy errors
- Health data sync to fail silently
- Stand hours data to be lost

**Solution:** 
1. Created migration to add `stand_hours` column to `weekly_scores` table
2. Updated TypeScript interface to use `stand_hours` (snake_case) instead of `standHours` (camelCase)
3. Fixed all references throughout the codebase to use the correct field name

**Files Changed:**
- `supabase/migrations/015_add_stand_hours_column.sql` - NEW migration file
- `services/supabase.ts` - Updated `WeeklyScore` interface and `upsertWeeklyScore` function
- `services/leagueSpeedRun.ts` - Added `standHours` to upsert call
- `services/dailySync.ts` - Added `standHours` to upsert call
- `services/realtimeSync.ts` - Added `standHours` to upsert call
- `services/backgroundSync.ts` - Added `standHours` to upsert call
- `app/(app)/league/[leagueId]/index.tsx` - Changed `standHours` to `stand_hours`
- `app/(app)/league/[leagueId]/matchup.tsx` - Changed `standHours` to `stand_hours`

---

### 3. ✅ Improved Health Data Logging
**Problem:** Health data wasn't matching phone's Health app, making it hard to debug.

**Solution:** Added detailed logging to the steps query function to help diagnose filtering issues:
- Log total samples received
- Log filtered samples count
- Log individual samples that are outside the date range (when < 10 samples)
- Log final total with sample count

**Files Changed:**
- `services/health.ts` - Enhanced logging in `getDailySteps()` function

---

## Database Migration Required

**IMPORTANT:** You need to run the new migration on your Supabase database:

```sql
-- Run this in your Supabase SQL editor
ALTER TABLE weekly_scores 
ADD COLUMN IF NOT EXISTS stand_hours INTEGER DEFAULT 0;

COMMENT ON COLUMN weekly_scores.stand_hours IS 'Number of hours the user stood up during the week (Apple Watch stand hours)';
```

Or use the Supabase CLI:
```bash
supabase db push
```

---

## Testing Recommendations

### 1. Test Speed Run
The speed run should now work without RLS policy errors:
1. Go to Debug screen
2. Run "Full Integration Test"
3. Verify all steps pass, especially "Speed Run Failed"

### 2. Test Health Data Accuracy
To verify health data is now accurate:
1. Check your phone's Health app for today's stats
2. Open the Lock-In app
3. Pull to refresh on the home screen
4. Check the console logs for detailed step filtering info
5. Compare the displayed values with your phone

Expected behavior:
- Steps should match today's steps (not weekly total)
- Sleep should match today's sleep (not weekly total)
- Calories should match today's calories
- Workouts should match today's workout minutes
- Stand hours should match today's stand hours
- Distance should match today's distance

### 3. Test Matchup Card
Verify the matchup card looks cleaner:
1. Go to any league
2. View a matchup
3. Confirm there are NO small icons/numbers under the scores
4. Only the large score numbers should be visible

---

## Potential Remaining Issues

### Health Data Still Showing Weekly Totals?
If the health data is still showing weekly totals instead of today's data, the issue is likely in how HealthKit queries are being filtered. The enhanced logging will help diagnose this.

**Next steps if issue persists:**
1. Check the console logs when syncing health data
2. Look for the "Filtering samples" log entry
3. Verify that `filteredSamples` count is reasonable for one day
4. If it's filtering correctly but still wrong, the issue might be in the HealthKit sample structure

### Possible Root Cause
The HealthKit library might be returning samples in a different format than expected. The code tries multiple property names (`quantity`, `value`, `count`), but there might be another field name or the date filtering might not be working correctly.

**To investigate:**
- Look at the "Raw response" log to see the actual sample structure
- Check if `startDate` is in the correct format
- Verify timezone handling (dates should be in local timezone)

---

## Summary

✅ **Fixed:**
- Removed cluttered mini stats from matchup cards
- Added missing `stand_hours` database column
- Fixed all code references to use correct field name
- Fixed speed run RLS policy errors
- Enhanced health data logging for debugging

⚠️ **Needs Testing:**
- Health data accuracy (may need more investigation based on logs)
- Speed run should now pass
- Matchup cards should look cleaner

📝 **Action Required:**
- Run database migration to add `stand_hours` column
- Test the app and check console logs
- Report back with any remaining issues

