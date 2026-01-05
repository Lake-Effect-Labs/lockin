# Lock-In Competition System Fix Plan

**Date:** January 5, 2026
**Based On:** Bug Audit Report (Jan 5, 2026)
**Goal:** Make the competition system trustworthy for a friends beta

---

## 1. Global Strategy

### 1.1 Core Invariants That Must Always Hold

| ID | Invariant | Violated By |
|----|-----------|-------------|
| INV-1 | A week can only be finalized once per league | Audit 2.1 |
| INV-2 | `league_members.total_points` = `SUM(weekly_scores.total_points)` for that user/league | Audit 2.2 |
| INV-3 | Scoring formula is frozen at season start | Audit 2.3 |
| INV-4 | Playoffs are generated exactly once per league | Audit 2.4 |
| INV-5 | Playoff tiebreaker uses frozen end-of-regular-season totals | Audit 2.5 |
| INV-6 | Only SQL functions (not users) can modify standings data | Audit 5.4 |
| INV-7 | Week boundaries are deterministic (not device-dependent) | Audit 4.5 |

### 1.2 High-Level Approach

**Idempotency:** Every state-changing SQL function must be safe to call multiple times with the same arguments. Achieved via:
- Guard clauses that return early if operation already completed
- Tracking flags (`points_added`, `is_finalized`, etc.)
- Conditional writes that check current state before mutating

**Locking:** Use PostgreSQL advisory locks (`pg_advisory_xact_lock`) to serialize critical operations per-league. This prevents concurrent `finalize_week()` calls from racing.

**Snapshots:** Freeze mutable data at critical moments:
- Snapshot `scoring_config` when season starts
- Snapshot `total_points` when playoffs start
- Snapshot `weekly_scores.total_points` into `matchups` at finalization

**Constraints:** Add database-level constraints where possible:
- `CHECK` constraints on state transitions
- `UNIQUE` constraints to prevent duplicates
- Foreign keys for referential integrity

**RLS Lockdown:** Remove all overly permissive policies. User operations go through SQL functions with service-role access patterns.

---

## 2. Fixes for Critical Issues

### 2.1 Fix for Audit 2.1: Double Week Advancement

**What Must Change:**
1. Add a guard clause at the start of `finalize_week()` that returns immediately if `leagues.current_week != p_week`
2. Track whether any matchups were actually finalized in this call
3. Only advance `current_week` if at least one matchup was finalized
4. Use an advisory lock to serialize concurrent calls

**Where:**
- SQL function: `finalize_week(p_league_id UUID, p_week INTEGER)`
- Table: `leagues` (add `last_week_finalized_at TIMESTAMPTZ`)
- Table: `matchups` (add `finalized_at TIMESTAMPTZ`)

**Exact Condition/Invariant:**
```
AT START:
  IF (SELECT current_week FROM leagues WHERE id = p_league_id) != p_week THEN
    RETURN; -- Already past this week, idempotent no-op
  END IF;

AT END (after FOR loop):
  IF matchups_finalized_count > 0 THEN
    UPDATE leagues SET current_week = current_week + 1, last_week_finalized_at = NOW()
    WHERE id = p_league_id AND current_week = p_week; -- conditional update
  END IF;
```

**Why Sufficient:**
- The guard clause prevents processing if week already advanced
- The conditional `WHERE current_week = p_week` at the end means only one call can advance the week
- Advisory lock ensures serialization even under concurrent calls
- `finalized_at` on matchups provides audit trail

---

### 2.2 Fix for Audit 2.2: Non-Idempotent Point Accumulation

**What Must Change:**
1. Add `points_added BOOLEAN DEFAULT FALSE` column to `matchups` table
2. Only add points to `league_members.total_points` if `points_added = FALSE`
3. Set `points_added = TRUE` atomically when adding points
4. Store the actual points added in matchup record for audit

**Where:**
- Table: `matchups` (add `points_added BOOLEAN DEFAULT FALSE`, `p1_points_snapshot DECIMAL`, `p2_points_snapshot DECIMAL`)
- SQL function: `finalize_week()` point accumulation section

