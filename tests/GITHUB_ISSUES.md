# GitHub Issues Tracker

This file documents all bugs and feature requests found during regression testing.
Issues are formatted for easy copy/paste into GitHub Issues.

**Generated:** 2024-12-30
**Test Suite:** 80/80 unit tests passed
**Bugs Found:** 4 (via code review)

---

## CRITICAL BUGS

### ISSUE-002: Duplicate `sanitizeMetrics` Function Definition

**Type:** Bug
**Priority:** Critical
**Labels:** bug, scoring, duplicate-code
**File:** `services/scoring.ts`

**Description:**
There are TWO definitions of `sanitizeMetrics` function in `services/scoring.ts`:
- **First definition (lines 64-79):** Uses caps: steps=200000, sleepHours=24, etc.
- **Second definition (lines 138-159):** Uses different caps: steps=100000, standHours=16

The second definition **overrides** the first, causing inconsistent behavior. Users may have different scoring caps than intended.

**Impact:**
- Steps capped at 100,000 instead of 200,000
- Stand hours capped at 16 instead of 24
- Inconsistent behavior depending on which function gets called

**Fix:**
Remove the duplicate function definition. Keep the version with the correct caps (likely the first one at lines 64-79 which matches the test expectations of 200k steps).

**Files to Modify:**
- `services/scoring.ts` - Remove lines 138-159 (or 64-79 if second is correct)

---

### ISSUE-003: `getScoringRules` References Non-Existent Property

**Type:** Bug
**Priority:** High
**Labels:** bug, scoring, typo
**File:** `services/scoring.ts`, Lines 297-298

**Description:**
The `getScoringRules` function references `scoringConfig.POINTS_PER_WORKOUT` which doesn't exist. The correct property name is `POINTS_PER_WORKOUT_MINUTE`.

```typescript
// Line 297-298 - INCORRECT:
{
  metric: 'Workouts',
  rule: `${scoringConfig.POINTS_PER_WORKOUT} points per workout`,  // <- WRONG
  icon: '💪',
}
```

**Impact:**
- UI shows "undefined points per workout" or crashes
- Users don't see correct workout scoring rules

**Fix:**
Change `POINTS_PER_WORKOUT` to `POINTS_PER_WORKOUT_MINUTE` and update the text to reflect minutes:

```typescript
{
  metric: 'Workouts',
  rule: `${scoringConfig.POINTS_PER_WORKOUT_MINUTE} points per minute`,
  icon: '💪',
}
```

**Files to Modify:**
- `services/scoring.ts` - Line 298

---

### ISSUE-004: Playoffs Qualify Top 8 Instead of Top 4 for Large Leagues

**Type:** Bug
**Priority:** Critical
**Labels:** bug, playoffs, business-logic
**File:** `services/playoffs.ts`, Lines 46-57

**Description:**
The business requirement states that **ALL league sizes should have top 4 qualify for playoffs**. However, the current implementation qualifies top 8 for leagues with 8+ players:

```typescript
// Line 54 - INCORRECT:
const playoffSize = leagueSize ? (leagueSize >= 8 ? 8 : 4) : 4;
```

**Impact:**
- 8, 10, 12, and 14 player leagues have 8 playoff qualifiers instead of 4
- Playoffs have quarterfinals when they should only have semifinals + finals
- Inconsistent playoff experience across league sizes

**Expected Behavior:**
- All leagues (4, 6, 8, 10, 12, 14 players) → Top 4 qualify
- Semifinals: 1v4, 2v3
- Finals: winners play for championship

**Fix:**
```typescript
// Always return top 4
const playoffSize = 4;
return sorted.slice(0, Math.min(playoffSize, sorted.length));
```

Also remove the quarterfinal logic in `generatePlayoffMatchups` (lines 92-109).

**Files to Modify:**
- `services/playoffs.ts` - Lines 54-57, 92-109

---

## FEATURE REQUESTS

### ISSUE-001: Change Week Boundaries to Mon-Sat Scoring with Sunday Results Day

**Type:** Feature Request
**Priority:** High
**Labels:** enhancement, scoring, week-boundaries

**Description:**
Currently, week boundaries run Monday 00:00 - Sunday 23:59 for scoring. Change to:
- **Scoring Period:** Monday 00:00 - Saturday 23:59
- **Results Day:** Sunday - Users can view final scores, see who won, and see next week's opponent

**Acceptance Criteria:**
- [ ] Update `getWeekDateRange()` to return Mon-Sat instead of Mon-Sun
- [ ] Update `calculateDaysRemainingInWeek()` to account for 6-day scoring period
- [ ] Update matchup finalization to trigger at Saturday 23:59
- [ ] Add "Results Day" UI state for Sunday
- [ ] Show next week's opponent preview on Sunday
- [ ] Update background sync to not count Sunday health data in current week

**Files to Modify:**
- `utils/dates.ts` - Week date calculations
- `services/league.ts` - Days remaining calculation
- `app/(app)/league/[leagueId]/matchup.tsx` - Results Day UI
- `services/backgroundSync.ts` - Sync timing

---

## POTENTIAL ISSUES (Need Verification)

### ISSUE-005: Week Auto-Advancement May Have Race Conditions

**Type:** Potential Bug
**Priority:** Medium
**Labels:** needs-investigation, race-condition
**File:** `services/league.ts`, Lines 207-282

**Description:**
The week auto-advancement logic uses an in-memory lock (`leagueWeekLocks`). This works for a single server but could fail with:
- Multiple server instances
- Serverless deployments (each function instance has its own memory)
- App restarts clearing the lock map

**Recommendation:**
Consider using database-level locking (e.g., Supabase advisory locks) instead of in-memory locks for production reliability.

---

### ISSUE-006: Error Handling Silently Swallows Errors

**Type:** Code Quality
**Priority:** Low
**Labels:** code-quality, error-handling
**Files:** Multiple

**Description:**
Several try/catch blocks swallow errors without logging:

```typescript
// Example from league.ts:
} catch (error: any) {
  // Error finalizing week
}
```

**Recommendation:**
Add proper error logging or telemetry for production debugging.

---

## SUMMARY

| Issue | Type | Priority | Status |
|-------|------|----------|--------|
| ISSUE-001 | Feature | High | Open |
| ISSUE-002 | Bug | Critical | Open |
| ISSUE-003 | Bug | High | Open |
| ISSUE-004 | Bug | Critical | Open |
| ISSUE-005 | Potential | Medium | Needs Investigation |
| ISSUE-006 | Code Quality | Low | Open |

**Critical Bugs to Fix Before Launch:** ISSUE-002, ISSUE-004
**High Priority:** ISSUE-001, ISSUE-003

---

## How to Create These Issues in GitHub

1. Go to: https://github.com/Lake-Effect-Labs/lockin/issues/new
2. Copy the title and description from each issue above
3. Add appropriate labels
4. Assign to an agent or developer

Or use the GitHub CLI:
```bash
gh issue create --title "Bug: Duplicate sanitizeMetrics function" --body "..." --label "bug,critical"
```
