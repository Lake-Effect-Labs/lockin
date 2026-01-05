# Lock-In App Bug Audit Report

**Date:** January 5, 2026
**Auditor:** Systems Audit
**Scope:** Full competition logic, data integrity, and fairness analysis

---

## 1. Competition State Model

### 1.1 League Lifecycle States

| State | Description | Valid Transitions |
|-------|-------------|-------------------|
| `CREATED` | League created, join_code active, start_date=null | -> FILLING |
| `FILLING` | Members joining, start_date=null | -> SCHEDULED (when full) |
| `SCHEDULED` | Full, start_date set to next Monday, matchups generated | -> ACTIVE (when start_date arrives) |
| `ACTIVE` | Regular season in progress, current_week >= 1 | -> PLAYOFFS (when current_week > season_length) |
| `PLAYOFFS` | playoffs_started=true, bracket active | -> COMPLETE |
| `COMPLETE` | champion_id set, is_active=false | (terminal) |

**BUG: No formal state machine enforcing transitions.** The `leagues` table has independent boolean/nullable flags that can be set inconsistently.

### 1.2 Week Lifecycle States

| State | Description |
|-------|-------------|
| `PENDING` | Week not yet started (start_date in future or current_week not reached) |
| `ACTIVE` | Week in progress (Monday 00:00 to Saturday 23:59) |
| `RESULTS_DAY` | Sunday - scoring complete, results visible |
| `FINALIZED` | All matchups finalized, week advanced |

**BUG: No explicit week state stored.** State is derived from calendar time + `current_week` + `is_finalized` flags. This creates race windows.

### 1.3 Matchup Lifecycle States

| State | Transition Trigger |
|-------|-------------------|
| `SCHEDULED` | Created by generate_matchups() |
| `SCORING` | Week is active, scores being synced |
| `FINALIZED` | finalize_week() called, is_finalized=true |

**BUG: Matchups have no `SCORING` state.** Cannot distinguish "never played" from "in progress".

---

## 2. Critical Bugs (Must Fix)

### 2.1 Double Week Advancement on finalize_week()

**Description:**
The `finalize_week()` SQL function (001_initial_schema.sql:404-406) unconditionally advances `current_week` at the end of every call:

```sql
UPDATE leagues SET current_week = current_week + 1 WHERE id = p_league_id;
```

This runs even if no matchups were finalized (because they were already finalized by a previous call).

**Exact Triggering Scenario:**
1. Week 3 ends on Saturday night
2. User A opens app Sunday morning -> calls `processWeekEnd()` -> `finalizeWeek(league, 3)`
3. Week 3 matchups finalized, `current_week` becomes 4
4. User B opens app 10 seconds later -> `processWeekEnd()` -> `finalizeWeek(league, 3)`
5. `finalize_week(league, 3)` runs again. The FOR loop finds no matchups (all already `is_finalized=true`), but **still executes** `UPDATE leagues SET current_week = current_week + 1`
6. `current_week` is now **5** instead of 4

**Why It Will Happen:**
Multiple users in the same league will open the app around the same time, especially Sunday morning. The client-side `leagueWeekLocks` Map (league.ts:36) only prevents races within a single app instance, not across devices.

**Impact:**
- Week 4 gets skipped entirely - no matchups scored
- Standings corrupted - some players miss a week of wins/losses
- Users lose trust in the app's fairness

**Severity:** CRITICAL

---

### 2.2 league_members.total_points Accumulation During finalize_week() is Non-Idempotent

**Description:**
`finalize_week()` adds weekly points to `league_members.total_points` for both players (001_initial_schema.sql:395-401):

```sql
UPDATE league_members
SET total_points = total_points + p1_score
WHERE league_id = p_league_id AND user_id = matchup.player1_id;
```

If `finalize_week()` is called twice for the same week due to race conditions, and a matchup is somehow processed twice (e.g., due to a partial retry), points could be double-counted.

**Exact Triggering Scenario:**
1. finalize_week() starts, processes 5 of 6 matchups
2. Network timeout, function appears to fail
3. Client retries finalize_week()
4. The 5 already-processed matchups are skipped (is_finalized=true), but the 6th matchup is processed
5. Meanwhile, the original transaction commits for matchup 6
6. Total_points for matchup 6 players is added twice

