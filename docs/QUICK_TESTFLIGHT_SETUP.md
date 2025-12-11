# Quick TestFlight Setup Guide

## Current Status
✅ Apple Developer Account: Active  
✅ EAS CLI: Configured  
✅ Environment Variables: Set  
✅ Bundle ID Updated: `io.lockin.app`

## Step 1: Register Bundle ID

**Go to Apple Developer Portal:**
1. Visit: https://developer.apple.com/account/resources/identifiers/list
2. Click **"+"** button (top left)
3. Select **"App IDs"** → **Continue**
4. Select **"App"** → **Continue**
5. Fill in:
   - **Description**: `Lock-In App`
   - **Bundle ID**: `io.lockin.app` (exact match!)
6. **IMPORTANT**: Scroll down and **CHECK** ✅ **"HealthKit"** capability
7. Click **"Continue"** → **"Register"**

## Step 2: Create App in App Store Connect

1. Go to: https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Lock-In
   - **Primary Language**: English
   - **Bundle ID**: Select `io.lockin.app` (from dropdown)
   - **SKU**: `lockin-001`
   - **User Access**: Full Access
4. Click **"Create"**

5. **Complete App Privacy** (required):
   - Click **"App Privacy"** tab
   - Click **"Get Started"**
   - Answer:
     - ✅ Health & Fitness data: **Yes**
     - ✅ User ID: **Yes**
     - ✅ Email Address: **Yes**
   - Click **"Save"**

## Step 3: Build for TestFlight

```bash
eas build --platform ios --profile testflight
```

**What happens:**
- Build takes ~15-20 minutes
- EAS will use your Apple credentials (already saved)
- Build uploads automatically to App Store Connect

## Step 4: Wait for Processing

1. Go to **App Store Connect** → **TestFlight** tab
2. Your build will appear under **"iOS Builds"**
3. Wait 5-15 minutes for processing
4. Status changes: **"Processing"** → **"Ready to Submit"**

## Step 5: Add Friends as Internal Testers

**Internal Testing = No Apple Review Needed!**

1. In **TestFlight** tab, click **"Internal Testing"**
2. Click **"+"** → **"Create Group"**
3. Name: **"Friends & Family"**
4. Click **"Create"**

5. **Add Build:**
   - Click on **"Friends & Family"** group
   - Click **"+"** next to **"Builds"**
   - Select your build
   - Click **"Add"**

6. **Add Testers:**
   - Click **"+"** next to **"Testers"**
   - Enter email addresses (one per line)
   - Click **"Add"**

7. **Send Invites:**
   - Testers automatically get email invites
   - Or click **"Invite"** to send manually

## Step 6: Friends Install

Your friends need to:
1. Install **TestFlight** app from App Store (free)
2. Open email invite
3. Tap **"View in TestFlight"** or **"Start Testing"**
4. Tap **"Install"** in TestFlight
5. App appears on home screen!

## Troubleshooting

### "Bundle ID not available"
- Make sure you registered it in Apple Developer Portal first
- Check spelling: `io.lockin.app` (exact match)

### "Build stuck processing"
- Wait up to 30 minutes
- Check App Store Connect for status

### "Friends can't install"
- Make sure they have TestFlight app installed
- Check they accepted email invite
- Verify iOS version (needs iOS 13+)

## Quick Commands

```bash
# Build for TestFlight
eas build --platform ios --profile testflight

# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Publish OTA update (no rebuild needed for JS changes)
eas update --branch production --message "Bug fixes"
```

## Timeline

- **Bundle ID Registration**: 2 minutes
- **App Store Connect Setup**: 10 minutes
- **Build**: 15-20 minutes
- **Processing**: 5-15 minutes
- **Total**: ~30-45 minutes to first beta!

---

**You're almost there!** 🚀

