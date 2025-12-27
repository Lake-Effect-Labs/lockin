# HealthKit TestFlight Fix - Complete Guide

## 🎯 Problem Summary

Your TestFlight build shows "Cannot find module" when trying to load `react-native-health`, even though the library is properly configured. This means the native module isn't being bundled into your iOS build.

## ✅ Fixes Applied

### 1. **Enhanced Expo Plugin Configuration** (`app.json`)
**Changed:** Added explicit configuration to the react-native-health plugin
```json
[
  "react-native-health",
  {
    "isClinicalDataEnabled": false
  }
]
```
**Why:** Ensures the Expo config plugin properly processes and links the native module during build.

### 2. **Bumped Build Number** (`app.json`)
**Changed:** `buildNumber: "7"` → `buildNumber: "8"`
**Why:** Forces Apple to recognize this as a new build.

### 3. **Enhanced Metro Config** (`metro.config.js`)
**Added:** Explicit source extension configuration
**Why:** Ensures Metro properly resolves all module files during bundling.

### 4. **Build Scripts**
**Created:** 
- `scripts/build-healthkit-testflight.bat` (Windows)
- `scripts/build-healthkit-testflight.sh` (Mac/Linux)
- Added `npm run build:testflight` command

**Why:** Provides one-command build with all necessary cache clearing and verification steps.

## 🚀 How to Build

### Option 1: Use the new npm script (RECOMMENDED)
```bash
npm run build:testflight
```

### Option 2: Use the shell script
**Windows:**
```bash
.\scripts\build-healthkit-testflight.bat
```

**Mac/Linux:**
```bash
chmod +x scripts/build-healthkit-testflight.sh
./scripts/build-healthkit-testflight.sh
```

### Option 3: Manual build
```bash
# Clear caches
rm -rf node_modules/.cache .expo

# Reinstall dependencies
npm install

# Build with cache clear
eas build --platform ios --profile testflight --clear-cache
```

## 🔍 What to Check After Build

### 1. In the EAS Build Logs
Look for these success indicators:
- ✅ `[expo-config-plugins]` processing react-native-health
- ✅ `Pod install` including RNHealth
- ✅ `HealthKit.framework` linked
- ✅ Entitlements file includes `com.apple.developer.healthkit`

### 2. On Device (Debug Screen)
1. Install the TestFlight build
2. Open the app → Debug screen
3. Tap **"Test Module Loading"**

**Expected Result:**
```
✅ require() succeeded
typeof module: object
Module exports (15+): initHealthKit, getStepCount, ...
✅ initHealthKit: YES
✅ getStepCount: YES
✅ Constants: YES
```

**If you still see "Cannot find module":**
- The native module didn't get linked
- Check the build logs (see above)
- Try rebuilding with build number 9

### 3. Permission Dialog Test
1. Tap **"Force HealthKit Init"**
2. **You should see:** iOS Health permission dialog (modal popup)
3. Grant permissions
4. **Check Settings:** Settings → Privacy & Security → Health → Lock-In

## 🐛 Troubleshooting

### Issue: "Cannot find module" persists

**Solution 1:** Verify package is installed
```bash
npm ls react-native-health
# Should show: react-native-health@1.19.0
```

**Solution 2:** Check EAS build logs for plugin errors
```bash
# After build starts, open the build URL
# Search for "react-native-health" in logs
# Look for any ERROR or WARN messages
```

**Solution 3:** Ensure you're not using Expo Go
The error "executionEnvironment: storeClient" means Expo Go, which can't use native modules.
TestFlight builds should show "executionEnvironment: standalone"

### Issue: Module loads but "undefined is not a function"

This means the JS module loads but native methods aren't bridged. Usually caused by:

**Solution 1:** Disable New Architecture (add to `app.json`):
```json
"ios": {
  "newArchEnabled": false
}
```

**Solution 2:** Switch to a more modern library
If the issue persists, consider switching to `@kingstinct/react-native-healthkit` which has better Expo support and uses Nitro modules.

### Issue: Permission dialog doesn't appear

**Check 1:** Verify Info.plist has description
```json
"NSHealthShareUsageDescription": "Lock-In needs access to your health data to track your fitness metrics and compete in leagues."
```
This is already set in your `app.json` ✅

**Check 2:** Verify entitlements
```json
"com.apple.developer.healthkit": true
```
This is already set in your `app.json` ✅

**Check 3:** Check Apple Developer Portal
- Go to https://developer.apple.com
- Certificates, Identifiers & Profiles
- Identifiers → io.lockin.app
- Scroll to "HealthKit" → should be checked ✅

## 📊 Your Current Configuration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Package installed | ✅ | `react-native-health@1.19.0` in dependencies |
| Expo plugin | ✅ | Configured with explicit options |
| Entitlements | ✅ | HealthKit + background delivery |
| Info.plist | ✅ | NSHealthShareUsageDescription set |
| Build number | ✅ | Bumped to 8 |
| Cache disabled | ✅ | Set in eas.json testflight profile |
| Service code | ✅ | Correct require('react-native-health') |
| Test code | ✅ | Matches service (not using Kingstinct) |

## 🎉 Expected Outcome

After building with these fixes:

1. ✅ Module will load successfully in TestFlight
2. ✅ Permission dialog will appear when you tap "Force HealthKit Init"
3. ✅ App will appear in: Settings → Health → Apps → Lock-In
4. ✅ Health data will sync to your league

## 🔄 Next Build Command

Run this now:
```bash
npm run build:testflight
```

This will:
- ✅ Clear all caches
- ✅ Verify configuration
- ✅ Build with --clear-cache flag
- ✅ Take ~15 minutes
- ✅ Upload to TestFlight automatically

## 📝 Post-Build Checklist

- [ ] Build completes without errors
- [ ] Install TestFlight build on iOS device
- [ ] Open app → Debug screen
- [ ] Tap "Test Module Loading" → Should show ✅ require() succeeded
- [ ] Tap "Force HealthKit Init" → Should show iOS permission dialog
- [ ] Grant permissions
- [ ] Check Settings → Health → Lock-In appears
- [ ] Return to app → Health data should sync

## ❓ Still Having Issues?

If after this build you still see "Cannot find module":

1. **Share the EAS build URL** - I can review the logs
2. **Take screenshots** of:
   - The "Test Module Loading" result
   - The EAS build summary page
   - Any error messages
3. **Check**: Open the build logs, search for "react-native-health", copy any errors

The most common remaining issue would be the build environment not running the config plugin properly, which would show in the logs as missing Pod installation or missing framework linking.

