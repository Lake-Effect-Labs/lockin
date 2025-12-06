# 📅 Monday-Sunday Week Update

## Changes Made

Updated the app so that leagues follow calendar weeks (Monday-Sunday) instead of arbitrary 7-day periods.

---

## ✅ What Changed

### 1. **League Start Date**
- **Before**: Leagues started immediately when full (any day of the week)
- **After**: Leagues start on the **next Monday** after filling up
- Gives players time to prepare and ensures consistent week boundaries

### 2. **Week Calculation**
- **Before**: Weeks were calculated as `start_date + (N * 7) days`
- **After**: Weeks follow Monday-Sunday calendar weeks
  - Week 1: First Monday after start_date → Sunday
  - Week 2: Next Monday → Sunday
  - And so on...

### 3. **Health Data Sync**
- **Before**: Synced to calendar week (Sunday-Saturday)
- **After**: Synced to Monday-Sunday weeks (matching league weeks)

---

## 🔧 Technical Changes

### New Functions in `utils/dates.ts`:
- `getStartOfWeekMonday()` - Gets Monday of current week
- `getEndOfWeekSunday()` - Gets Sunday of current week  
- `getNextMonday()` - Gets the next upcoming Monday

### Updated Functions:
- `services/supabase.ts` - `joinLeagueByCode()` sets start_date to next Monday
- `services/admin.ts` - `startLeague()` sets start_date to next Monday
- `services/league.ts` - `getWeekDateRange()` uses Monday-Sunday weeks
- `services/league.ts` - `calculateDaysRemainingInWeek()` uses Monday-Sunday weeks
- `services/health.ts` - `getCurrentWeekHealthData()` uses Monday-Sunday weeks

---

## 📋 User Experience

### When League Fills Up:
1. League reaches max players
2. **Start date is set to next Monday** (not today)
3. Players see: "League is full! Starting on [Monday, Month Day]"
4. Matchups are generated but won't be active until Monday

### Week Progression:
- **Week 1**: Monday → Sunday (first week after start)
- **Week 2**: Next Monday → Sunday
- **Week 3**: Next Monday → Sunday
- And so on...

### Benefits:
- ✅ Consistent week boundaries (always Monday-Sunday)
- ✅ Time to prepare (league doesn't start immediately)
- ✅ Easier to understand (matches calendar weeks)
- ✅ Health data syncs correctly (Monday-Sunday weeks)

---

## 🧪 Testing

### Test Cases:
1. **League fills on Wednesday**:
   - ✅ Should start next Monday (not Wednesday)
   - ✅ Week 1 is Monday-Sunday

2. **League fills on Monday**:
   - ✅ Should start next Monday (gives full week)
   - ✅ Week 1 is that Monday-Sunday

3. **Health Data Sync**:
   - ✅ Syncs to Monday-Sunday week
   - ✅ Matches league week boundaries

4. **Week Calculation**:
   - ✅ Days remaining calculated correctly
   - ✅ Week end is Sunday at 11:59 PM

---

## ⚠️ Important Notes

### For Existing Leagues:
- Existing leagues with `start_date` set will continue to work
- Their weeks will be calculated from their original start_date
- New leagues will use Monday start dates

### Migration:
- No database migration needed
- Existing leagues unaffected
- New behavior applies to new leagues only

---

## 🎯 Summary

Leagues now:
- ✅ Start on Mondays (next Monday after filling up)
- ✅ Follow Monday-Sunday calendar weeks
- ✅ Sync health data to correct week boundaries
- ✅ Give players time to prepare

This makes the app more intuitive and consistent! 🎉