**Exact Condition/Invariant:**
```
-- Inside the matchup FOR loop, BEFORE adding points:
IF NOT matchup.points_added THEN
  -- Add points to league_members
  UPDATE league_members SET total_points = total_points + p1_score ...;
  UPDATE league_members SET total_points = total_points + p2_score ...;

  -- Mark as added and snapshot
  UPDATE matchups SET
    points_added = TRUE,
    p1_points_snapshot = p1_score,
    p2_points_snapshot = p2_score
  WHERE id = matchup.id;
END IF;
```

**Why Sufficient:**
- `points_added` flag is checked before every accumulation
- Even if function runs twice, points are only added once
- Snapshot allows verification that correct amount was added
- Works across retries and concurrent calls because flag is persisted

---

### 2.3 Fix for Audit 2.3: Scoring Config Mid-Season Inconsistency

**What Must Change:**
1. Add `season_scoring_config JSONB` column to `leagues` table
2. Copy `scoring_config` to `season_scoring_config` when league starts (start_date is set)
3. Modify `auto_calculate_points()` trigger to use `season_scoring_config` if set, else `scoring_config`
4. Make `scoring_config` editable only before season starts

**Where:**
- Table: `leagues` (add `season_scoring_config JSONB`)
- SQL function: `auto_calculate_points()` trigger
- SQL function or trigger: on league start, snapshot the config
- Optionally: add CHECK constraint or trigger to prevent `scoring_config` changes after start

**Exact Condition/Invariant:**
```
-- In auto_calculate_points() trigger:
SELECT COALESCE(season_scoring_config, scoring_config) INTO league_config
FROM leagues WHERE id = NEW.league_id;
```

```
-- When league starts (start_date set from NULL to value):
UPDATE leagues SET season_scoring_config = scoring_config
WHERE id = p_league_id AND season_scoring_config IS NULL;
```

**Why Sufficient:**
- All weekly_scores calculations use frozen config
- Even if admin changes `scoring_config`, active season uses `season_scoring_config`
- Provides clear audit: what config was used for this season

---

### 2.4 Fix for Audit 2.4: Multiple Playoff Generation

**What Must Change:**
1. Add guard clause at start of `generate_playoffs()`: return early if `playoffs_started = TRUE`
2. Add guard clause: return early if any playoff records exist for this league
3. Use advisory lock to serialize concurrent calls

**Where:**
- SQL function: `generate_playoffs(p_league_id UUID)`

**Exact Condition/Invariant:**
```
-- At function start:
IF (SELECT playoffs_started FROM leagues WHERE id = p_league_id) = TRUE THEN
  RETURN; -- Playoffs already generated
END IF;

IF EXISTS (SELECT 1 FROM playoffs WHERE league_id = p_league_id) THEN
  RETURN; -- Playoff records already exist
END IF;

-- Acquire advisory lock for this league
PERFORM pg_advisory_xact_lock(hashtext('playoffs-' || p_league_id::text));

-- Re-check after acquiring lock (double-check locking pattern)
IF (SELECT playoffs_started FROM leagues WHERE id = p_league_id) = TRUE THEN
  RETURN;
END IF;
```

**Why Sufficient:**
- First check prevents unnecessary lock acquisition
- Advisory lock serializes concurrent calls
- Double-check after lock handles race between check and lock acquisition
- Existing `ON CONFLICT DO NOTHING` on playoff inserts is backup

---

### 2.5 Fix for Audit 2.5: Playoff Tiebreaker Uses Mutable Points

**What Must Change:**
1. Add `playoff_tiebreaker_points DECIMAL(10,2)` column to `league_members`
2. When playoffs are generated, snapshot `total_points` into `playoff_tiebreaker_points` for top 4
3. Modify `finalize_playoff_match()` to use `playoff_tiebreaker_points` instead of `total_points`
4. Stop accumulating regular-season points to `total_points` once playoffs start

