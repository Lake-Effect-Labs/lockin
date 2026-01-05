# Lock-In Fitness Competition App - Codebase Overview
**Version:** 1.0.55  
**Platform:** React Native (iOS-focused with HealthKit integration)  
**Backend:** Supabase (PostgreSQL + Auth + Realtime)  
**Last Updated:** 2026-01-03

---

## 🎯 Product Overview

**Lock-In** is a fitness competition app where users create or join leagues and compete head-to-head each week based on their health metrics from Apple HealthKit.

### Core Concept
- Users join **leagues** (4-14 players)
- Each week, players are matched up **1v1** (round-robin scheduling)
- Health data syncs from Apple HealthKit (steps, sleep, calories, workouts, distance)
- Points are calculated based on fitness metrics
- Player with higher weekly score **wins the matchup**
- After regular season, **top 4 advance to playoffs**
- Winner is crowned **champion**

### Key Features
- 📱 **Real-time scoring** - See opponent's score update live
- 🏆 **Playoff brackets** - Top 4 compete in semifinals → finals
- 📊 **Custom scoring** - League admins can customize point values
- 🤖 **Speed Run** - End-to-end testing with bot users
- 🔄 **Auto week advancement** - Weeks finalize automatically on Sundays

---

## 🏗️ Architecture

### Tech Stack
```
Frontend:  React Native + Expo
Language:  TypeScript
UI:        React Native components + Expo UI
Backend:   Supabase (PostgreSQL + Auth + Realtime)
Health:    @kingstinct/react-native-healthkit (iOS only)
State:     Zustand stores
Navigation: Expo Router (file-based routing)
```

### Project Structure
```
lockin/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (app)/                    # Authenticated app screens
│   │   ├── home.tsx              # Main dashboard (leagues list)
│   │   ├── create-league.tsx     # League creation form
│   │   ├── join-league.tsx       # Join by code
│   │   └── league/[leagueId]/    # League-specific screens
│   │       ├── index.tsx         # League dashboard (your matchup)
│   │       ├── matchup.tsx       # Detailed head-to-head view
│   │       ├── standings.tsx     # Full league standings
│   │       ├── allMatchups.tsx   # All matchups for selected week
│   │       └── speedrun.tsx      # Speed run test feature
│   ├── (auth)/                   # Auth screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── _layout.tsx               # Root layout
│
├── services/                     # Business logic & API calls
│   ├── health.ts                 # HealthKit integration (fetch metrics)
│   ├── scoring.ts                # Points calculation engine
│   ├── supabase.ts               # Database queries & types
│   ├── league.ts                 # League operations (dashboard, sync)
│   ├── dailySync.ts              # Daily health data aggregation
│   ├── leagueSpeedRun.ts         # End-to-end testing simulation
│   └── admin.ts                  # Admin operations (delete, remove members)
│
├── components/                   # Reusable UI components
│   ├── MatchupCard.tsx           # Head-to-head matchup display
│   ├── PlayerScoreCard.tsx       # Standings row
│   ├── StatBubble.tsx            # Points breakdown display
│   ├── Avatar.tsx                # User avatar
│   └── WeekProgressBar.tsx       # Week countdown
│
├── store/                        # Zustand state management
│   ├── useAuthStore.ts           # User auth state
│   ├── useLeagueStore.ts         # League data cache
│   └── useHealthStore.ts         # Health data & sync status
│
├── supabase/migrations/          # Database schema & migrations
│   ├── 001_initial_schema.sql    # Core tables + RLS policies
│   ├── 015_add_stand_hours_column.sql
│   ├── 018_allow_bot_users_for_testing.sql  # Speed run support
│   └── 019_fix_workout_scoring_calculation.sql  # Latest fix
│
├── utils/                        # Helper functions
│   ├── dates.ts                  # Week calculations, Monday start
│   ├── colors.ts                 # Theme colors
│   └── fakeData.ts               # Mock data generation
│
└── hooks/                        # Custom React hooks
    └── useRealtimeSync.ts        # Real-time score updates
```

---

## 📊 Database Schema (Supabase PostgreSQL)

### Core Tables

#### `users`
- User profiles (separate from auth.users)
- Stores username, avatar, created_at
- **Note:** Foreign key to auth.users REMOVED to support bot users

#### `leagues`
- League metadata
- Fields: name, join_code, max_players, season_length_weeks, current_week, start_date, scoring_config
- Auto-generates 6-char join code
- Starts on next Monday when full

