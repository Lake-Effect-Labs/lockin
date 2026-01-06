# Remove Stand Hours - Implementation Plan

## Files to Update (Priority Order)

### 1. Core Type Definitions
- `services/scoring.ts` - Remove from FitnessMetrics interface
- `services/health.ts` - Remove getDailyStandHours, remove from auth
- `services/supabase.ts` - Remove from upsertWeeklyScore

### 2. Frontend Components  
- `app/(app)/league/[leagueId]/index.tsx` - Remove from breakdown display
- `app/(app)/league/[leagueId]/matchup.tsx` - Remove from comparison
- `app/(app)/home.tsx` - Remove from dashboard
- `components/StatBubble.tsx` - Remove from PointsBreakdown component

### 3. Services
- `services/leagueSpeedRun.ts` - Remove from bot data generation
- `services/dailySync.ts` - Remove from sync logic
- `utils/fakeData.ts` - Remove from fake data generation

### 4. Database (DO NOT TOUCH YET - data exists)
- Keep `stand_hours` column in database for now
- Just stop writing to it and remove from calculations

## Strategy
1. Remove from scoring calculation (already done in migration 019)
2. Remove from health fetching (remove getDailyStandHours function)
3. Remove from all sync operations (just don't pass it)
4. Remove from UI displays
5. Remove from type definitions last (to avoid breaking existing code)