**Where:**
- Table: `league_members` (add `playoff_tiebreaker_points DECIMAL(10,2)`)
- SQL function: `generate_playoffs()` (add snapshot step)
- SQL function: `finalize_playoff_match()` (change tiebreaker lookup)
- SQL function: `finalize_week()` (skip point accumulation if playoffs_started)

**Exact Condition/Invariant:**
```
-- In generate_playoffs(), after selecting top 4:
UPDATE league_members
SET playoff_tiebreaker_points = total_points
WHERE league_id = p_league_id AND user_id = ANY(top_players);
```

```
-- In finalize_playoff_match() tiebreaker section:
SELECT playoff_tiebreaker_points INTO p1_total_points
FROM league_members
WHERE league_id = playoff.league_id AND user_id = playoff.player1_id;
```

```
-- In finalize_week(), guard against playoff weeks:
IF (SELECT playoffs_started FROM leagues WHERE id = p_league_id) = TRUE THEN
  RETURN; -- Don't finalize regular season weeks during playoffs
END IF;
```

**Why Sufficient:**
- Tiebreaker values are frozen at playoff generation time
- Late health syncs don't affect playoff outcomes
- Snapshot is immutable once set
- Clear audit trail of what values determined seeding

---

## 3. Fixes for High-Risk Issues

### 3.1 Fix for Audit 3.1: Client-Side Lock Ineffective

**What Must Change:**
1. Use PostgreSQL advisory locks in all state-changing functions
2. Remove reliance on client-side `leagueWeekLocks` Map
3. Each critical function acquires lock at start, releases at end (automatic with `pg_advisory_xact_lock`)

**Where:**
- SQL functions: `finalize_week()`, `generate_playoffs()`, `finalize_playoff_match()`
- Frontend: Remove `leagueWeekLocks` or keep only as UI debounce (not for correctness)

**Exact Pattern:**
```
-- At start of finalize_week():
PERFORM pg_advisory_xact_lock(hashtext('finalize-week-' || p_league_id::text || '-' || p_week::text));
```

**Why Sufficient:**
- Advisory locks are process-global across all database connections
- `pg_advisory_xact_lock` automatically releases when transaction ends
- Different lock keys for different operations allow parallelism where safe
- Serializes all concurrent attempts at the same operation

---

### 3.2 Fix for Audit 3.2: Matchup Generation Swap Logic

**What Must Change:**
1. Simplify the swap logic or remove it entirely
2. Accept occasional repeat opponents as preferable to corrupted matchups
3. Add validation after generation: ensure no player appears twice in same week

**Where:**
- SQL function: `generate_matchups()`

**Exact Condition/Invariant:**
```
-- After generating matchups for a week, validate:
IF EXISTS (
  SELECT player_id, COUNT(*)
  FROM (
    SELECT player1_id AS player_id FROM matchups WHERE league_id = p_league_id AND week_number = week
    UNION ALL
    SELECT player2_id AS player_id FROM matchups WHERE league_id = p_league_id AND week_number = week
  ) sub
  GROUP BY player_id
  HAVING COUNT(*) > 1
) THEN
  RAISE EXCEPTION 'Invalid matchup generation: player appears twice in week %', week;
END IF;
```

**Why Sufficient:**
- Validation catches bugs before they corrupt standings
- Exception prevents bad data from being committed
- Simpler logic is easier to verify correct

---

### 3.3 Fix for Audit 3.3: Workout Unit Mismatch

**What Must Change:**
1. Clarify in database that `workouts` field is MINUTES not count
2. Rename `points_per_workout` to `points_per_workout_minute` in scoring config schema
3. Update default value to match frontend (0.2 per minute)
4. Document the unit in column comment

**Where:**
- Table: `weekly_scores` (add comment clarifying unit)
- SQL function: `calculate_points()` (rename parameter, update default)
- Migration: Update any existing scoring_config JSONB to use new key name

