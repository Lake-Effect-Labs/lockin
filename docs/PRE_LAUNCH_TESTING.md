# 🧪 Pre-Launch Testing Guide
## Complete Test Scenarios for Launch Week

This document provides step-by-step testing instructions for all critical user flows.

---

## ✅ Test Checklist

### 🔐 Authentication Flow

#### Test 1: New User Signup
- [ ] Open app → See login screen
- [ ] Tap "Create Account"
- [ ] Enter email, password, confirm password
- [ ] Enter username (optional)
- [ ] Tap "Create Account"
- [ ] **Expected**: Redirected to home screen
- [ ] **Expected**: Welcome banner appears (first-time users)
- [ ] **Expected**: Profile created automatically

#### Test 2: Existing User Login
- [ ] Open app → See login screen
- [ ] Enter email and password
- [ ] Tap "Sign In"
- [ ] **Expected**: Redirected to home screen
- [ ] **Expected**: Leagues load automatically

#### Test 3: Invalid Credentials
- [ ] Enter wrong email/password
- [ ] **Expected**: Clear error message "Invalid email or password"
- [ ] **Expected**: Can retry immediately

#### Test 4: Password Validation
- [ ] Try password < 6 characters
- [ ] **Expected**: Button disabled until valid
- [ ] **Expected**: Error message "Password must be at least 6 characters"

---

### 🏆 League Creation Flow

#### Test 5: Create League
- [ ] From home screen, tap "Create League"
- [ ] Enter league name (max 30 chars)
- [ ] Select season length (6, 8, 10, or 12 weeks)
- [ ] Select max players (4-14)
- [ ] (Optional) Customize scoring
- [ ] Tap "Create League"
- [ ] **Expected**: League created successfully
- [ ] **Expected**: Join code displayed
- [ ] **Expected**: Can copy join code
- [ ] **Expected**: Redirected to league dashboard

#### Test 6: League Name Validation
- [ ] Try empty name
- [ ] **Expected**: Button disabled
- [ ] Try name > 30 characters
- [ ] **Expected**: Error message

#### Test 7: Copy Join Code
- [ ] After creating league, tap join code
- [ ] **Expected**: Code copied to clipboard
- [ ] **Expected**: Alert confirms copy
- [ ] **Expected**: Can paste code elsewhere

---

### 🔗 League Joining Flow

#### Test 8: Join by Code (Valid)
- [ ] From home screen, tap "Join League"
- [ ] Enter valid 6-character code
- [ ] Tap "Join League"
- [ ] **Expected**: Success screen appears
- [ ] **Expected**: Redirected to home
- [ ] **Expected**: League appears in list

#### Test 9: Join by Code (Invalid)
- [ ] Enter invalid code (wrong format)
- [ ] **Expected**: Error "Please enter a valid 6-character join code"
- [ ] Enter non-existent code
- [ ] **Expected**: Error "League not found. Please check the join code."

#### Test 10: Join Started League
- [ ] Try to join a league that has already started
- [ ] **Expected**: Error "This league has already started. You can only join leagues before they begin."

#### Test 11: Join Full League
- [ ] Try to join a league at max capacity
- [ ] **Expected**: Error "This league is full. The maximum number of players has been reached."

#### Test 12: Join Already Member
- [ ] Try to join a league you're already in
- [ ] **Expected**: Error "You are already a member of this league."

#### Test 13: Auto-Start When Full
- [ ] Create league with 4 max players
- [ ] Have 3 friends join
- [ ] 4th person joins
- [ ] **Expected**: League automatically starts
- [ ] **Expected**: Matchups generated for Week 1
- [ ] **Expected**: `start_date` set

---

### 📊 League Dashboard Flow

#### Test 14: View League Dashboard
- [ ] Tap on a league from home screen
- [ ] **Expected**: League dashboard loads
- [ ] **Expected**: Shows current matchup (if started)
- [ ] **Expected**: Shows standings
- [ ] **Expected**: Shows week progress

#### Test 15: Empty League (Not Started)
- [ ] View league that hasn't started
- [ ] **Expected**: Shows "Waiting to Start" message
- [ ] **Expected**: Shows player count (X of Y players)
- [ ] **Expected**: Share button available

#### Test 16: No Matchup Yet
- [ ] View league with only 1 player
- [ ] **Expected**: Shows "No Matchup Yet" message
- [ ] **Expected**: Shows "Invite friends" CTA

