# HealthKit Setup Guide

## ⚠️ Why Your Health Data Isn't Showing

**HealthKit does NOT work in Expo Go!** 

Expo Go is a sandbox app that can't access native iOS APIs like HealthKit. You need a **development build** to access real health data.

---

## ✅ Solution: Create a Development Build

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure EAS (if not done)

```bash
eas build:configure
```

### Step 4: Build Development Version

```bash
# Build for your iPhone (physical device)
eas build --platform ios --profile development

# OR build for simulator (faster, but HealthKit limited)
eas build --platform ios --profile development --simulator
```

**This will:**
- Take 10-15 minutes
- Create a `.ipa` file
- Install native modules (including HealthKit)

### Step 5: Install on Your iPhone

**Option A: Direct Install (Recommended)**
1. EAS will give you a download link
2. Open link on your iPhone
3. Install the app
4. Trust the developer in Settings → General → VPN & Device Management

**Option B: TestFlight**
```bash
# Submit to TestFlight
eas submit --platform ios --latest
```

Then install via TestFlight app.

---

## 🔍 Verify HealthKit is Working

### Check the Logs

After installing the development build, check your console logs:

**✅ Success:**
```
✅ HealthKit initialized successfully
📊 HealthKit data for 2024-01-15: { steps: 8523, sleep: 7.5, ... }
```

**❌ Still Not Working:**
```
⚠️ Apple HealthKit module not available
```

If you still see this, check:

1. **Are you using the development build?**
   - Not Expo Go
   - Should say "Development Build" when you open app

2. **HealthKit Permissions**
   - Settings → Privacy & Security → Health → Lock-In
   - Make sure all permissions are enabled

3. **Apple Developer Account**
   - Need Apple Developer account ($99/year)
   - HealthKit requires proper provisioning

---

## 🧪 Test HealthKit Access

### Method 1: Check Settings

1. Open iPhone Settings
2. Privacy & Security → Health
3. Find "Lock-In" in the list
4. Enable all permissions:
   - ✅ Steps
   - ✅ Sleep Analysis
   - ✅ Active Energy
   - ✅ Walking + Running Distance
   - ✅ Workouts

### Method 2: Use Debug Screen

1. Open your app
2. Go to Settings → Debug & Testing
3. Run "Health Integration Tests"
4. Check results

### Method 3: Check Console Logs

Look for these messages:

```
🔄 Initializing health data access...
✅ HealthKit initialized successfully
📊 HealthKit data for [date]: { steps: X, sleep: Y, ... }
```

---

## 🐛 Troubleshooting

### Issue: "HealthKit module not available"

**Cause:** Running in Expo Go or simulator

**Fix:** 
- Use development build (see above)
- Test on physical device (simulator has limited HealthKit)

### Issue: "Permission denied"

**Cause:** User denied permissions

**Fix:**
1. Settings → Privacy & Security → Health → Lock-In
2. Enable all permissions
3. Restart app

### Issue: "No data showing"

**Possible Causes:**

1. **No health data in Apple Health**
   - Make sure you have data in Apple Health app
   - Check if your Garmin is syncing to Apple Health
   - Settings → Privacy & Security → Health → Data Sources

2. **Date range issue**
   - App only shows current week
   - Make sure you have data for today/this week

3. **Garmin not syncing**
   - Open Garmin Connect app
   - Make sure it's connected to Apple Health
   - Settings → Apps & Services → Apple Health → Enable all

### Issue: "Build failed"

**Common Causes:**

1. **Missing Apple Developer Account**
   - Need $99/year account
   - Sign up at developer.apple.com

2. **Bundle identifier conflict**
   - Change `com.lockin.app` if taken
   - Update in `app.json`

3. **EAS project not configured**
   - Run `eas build:configure`
   - Set project ID in `app.json`

---

## 📱 Quick Test Checklist

After installing development build:

- [ ] App opens (not Expo Go)
- [ ] Settings → Privacy → Health → Lock-In exists
- [ ] All permissions enabled
- [ ] Console shows "HealthKit initialized"
- [ ] Home screen shows real data (not fake)
- [ ] Data updates when you sync

---

## 🚀 Production Build

Once testing is done, build for App Store:

```bash
# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

---

## 💡 Pro Tips

1. **Always test on physical device**
   - Simulator has limited HealthKit support
   - Real device = real data

2. **Check Apple Health app first**
   - If no data in Apple Health, app can't read it
   - Make sure Garmin syncs to Apple Health

3. **Development builds expire**
   - Valid for 90 days
   - Rebuild when expired

4. **Use fake data mode for development**
   - Faster iteration
   - Don't need device
   - Switch off before production

---

## 🎯 Summary

**The Problem:**
- Expo Go can't access HealthKit
- App falls back to fake data

**The Solution:**
- Build development version with EAS
- Install on physical iPhone
- Grant HealthKit permissions
- Real data will appear!

**Quick Command:**
```bash
eas build --platform ios --profile development
```

Then install the `.ipa` file on your iPhone!

