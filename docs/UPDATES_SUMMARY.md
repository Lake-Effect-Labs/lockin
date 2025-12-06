# Updates Summary

## ✅ All Issues Fixed!

### 1. **Home Screen Action Cards Fixed** ✅
- **Problem**: Create/Join league buttons were cut off at the bottom
- **Fix**: Added `flexWrap: 'wrap'` and wrapper styles to make cards responsive
- **Files Changed**: `app/(app)/home.tsx`

### 2. **Matchup Display Fixed** ✅
- **Problem**: No matchup shown when only one user in league
- **Fix**: Added empty state that shows when there's no matchup, with helpful message and invite button
- **Files Changed**: `app/(app)/league/[leagueId]/index.tsx`

### 3. **League-Specific Scoring Rules** ✅
- **Problem**: Scoring rules were global, not per-league
- **Fix**: 
  - Added `scoring_config` JSONB column to `leagues` table
  - Updated scoring service to accept league-specific config
  - Updated database function to use league scoring config
  - Updated UI to use league-specific scoring when displaying points
- **Files Changed**: 
  - `services/scoring.ts` - Added `getScoringConfig()` and updated functions
  - `services/supabase.ts` - Updated `League` interface and `createLeague()`
  - `app/(app)/league/[leagueId]/index.tsx` - Uses league config
  - `app/(app)/league/[leagueId]/matchup.tsx` - Uses league config
- **Migrations**: 
  - `006_add_scoring_config_to_leagues.sql` - Adds column
  - `008_update_scoring_function_for_leagues.sql` - Updates DB function

### 4. **Demo League Seed Data** ✅
- **Created**: `007_seed_demo_league.sql` - Creates a fully simulated league
- **Features**:
  - League in week 4 of 8-week season
  - 4 weeks of matchups (3 completed, 1 active)
  - Weekly scores for all weeks
  - Your user has a 2-1-0 record
  - Join code: `DEMO42`

## Database Migrations to Run

Run these migrations in order in your Supabase SQL Editor:

1. ✅ `001_initial_schema.sql` - Base schema (if not already run)
2. ✅ `002_auto_create_profile.sql` - Auto-create user profiles
3. ✅ `003_fix_rls_recursion.sql` - Fix league_members RLS recursion
4. ✅ `004_fix_leagues_insert_policy.sql` - Fix league creation (OR skip if using 005)
5. ✅ `005_fix_all_rls_policies.sql` - **Comprehensive RLS fix (recommended)**
6. ✅ `006_add_scoring_config_to_leagues.sql` - Add scoring_config column
7. ✅ `008_update_scoring_function_for_leagues.sql` - Update scoring function
8. ✅ `007_seed_demo_league.sql` - **Create demo league** (optional, for testing)

## How Scoring Rules Work Now

- **Default**: If no `scoring_config` is set, uses default values:
  - 1 point per 1,000 steps
  - 2 points per hour of sleep
  - 5 points per 100 active calories
  - 20 points per workout
  - 3 points per mile

- **Custom**: When creating a league, you can optionally pass `scoring_config`:
```typescript
createLeague(name, seasonLength, userId, {
  points_per_1000_steps: 2,  // Custom: 2 points per 1k steps
  points_per_workout: 25,    // Custom: 25 points per workout
  // Other fields optional - will use defaults
});
```

- **Database**: The trigger automatically uses the league's scoring config when calculating `total_points` in `weekly_scores`

## Next Steps (Optional Future Enhancements)

1. **Add UI for custom scoring rules** - Add a form in create-league screen to set custom scoring
2. **Add more fake users to demo league** - Create multiple auth users and add them to the demo league
3. **Add scoring config editing** - Allow league creators to edit scoring rules after creation

## Testing the Demo League

After running migration `007_seed_demo_league.sql`:
1. Restart your app
2. You should see "Demo League - Week 4" in your leagues list
3. Click on it to see:
   - Your matchup for week 4 (in progress)
   - Your stats: 2-1-0 record, 450.5 total points
   - Previous weeks' matchups
   - Standings

The demo league uses the default scoring rules. You can create new leagues with custom scoring rules by passing the `scoring_config` parameter (though the UI for this isn't built yet - it's ready in the backend).