**Why It Will Happen:**
Network timeouts are common on mobile devices. Supabase RPC has default timeouts. Users may retry.

**Impact:**
- Incorrect season total_points affects playoff seeding
- Player with double-counted points could unfairly make playoffs

**Severity:** CRITICAL

---

### 2.3 Scoring Config Changes Apply Inconsistently Mid-Season

**Description:**
When `weekly_scores` is upserted, the `auto_calculate_points()` trigger fetches the league's current `scoring_config` and recalculates points. If a league admin changes the scoring config mid-season, newly synced scores use the new formula, while historical scores retain the old calculation.

**Exact Triggering Scenario:**
1. League created with default scoring (1 point per 1000 steps)
2. Weeks 1-3 completed with that formula
3. Admin changes scoring to 2 points per 1000 steps
4. Week 4 users sync -> their weekly_scores use 2x step points
5. Some Week 4 users don't sync until after Week 4 ends
6. At finalization, User A has 50 points (new formula), User B has 25 points (synced before change)
7. User B syncs again in Week 5 -> Week 4 score recalculates to 50 points, but finalization already happened

**Why It Will Happen:**
Admins may adjust scoring to "fix" perceived imbalances. The UI likely allows this.

**Impact:**
- Unfair matchup results based on sync timing
- Some weeks permanently have mixed scoring formulas
- Users who sync less frequently are disadvantaged

**Severity:** CRITICAL

---

### 2.4 Playoffs Can Be Generated Multiple Times

**Description:**
`generate_playoffs()` (001_initial_schema.sql:433-474) does not check if playoffs already exist. It sets `playoffs_started = true` and inserts semifinal matchups unconditionally.

**Exact Triggering Scenario:**
1. Week 8 (final regular season week) ends
2. User A triggers `processWeekEnd()` -> `finalizeWeek(league, 8)` -> `generatePlayoffsDB()`
3. Playoffs created: semifinal matchups inserted
4. Due to race, User B also triggers `generatePlayoffsDB()`
5. `generate_playoffs()` runs again
6. `UNIQUE(league_id, round, match_number)` constraint prevents duplicate inserts, BUT...
7. `playoff_seed` values are re-set on `league_members` - could overwrite with different values if standings changed

**Why It Will Happen:**
Same race condition as week finalization.

**Impact:**
- If standings calculation had a race, playoff seeds could be inconsistent
- The `ON CONFLICT DO NOTHING` on playoff insert prevents duplicate matches, but seed values on league_members table can flip

**Severity:** HIGH

---

### 2.5 Playoff Tie-Breaker Uses Accumulated total_points Including Current Match

**Description:**
`finalize_playoff_match()` (011_fix_playoff_tie_handling.sql) uses `league_members.total_points` as tiebreaker when playoff scores tie. However, during playoffs, `weekly_scores` may still be synced and accumulated via any lingering `finalize_week()` calls or manual triggers.

**Exact Triggering Scenario:**
1. Semifinals: Player A and Player B tie at 100 points each
2. Tiebreaker uses `league_members.total_points`
3. Player A has 500, Player B has 499 -> Player A wins
4. But Player B's Week 8 score was slow to sync
5. Right after semifinal finalization, Player B's Week 8 score syncs -> adds 50 points
6. Now Player B has 549 total_points, more than Player A
7. But Player B already lost the tiebreaker and is eliminated

**Why It Will Happen:**
HealthKit data is eventually consistent. Users may not sync until late.

**Impact:**
- Wrong player advances in playoffs
- Championship could go to wrong person
- Users will notice and be furious

**Severity:** CRITICAL

---

## 3. High-Risk Logic Issues

### 3.1 Client-Side Week Lock is Ineffective Across Devices

**Location:** league.ts:36, 216-278

**Issue:**
`leagueWeekLocks` is a JavaScript Map that exists only in the current app process. Two users on different phones both opening the app simultaneously will both acquire the "lock" on their own devices.

**Risk:**
All race conditions related to week advancement remain exploitable.

---

### 3.2 Matchup Generation Swap Logic Can Create Invalid Pairings