**Exact Change:**
```sql
-- In calculate_points():
points_per_workout_minute := COALESCE((p_scoring_config->>'points_per_workout_minute')::DECIMAL, 0.2);
-- Also support legacy key for backwards compatibility during migration:
IF points_per_workout_minute IS NULL THEN
  points_per_workout_minute := COALESCE((p_scoring_config->>'points_per_workout')::DECIMAL, 0.2);
END IF;
```

**Why Sufficient:**
- Clear naming prevents future confusion
- Default value matches frontend behavior
- Backward compatibility handles existing leagues

---

### 3.4 Fix for Audit 3.4: Bot User RLS Policy Too Permissive

**What Must Change:**
1. Remove the bot email pattern from user-accessible INSERT policy
2. Bot creation should require service role
3. Speed run tests must use service role or a dedicated admin endpoint

**Where:**
- RLS Policy: `"Users can insert own profile or bot users"` on `users` table
- RLS Policy: `"Users can join leagues or add bot users"` on `league_members` table

**Exact Policy Change:**
```sql
-- Replace the bot-allowing policy with strict user-only:
DROP POLICY "Users can insert own profile or bot users" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- For league_members:
DROP POLICY "Users can join leagues or add bot users" ON league_members;
CREATE POLICY "Users can join leagues" ON league_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Why Sufficient:**
- Only authenticated users can create their own profile
- Bot creation blocked at RLS level
- Speed run tests must use service role key (acceptable for dev/test only)
- Production users cannot create fake competitors

---

### 3.5 Fix for Audit 3.5: start_date Not Validated as Monday

**What Must Change:**
1. Add a CHECK constraint or trigger that ensures `start_date` is always a Monday
2. Validate in the auto-start logic when league becomes full

**Where:**
- Table: `leagues` (add CHECK constraint)
- Frontend: `supabase.ts` (validate before setting)

**Exact Constraint:**
```sql
ALTER TABLE leagues ADD CONSTRAINT start_date_must_be_monday
CHECK (start_date IS NULL OR EXTRACT(DOW FROM start_date) = 1);
```

Note: In PostgreSQL, `EXTRACT(DOW FROM date)` returns 0=Sunday, 1=Monday, etc.

**Why Sufficient:**
- Database rejects invalid start dates
- Existing code already uses `getNextMonday()` which returns Monday
- Constraint prevents any manual/API bypass

---

## 4. Required Database Changes

### 4.1 New Columns

| Table | Column | Type | Default | Purpose |
|-------|--------|------|---------|---------|
| `leagues` | `season_scoring_config` | `JSONB` | `NULL` | Frozen scoring config for active season |
| `leagues` | `last_week_finalized_at` | `TIMESTAMPTZ` | `NULL` | Audit: when last finalization occurred |
| `league_members` | `playoff_tiebreaker_points` | `DECIMAL(10,2)` | `NULL` | Frozen points for playoff tiebreakers |
| `matchups` | `points_added` | `BOOLEAN` | `FALSE` | Flag: have points been added to standings |
| `matchups` | `p1_points_snapshot` | `DECIMAL(10,2)` | `NULL` | Audit: points added for player 1 |
| `matchups` | `p2_points_snapshot` | `DECIMAL(10,2)` | `NULL` | Audit: points added for player 2 |
| `matchups` | `finalized_at` | `TIMESTAMPTZ` | `NULL` | Audit: when matchup was finalized |

### 4.2 New Constraints

| Table | Constraint | Definition | Purpose |
|-------|------------|------------|---------|
| `leagues` | `start_date_must_be_monday` | `CHECK (start_date IS NULL OR EXTRACT(DOW FROM start_date) = 1)` | Ensure week calculations are valid |

### 4.3 Advisory Lock Keys

| Operation | Lock Key Pattern | Granularity |
|-----------|------------------|-------------|
| `finalize_week()` | `'finalize-week-' || league_id || '-' || week` | Per league-week |
| `generate_playoffs()` | `'playoffs-' || league_id` | Per league |
| `generate_matchups()` | `'matchups-' || league_id` | Per league |

Use `pg_advisory_xact_lock(hashtext(key))` for transaction-scoped locks.

### 4.4 Transaction Boundaries

All critical SQL functions already run as single transactions (default Postgres behavior for functions). Key requirements:

1. **`finalize_week()`**: Must complete atomically - all matchups finalized and week advanced together
2. **`generate_playoffs()`**: Must complete atomically - all seeds set and matches created together
3. **`finalize_playoff_match()`**: Must complete atomically - winner set, loser eliminated, next match created together

**Isolation Level:** Default (READ COMMITTED) is sufficient with advisory locks providing serialization.

---

## 5. Final Competition State Model

### 5.1 Canonical League States

| State | Derived From | Allowed Next States |
|-------|--------------|---------------------|
| `CREATED` | `start_date IS NULL AND current_week = 1` | ACTIVE |
| `ACTIVE` | `start_date IS NOT NULL AND NOT playoffs_started AND is_active` | PLAYOFFS, ABANDONED |
| `PLAYOFFS` | `playoffs_started = TRUE AND champion_id IS NULL AND is_active` | COMPLETE |
| `COMPLETE` | `champion_id IS NOT NULL OR is_active = FALSE` | (terminal) |
| `ABANDONED` | `is_active = FALSE AND champion_id IS NULL` | (terminal) |

**Enforcement:** No explicit `state` column needed. State is derived from existing fields. Add a computed column or view if explicit state is useful for queries.

### 5.2 Canonical Week States

| State | Condition | Transitions |
|-------|-----------|-------------|
| `FUTURE` | `week_number > current_week` | -> ACTIVE (when current_week advances) |
| `ACTIVE` | `week_number = current_week AND NOT all matchups finalized` | -> FINALIZED |
| `FINALIZED` | `week_number < current_week OR all matchups for week have is_finalized=TRUE` | (terminal for that week) |

**Key Rule:** `current_week` only advances when `finalize_week()` successfully processes at least one matchup.

### 5.3 Forbidden Transitions

| From | To | Why Forbidden | How Enforced |
|------|-----|---------------|--------------|
| ACTIVE | CREATED | Can't un-start a league | `start_date` not nullable after set (no UPDATE policy allowing NULL) |
| PLAYOFFS | ACTIVE | Can't go back to regular season | `playoffs_started` not resettable (no policy allows FALSE after TRUE) |
| COMPLETE | * | League is done | `is_active = FALSE` is terminal |
| Week N FINALIZED | Week N ACTIVE | Can't re-open a week | `is_finalized` not resettable |

---

## 6. Idempotency & Race-Condition Rules

### 6.1 How `finalize_week()` Becomes Idempotent

**Entry Conditions:**
1. Acquire advisory lock for this league-week
2. Check `leagues.current_week = p_week` - if not, return (already past this week)
3. Check at least one matchup exists with `is_finalized = FALSE` for this week

**Processing:**
1. FOR each unfinalIZED matchup in this league-week:
   - Fetch scores from `weekly_scores`
   - Determine winner
   - SET `is_finalized = TRUE`, `finalized_at = NOW()`
   - IF `points_added = FALSE`:
     - Add points to `league_members`
     - SET `points_added = TRUE`, snapshot columns
   - Update wins/losses/ties

**Exit Conditions:**
1. IF any matchups were finalized: `UPDATE leagues SET current_week = current_week + 1 WHERE current_week = p_week`
2. Advisory lock releases automatically

**Under Retry:** Second call finds `current_week != p_week`, returns immediately.

**Under Concurrent Call:** Second caller blocks on advisory lock, then finds work already done, returns.

### 6.2 How `generate_playoffs()` Becomes Idempotent

**Entry Conditions:**
1. Check `playoffs_started = FALSE` - if TRUE, return
2. Check no playoff records exist - if any, return
3. Acquire advisory lock for this league
4. Re-check `playoffs_started` after lock (double-check pattern)

**Processing:**
1. Calculate top 4 players
2. Set `playoff_seed` on league_members
3. Set `playoff_tiebreaker_points` snapshot
4. Insert semifinal matches
5. Set `playoffs_started = TRUE`

**Under Retry/Concurrent:** Guard clauses and lock ensure only one execution succeeds.

### 6.3 How Playoff Match Finalization Remains Correct

**For Late Health Sync:**
- Playoff tiebreakers use `playoff_tiebreaker_points` (frozen at playoff start)
- Regular season `finalize_week()` returns early if `playoffs_started = TRUE`
- Late syncs update `weekly_scores` and `total_points` but don't affect playoff outcomes

**For `finalize_playoff_match()` Races:**
- Check `is_finalized = FALSE` at start - if TRUE, return
- Use advisory lock keyed on playoff match ID
- Finals creation uses `ON CONFLICT DO NOTHING`

### 6.4 Two Clients Calling Same RPC Simultaneously

| RPC | Client A | Client B | Outcome |
|-----|----------|----------|---------|
| `finalize_week(L, 3)` | Acquires lock, processes | Blocks on lock | A completes, B finds week=4, returns no-op |
| `generate_playoffs(L)` | Acquires lock, generates | Blocks on lock | A completes, B finds playoffs_started=TRUE, returns no-op |
| `finalize_playoff_match(M)` | Acquires lock, processes | Blocks on lock | A completes, B finds is_finalized=TRUE, returns no-op |

---

## 7. Security / RLS Remediation Plan

### 7.1 Fix `league_members` UPDATE Policy

**Current (DANGEROUS):**
```sql
CREATE POLICY "League members can be updated" ON league_members
    FOR UPDATE USING (true);
