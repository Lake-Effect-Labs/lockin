# 🔧 Build Troubleshooting Guide

## Common Build Errors & Solutions

### Error: "Install dependencies build phase failed"

**Possible Causes:**

1. **Native Module Issues**
   - `react-native-health` requires proper iOS setup
   - HealthKit entitlements need to be configured

2. **Dependency Conflicts**
   - React version mismatches
   - Native module version conflicts

3. **Missing Dependencies**
   - CocoaPods not installed
   - Native dependencies not linked

## Quick Fixes

### 1. Clean and Rebuild

```bash
# Clear EAS cache
eas build:cancel --all

# Clear local cache
rm -rf node_modules
rm -rf .expo
npm install

# Try build again
eas build --platform ios --profile development
```

### 2. Check Build Logs

The build logs URL shows detailed error messages:
```
https://expo.dev/accounts/samfilipiak/projects/lock-in/builds/26fdbd35-e37c-4b30-a9f6-5558e0b91950
```

**Common errors in logs:**
- `pod install failed` → CocoaPods issue
- `Module not found` → Missing dependency
- `HealthKit not available` → Entitlements issue

### 3. Try Simulator Build First

Simulator builds are faster and don't require device provisioning:

```bash
eas build --platform ios --profile development --simulator
```

### 4. Build Locally (Fastest Debugging)

If you have Xcode installed:

```bash
# Install CocoaPods dependencies locally
cd ios
pod install
cd ..

# Build locally
eas build --platform ios --profile development --local
```

**Requirements:**
- Xcode installed
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account (free account works for development)

### 5. Check Native Module Compatibility

`react-native-health` might need specific configuration. Check if it's compatible with:
- React Native 0.81.5
- Expo SDK 54
- iOS 15+

## Alternative: Build Without HealthKit (For Testing)

If HealthKit is causing issues, temporarily disable it:

1. Comment out HealthKit plugin in `app.json`:
```json
// [
//   "react-native-health",
//   {
//     "isClinicalDataEnabled": false
//   }
// ],
```

2. Build without HealthKit:
```bash
eas build --platform ios --profile development
```

3. Use fake data mode in app (already implemented)

## Check Build Status

View detailed logs:
```bash
eas build:list
eas build:view [BUILD_ID]
```

## Still Failing?

1. **Check EAS Dashboard**: https://expo.dev/accounts/samfilipiak/projects/lock-in/builds
2. **Look for specific error** in "Install dependencies" phase
3. **Common fixes**:
   - Update `eas.json` with `appVersionSource: "remote"`
   - Remove problematic dependencies
   - Try building for simulator first
   - Check React Native version compatibility

## Next Steps

Once build succeeds:
1. Download `.ipa` file
2. Install on device via EAS dashboard link
3. Trust developer certificate in Settings
4. Test HealthKit permissions