**Location:** 014_improve_matchup_generation.sql:92-107

**Issue:**
The repeat-avoidance swap logic swaps `away_idx` to `member_count - i`, but this can cause:
1. A player to be matched against themselves if the array has odd properties
2. A player to be assigned to two matchups if the swap doesn't also update the other pairing

**Triggering Scenario:**
6-player league where the standard rotation creates a repeat opponent. The swap may create a matchup where player appears twice.

---

### 3.3 Workout Field Semantic Mismatch Between Frontend and Database

**Location:**
- Frontend scoring.ts:11: `POINTS_PER_WORKOUT_MINUTE: 0.2`
- Database 008_update_scoring_function.sql:30: `points_per_workout`

**Issue:**
Frontend tracks workouts in **minutes** (health.ts:204-237 calculates total workout minutes). But the database `calculate_points()` uses `points_per_workout` which in migration 001 was `POINTS_PER_WORKOUT = 20` (per workout count, not minutes).

The migration 008 doesn't change the field name or clarify units. If `points_per_workout` is interpreted as "per workout" (the original intent) but frontend sends minutes, scoring is drastically wrong.

**Impact:**
60-minute workout could give 60 * 20 = 1200 points instead of 60 * 0.2 = 12 points.

---

### 3.4 Bot User RLS Policy Allows Any Authenticated User to Create Bots

**Location:** 018_allow_bot_users_for_testing.sql:26-37

**Issue:**
The policy allows ANY authenticated user to insert users with `@speedrun.test` or `@bot.test` emails:

```sql
CREATE POLICY "Users can insert own profile or bot users" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id
        OR
        (email LIKE '%@speedrun.test' OR email LIKE '%@bot.test')
    );
```

A malicious user could:
1. Create bot users with predictable UUIDs
2. Add them to other users' leagues before they fill
3. Control matchup outcomes

**Impact:**
Complete competition integrity compromise in non-full leagues.

---

### 3.5 No Validation That start_date is Actually a Monday

**Location:** supabase.ts:532-540 (auto-start on full)

**Issue:**
`getNextMonday()` is called when league becomes full, but:
1. If league was created with a manual start_date, it may not be Monday
2. `getWeekNumber()` calculation assumes start_date is Monday

**Impact:**
Off-by-one week calculations if start_date is Tuesday-Sunday.

---

## 4. Medium / Edge Case Issues

### 4.1 User Who Misses Entire Week Gets 0-0 Score, Not a Loss

**Scenario:**
User never opens app during Week 3. Their `weekly_scores` entry doesn't exist.

**Current Behavior:**
In `finalize_week()`:
```sql
SELECT COALESCE(total_points, 0) INTO p1_score
FROM weekly_scores
WHERE league_id = p_league_id AND user_id = matchup.player1_id AND week_number = p_week;

p1_score := COALESCE(p1_score, 0);
```

Both COALESCE calls mean a missing record = 0 points. If opponent also has 0 (or missing), it's a tie.

**Impact:**
Inactive users may earn ties instead of losses, distorting standings.

---

### 4.2 Playoff Week Numbers Can Conflict With Regular Season

**Issue:**
`generate_playoffs()` sets `week_number = season_length + 1` for semifinals. But if the regular season is still being finalized due to races, Week 9 regular matchups could exist alongside Week 9 playoff matchups.

**Impact:**
Confusing data model, potential display issues.

---

### 4.3 Health Data Date Range Query Uses Calendar Week, Not League Week

**Location:** realtimeSync.ts:287-324

**Issue:**
`syncToAllLeagues()` attempts to get league-specific week data using `getWeekDateRange()`, but falls back to pre-aggregated metrics. If league's Week 3 starts on a different calendar week than the user's local calendar week calculation, wrong data is synced.

**Impact:**
User's Monday activity could count toward wrong league week if they're in leagues with different start dates.

---

### 4.4 getCurrentWeekHealthData Uses Calendar Week Always

**Location:** health.ts:321-352

**Issue:**
`getCurrentWeekHealthData()` always gets Monday-to-today of the current calendar week. But a league's "current week" could span different dates if the league started mid-week or has a non-Monday start.

**Impact:**
Health data for leagues not aligned with calendar weeks will be wrong.

