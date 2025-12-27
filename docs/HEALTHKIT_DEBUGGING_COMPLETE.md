# HealthKit Integration Troubleshooting - Complete Context

## 🏢 App Overview: Lock-In

**What is Lock-In?**
A fitness competition app where users join leagues and compete based on real health metrics. Built with React Native/Expo for iOS, Android, and Web.

**Key Features:**
- User authentication (login/register)
- League creation and joining
- Real-time health data syncing (steps, sleep, calories, burned energy, distance)
- League matchups and standings
- Seasonal playoffs
- Weekly recaps
- Ad revenue integration

**Tech Stack:**
- React Native 0.81.5 with New Architecture enabled
- Expo SDK 54
- Expo Router for navigation
- Zustand for state management
- Supabase for backend
- HealthKit integration for iOS health data

## ❌ The Persistent Problem: TestFlight Crashes on Launch

### Current Status
**Build #10+ still crashes when opening from TestFlight**, even with:
- ✅ Error handling at all levels
- ✅ Try/catch wrappers everywhere
- ✅ Crash prevention code
- ✅ Modern library (@kingstinct/react-native-healthkit)

The app opens fine in local Expo Go but crashes immediately on TestFlight.

## 🔍 Root Causes Analyzed (Step by Step)

### Phase 1: Initial Diagnosis (Builds 1-7)
**Symptom:** "Cannot find module" error
- Metro couldn't resolve react-native-health at runtime
- Solution attempted: Cache clearing, plugin configuration
- Result: Still crashed

### Phase 2: Library Incompatibility (Build 8)
**Symptom:** Build failed - Reanimated conflict
- Reanimated v4 requires New Architecture
- We had disabled New Architecture for HealthKit compatibility
- Solution: Removed the `newArchEnabled: false` setting
- Result: Build succeeded but app had broken HealthKit bridge

### Phase 3: Bridge Broken (Build 9)
**Symptom:** Only Constants exported, all methods undefined
- Switched to @kingstinct/react-native-healthkit
- Updated app.json plugins
- Rewrote health service with new API
- Solution: Fixed export shape handling with `.default ?? healthModule`
- Result: Module loads but still issues

### Phase 4: Crash Prevention Added (Build 10)
**Symptom:** App crashes silently on TestFlight
- Added try/catch wrapper to getHealthKit()
- Added try/catch wrapper to initializeHealth()
- Added error caching and diagnostics
- Solution: Comprehensive error handling
- Result: **Still crashes** - suggests error at deeper level

## 🚨 Why It Still Crashes

### Most Likely Causes

#### 1. **Module Doesn't Exist in Native Build**
The @kingstinct library didn't actually compile into the iOS binary during EAS Build.

**Signs:**
- Module load fails (require() throws)
- Try/catch catches it but something else crashes
- Possible cause: Config plugin didn't run during build

**Solution needed:**
- Check EAS build logs for `@kingstinct/react-native-healthkit` pod installation
- Verify Xcode config plugin processed correctly
- May need to rebuild with explicit plugin configuration

#### 2. **Native Module Registration Failed**
Module compiled but didn't register with React Native bridge.

**Signs:**
- Module loads but methods are all undefined
- Something in app initialization depends on it existing
- Unhandled code path when methods don't exist

**Solution needed:**
- Audit app initialization code
- Ensure no code path assumes HealthKit exists
- May need to defer any HealthKit calls to user interaction only

#### 3. **Nitro Modules Bridge Issue**
The Nitro module bridge (New Architecture) has incompatibility with Expo/Reanimated stack.

**Signs:**
- Works in dev, breaks in production
- Nitro modules require specific RN versions
- Our RN 0.81.5 might not support it fully

**Solution needed:**
- Check @kingstinct library version compatibility
- May need to downgrade/upgrade Nitro modules
- Consider alternative: fork and use callback-based wrapper

#### 4. **App Initialization Code Crashes Before HealthKit**
Something else crashes before we even get to HealthKit.

**Signs:**
- Crash happens on app open, not on HealthKit init
- HealthKit code never even runs
- Some other dependency failing

**Solution needed:**
- Get actual crash logs from TestFlight
- Trace exact line number where crash occurs
- Check if issue is HealthKit-related at all

## 📋 Current Code Structure

### Where HealthKit Is Used
```
app/index.tsx
  ↓ (splash screen, routes to /login or /home)

app/(app)/home.tsx
  ↓ (might call health functions)

app/(app)/debug.tsx (DEBUG SCREEN ONLY)
  ↓ (intentionally calls initializeHealth() on button tap)
  ├─ "Test Native Linking" button
  │  └─ Tests if module loads and methods exist
  │
  └─ "Force HealthKit Init" button
     └─ Calls initializeHealth()
        └─ Should show iOS permission dialog

services/health.ts
  ├─ getHealthKit() - lazy loads @kingstinct module
  ├─ initializeHealth() - requests permissions
  ├─ getDailySteps() - queries step count
  ├─ getDailySleep() - queries sleep data
  ├─ getDailyCalories() - queries calories
  └─ getDailyDistance() - queries distance
```

