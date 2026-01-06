# League Screens Bug Review
**Date:** 2026-01-03  
**Screens Reviewed:** Dashboard, Standings, All Matchups

---

## 🔴 BUG #1: Weeks Remaining Calculation (Standings Screen)

**Location:** `app/(app)/league/[leagueId]/standings.tsx` line 45

**Current Code:**
```typescript
const weeksRemaining = league.season_length_weeks - league.current_week + 1;
```

**Problem:**
The calculation is **off by one**. It's counting the current week as "remaining" when it should only count **future** weeks.

**Example:**
- Season: 8 weeks total
- Current week: 6
- Calculation: `8 - 6 + 1 = 3 weeks remaining`
- **Wrong!** Should be `2 weeks remaining` (weeks 7 and 8)

**Impact:**
- "Weeks Remaining" display shows incorrect value
- "Near Playoffs" banner may show at wrong time (triggers when `weeksRemaining <= 2`)

**Fix:**
```typescript
const weeksRemaining = league.season_length_weeks - league.current_week;
```

**New Example:**
- Season: 8 weeks, Current: 6
- `8 - 6 = 2 weeks remaining` ✅ (weeks 7 and 8)

---

## ⚠️ POTENTIAL ISSUE #2: Score Display Fallback (All Matchups Screen)

**Location:** `app/(app)/league/[leagueId]/allMatchups.tsx` lines 219-220

**Current Code:**
```typescript
const score1 = matchup.player1Score?.total_points ?? matchup.player1_score;
const score2 = matchup.player2Score?.total_points ?? matchup.player2_score;
```

**Potential Problem:**
If both `player1Score` (WeeklyScore object) and `matchup.player1_score` (stored score) are `null` or `undefined`, the score will be `null`/`undefined` instead of `0`.

**Later in the code (line 279):**
```typescript
<Text style={[styles.score, { color: score1Color }]}>
  {score1.toFixed(1)}  // ❌ CRASH if score1 is null/undefined!
</Text>
```

**Impact:**
App will crash with `Cannot read property 'toFixed' of null` if both score sources are missing.

**Fix:**
```typescript
const score1 = matchup.player1Score?.total_points ?? matchup.player1_score ?? 0;
const score2 = matchup.player2Score?.total_points ?? matchup.player2_score ?? 0;
```

---

## ⚠️ POTENTIAL ISSUE #3: Missing Null Check (All Matchups Screen)

**Location:** `app/(app)/league/[leagueId]/allMatchups.tsx` lines 272-280

**Current Code:**
```typescript
<Text style={[
  styles.playerName,
  matchup.player1_id === currentUserId && styles.playerNameHighlight,
]} numberOfLines={1}>
  {player1?.username || 'Player 1'}
  {matchup.player1_id === currentUserId && ' (You)'}
</Text>
<Text style={[styles.score, { color: score1Color }]}>
  {score1.toFixed(1)}  // ❌ Will crash if score1 is null
</Text>
```

**Same issue on Player 2** (lines 302-308)

**Impact:**
- If `WeeklyScore` doesn't exist and matchup score is also null
- App crashes when trying to call `.toFixed()` on null/undefined

---

## ✅ NO ISSUES FOUND:

### Dashboard Screen
- ✅ Properly handles null scores with fallback: `myScore = breakdown?.totalPoints ?? userScore?.total_points`
- ✅ Uses `formatScoreForDisplay()` which handles null: `formatScoreForDisplay(myScore, '--')`
- ✅ Validates scores before display
- ✅ Handles missing matchup with proper empty state

### Standings Screen  
- ✅ Properly renders player cards with member data
- ✅ Handles playoff cutoff line correctly
- ✅ Correctly sorts standings (wins, then total points)
- ✅ Only issue is "weeks remaining" calculation (Bug #1)

### All Matchups Screen
- ✅ Proper week selector with visual indicators
- ✅ Handles empty matchups with good UX
- ✅ Highlights user's own matchups
- ✅ Shows status badges (Live/Final/Tie) correctly
- ✅ Only issues are null score handling (Bugs #2 and #3)

---

## Summary

| Bug # | Screen | Severity | Status |
|-------|--------|----------|--------|
| 1 | Standings | 🟡 Medium | Needs Fix |
| 2 | All Matchups | 🔴 High | Needs Fix (Crash Risk) |
| 3 | All Matchups | 🔴 High | Duplicate of #2 |

### Recommended Fixes

1. **Fix weeks remaining calculation** (Standings)
2. **Add null coalescing for scores** (All Matchups)

Both are simple one-line fixes.