#### `league_members`
- Junction table (users ↔ leagues)
- Tracks: wins, losses, ties, total_points, is_admin
- **Updated by:** `finalize_week()` SQL function

#### `matchups`
- Weekly head-to-head pairings
- Fields: week_number, player1_id, player2_id, player1_score, player2_score, winner_id, is_finalized
- **Generated by:** `generate_matchups()` SQL function (round-robin)

#### `weekly_scores`
- Health metrics per user per week
- Fields: steps, sleep_hours, calories, workouts, distance, stand_hours (disabled), total_points
- **Auto-calculated:** `total_points` via trigger calling `calculate_points()` SQL function

#### `playoffs`
- Playoff bracket (semifinals + finals)
- Fields: round, match_number, player1_id, player2_id, winner_id

---

## 🔄 Data Flow

### 1. Health Data Sync Flow
```
Apple HealthKit
    ↓
services/health.ts (getDailySteps, getDailySleep, etc.)
    ↓
services/dailySync.ts (aggregates Mon-Sun)
    ↓
services/supabase.ts (upsertWeeklyScore)
    ↓
Database Trigger: auto_calculate_points()
    ↓
weekly_scores.total_points updated
    ↓
Real-time subscription updates opponent's view
```

### 2. Scoring Calculation
```
Raw Metrics (steps, sleep, calories, workouts, distance)
    ↓
services/scoring.ts: calculatePoints()
    ↓
Formula:
  - Steps: (steps / 1000) × 1 point
  - Sleep: hours × 2 points
  - Calories: (calories / 100) × 5 points
  - Workouts: minutes × 0.2 points
  - Distance: miles × 3 points
  - Stand Hours: DISABLED (was hours × 5 points)
    ↓
Total Points (stored in weekly_scores.total_points)
```

### 3. Week Finalization Flow
```
Sunday 11:59 PM → Week ends
    ↓
User opens app Monday
    ↓
services/league.ts: checkWeekEnd()
    ↓
Calls: finalizeWeek(leagueId, weekNumber)
    ↓
SQL Function: finalize_week()
  - Reads weekly_scores.total_points
  - Updates matchups (player1_score, player2_score, winner_id)
  - Updates league_members (wins++, losses++)
  - Marks matchup as is_finalized = true
    ↓
Advances league.current_week
    ↓
Calls: generate_matchups() for new week
    ↓
Shows WeeklyRecap modal to user
```

### 4. Matchup Generation (Round-Robin)
```
generate_matchups(league_id)
    ↓
Gets all league members (ordered by joined_at)
    ↓
If odd number, adds NULL "bye" player
    ↓
For each week:
  - Rotates player order (keep first fixed)
  - Pairs: [1 vs N, 2 vs N-1, 3 vs N-2, ...]
  - Inserts into matchups table
    ↓
Result: Every player faces every other player once
```

---

## 🎮 Key Features & Implementation

### 1. Real-Time Opponent Score Updates
**File:** `hooks/useRealtimeSync.ts`  
**How:** Supabase real-time subscription to `weekly_scores` table  
**Triggers:** When opponent syncs their health data  
**Result:** Your screen updates to show their new score instantly

### 2. Custom Scoring
**File:** `app/(app)/create-league.tsx`  
**Storage:** `leagues.scoring_config` (JSONB)  
**Usage:** League admin can customize point values per metric  
**Default:** See `services/scoring.ts: DEFAULT_SCORING_CONFIG`

### 3. Speed Run (Testing Feature)
**File:** `services/leagueSpeedRun.ts`  
**Purpose:** End-to-end test of entire league lifecycle  
**What it does:**
- Creates test league with 12 bot users
- Generates random health data for each week
- Simulates 8-week season + playoffs
- Shows step-by-step progress in UI
- **Critical for QA:** Tests matchup generation, scoring, week finalization, playoffs

### 4. Auto Week Advancement
**File:** `services/league.ts: checkWeekEnd()`  
**Trigger:** User opens league dashboard  
**Logic:**
- Checks if calendar week > league.current_week
- If yes, finalizes previous week
- Advances to new week
- Generates new matchups
- Shows recap of previous week

### 5. Playoff System
**File:** `supabase/migrations/001_initial_schema.sql: generate_playoffs()`  
**When:** After final regular season week  
**How:**
- Top 4 by wins (tiebreaker: total_points)
- Semifinal: #1 vs #4, #2 vs #3
- Finals: Winners face off
- Champion crowned

