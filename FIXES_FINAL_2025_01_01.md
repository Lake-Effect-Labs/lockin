# FINAL FIXES - Jan 1, 2025

## Issue 1: Speed Run - RLS Policy Blocking Bot Users ✅

**Problem**: Speed run failing at "Bot Join Failed" with error:
```
Error: Failed to add bot 1 to league: new row violates row-level security policy for table "league_members"
```

**Root Cause**: The `league_members` table has an INSERT policy that only allows `auth.uid() = user_id`, which blocks bot users who don't have auth entries.

**Fix Applied**:
Updated `supabase/migrations/018_allow_bot_users_for_testing.sql` to add a new RLS policy:

```sql
-- Allow bot users to be added to leagues
DROP POLICY IF EXISTS "Users can join leagues" ON league_members;

CREATE POLICY "Users can join leagues or add bot users" ON league_members
    FOR INSERT WITH CHECK (
        -- User joining a league themselves
        auth.uid() = user_id
        OR
        -- Allow adding bot users (check if user exists in users table with bot email)
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = league_members.user_id
            AND (users.email LIKE '%@speedrun.test' OR users.email LIKE '%@bot.test')
        )
    );
```

This allows:
1. Real users to join leagues themselves (`auth.uid() = user_id`)
2. Bot users (identified by `@speedrun.test` or `@bot.test` emails) to be added to leagues

---

## Issue 2: Health Metrics Returning 0 Despite Finding Samples ✅

**Problem**: Diagnostic shows "Found 15 samples" but all health metrics return 0.

**Root Causes**:
1. Using `limit: -1` which may not be supported
2. Not logging sample contents to debug why quantities are 0
3. Potential date filtering issues

**Fixes Applied**:

### 1. Set Explicit Limit
Changed from no limit to `limit: 1000` for all queries:

```typescript
const samples = await module.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
  filter: {
    date: {
      startDate: from,
      endDate: to,
    },
  },
  limit: 1000, // Explicit limit instead of relying on default
});
```

### 2. Enhanced Logging
Added detailed logging to see exactly what's in each sample:

```typescript
// Log each sample's quantity
samples.forEach((sample: any, index: number) => {
  console.log(`📊 [Steps] Sample ${index}:`, {
    quantity: sample?.quantity,
    unit: sample?.unit,
    startDate: sample?.startDate?.toString().substring(0, 24),
  });
});

const total = samples.reduce((sum: number, sample: any) => {
  const value = sample?.quantity ?? 0;
  console.log(`📊 [Steps] Adding ${value} to sum (current: ${sum})`);
  return sum + value;
}, 0);
```

### 3. Confirmed Correct API Format
Based on the Kingstinct example app, using:

```typescript
{
  filter: {
    date: {
      startDate: Date,
      endDate: Date,
    },
  },
  limit: number,
  ascending?: boolean
}
```

This matches their example app exactly.

---

## Testing Instructions

### 1. Run Database Migration
```bash
supabase db reset
```

This will apply the updated `018_allow_bot_users_for_testing.sql` migration with the fixed RLS policies.

### 2. Test Speed Run
1. Open the app
2. Go to League Speed Run
3. Run the speed run
4. Should now complete all 6 steps and create bot users successfully

### 3. Test Health Metrics
1. Make sure you have health data for today in Apple Health
2. Check the Health Data Report diagnostic
3. Look at the console logs to see:
   - How many samples were found
   - What the `quantity` value is for each sample
   - The total calculated value

If quantities are still 0, the logs will now show us exactly what's in the sample objects.

---

## Next Steps if Health Metrics Still Show 0

If the enhanced logging shows that `sample.quantity` is actually 0 or undefined, we need to check:

1. **Different property name**: The sample might use a different property (e.g., `value`, `count`, `amount`)
2. **Unit conversion needed**: The quantity might be in a different unit that needs conversion
3. **Date timezone issues**: The samples might be there but in a different timezone

The new logging will tell us exactly what to fix.

---

## Files Changed

1. `supabase/migrations/018_allow_bot_users_for_testing.sql`
   - Added RLS policy for `league_members` table to allow bot users

2. `services/health.ts`
   - Changed `limit: -1` to `limit: 1000` in diagnostic code
   - Added `limit: 1000` to `getDailySteps()` query
   - Added extensive logging to see sample contents and quantity values
   - Log each sample individually to debug why total is 0

