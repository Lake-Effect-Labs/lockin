# How to Switch to Expo Go Mode

## Quick Fix

When you see:
```
› Using development build
› Press s │ switch to Expo Go
```

**Just press `s` in your terminal!**

This will:
- ✅ Switch to Expo Go mode
- ✅ Regenerate QR code for Expo Go
- ✅ Let you scan with Expo Go app

---

## Why This Happened

Expo detected you have:
- `expo-dev-client` installed
- `react-native-health` (native module)

So it defaulted to "development build" mode.

**This is normal!** Just press `s` to switch.

---

## After Pressing `s`

You'll see:
```
› Using Expo Go
```

Then scan the QR code with **Expo Go app** (not iPhone Camera).

---

## Note About HealthKit

⚠️ **Important:** Even in Expo Go mode, HealthKit won't work. You'll need to:
1. Enable "Fake Data Mode" in Settings
2. Or build a development build for real HealthKit

But Expo Go mode lets you test everything else!

