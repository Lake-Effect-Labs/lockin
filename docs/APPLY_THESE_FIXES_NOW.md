# CRITICAL FIXES - No DB Reset Needed

## MIGRATION FIX - Apply Manually

The migration file has been updated, but since you don't want to reset the database, **run this SQL directly in Supabase**:

```sql
-- Fix league_members RLS to allow bot users
DROP POLICY IF EXISTS "Users can join leagues" ON league_members;
DROP POLICY IF EXISTS "Users can join leagues or add bot users" ON league_members;

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

## HEALTH DATA - What We Know

From your diagnostic:
- ✅ Module loaded
- ✅ Auth working  
- ✅ Query returns 15 samples
- ❌ All `quantity` values are 0

**This means:**
The API is working correctly, samples are being found, BUT either:
1. The `quantity` property is actually 0 in the samples
2. We need to look at a different property
3. The samples need aggregation/processing

**The enhanced logging will show us exactly what's in each sample** including:
- `sample.quantity`
- `sample.unit`
- `sample.startDate`
- All properties available on the sample object

## What Happens Next Build

1. **Speed Run**: Will work because the RLS policy now allows bot users in `league_members`
2. **Health Data**: The detailed logs will show us the actual sample structure so we can fix it properly

## NO MORE GUESSING

The next build will have logs that show:
```
📊 [Steps] Sample 0: { quantity: ???, unit: ???, startDate: ??? }
📊 [Steps] Sample 1: { quantity: ???, unit: ???, startDate: ??? }
...
```

This will definitively tell us if we need to:
- Use a different property name
- Do unit conversion
- Aggregate differently  
- Something else entirely

**Once you run the SQL above and build, send me the logs from the Health Data Report and I'll fix it in ONE shot.**

