# Supabase Setup Guide

## Quick Fix for RLS Error

The error `"new row violates row-level security policy for table \"users\""` happens because the user profile needs to be created automatically when someone signs up.

### Steps to Fix:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to SQL Editor** (left sidebar)
4. **Run this SQL** (copy from `supabase/migrations/002_auto_create_profile.sql`):

```sql
-- Auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

5. **Click "Run"** to execute the SQL

This will automatically create a user profile whenever someone signs up, bypassing the RLS policy issue.

### What This Does:

- Creates a database trigger that runs automatically when a new user signs up
- Inserts a row into the `users` table with the new user's ID and email
- Uses `SECURITY DEFINER` to bypass RLS policies (runs with elevated privileges)
- The app code will then find the profile and continue normally

### After Running:

- Restart your Expo app
- Try signing up again - it should work now!

---

## Full Database Setup

If you haven't set up your database yet:

1. **Run the initial schema** (`supabase/migrations/001_initial_schema.sql`) in the SQL Editor
2. **Then run the auto-create profile trigger** (above)

Both files are in the `supabase/migrations/` folder.

---

## Fix RLS Infinite Recursion Error

If you see the error `"infinite recursion detected in policy for relation \"league_members\""`, run this migration:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the SQL from `supabase/migrations/003_fix_rls_recursion.sql`:

```sql
-- Fix infinite recursion in league_members RLS policy
DROP POLICY IF EXISTS "Members can view league members" ON league_members;

-- Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION is_league_member(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM league_members
        WHERE league_id = p_league_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policy using helper function
CREATE POLICY "Members can view league members" ON league_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        is_league_member(league_id, auth.uid())
    );
```

3. **Click "Run"** to execute

This fixes the infinite recursion by using a helper function with `SECURITY DEFINER` that bypasses RLS when checking membership.

---

## Fix Leagues INSERT Policy Error

If you see the error `"new row violates row-level security policy for table \"leagues\""` when creating a league, run this migration:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the SQL from `supabase/migrations/004_fix_leagues_insert_policy.sql`:

```sql
-- Fix leagues INSERT policy to ensure created_by matches auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create leagues" ON leagues;

CREATE POLICY "Authenticated users can create leagues" ON leagues
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND created_by = auth.uid()
    );
```

3. **Click "Run"** to execute

This ensures that when creating a league, the `created_by` field must match the authenticated user's ID.

---

## Comprehensive RLS Fix (Recommended - Fixes All Issues)

To fix **all** potential RLS errors at once, run this comprehensive migration:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the SQL from `supabase/migrations/005_fix_all_rls_policies.sql`

This migration fixes:
- ✅ Leagues SELECT policy (can view leagues you created OR are a member of)
- ✅ Leagues INSERT policy (ensures created_by matches auth.uid())
- ✅ Matchups policies (separates INSERT/UPDATE/DELETE properly)
- ✅ Weekly scores policies (separates INSERT/UPDATE/DELETE properly)
- ✅ Playoffs policies (separates INSERT/UPDATE/DELETE properly)
- ✅ Ensures helper function exists for league membership checks

**This is the recommended approach** - it fixes all RLS issues in one go and prevents future errors.

### Migration Order

If you're setting up from scratch, run migrations in this order:
1. `001_initial_schema.sql` - Creates all tables and initial policies
2. `002_auto_create_profile.sql` - Auto-creates user profiles
3. `003_fix_rls_recursion.sql` - Fixes league_members recursion
4. `004_fix_leagues_insert_policy.sql` - Fixes league creation (OR skip if using 005)
5. `005_fix_all_rls_policies.sql` - **Comprehensive fix (recommended)**

Or just run `005_fix_all_rls_policies.sql` after the initial schema - it includes fixes from 003 and 004.

---

## Email Confirmation Settings

By default, Supabase requires email confirmation before users can sign in. You can change this:

### Option 1: Disable Email Confirmation (for development/testing)

1. Go to **Authentication** → **Settings** in Supabase Dashboard
2. Under **Email Auth**, find **"Enable email confirmations"**
3. **Turn it OFF** for development
4. Users will be able to sign in immediately after signup

### Option 2: Keep Email Confirmation (recommended for production)

1. Keep **"Enable email confirmations"** **ON**
2. Configure your email templates in **Authentication** → **Email Templates**
3. Users will receive a confirmation email and must click the link before signing in
4. The app will show a message directing users to check their email

### Email Confirmation Redirect URL

If using email confirmation, make sure your redirect URL is configured:

1. Go to **Authentication** → **URL Configuration**
2. Add your app's redirect URL:
   - For Expo Go: `exp://192.168.x.x:8081` (your local IP)
   - For production: `lockin://auth/callback` (your app's deep link scheme)

The app handles both scenarios automatically - if email confirmation is required, users will see a message to check their email. If it's disabled, they'll be signed in immediately.