```

**Fixed:**
```sql
DROP POLICY IF EXISTS "League members can be updated" ON league_members;

-- Users can only update their own non-competition fields
CREATE POLICY "Users can update own membership" ON league_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (
      -- Cannot modify competition data directly
      -- These columns can only be modified by SQL functions
      wins = (SELECT wins FROM league_members WHERE id = league_members.id) AND
      losses = (SELECT losses FROM league_members WHERE id = league_members.id) AND
      ties = (SELECT ties FROM league_members WHERE id = league_members.id) AND
      total_points = (SELECT total_points FROM league_members WHERE id = league_members.id) AND
      playoff_seed = (SELECT playoff_seed FROM league_members WHERE id = league_members.id) AND
      is_eliminated = (SELECT is_eliminated FROM league_members WHERE id = league_members.id)
    );
```

**Alternative (Simpler):** Remove all user UPDATE on league_members entirely. All updates happen through SQL functions which run as `SECURITY DEFINER`.

### 7.2 Fix Bot User Creation Policy

**Current (DANGEROUS):**
```sql
CREATE POLICY "Users can insert own profile or bot users" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id
        OR
        (email LIKE '%@speedrun.test' OR email LIKE '%@bot.test')
    );
```

**Fixed:**
```sql
DROP POLICY IF EXISTS "Users can insert own profile or bot users" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);
```

**For Speed Run Tests:** Use Supabase service role key in test environment only.

### 7.3 Operations Requiring Service Role

| Operation | Why Service Role |
|-----------|------------------|
| Creating bot users | Testing only, bypasses RLS |
| Manual standings correction | Admin intervention |
| Deleting leagues | Admin intervention |
| Bulk recalculation | Migration/repair scripts |

### 7.4 Minimal Safe Policy Set for Beta

**users:**
- SELECT: authenticated (view all profiles)
- INSERT: own profile only (`auth.uid() = id`)
- UPDATE: own profile only (`auth.uid() = id`)
- DELETE: not allowed via RLS

**leagues:**
- SELECT: league members only
- INSERT: authenticated users
- UPDATE: league creator only
- DELETE: league creator only (or service role)

**league_members:**
- SELECT: league members can see each other
- INSERT: user can add self to league (`auth.uid() = user_id`)
- UPDATE: not allowed via RLS (all updates through functions)
- DELETE: user can remove self (`auth.uid() = user_id`)

**matchups:**
- SELECT: league members
- INSERT/UPDATE/DELETE: not allowed via RLS (managed by functions)

**weekly_scores:**
- SELECT: league members
- INSERT: user can insert own scores (`auth.uid() = user_id`)
- UPDATE: user can update own scores (`auth.uid() = user_id`)
- DELETE: not allowed via RLS

**playoffs:**
- SELECT: league members
- INSERT/UPDATE/DELETE: not allowed via RLS (managed by functions)

---

## 8. Time & Timezone Determinism (Minimal Fix)

### 8.1 Minimum Viable Approach

**Decision:** Use UTC for all week boundary calculations. Display in user's local timezone but calculate in UTC.

**Why UTC:**
- Deterministic across all clients
- No ambiguity about when week ends
- Simple to implement
- Fair: all users in same league have same deadline

### 8.2 Storage

- `leagues.start_date`: Store as `DATE` (already is) - interpret as Monday 00:00:00 UTC
- All `TIMESTAMPTZ` columns: Store in UTC (Postgres default)
- No per-league timezone setting needed for beta

### 8.3 Week Boundary Definition

**Scoring Week:** Monday 00:00:00 UTC through Saturday 23:59:59 UTC (6 days)
**Results Day:** Sunday 00:00:00 UTC through Sunday 23:59:59 UTC

**Frontend Change Required:**
- `utils/dates.ts`: All functions that determine "is week ended" must use UTC
- `getWeekNumber()`, `getDaysRemainingInWeek()`: Calculate using UTC dates
- Display: Convert UTC boundaries to local time for user-friendly display

**Exact Rule:**
```
Week N ends at: start_date + (N * 7 days) - 1 second
Week N starts at: start_date + ((N-1) * 7 days)