---

## 🔐 Security (Row Level Security)

### RLS Policies Overview
```sql
-- Users can only read/update their own profile
users: auth.uid() = id

-- Users can only read leagues they're members of
leagues: EXISTS (SELECT 1 FROM league_members WHERE user_id = auth.uid())

-- Users can only see members of their leagues
league_members: league_id IN (user's leagues)

-- Users can only see matchups in their leagues
matchups: league_id IN (user's leagues)

-- Users can only read/write their own weekly scores
weekly_scores: user_id = auth.uid()

-- EXCEPTION: Bot users (for speed run)
-- Emails ending in @speedrun.test or @bot.test bypass some restrictions
```

### Bot User Support (Migration 018)
- Removed foreign key: `users.id` → `auth.users.id`
- Allows creating users without auth accounts
- Used ONLY for speed run testing
- Identified by: UUID pattern `00000000-0000-4000-8000-*` and email `*@speedrun.test`

---

## 📱 Health Data Integration

### HealthKit Permissions
**File:** `services/health.ts: initializeHealth()`  
**Requested:**
- Steps (HKQuantityTypeIdentifierStepCount)
- Sleep (HKCategoryTypeIdentifierSleepAnalysis)
- Calories (HKQuantityTypeIdentifierActiveEnergyBurned)
- Workouts (HKWorkoutTypeIdentifier)
- Distance (HKQuantityTypeIdentifierDistanceWalkingRunning)
- ~~Stand Hours~~ (REMOVED - requires Apple Watch)

### Health Queries
**Library:** `@kingstinct/react-native-healthkit`  
**Pattern:**
```typescript
await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
  unit: 'count',
  limit: 10000,
  filter: { date: { startDate, endDate } }
});
```

**Critical:** Must include `unit` parameter (learned the hard way!)

### Aggregation
**File:** `services/dailySync.ts`  
**Logic:**
- Fetches daily metrics for Mon-Sun
- Sums totals across the week
- Syncs to `weekly_scores` table
- Runs automatically every 30 seconds when app is open

---

## 🐛 Recent Bug Fixes (Build 1.0.55)

### Issue #1: Workout Scoring 100x Inflation
**Problem:** Database calculated workouts as COUNT (×20) but frontend as MINUTES (×0.2)  
**Fix:** Migration 019 - Changed SQL function to use 0.2  
**Impact:** 30-min workout now = 6 points (not 600!)

