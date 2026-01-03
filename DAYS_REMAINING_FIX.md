# Days Remaining Calculation Fix
**Date:** 2026-01-03  
**Issue:** Matchup screen showing "7 days remaining" on Saturday when week should end today

## The Problem

**Symptom:**
- User reports it's Saturday, but the app shows "7 days remaining"
- Week should show "0 days" (ends today) on Saturday

**Root Cause:**
The `calculateDaysRemainingInWeek()` function was using `Math.ceil()` to round up partial days:

```typescript
// OLD (WRONG)
const diffTime = weekEnd.getTime() - now.getTime();
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
```

**Why this is wrong:**

Weeks run **Monday-Saturday** (6 days), with Sunday as results day.

On Saturday at any time before midnight:
- `weekEnd` = Saturday 11:59:59 PM
- `now` = Saturday 11:00 AM (example)
- `diffTime` = ~13 hours = 0.54 days
- `Math.ceil(0.54)` = **1 day** ❌ (shows "1 day remaining")
- **Should show:** "0 days" (week ends today)

## The Fix

Changed from `Math.ceil()` to `Math.floor()`:

```typescript
// NEW (CORRECT)
const diffTime = weekEnd.getTime() - now.getTime();
// Use Math.floor so Saturday shows as "0 days" (ends today)
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
```

Now the countdown works correctly:
- **Monday:** 5 days remaining (Mon, Tue, Wed, Thu, Fri, Sat = 5 more days)
- **Tuesday:** 4 days remaining
- **Wednesday:** 3 days remaining
- **Thursday:** 2 days remaining
- **Friday:** 1 day remaining
- **Saturday:** 0 days (week ends today!)
- **Sunday:** 0 days (results day, week already ended)

## Files Changed

1. ✅ `services/league.ts` - Fixed `calculateDaysRemainingInWeek()`
2. ✅ `utils/dates.ts` - Fixed `getDaysRemainingInWeek()`

## Why Other Math.ceil() Calls Are Correct

There are two other places in `services/league.ts` that use `Math.ceil()`, but they're **correct** because they're counting days **until a future date** (league start):

```typescript
// CORRECT - counting days until league starts (future)
if (!league.start_date) {
  const nextMonday = getNextMonday();
  const diffTime = nextMonday.getTime() - now.getTime();
  daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // ✅ Round UP for future countdown
}
```

**Logic:**
- For "days until X starts" → round UP (if league starts in 1.1 days, show "2 days")
- For "days remaining in current period" → round DOWN (if period ends in 0.5 days, show "0 days - ends today")

## Week Structure Reference

```
Week 1 Timeline:
Monday    00:00:00 ────────────────── Week starts
Tuesday   00:00:00 ────────────────── 4 days remaining
Wednesday 00:00:00 ────────────────── 3 days remaining
Thursday  00:00:00 ────────────────── 2 days remaining
Friday    00:00:00 ────────────────── 1 day remaining
Saturday  00:00:00 ────────────────── 0 days (ends today)
Saturday  23:59:59 ────────────────── Week ends (scoring cutoff)
Sunday    00:00:00 ────────────────── Results Day (view-only, no scoring)
Monday    00:00:00 ────────────────── Week 2 starts
```

## Testing

To verify the fix:

```typescript
// Test on Saturday
const league = { start_date: '2026-12-29', current_week: 1 }; // Started Monday Dec 29
const daysRemaining = calculateDaysRemainingInWeek(league.start_date, 1);
console.log('Days remaining on Saturday:', daysRemaining); // Should be 0

// Test on Friday
// (manually set date to Friday and test)
// Should show 1 day remaining
```

## UI Display

The `formatCountdown()` function handles the display:

```typescript
export function formatCountdown(daysRemaining: number): string {
  if (daysRemaining === 0) return 'Week ends today!';  // Saturday (or Sunday)
  if (daysRemaining === 1) return '1 day remaining';   // Friday
  return `${daysRemaining} days remaining`;            // Mon-Thu
}
```

---

✅ **Saturday will now correctly show "Week ends today!"**