In UTC:
- Week 1: start_date 00:00:00 UTC -> start_date + 6 days 23:59:59 UTC
- Week 2: start_date + 7 days 00:00:00 UTC -> start_date + 13 days 23:59:59 UTC
```

### 8.4 Frontend Changes Required

Modify these functions to use UTC:
- `getWeekNumber(startDate, currentDate)`: Use `Date.UTC()` or `.getUTCDay()` methods
- `getDaysRemainingInWeek()`: Calculate difference using UTC timestamps
- `isResultsDay()`: Check if current UTC time is Sunday in league's week

---

## 9. Implementation Order

### Phase 1: Trust Killers (Do First)

**Migration 020_fix_critical_race_conditions.sql:**
1. Add columns: `matchups.points_added`, `matchups.p1_points_snapshot`, `matchups.p2_points_snapshot`, `matchups.finalized_at`
2. Add columns: `leagues.season_scoring_config`, `leagues.last_week_finalized_at`
3. Add column: `league_members.playoff_tiebreaker_points`
4. Backfill `points_added = TRUE` for all existing finalized matchups
5. Backfill `season_scoring_config = scoring_config` for all started leagues

**Migration 021_fix_finalize_week_idempotency.sql:**
1. Replace `finalize_week()` function with idempotent version
2. Add advisory lock acquisition
3. Add guard clauses
4. Add conditional week advancement
5. Add points_added check

**Migration 022_fix_rls_security_holes.sql:**
1. Drop dangerous policies
2. Create restrictive policies
3. Remove bot user creation capability

### Phase 2: Playoff Integrity

**Migration 023_fix_playoffs_idempotency.sql:**
1. Replace `generate_playoffs()` with idempotent version
2. Add advisory lock
3. Add guard clauses
4. Add `playoff_tiebreaker_points` snapshot step

**Migration 024_fix_playoff_tiebreaker.sql:**
1. Update `finalize_playoff_match()` to use `playoff_tiebreaker_points`
2. Add guard for `is_finalized = TRUE`

### Phase 3: Scoring Consistency

**Migration 025_fix_scoring_config_freeze.sql:**
1. Update `auto_calculate_points()` trigger to use `season_scoring_config`
2. Add trigger/function to snapshot config when league starts

**Migration 026_fix_workout_units.sql:**
1. Rename scoring config key to `points_per_workout_minute`
2. Update `calculate_points()` default value to 0.2
3. Add backward compatibility for old key

### Phase 4: Data Integrity Constraints

**Migration 027_add_constraints.sql:**
1. Add `start_date_must_be_monday` CHECK constraint
2. Add any additional constraints identified

### Phase 5: Timezone Determinism

**Frontend Changes (after migrations):**
1. Update `utils/dates.ts` to use UTC consistently
2. Update `league.ts` week boundary checks
3. Test with users in different timezones

### Phase 6: Observability (Nice to Have)

**Migration 028_add_audit_fields.sql:**
1. Add any remaining audit columns
2. Create `league_events` table if desired

### Phase 7: Cleanup

1. Remove client-side `leagueWeekLocks` (or keep as UI debounce only)
2. Update speed run tests to use service role
3. Add integration tests for race conditions

---

## 10. Additional Core Logic Flaws Identified

### 10.1 `finalize_week()` Doesn't Validate Week Bounds

**Issue:** Function accepts any `p_week` value. Calling `finalize_week(league, 0)` or `finalize_week(league, 99)` would execute without error.

**Fix:** Add guard clause at start:
```
IF p_week < 1 OR p_week > season_length_weeks THEN
  RETURN;
