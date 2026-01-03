# Matchup Detail Screen Bugs
**Date:** 2026-01-03  
**Screen:** `app/(app)/league/[leagueId]/matchup.tsx`

---

## 🔴 BUG #1: Null Values Crash on getPointsBreakdown (Lines 57-73)

**The Problem:**
Passing potentially `null` or `undefined` values directly to `getPointsBreakdown`:

```typescript
const myBreakdown = userScore ? getPointsBreakdown({
  steps: userScore.steps,           // ❌ Could be null/undefined
  sleepHours: userScore.sleep_hours, // ❌ Could be null/undefined
  calories: userScore.calories,      // ❌ Could be null/undefined
  workouts: userScore.workouts,      // ❌ Could be null/undefined
  standHours: userScore.stand_hours, // ❌ Could be null/undefined
  distance: userScore.distance,      // ❌ Could be null/undefined
}, leagueScoringConfig) : null;
```

**Impact:**
- If any field in `userScore` is `null`, the scoring calculation may produce `NaN`
- App may crash or show incorrect scores
- Same issue with `opponentBreakdown`

**Fix:**
Add `|| 0` fallback for each field (consistent with other screens)

---

## 🔴 BUG #2: Missing Null Coalescing for Scores (Lines 76-77)

**The Problem:**
```typescript
const myScore = myBreakdown?.totalPoints || (isPlayer1 ? currentMatchup.player1_score : currentMatchup.player2_score);
const theirScore = opponentBreakdown?.totalPoints || (isPlayer1 ? currentMatchup.player2_score : currentMatchup.player1_score);
```

If both `breakdown.totalPoints` and `matchup.player_score` are `null`/`undefined`, then `myScore` will be `null`/`undefined`.

**Later in code (lines 223, 227):**
```typescript
{myScore.toFixed(1)}    // ❌ CRASH if myScore is null!
{theirScore.toFixed(1)} // ❌ CRASH if theirScore is null!
```

**Impact:**
- App crashes when viewing matchup with no scores yet
- Same issue throughout the component where `.toFixed()` is called

**Fix:**
Add `?? 0` fallback for both scores

---

## 🔴 BUG #3: Missing standHours in PointsBreakdown (Line 236-248)

**The Problem:**
The `PointsBreakdown` component call is missing `standHours` and `standHoursPoints`:

```typescript
<PointsBreakdown
  steps={userScore?.steps || 0}
  stepsPoints={myBreakdown.stepsPoints}
  sleep={userScore?.sleep_hours || 0}
  sleepPoints={myBreakdown.sleepPoints}
  calories={userScore?.calories || 0}
  caloriesPoints={myBreakdown.caloriesPoints}
  workouts={userScore?.workouts || 0}
  workoutsPoints={myBreakdown.workoutsPoints}
  distance={userScore?.distance || 0}
  distancePoints={myBreakdown.distancePoints}
  totalPoints={myBreakdown.totalPoints}
  // ❌ MISSING standHours and standHoursPoints!
/>
```

**Impact:**
- Stand hours won't be displayed in the breakdown
- Incomplete scoring information shown to user

---

## Summary of Fixes Needed

1. Add `|| 0` fallbacks to all fields in `getPointsBreakdown` calls
2. Add `?? 0` fallback to `myScore` and `theirScore`
3. Add `standHours` and `standHoursPoints` to `PointsBreakdown` component

