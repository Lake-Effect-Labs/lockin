#!/bin/bash

# ============================================
# HEALTHKIT TESTFLIGHT BUILD SCRIPT
# Ensures clean build with proper native module linking
# ============================================

echo ""
echo "======================================================================"
echo "🏥 Building TestFlight with HealthKit"
echo "======================================================================"
echo ""

# Step 1: Verify package installation
echo "📦 Step 1: Verifying react-native-health installation..."
if grep -q '"react-native-health"' package.json; then
    echo "   ✅ react-native-health found in package.json"
else
    echo "   ❌ react-native-health NOT in package.json!"
    exit 1
fi

# Step 2: Clean caches
echo ""
echo "🧹 Step 2: Cleaning all caches..."
echo "   - Removing node_modules/.cache..."
rm -rf node_modules/.cache
echo "   - Removing .expo..."
rm -rf .expo
echo "   - Removing metro cache..."
rm -rf $TMPDIR/metro-*
echo "   - Removing metro bundler cache..."
rm -rf $TMPDIR/react-*
echo "   ✅ Caches cleared"

# Step 3: Reinstall dependencies
echo ""
echo "📥 Step 3: Reinstalling dependencies..."
npm install
echo "   ✅ Dependencies installed"

# Step 4: Verify Expo config
echo ""
echo "⚙️  Step 4: Verifying Expo configuration..."
if grep -q '"react-native-health"' app.json; then
    echo "   ✅ react-native-health plugin configured"
else
    echo "   ❌ react-native-health plugin NOT configured!"
    exit 1
fi

if grep -q 'com.apple.developer.healthkit' app.json; then
    echo "   ✅ HealthKit entitlement configured"
else
    echo "   ❌ HealthKit entitlement NOT configured!"
    exit 1
fi

# Step 5: Build for TestFlight
echo ""
echo "🚀 Step 5: Starting EAS Build..."
echo "   Profile: testflight"
echo "   Platform: ios"
echo "   Cache: disabled (forced in eas.json)"
echo ""
echo "   This will take 10-15 minutes..."
echo ""

eas build --platform ios --profile testflight --clear-cache

echo ""
echo "======================================================================"
echo "✅ Build submitted!"
echo "======================================================================"
echo ""
echo "📱 Next Steps:"
echo "   1. Wait for build to complete (~15 min)"
echo "   2. Install TestFlight build on device"
echo "   3. Open app and go to Debug screen"
echo "   4. Tap 'Test Module Loading' button"
echo "   5. Should show '✅ require() succeeded'"
echo "   6. Then tap 'Force HealthKit Init'"
echo "   7. iOS permission dialog should appear"
echo ""
echo "🔍 If 'Cannot find module' still appears:"
echo "   - Check EAS build logs for errors"
echo "   - Verify @config/plugins in build logs"
echo "   - Contact support with build ID"
echo ""