END IF;
```

### 10.2 No Prevention of Score Sync After Week Finalized

**Issue:** Users can call `upsertWeeklyScore()` for a finalized week, updating their score after matchup was decided.

**Fix:** In `upsertWeeklyScore()` or the trigger, check if any matchup for this user/week is already finalized:
```
IF EXISTS (
  SELECT 1 FROM matchups
  WHERE league_id = NEW.league_id
  AND week_number = NEW.week_number
  AND (player1_id = NEW.user_id OR player2_id = NEW.user_id)
  AND is_finalized = TRUE
) THEN
  -- Either reject the update or just don't recalculate
  RETURN OLD; -- or RETURN NEW without changes
END IF;
```

### 10.3 `generate_matchups()` Can Be Called Multiple Times Per Week

**Issue:** No guard against re-generating matchups for an existing week.

**Fix:** Already partially handled by `ON CONFLICT DO NOTHING`, but add explicit guard:
```
IF EXISTS (SELECT 1 FROM matchups WHERE league_id = p_league_id AND week_number = week) THEN
  RETURN; -- Matchups already exist for current week
END IF;
```

(This is actually present in 014_improve_matchup_generation.sql but should be verified it's in production)

---

## Summary Checklist

| Issue | Audit Ref | Fix Location | Phase |
|-------|-----------|--------------|-------|
| Double week advancement | 2.1 | `finalize_week()` | 1 |
| Non-idempotent point accumulation | 2.2 | `finalize_week()` | 1 |
| Scoring config mid-season | 2.3 | trigger + league start | 3 |
| Multiple playoff generation | 2.4 | `generate_playoffs()` | 2 |
| Playoff tiebreaker timing | 2.5 | `generate_playoffs()` + `finalize_playoff_match()` | 2 |
| Client-side lock ineffective | 3.1 | Advisory locks | 1 |
| Matchup swap logic | 3.2 | `generate_matchups()` | 4 |
| Workout unit mismatch | 3.3 | `calculate_points()` | 3 |
| Bot user RLS | 3.4 | RLS policies | 1 |
| start_date not Monday | 3.5 | CHECK constraint | 4 |
| league_members UPDATE RLS | 5.4 | RLS policies | 1 |
| Timezone determinism | 4.5 | Frontend UTC | 5 |

**Total Migrations Required:** ~9 (can be consolidated)
**Frontend Changes Required:** Timezone handling in `utils/dates.ts`
**Test Coverage Required:** Race condition integration tests
