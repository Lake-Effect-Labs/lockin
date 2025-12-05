# 🏗️ Build Guide for Lock-In

## Building Without Apple ID Credentials

You can build and test the app **without** entering your Apple ID/password by using a **development build**.

### Development Build (No Apple ID Required)

This creates a build you can install on your device for testing, but it won't be distributed through the App Store.

```bash
# Build for iOS simulator (no credentials needed)
eas build --platform ios --profile development

# Build for physical iOS device (no credentials needed)
eas build --platform ios --profile development --local

# Build for Android (no credentials needed)
eas build --platform android --profile development
```

### What Each Build Profile Does:

1. **`development`** - Development build
   - ✅ No Apple ID required
   - ✅ Can install on your device
   - ✅ Includes development tools
   - ❌ Cannot submit to App Store
   - ❌ Larger file size

2. **`preview`** - Preview build (for TestFlight/internal testing)
   - ⚠️ Requires Apple ID (for App Store Connect)
   - ✅ Can distribute via TestFlight
   - ✅ Smaller file size
   - ✅ Production-like performance

3. **`production`** - Production build (for App Store)
   - ⚠️ Requires Apple ID + App Store Connect
   - ✅ Ready for App Store submission
   - ✅ Optimized and signed

## Quick Start: Development Build

### Step 1: Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### Step 2: Login to EAS
```bash
eas login
```

### Step 3: Configure Project
```bash
eas build:configure
```

### Step 4: Build for Development
```bash
# iOS Simulator (fastest, no device needed)
eas build --platform ios --profile development

# iOS Device (requires device connected)
eas build --platform ios --profile development --local
```

### Step 5: Install on Device

After the build completes:
1. Download the `.ipa` file from EAS dashboard
2. Install via:
   - **Simulator**: Drag `.app` to simulator
   - **Device**: Use `eas build:run` or install via Xcode/TestFlight

## Local Development Build (Fastest)

For fastest iteration, build locally:

```bash
# iOS (requires Xcode and CocoaPods)
eas build --platform ios --profile development --local

# Android (requires Android Studio)
eas build --platform android --profile development --local
```

**Note**: Local builds require:
- Xcode (for iOS)
- Android Studio (for Android)
- All native dependencies installed

## Testing Ads

The ad component is configured to **always show in development mode** (`__DEV__`), so you'll see test ads when running:

- Expo Go (development)
- Development builds
- Simulator builds

To test ad behavior:
1. Run the app in development mode
2. Navigate to home, league, or matchup screens
3. You should see test ad banners
4. Test dismissing ads (X button)
5. Test frequency capping (should show max 3 per day)

## Troubleshooting

### "No credentials found"
- Use `--profile development` - doesn't require credentials
- Or use `--local` flag for local builds

### "Build failed"
- Check `eas.json` configuration
- Ensure all dependencies are installed
- Check EAS dashboard for detailed error logs

### "Can't install on device"
- Development builds need to be signed
- Use `eas build:run` to install automatically
- Or manually install via Xcode/TestFlight

## Next Steps

Once you're ready for TestFlight/App Store:
1. Get Apple Developer Account ($99/year)
2. Configure App Store Connect
3. Build with `--profile preview` or `--profile production`
4. Submit via `eas submit`

