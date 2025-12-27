@echo off
REM ============================================
REM HEALTHKIT TESTFLIGHT BUILD SCRIPT (Windows)
REM Ensures clean build with proper native module linking
REM ============================================

echo.
echo ======================================================================
echo 🏥 Building TestFlight with HealthKit
echo ======================================================================
echo.

REM Step 1: Verify package installation
echo 📦 Step 1: Verifying react-native-health installation...
findstr /C:"react-native-health" package.json >nul
if %errorlevel% equ 0 (
    echo    ✅ react-native-health found in package.json
) else (
    echo    ❌ react-native-health NOT in package.json!
    exit /b 1
)

REM Step 2: Clean caches
echo.
echo 🧹 Step 2: Cleaning all caches...
if exist "node_modules\.cache" (
    echo    - Removing node_modules\.cache...
    rmdir /s /q "node_modules\.cache"
)
if exist ".expo" (
    echo    - Removing .expo...
    rmdir /s /q ".expo"
)
echo    ✅ Caches cleared

REM Step 3: Reinstall dependencies
echo.
echo 📥 Step 3: Reinstalling dependencies...
call npm install
echo    ✅ Dependencies installed

REM Step 4: Verify Expo config
echo.
echo ⚙️  Step 4: Verifying Expo configuration...
findstr /C:"react-native-health" app.json >nul
if %errorlevel% equ 0 (
    echo    ✅ react-native-health plugin configured
) else (
    echo    ❌ react-native-health plugin NOT configured!
    exit /b 1
)

findstr /C:"com.apple.developer.healthkit" app.json >nul
if %errorlevel% equ 0 (
    echo    ✅ HealthKit entitlement configured
) else (
    echo    ❌ HealthKit entitlement NOT configured!
    exit /b 1
)

REM Step 5: Build for TestFlight
echo.
echo 🚀 Step 5: Starting EAS Build...
echo    Profile: testflight
echo    Platform: ios
echo    Cache: disabled (forced in eas.json)
echo.
echo    This will take 10-15 minutes...
echo.

call npx eas-cli build --platform ios --profile testflight --clear-cache

echo.
echo ======================================================================
echo ✅ Build submitted!
echo ======================================================================
echo.
echo 📱 Next Steps:
echo    1. Wait for build to complete (~15 min)
echo    2. Install TestFlight build on device
echo    3. Open app and go to Debug screen
echo    4. Tap 'Test Module Loading' button
echo    5. Should show '✅ require() succeeded'
echo    6. Then tap 'Force HealthKit Init'
echo    7. iOS permission dialog should appear
echo.
echo 🔍 If 'Cannot find module' still appears:
echo    - Check EAS build logs for errors
echo    - Verify @config/plugins in build logs
echo    - Contact support with build ID
echo.