### Issue #2: Stand Hours Removed
**Reason:** Requires Apple Watch (user doesn't have one)  
**Changes:**
- Disabled health query (returns 0)
- Removed from UI displays
- Removed from authorization request
- Removed from scoring calculation

### Issue #3: Calories/Workouts Returning 0
**Problem:** Missing `unit` parameter in queries  
**Fix:** Added `unit: 'kilocalorie'` to calories query  
**Fix:** Added validation to workouts duration calculation

### Issue #4: Speed Run Bot Records Stuck at 0-0
**Problem:** RLS policy blocked UPDATE on league_members for bot users  
**Fix:** Added UPDATE policy to allow `finalize_week()` to update wins/losses

### Issue #5: Days Remaining Off By One
**Problem:** Saturday showed "1 day remaining" instead of "0 days (ends today)"  
**Fix:** Changed `Math.ceil()` to `Math.floor()` in week countdown

### Issue #6: Null Score Crashes
**Problem:** `.toFixed()` called on null scores  
**Fix:** Added `?? 0` fallback throughout codebase

---

## 🚀 Deployment

### Build Process
```bash
# Development
npm start

# TestFlight Build
npm run build:testflight
# Uses: eas build --platform ios --profile testflight --clear-cache

# Production
npm run build:production
```

### Environment
- **Platform:** iOS only (HealthKit requirement)
- **Minimum iOS:** 14.0
- **Expo SDK:** 52
- **React Native:** 0.76.5

### Database Migrations
```bash
# Run locally
supabase db reset

# Production (via Supabase dashboard)
# Copy/paste migration SQL files
```

---

## 📝 Key Business Rules

### League Rules
- **Sizes:** 4, 6, 8, 10, 12, or 14 players
- **Season Length:** 6, 8, 10, or 12 weeks
- **Start:** Next Monday after league fills up
- **Scoring Week:** Monday 00:00 - Saturday 23:59
- **Results Day:** Sunday (view-only, no scoring)

### Matchup Rules
- **Algorithm:** Round-robin (everyone faces everyone once)
- **Ties:** Allowed (both get 0.5 wins in some leagues, or just marked as tie)
- **Byes:** If odd number of players, one player has "bye" each week

### Playoff Rules
- **Qualification:** Top 4 by wins (tiebreaker: total_points)
- **Format:** Single elimination
- **Rounds:** Semifinals → Finals
- **Seeding:** #1 vs #4, #2 vs #3

---

## 🔧 Development Notes

### Common Gotchas
1. **HealthKit only works on real iOS devices** (not simulator, not Expo Go)
2. **Dates are in local timezone** but stored as ISO strings
3. **Week starts Monday** (not Sunday) - see `utils/dates.ts`
4. **RLS policies** can be tricky - use service role for admin operations
5. **Stand hours require Apple Watch** - now disabled
6. **Workout is in MINUTES** not count (0.2 points per minute)
7. **Calories need unit parameter** (`kilocalorie`)

### Testing Strategy
1. **Speed Run:** Full end-to-end test with bot users
2. **Manual Testing:** TestFlight builds (costs money per build)
3. **Debug Page:** `app/(app)/debug.tsx` shows raw health API responses

### State Management
- **Auth:** `useAuthStore` (Zustand)
- **Leagues:** `useLeagueStore` (Zustand + cache)
- **Health:** `useHealthStore` (Zustand + AsyncStorage)

---

## 📚 Important Files to Know

### Must-Read for Understanding System
1. `services/scoring.ts` - Points calculation logic
2. `services/league.ts` - Core league operations
3. `supabase/migrations/001_initial_schema.sql` - Database structure
4. `services/health.ts` - HealthKit integration

### Critical for Debugging
1. `app/(app)/debug.tsx` - Health API debug page
2. `services/leagueSpeedRun.ts` - End-to-end testing
3. `supabase/migrations/018_*.sql` - Bot user support

### UI Entry Points
1. `app/(app)/home.tsx` - Main dashboard
2. `app/(app)/league/[leagueId]/index.tsx` - League dashboard
3. `app/(app)/league/[leagueId]/matchup.tsx` - Head-to-head detail

---

## 🎯 Current State (Build 1.0.55)

### ✅ Working Features
- User auth (Supabase Auth)
- League creation & joining
- Round-robin matchup generation
- Health data sync (steps, sleep, calories, workouts, distance)
- Real-time score updates
- Week auto-advancement
- Playoff generation
- Speed run testing
- Custom scoring

### 🚧 Known Limitations
- iOS only (no Android support)
- Requires Apple Health data
- No Apple Watch = no stand hours
- TestFlight builds cost money (can't test frequently)

### 🔜 Potential Future Enhancements
- Android support (Google Fit)
- Social features (chat, trash talk)
- Achievements/badges
- Historical stats
- Multi-league support per user
- Push notifications for matchup results

---

## 📞 Support & Debugging

### Common User Issues
1. **"Health data showing 0"**
   - Check permissions in iOS Settings → Health → Lock-In
   - Verify data exists in Apple Health app
   - Check debug page for raw API responses

2. **"Week not advancing"**
   - Check `league.current_week` vs calendar week
   - Verify `start_date` is set correctly
   - Check if `finalizeWeek` is being called

3. **"Opponent score not updating"**
   - Check real-time subscription status
   - Verify opponent has synced their data
   - Check `weekly_scores` table for both users

### Debug Tools
- **Debug Page:** Shows raw HealthKit API responses
- **Speed Run:** Tests entire system end-to-end
- **Supabase Logs:** Check for RLS policy errors
- **Console Logs:** Extensive logging throughout codebase

---

## 🎓 Learning Resources

### Key Concepts to Understand
1. **Expo Router** (file-based routing)
2. **Supabase RLS** (row-level security)
3. **HealthKit API** (iOS health data)
4. **Round-robin scheduling** (matchup algorithm)
5. **Zustand** (state management)

### External Documentation
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Supabase Docs](https://supabase.com/docs)
- [@kingstinct/react-native-healthkit](https://github.com/kingstinct/react-native-healthkit)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

**Last Updated:** 2026-01-03  
**Build Version:** 1.0.55  
**Status:** Ready for TestFlight deployment