#### Test 17: Current Matchup Display
- [ ] View active league with matchup
- [ ] **Expected**: Shows live matchup card
- [ ] **Expected**: Shows your score vs opponent
- [ ] **Expected**: Shows days remaining
- [ ] **Expected**: Shows last sync time

---

### 💪 Health Data Sync Flow

#### Test 18: HealthKit Permissions (iOS)
- [ ] First launch on iOS device
- [ ] **Expected**: HealthKit permission prompt appears
- [ ] Grant permissions
- [ ] **Expected**: Health data starts syncing
- [ ] **Expected**: Settings shows "Connected" status

#### Test 19: Deny HealthKit Permissions
- [ ] Deny HealthKit permissions
- [ ] **Expected**: App continues working
- [ ] **Expected**: Fake Data Mode enabled automatically
- [ ] **Expected**: Settings shows "Not Connected" with "Enable" button

#### Test 20: Manual Health Sync
- [ ] Pull down on home screen to refresh
- [ ] **Expected**: Health data syncs
- [ ] **Expected**: Loading indicator shows
- [ ] **Expected**: Scores update

#### Test 21: Real-Time Score Updates
- [ ] View matchup screen
- [ ] Have opponent sync their data
- [ ] **Expected**: Opponent's score updates automatically (within 30s)
- [ ] **Expected**: No need to refresh

---

### 📅 Week Progression Flow

#### Test 22: Week Countdown
- [ ] View active matchup
- [ ] **Expected**: Shows "X days remaining"
- [ ] **Expected**: Shows "Week ends today!" when 0 days
- [ ] **Expected**: Warning banner when ≤2 days remaining

#### Test 23: Week Finalization (Manual Test)
- [ ] **Note**: Requires database manipulation or waiting
- [ ] When week ends (daysRemaining = 0)
- [ ] **Expected**: Week finalizes automatically
- [ ] **Expected**: Winner determined
- [ ] **Expected**: Records updated (wins/losses)
- [ ] **Expected**: Week advances to next week

#### Test 24: Tie Game
- [ ] Create scenario where both players have same score
- [ ] Finalize week
- [ ] **Expected**: Both players get +1 tie
- [ ] **Expected**: No winner assigned
- [ ] **Expected**: Matchup shows "Tie" status

---

### 🏆 Playoff Flow

#### Test 25: Playoff Generation
- [ ] Complete regular season (all weeks)
- [ ] **Expected**: Playoffs automatically generate
- [ ] **Expected**: Top 4 players seeded
- [ ] **Expected**: Semifinals created (1v4, 2v3)
- [ ] **Expected**: Playoff banner appears

#### Test 26: Playoff Bracket View
- [ ] Navigate to Playoffs tab
- [ ] **Expected**: Shows bracket visualization
- [ ] **Expected**: Shows semifinals matches
- [ ] **Expected**: Shows seeds (1-4)

#### Test 27: Playoff Progression
- [ ] Complete semifinals
- [ ] **Expected**: Finals automatically created
- [ ] **Expected**: Losers marked eliminated
- [ ] **Expected**: Winners advance

#### Test 28: Champion Crowned
- [ ] Complete finals
- [ ] **Expected**: Champion set
- [ ] **Expected**: League marked complete
- [ ] **Expected**: Confetti animation (if user is champion)
- [ ] **Expected**: Champion banner displays

---

### 🔄 Multi-League Flow

#### Test 29: Multiple Leagues
- [ ] Join 3 different leagues
- [ ] **Expected**: All leagues appear on home screen
- [ ] **Expected**: Can navigate to each
- [ ] **Expected**: Each shows correct current week

#### Test 30: Sync to All Leagues
- [ ] Sync health data once
- [ ] **Expected**: Data syncs to all active leagues
- [ ] **Expected**: Each league shows correct score for current week

---

### ⚙️ Settings & Profile Flow

#### Test 31: Edit Profile
- [ ] Go to Settings → Edit Profile
- [ ] Change username
- [ ] Select new avatar
- [ ] Tap "Save"
- [ ] **Expected**: Profile updates
- [ ] **Expected**: Changes reflected immediately

#### Test 32: Health Permissions in Settings
- [ ] Go to Settings
- [ ] View Health Data section
- [ ] **Expected**: Shows connection status
- [ ] Tap "Enable" if not connected
- [ ] **Expected**: Permission prompt appears
- [ ] **Expected**: Status updates after granting

