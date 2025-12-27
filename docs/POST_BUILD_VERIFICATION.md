# Post-Build Verification Guide - HealthKit Native Linking

## 🎯 Critical Question

After your TestFlight build completes, you need to verify:
1. ✅ **JS Module loads** (Metro bundled it)
2. ✅ **Native methods exist** (Xcode linked it)
3. ✅ **Entitlements applied** (HealthKit framework included)

## 🔬 Option A: In-App Testing (FASTEST)

### Step 1: Install TestFlight Build
Install build #8 on your iOS device

### Step 2: Test Native Linking
1. Open Lock-In app
2. Go to **Debug screen**
3. Tap **"Test Native Linking"** button

### Expected Results:

#### ✅ SUCCESS (Native Fully Linked):
```
✅ JS MODULE: require() succeeded
typeof: object

NATIVE BRIDGE CHECK:
Exports found: 15
Sample: initHealthKit, getStepCount, getSleepSamples...

✅ initHealthKit: YES
✅ getStepCount: YES
✅ getSleepSamples: YES
✅ Constants: YES

🎉 NATIVE FULLY LINKED!
HealthKit ready to use
```
**If you see this → PROCEED to Step 3**

#### ⚠️ PARTIAL SUCCESS (JS loads, Native missing):
```
✅ JS MODULE: require() succeeded
typeof: object

NATIVE BRIDGE CHECK:
Exports found: 0

❌ NATIVE NOT LINKED!
JS loads but native side missing

POSSIBLE CAUSES:
1. New Architecture enabled
2. Native module not compiled
3. Config plugin not applied
```
**If you see this → Go to Troubleshooting Section**

#### ❌ FAILURE (Module not in bundle):
```
❌ JS MODULE: require() FAILED
Error: Cannot find module 'react-native-health'

💡 Module NOT in bundle

FIX: npm run build:testflight
```
**If you see this → Contact me with EAS build logs**

### Step 3: Test Permission Dialog
1. Tap **"Force HealthKit Init"**
2. **EXPECTED:** iOS Health permission modal appears
3. Grant all permissions
4. **VERIFY:** Settings → Privacy & Security → Health → Lock-In

---

## 🔍 Option B: Inspect .ipa Entitlements (DEFINITIVE)

This is the **100% certain** way to verify native linking happened.

### Download the .ipa
1. Go to your EAS build page (check email for link)
2. Download the **Build artifact** (.ipa file)
3. Or run: `eas build:download --platform ios --latest`

### Extract and Check (Mac/Linux)
```bash
# Unzip the .ipa
unzip Lock-In.ipa

# Check entitlements
codesign -d --entitlements :- Payload/Lock-In.app
```

### What to Look For:

#### ✅ SUCCESS:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.background-delivery</key>
    <true/>
    ...
</dict>
</plist>
```
**If you see `com.apple.developer.healthkit` with `<true/>` → Native is linked!**

#### ❌ FAILURE:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- No healthkit key! -->
</dict>
</plist>
```
**If `com.apple.developer.healthkit` is missing → Config plugin didn't run**

---

## 🐛 Troubleshooting

### Issue: Native methods undefined (Object.keys returns 0)

This means Metro bundled the JS but the native side didn't compile/link.

**Root Cause Check:**
```bash
# Check if New Architecture is enabled
grep -r "newArchEnabled" .
```

**Solution 1: Disable New Architecture** (fastest)
Add to `app.json` under `"ios"`:
```json
"ios": {
  "newArchEnabled": false,
  "supportsTablet": true,
  // ... rest of config
}
```
Then rebuild.

**Solution 2: Check EAS build logs**
1. Open your build URL from EAS
2. Search for: `react-native-health`
3. Look for:
   - `[expo-config-plugins] ` lines mentioning RNHealth
   - `pod install` including RNHealth pod
   - Any ERROR or WARN about HealthKit

**Solution 3: Switch libraries**
If `react-native-health` continues to have native bridge issues, switch to:
```bash
npm uninstall react-native-health
npm install @kingstinct/react-native-healthkit react-native-nitro-modules
```
This library has better New Architecture support.

### Issue: Entitlements missing from .ipa

**Check EAS build logs for:**
```
Signing identity: "Apple Distribution: ..."
Provisioning profile: "..."
```

**Verify Apple Developer Portal:**
1. https://developer.apple.com/account
2. Identifiers → io.lockin.app
3. Scroll to **HealthKit** → Must be checked ✅
4. If not checked:
   - Check it
   - Save
   - Regenerate provisioning profile
   - Rebuild

---

## 📊 Expected Test Results Summary

| Test | Expected Result | If Fails |
|------|----------------|----------|
| **In-App: Test Native Linking** | ✅ "NATIVE FULLY LINKED!" | See Troubleshooting |
| **In-App: Force HealthKit Init** | iOS permission dialog appears | Check entitlements |
| **iOS Settings** | Lock-In appears in Health apps | Dialog must be shown first |
| **.ipa Entitlements** | `com.apple.developer.healthkit: true` | Config plugin issue |

---

## ✅ Success Criteria

You've successfully verified native linking when **ALL** of these are true:

1. ✅ "Test Native Linking" shows `🎉 NATIVE FULLY LINKED!`
2. ✅ "Force HealthKit Init" shows iOS permission dialog
3. ✅ Settings → Privacy → Health → Lock-In appears
4. ✅ (Optional) `.ipa` contains HealthKit entitlements

---

## 🚨 When to Contact Support

Contact me (with screenshots + build URL) if:

1. ❌ "Test Native Linking" shows 0 exports even after clean rebuild
2. ❌ `.ipa` entitlements missing `com.apple.developer.healthkit`
3. ❌ EAS build logs show errors mentioning RNHealth/HealthKit
4. ❌ Permission dialog never appears despite native linking success

---

## 🎯 Next Steps

1. **Build:** `npm run build:testflight`
2. **Wait:** ~15 minutes
3. **Test:** Run "Test Native Linking" on device
4. **Report:** Share the exact output from that test button
5. **Verify:** (Optional) Download .ipa and check entitlements

The enhanced debug button will tell us **exactly** which failure mode you're hitting (if any), and we can fix from there!

