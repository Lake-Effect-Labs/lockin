# Tasks You Can Do Tonight (Without Device Build)

## 🔴 Critical (Do First)

### 1. **Create Privacy Policy** (30 min)
**Why:** Required for App Store submission - they'll reject without it

**Quick Option:**
- Use a template: https://www.freeprivacypolicy.com/
- Or use this template: https://www.privacypolicygenerator.info/

**What to Include:**
- What data you collect (health data, email, username)
- How you use it (fitness tracking, league competition)
- Who you share it with (other league members, Supabase)
- User rights (delete account, access data)
- Health data specifics (Apple HealthKit integration)

**Where to Host:**
- GitHub Pages (free)
- Netlify/Vercel (free)
- Your own domain

**Action:** Create `PRIVACY_POLICY.md` in your repo, then host it somewhere public

---

### 2. **Test Core Features in Expo Go** (1 hour)
Even without real health data, you can test:

- ✅ **Authentication**
  - Sign up / Login
  - Email verification flow
  - Password reset

- ✅ **League Management**
  - Create league
  - Join with code
  - Leave league
  - View standings

- ✅ **UI/UX**
  - Navigation flows
  - Loading states
  - Error messages
  - Empty states

- ✅ **Real-time Features**
  - Score updates (with fake data)
  - Matchup changes
  - Notifications

**Action:** Run through the app in Expo Go, note any bugs or UX issues

---

## 🟡 Important (Do Soon)

### 3. **App Store Connect Prep** (1 hour)
**What You Need:**

- **App Name:** Lock-In (or your final name)
- **Subtitle:** "Fitness Competition Leagues"
- **Description:** Write compelling copy (2-3 paragraphs)
- **Keywords:** fitness, competition, league, health, workout, steps
- **Screenshots:** Need 6.5" iPhone screenshots (can mock up for now)
- **App Icon:** Already have (1024x1024)
- **Support URL:** Your email or website
- **Privacy Policy URL:** (from task #1)

**Action:** Create `APP_STORE_LISTING.md` with all this content

---

### 4. **Fix Any Remaining Bugs** (1-2 hours)
**Check These:**

- [ ] Can you create a league with custom scoring?
- [ ] Does the scoring config actually save?
- [ ] What happens if you join a league mid-season?
- [ ] What if you're the only person in a league?
- [ ] Does the matchup view show correctly?
- [ ] Are error messages user-friendly?

**Action:** Test each feature, fix bugs as you find them

---

### 5. **Remove Unused Dependencies** (15 min)
You still have `react-native-health-connect` in `package.json` but removed Android support.

**Action:**
```bash
npm uninstall react-native-health-connect
```

---

## 🟢 Nice to Have (Polish)

### 6. **Add Loading States**
Make sure every async operation shows loading:
- Creating league
- Joining league
- Syncing data
- Fetching matchups

### 7. **Improve Error Messages**
Make errors more helpful:
- "League not found" → "This league code doesn't exist. Check the code and try again."
- "Network error" → "Can't connect. Check your internet and try again."

### 8. **Add Empty States**
Better empty states for:
- No leagues yet
- No matchups
- No data synced

### 9. **Polish UI**
- Consistent spacing
- Better colors/contrast
- Smooth animations
- Better typography

---

## 📝 Documentation

### 10. **Update README** (30 min)
Make sure README has:
- Quick start guide
- Setup instructions
- Known limitations
- Troubleshooting

---

## 🎯 Recommended Order Tonight

1. **Privacy Policy** (30 min) - Critical blocker
2. **Test in Expo Go** (1 hour) - Find bugs
3. **Fix Critical Bugs** (1 hour) - Make it stable
4. **App Store Prep** (30 min) - Get ready for submission

**Total Time:** ~3 hours

---

## 🚀 After You Get Apple Developer Account

Then you can:
- Build development version
- Test HealthKit on real device
- Submit to TestFlight
- Get friends to test

---

## 💡 Quick Wins (15 min each)

- Remove `react-native-health-connect` dependency
- Add better error messages
- Improve loading states
- Polish UI spacing
- Write app description

---

**Focus on Privacy Policy first - it's the only blocker for App Store submission!**