#### Test 33: Fake Data Mode
- [ ] Enable Fake Data Mode in Settings
- [ ] **Expected**: Fake data generates
- [ ] **Expected**: Can still compete in leagues
- [ ] **Expected**: Scores calculated correctly

---

### 🚨 Error Handling Flow

#### Test 34: Network Offline
- [ ] Turn on airplane mode
- [ ] **Expected**: Network error banner appears
- [ ] **Expected**: Can still view cached data
- [ ] **Expected**: Retry button available
- [ ] Turn off airplane mode
- [ ] **Expected**: Banner disappears
- [ ] **Expected**: Data syncs automatically

#### Test 35: Invalid Actions
- [ ] Try to create league with invalid data
- [ ] **Expected**: Clear error messages
- [ ] **Expected**: Can correct and retry
- [ ] Try to join with invalid code
- [ ] **Expected**: Helpful error message

#### Test 36: App Restart
- [ ] Force close app
- [ ] Reopen app
- [ ] **Expected**: User still logged in
- [ ] **Expected**: Leagues load
- [ ] **Expected**: Data persisted

---

### 🎯 Edge Cases

#### Test 37: Single Player League
- [ ] Create league, don't invite anyone
- [ ] Manually start league (admin)
- [ ] **Expected**: League starts
- [ ] **Expected**: Shows "No Matchup Yet" (no opponent)

#### Test 38: Odd Number of Players
- [ ] Create league with 5 max players
- [ ] Have 5 people join
- [ ] **Expected**: League starts
- [ ] **Expected**: Round-robin handles odd number (byes)

#### Test 39: Leave League
- [ ] Join a league
- [ ] Leave the league
- [ ] **Expected**: Removed from league
- [ ] **Expected**: League disappears from home
- [ ] **Expected**: Can rejoin if league not started

#### Test 40: Admin Functions
- [ ] As league creator, view admin section
- [ ] **Expected**: Can start league manually
- [ ] **Expected**: Can remove members (before start)
- [ ] **Expected**: Can delete league
- [ ] Try to remove yourself
- [ ] **Expected**: Error "Cannot remove yourself"

---

## 🐛 Known Issues to Verify Fixed

### ✅ Fixed Issues:
1. ✅ **Join started league** - Now prevents joining leagues that have started
2. ✅ **Empty states** - Improved with helpful CTAs
3. ✅ **Error messages** - All user-friendly now
4. ✅ **Week end warning** - Shows when ≤2 days remaining
5. ✅ **Playoff explanation** - Banner appears when playoffs start
6. ✅ **Welcome banner** - Shows for first-time users
7. ✅ **Join code help** - Info text on join screen

### ⚠️ Potential Issues to Watch:
1. **Race conditions** - Multiple users joining simultaneously
2. **Week finalization timing** - Ensure it happens at correct time
3. **Real-time sync delays** - May take 30s-5min to update
4. **HealthKit permissions** - May need manual enable in Settings

---

## 📱 Device Testing

### iOS Testing:
- [ ] iPhone 13/14 (latest iOS)
- [ ] iPhone SE (older device)
- [ ] iPad (if supported)
- [ ] TestFlight build

### Android Testing:
- [ ] Latest Android device
- [ ] Older Android (API 23+)
- [ ] Different screen sizes

---

## 🔍 Performance Testing

- [ ] App opens in < 3 seconds
- [ ] League list loads in < 2 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] No memory leaks (check with profiler)
- [ ] Smooth scrolling (60fps)
- [ ] No crashes during normal use

---

## ✅ Launch Readiness Checklist

### Code Quality:
- [x] All lint errors fixed
- [x] TypeScript types correct
- [x] Error handling comprehensive
- [x] Loading states everywhere
- [x] Empty states helpful

### UX:
- [x] First-time user guidance
- [x] Clear error messages
- [x] Helpful empty states
- [x] Week progression clarity
- [x] Playoff explanation

### Functionality:
- [x] All 10 use cases verified
- [x] Edge cases handled
- [x] Network errors handled
- [x] Offline mode works
- [x] Real-time sync works

### Security:
- [x] RLS policies enforced
- [x] Input validation
- [x] No sensitive data exposed

---

## 🚀 Ready for Launch!

After completing all tests above, the app should be ready for beta launch. Document any bugs found and prioritize fixes.