---

### 4.5 Timezone Handling is Entirely Absent

**Issue:**
All date calculations use JavaScript `Date` which defaults to local device time. A user in PST opening the app at 9 PM Saturday thinks it's still scoring time. A user in EST at midnight thinks it's Sunday.

**Impact:**
Users in different timezones experience week boundaries at different real-world times.

---

### 4.6 Odd Player Count Bye Week Logic May Skip Last Player

**Location:** 014_improve_matchup_generation.sql:45-49

**Issue:**
```sql
IF member_count % 2 = 1 THEN
    members := array_append(members, NULL::UUID);
    member_count := member_count + 1;
END IF;
```

The NULL is appended, so the last joined player is always paired with NULL (bye). Better rotation would give everyone bye weeks evenly.

**Impact:**
Last player to join gets disproportionate bye weeks in short seasons.

---

### 4.7 Speed Run Playoff Simulation Bypasses finalize_playoff_match()

**Location:** leagueSpeedRun.ts:356-369

**Issue:**
Speed run directly updates playoff matches:
```typescript
await supabase
  .from('playoffs')
  .update({
    player1_score: p1Score,
    player2_score: p2Score,
    winner_id: winnerId,
    is_finalized: true,
  })
  .eq('id', match.id);
```

This bypasses `finalize_playoff_match()` which handles:
- Marking loser as eliminated
- Creating finals matchup
- Crowning champion

**Impact:**
Speed run test results may not match production behavior. Bugs in `finalize_playoff_match()` won't be caught.

---

## 5. Data Integrity Risks

### 5.1 Double Updates

| Risk | Location | Trigger |
|------|----------|---------|
| Week advanced twice | finalize_week() | Race between users |
| total_points added twice | finalize_week() | Retry after timeout |
| Playoff seeds overwritten | generate_playoffs() | Race condition |

### 5.2 Partial Updates

| Risk | Location | Trigger |
|------|----------|---------|
| Some matchups finalized, others not | finalize_week() FOR loop | Timeout mid-processing |
| One player's wins updated, opponent's losses not | finalize_week() | Error between statements |
| Finals created without both semifinal winners | finalize_playoff_match() | Race in semifinal completion |

### 5.3 Inconsistent Aggregates

| Aggregate | Source of Truth | Risk |
|-----------|-----------------|------|
| `league_members.total_points` | Sum of all `weekly_scores.total_points` | Can drift if finalize_week runs twice |
| `league_members.wins/losses/ties` | Count of matchup outcomes | Can drift if finalize_week runs twice |
| `matchups.player1_score/player2_score` | Snapshot of `weekly_scores.total_points` at finalization | Stale if user syncs after finalization |

### 5.4 RLS Loopholes

| Policy | Loophole | Impact |
|--------|----------|--------|
| Bot user creation | Any auth'd user can create bots | League manipulation |
| `league_members` UPDATE | `true` allows anyone to update wins/losses | Direct standings manipulation |
| No row-level league ownership check | League creator field not enforced on many operations | Non-admins can modify league settings |

**Critical:** Migration 018 sets:
```sql
CREATE POLICY "League members can be updated" ON league_members
    FOR UPDATE USING (true);
```

This allows ANY authenticated user to UPDATE ANY league_member record, including wins/losses/total_points.

### 5.5 Bot User Side Effects

| Side Effect | Risk |
|-------------|------|
| Bot users persist after speed run | Orphan records in users table |
| Bot users count toward league capacity | Could prevent real users from joining |
| Bot email pattern is public | Attack vector for fake leagues |

---

## 6. Observability Gaps

### 6.1 Missing Audit Fields

| Table | Missing Field | Why Needed |
|-------|---------------|------------|
| `weekly_scores` | `calculated_at`, `scoring_config_snapshot` | Debug scoring discrepancies |
| `matchups` | `finalized_at`, `finalized_by` | Debug race conditions |
| `league_members` | `points_audit_log` | Track point accumulation history |
| `leagues` | `state_history` | Debug state transitions |

### 6.2 No Event Logging

The app has no mechanism to log:
- When finalize_week() was called and by whom
- When generate_playoffs() ran
- When scoring config changed
- When week advancement occurred