### Key: HealthKit is ONLY called from debug screen
- **Not called on app launch**
- **Not called during normal navigation**
- **Only called when user explicitly taps button**

**So if app crashes on launch, it's NOT HealthKit's fault** - something else is failing.

## 🎯 What to Do Next

### For Your Next Agent

**Priority 1: Get Actual Error Logs**
```
1. Open TestFlight build on iOS device
2. Go to: Settings → Privacy → Analytics → Analytics Data
3. Look for "Lock-In" crash logs
4. Screenshot the exact error message
OR
5. Connect device to Xcode
6. Open Xcode organizer
7. Get device console logs during crash
8. Screenshot the exact error
```

**Priority 2: Verify It's Actually Crashing**
```
1. Install build #10 from TestFlight
2. Try to open app 3 times
3. Does it crash EVERY time?
4. Does it crash ALWAYS on first tap?
5. Or crash after some interaction?
```

**Priority 3: Check EAS Build Logs**
```
1. Go to https://expo.dev/accounts/[your-account]/projects/[project]
2. Find build #10 in history
3. Click "View full logs"
4. Search for: "@kingstinct" 
5. Search for: "pod install"
6. Search for: "ERROR" or "WARN"
7. Screenshot anything related to HealthKit plugin
```

**Priority 4: Isolate the Problem**
```
If app still crashes:

Option A: Temporarily disable ALL HealthKit code
- Comment out all imports from services/health.ts
- Rebuild
- If still crashes: problem is NOT HealthKit
- If works now: problem IS HealthKit initialization

Option B: Remove HealthKit from app.json plugins
- Delete [@kingstinct/react-native-healthkit] line
- Rebuild
- If still crashes: problem is dependency conflict
- If works now: HealthKit plugin has issue
```

## 📊 Configuration Summary

### app.json Current State
```json
{
  "expo": {
    "version": "1.0.31",
    "ios": {
      "bundleIdentifier": "io.lockin.app",
      "buildNumber": "10",
      "infoPlist": {
        "NSHealthShareUsageDescription": "...",
        "NSHealthUpdateUsageDescription": "..."
      },
      "entitlements": {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.background-delivery": true
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-notifications", {...}],
      ["@kingstinct/react-native-healthkit", {...}],
      "expo-background-fetch",
      "expo-task-manager",
      ["react-native-google-mobile-ads", {...}]
    ]
  }
}
```

### eas.json Current State
```json
{
  "build": {
    "testflight": {
      "distribution": "store",
      "ios": {
        "buildConfiguration": "Release",
        "cache": { "disabled": true }  // ← Always clean rebuild
      }
    }
  }
}
```

## 💡 Debugging Checklist

**Before rebuilding, verify:**
- [ ] EAS build logs show @kingstinct plugin running
- [ ] No "ERROR" in pod install phase
- [ ] Entitlements applied to binary
- [ ] No other app startup code depends on HealthKit
- [ ] Actual crash logs from TestFlight reviewed
- [ ] Tried with HealthKit plugin temporarily disabled

**If crash persists:**
- [ ] Upgrade/downgrade @kingstinct version
- [ ] Check React Native New Architecture compatibility
- [ ] Consider reverting to callback-based library wrapper
- [ ] Check if Reanimated or other dep has conflict

## 📝 Key Files Structure

```
app/
├── index.tsx              (splash/routing - NOT calling HealthKit)
├── (app)/
│   ├── home.tsx          (league home screen)
│   └── debug.tsx         (DEBUG SCREEN - HealthKit buttons here)
└── (auth)/
    ├── login.tsx
    └── register.tsx

services/
├── health.ts             (HealthKit service - wrapped in try/catch)
├── supabase.ts           (backend)
├── league.ts             (league logic)
└── ...

store/
├── useAuthStore.ts       (auth state)
└── useHealthStore.ts     (health data caching)
```

## 🚨 Critical Questions for Your Agent

1. **What's the actual crash error?** (Get from logs)
2. **Does it crash on app launch, or only on HealthKit button?**
3. **Are other features working before crash?** (Can you navigate without tapping HealthKit button?)
4. **What if you disable HealthKit plugin entirely?**
5. **Do build logs show @kingstinct plugin running?**

---

## Summary for Handoff

**Tell your agent:**

"Lock-In is a React Native Expo app with New Architecture enabled (required by Reanimated v4). We integrated HealthKit using @kingstinct/react-native-healthkit with comprehensive error handling. App still crashes on TestFlight launch despite crash prevention code. 

Need to:
1. Get actual crash logs from device
2. Check EAS build logs for @kingstinct plugin  
3. Verify if crash happens on app launch or only on HealthKit interaction
4. Test by disabling HealthKit plugin entirely

The crash likely isn't from HealthKit itself (it's only called from debug button), but from either module registration, dependency conflict, or something else on app init."


