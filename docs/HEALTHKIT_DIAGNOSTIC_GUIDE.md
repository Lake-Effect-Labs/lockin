# HealthKit Diagnostic Guide - Build 1.0.27 (Build 5)

## 🎯 Purpose
This build has **COMPREHENSIVE DIAGNOSTICS** to help us identify the HealthKit issue once and for all.

---

## 📱 Testing Steps

### 1. Open TestFlight App
- Install build **1.0.27 (Build 5)**
- Wait for installation to complete

### 2. Navigate to Debug Screen
- Open Lock-In app
- Tap **Settings** (bottom nav)
- Tap **Debug & Testing** button
- You should see the debug screen with health testing tools

### 3. Run "Test Module Loading"
This checks if the HealthKit native module is in the build.

**Expected Result:**
```
✅ require() succeeded
Export count: 50+
Has requestAuthorization: true
Has isHealthDataAvailable: true
```

**If you see "require() FAILED":**
- ❌ Native module NOT in build (this is the core bug)
- We need to rebuild with different EAS configuration

### 4. Run "Force HealthKit Init"
This is the critical test - it will attempt to show the iOS permission dialog.

**Watch for:**
1. **iOS Permission Dialog** - Should appear asking for Health access
2. **Alert Result** - Shows detailed logs
3. **Duration** - Should take 2+ seconds if dialog was shown

**Expected Logs (when working):**
```
🔄 Starting HealthKit initialization...
✅ Module loaded successfully
📱 Calling initializeHealth()...
⏱️ Init took 2500ms
✅ SUCCESS!
```

**If duration < 500ms:**
- ⚠️ No dialog was shown (this is the bug)
- Native method not actually calling iOS HealthKit

### 5. Check iOS Settings
**After** running "Force HealthKit Init":
- Open **Settings** → **Privacy & Security** → **Health**
- Look for **"Lock-In"** in the apps list

**OR:**
- Open **Health** app
- Tap **Profile icon** (top right)
- Tap **Apps**
- Look for **"Lock-In"**

---

## 📊 What to Report Back

### CRITICAL: Did You See the Permission Dialog?
- ✅ **YES** → HealthKit is working! Just enable permissions.
- ❌ **NO** → This is the bug. See "Data to Collect" below.

### Data to Collect (If NO Dialog):

#### From "Test Module Loading" Alert:
- Module loaded: YES/NO
- Export count: ___
- Has requestAuthorization: YES/NO

#### From "Force HealthKit Init" Alert:
- ✅ SUCCESS or ⚠️ FAILED
- Duration: ___ ms
- Full alert text (screenshot)

#### From Console Logs (CRITICAL):
**Option A - Safari Remote Debugging:**
1. Connect iPhone to Mac via cable
2. Open Safari on Mac
3. Safari → Develop → [Your iPhone] → JSContext
4. Look for the detailed logs starting with:
   ```
   ============================================================
   🏥 HEALTHKIT INITIALIZATION - DETAILED DIAGNOSTIC LOG
   ============================================================
   ```
5. **COPY THE ENTIRE LOG BLOCK** and send to me

**Option B - Expo Dev Menu (TestFlight):**
1. Shake device
2. Tap "Show Dev Menu"
3. (May not work in TestFlight production builds)

#### Screenshots to Send:
1. "Test Module Loading" result
2. "Force HealthKit Init" result
3. iOS Settings → Privacy → Health (showing Lock-In is/isn't there)
4. Health app → Profile → Apps (showing Lock-In is/isn't there)
5. Safari console logs (if accessible)

---

## 🔍 Diagnostic Log Breakdown

The console will show a **6-STEP PROCESS**:

### STEP 1: Platform Check
- ✅ Should pass (iOS)

### STEP 2: Execution Environment Check
- ✅ Should pass (not Expo Go)

### STEP 3: Load HealthKit Module
- ✅ Should pass (module loaded)
- ❌ If fails: Native module not in build

### STEP 4: Check Device Availability
- ✅ Should pass (iPhone 6s+)
- Duration should be < 100ms

### STEP 5: Build Permission Request
- ✅ Should always pass (just building an object)

### STEP 6: Request Authorization ⭐ CRITICAL
- This is where the iOS dialog should appear
- Duration should be **2000+ ms** (user interaction time)
- ⚠️ If duration < 500ms: Dialog NOT shown (BUG)

---

## 🎯 What Success Looks Like

1. **"Test Module Loading"**: 
   - ✅ require() succeeded
   - ✅ 50+ exports
   - ✅ Has all required methods

2. **"Force HealthKit Init"**:
   - 📱 iOS permission dialog appears
   - ⏱️ Takes 2+ seconds (user interaction)
   - ✅ Alert shows "SUCCESS!"

3. **iOS Settings**:
   - Lock-In appears in Health app list
   - Can toggle permissions on/off

---

## 🐛 What Failure Looks Like

### Scenario 1: Module Not Loaded
```
❌ require() FAILED: Cannot find module
💡 Native module NOT in build
```
**Fix:** EAS build configuration issue. Need to check plugin setup.

### Scenario 2: Module Loaded, No Dialog
```
✅ Module loaded successfully
📱 Calling initializeHealth()...
⏱️ Init took 180ms  ⚠️ TOO FAST!
⚠️ WARNING: Call completed in < 500ms
💡 This suggests no dialog was shown
```
**Fix:** Native method not properly bridged. Plugin not applying entitlements.

### Scenario 3: Module Loaded, Dialog Shows, But Returns False
```
✅ Module loaded successfully
📱 Calling initializeHealth()...
⏱️ Init took 2500ms  ✅ GOOD
⚠️ Init returned FALSE
🔍 Check if you saw a permission dialog
```
**This is actually GOOD:** Dialog was shown, user just denied or closed it.

---

## 📋 Quick Checklist

Send me:
- [ ] Screenshot: "Test Module Loading" result
- [ ] Screenshot: "Force HealthKit Init" result  
- [ ] Answer: Did you see the iOS permission dialog? (YES/NO)
- [ ] Duration from "Force HealthKit Init": ___ ms
- [ ] Screenshot: iOS Settings → Privacy → Health
- [ ] Screenshot: Health app → Profile → Apps
- [ ] Console logs (if accessible via Safari)

---

## 💡 Pro Tips

1. **Always check console logs** - They have the most detailed info
2. **Duration is key** - < 500ms = no dialog, 2000+ ms = dialog shown
3. **Don't tap too fast** - Wait for each alert to complete
4. **Test multiple times** - First call might behave differently than subsequent calls
5. **Restart app between tests** - Ensures clean state

---

## 🚀 Next Steps

Once we get this data, we'll know **exactly** what's wrong:
- If module not loading → Fix EAS/plugin config
- If module loads but no dialog → Fix entitlements/bridging
- If dialog shows → SUCCESS! Just a permission issue.

**This build will tell us everything we need to know!** 🎉

