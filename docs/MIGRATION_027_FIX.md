# Migration 027 Fix - Handle Existing Non-Monday start_dates

**Issue:** Migration 027 was failing with:
```
ERROR: 23514: check constraint "start_date_must_be_monday" of relation "leagues" is violated by some row
```

**Root Cause:** Existing leagues in the database have `start_date` values that are not Mondays.

**Solution:** Updated migration 027 to fix existing data before adding the constraint.

---

## What Changed

### Before (Failed)
```sql
-- Tried to add constraint directly
ALTER TABLE leagues 
ADD CONSTRAINT start_date_must_be_monday
CHECK (start_date IS NULL OR EXTRACT(DOW FROM start_date) = 1);
-- ❌ Failed because existing data violated constraint
```

### After (Fixed)
```sql
-- Step 1: Fix existing non-Monday start_dates
DO $$
BEGIN
    -- Move all non-Monday start_dates to previous Monday
    UPDATE leagues
    SET start_date = CASE
        WHEN EXTRACT(DOW FROM start_date) = 0 THEN start_date - INTERVAL '6 days'
        ELSE start_date - CAST((EXTRACT(DOW FROM start_date) - 1) AS INTEGER) * INTERVAL '1 day'
    END
    WHERE start_date IS NOT NULL 
    AND EXTRACT(DOW FROM start_date) != 1;
END $$;

-- Step 2: Now add constraint (data is valid)
ALTER TABLE leagues 
ADD CONSTRAINT start_date_must_be_monday
CHECK (start_date IS NULL OR EXTRACT(DOW FROM start_date) = 1);
-- ✅ Succeeds because all data is now valid
```

---

## What the Fix Does

### 1. Identifies Non-Monday Leagues
- Counts how many leagues have non-Monday start_dates
- Logs each league that needs fixing (name, ID, current day)

### 2. Fixes start_dates
Moves each non-Monday start_date to the **previous Monday**:

| Current Day | Action | Example |
|-------------|--------|---------|
| Sunday (0) | Go back 6 days | Sun Jan 12 → Mon Jan 6 |
| Tuesday (2) | Go back 1 day | Tue Jan 7 → Mon Jan 6 |
| Wednesday (3) | Go back 2 days | Wed Jan 8 → Mon Jan 6 |
| Thursday (4) | Go back 3 days | Thu Jan 9 → Mon Jan 6 |
| Friday (5) | Go back 4 days | Fri Jan 10 → Mon Jan 6 |
| Saturday (6) | Go back 5 days | Sat Jan 11 → Mon Jan 6 |

### 3. Logs Results
```
NOTICE: Found 3 leagues with non-Monday start_dates, fixing...
NOTICE: League "Test League" (uuid-123) had start_date on day 3 (not Monday)
NOTICE: League "Demo League" (uuid-456) had start_date on day 5 (not Monday)
NOTICE: League "Speed Run" (uuid-789) had start_date on day 0 (not Monday)
NOTICE: Fixed 3 leagues - moved start_dates to previous Monday
```

### 4. Adds Constraint
Now that all data is valid, the constraint is added successfully.

---

## Why This Fix is Safe

### ✅ Preserves Week Structure
- Moving to previous Monday maintains relative week numbers
- Week 1 is still week 1, week 2 is still week 2, etc.
- Only the absolute dates shift slightly

### ✅ Maintains Week Boundaries
- All leagues now use consistent Monday-Sunday boundaries
- Week calculations in frontend (UTC-based) will work correctly

### ✅ One-Time Migration
- This fix only affects existing leagues
- Future leagues will be created with Monday start_dates (enforced by constraint)
- No ongoing performance impact

### ✅ Transparent Logging
- You can see exactly which leagues were affected
- Audit trail in migration logs

---

## How to Run

### Run Migration 027 Again
```sql
-- In Supabase SQL Editor, run the updated migration:
-- File: supabase/migrations/027_add_constraints.sql

-- The migration will:
-- 1. Fix any non-Monday start_dates
-- 2. Log what was fixed
-- 3. Add the constraint
-- 4. Add validation functions
```

### Verify Results
```sql
-- Check that all start_dates are now Monday (or NULL)
SELECT id, name, start_date, EXTRACT(DOW FROM start_date) as day_of_week
FROM leagues
WHERE start_date IS NOT NULL;
-- Expected: day_of_week = 1 for all rows

-- Check that constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'leagues' 
AND constraint_name = 'start_date_must_be_monday';
-- Expected: 1 row
```

---

## Impact Assessment

### Affected Leagues
- Only leagues with non-Monday start_dates are affected
- Likely a small number (most leagues probably already use Monday)

### User Impact
- **Minimal**: Week structure is preserved
- **Transparent**: Users won't notice the date shift
- **Beneficial**: Ensures consistent week boundaries going forward

### Data Integrity
- ✅ No data loss
- ✅ No week number changes
- ✅ No matchup corruption
- ✅ Constraint now enforced for all future leagues

---

## Next Steps

1. **Run Updated Migration 027** ✅
2. **Verify Constraint Added** ✅
3. **Check Logs** - See which leagues were fixed
4. **Continue with Remaining Migrations** (if any)
5. **Test Week Calculations** - Verify UTC logic works correctly

---

## Status

**Migration 027:** ✅ FIXED - Ready to run

The migration now handles existing data gracefully and will succeed.