Debugging production issues requires reading raw table data.

### 6.3 Silent Failures

| Operation | Silent Failure Mode |
|-----------|---------------------|
| Health sync | Returns null, no error logged to server |
| Week finalization | swallows errors in FOR loop (lines 228-233 in league.ts) |
| Playoff generation | Catches "<4 players" error without logging |

### 6.4 No Consistency Checks

No mechanism exists to verify:
- `SUM(wins + losses + ties)` for a user = number of weeks played
- `league_members.total_points` = `SUM(weekly_scores.total_points)`
- All players have exactly N matchups for N-week season

---

## 7. Explicit Fix Recommendations (No Code)

### 7.1 For Critical Bug 2.1 (Double Week Advancement)

**Fix:** Make `finalize_week()` idempotent by:
1. Adding a check at the start: if `current_week != p_week`, return early
2. Moving week advancement inside a check: only advance if at least one matchup was finalized this call
3. Adding a `finalized_at` timestamp column to track when week was finalized

### 7.2 For Critical Bug 2.2 (Non-Idempotent Point Accumulation)

**Fix:**
1. Store a snapshot of points at finalization time in `matchups` table
2. Only add to `total_points` if the matchup's `points_added` flag is false
3. Set `points_added = true` atomically with the UPDATE

### 7.3 For Critical Bug 2.3 (Scoring Config Mid-Season)

**Fix:**
1. Snapshot `scoring_config` at league start into a `season_scoring_config` column
2. Use the snapshot for all calculations during the season
3. Alternatively: recalculate ALL weekly_scores when config changes (expensive but consistent)

### 7.4 For Critical Bug 2.4 (Multiple Playoff Generation)

**Fix:**
1. Check `playoffs_started = true` at the start of `generate_playoffs()` and return early
2. Or check if any playoff records exist for this league

### 7.5 For Critical Bug 2.5 (Playoff Tiebreaker Timing)

**Fix:**
1. Snapshot `total_points` at playoff generation time into a `playoff_tiebreaker_points` column on `league_members`
2. Use that snapshot for all playoff tiebreakers
3. Freeze regular season point accumulation once playoffs start

### 7.6 For High-Risk 3.1 (Client-Side Lock)

**Fix:**
Use database-level advisory locks or a `league_locks` table:
1. Before finalize_week, INSERT INTO league_locks with a unique constraint
2. Only one transaction can hold the lock
3. Delete lock after finalization

### 7.7 For High-Risk 3.4 (Bot RLS Policy)

**Fix:**
1. Remove bot user creation from production RLS policy
2. Create a separate service-role function for speed run tests
3. Or require bot emails to include requesting user's ID in the email

### 7.8 For RLS Loophole 5.4 (league_members UPDATE)

**Fix:**
Change policy to only allow updates from SQL functions (service role) or the user themselves:
```sql
FOR UPDATE USING (
    user_id = auth.uid()
    OR
    auth.jwt()->>'role' = 'service_role'
)
```

### 7.9 For Observability Gaps

**Fix:**
1. Add `finalized_at` TIMESTAMPTZ to `matchups`
2. Add `audit_log` JSONB array to `league_members` for point changes
3. Create a `league_events` table logging all state transitions
4. Implement a daily consistency check job (even if manually triggered)

### 7.10 For Timezone Issues

**Fix:**
1. Store all times in UTC
2. Use league's `timezone` setting for display and week boundary calculations
3. Define "week end" as Saturday 23:59:59 in the league's configured timezone

---

## Summary

| Category | Count |
|----------|-------|
| Critical Bugs | 5 |
| High-Risk Issues | 5 |
| Medium/Edge Case Issues | 7 |
| Data Integrity Risks | 5 categories |
| Observability Gaps | 4 categories |

**Most Urgent Fix:** The `finalize_week()` double-advancement bug (2.1) combined with the league_members UPDATE RLS loophole (5.4) makes the competition fundamentally untrustworthy. These should be fixed before any real money or prizes are involved.

**Systemic Issue:** The lack of server-side coordination (no background workers, no cron) means all state transitions depend on client-initiated actions racing against each other. This architectural constraint makes true consistency difficult without database-level locking.
