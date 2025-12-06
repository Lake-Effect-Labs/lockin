# Apple Developer Setup - Step by Step Guide
## Complete Walkthrough from Start to TestFlight

---

## Part 1: Setting Up Apple Developer Account

### Step 1: Open Apple Developer App

1. Open the **Apple Developer** app on your iPhone
2. Tap **"Get Started"** or **"Sign In"**

### Step 2: Sign In with Apple ID

1. Tap **"Sign In"**
2. Enter your **Apple ID** (the one you use for iCloud, App Store, etc.)
3. Enter your **password**
4. Complete **2-factor authentication** if prompted

**Note**: If you don't have an Apple ID, create one first at appleid.apple.com

### Step 3: Enroll in Apple Developer Program

1. Tap **"Enroll"** or **"Join the Apple Developer Program"**
2. Review the information
3. Tap **"Continue"**

### Step 4: Choose Enrollment Type

You'll see options:
- **Individual** ($99/year) - Choose this if it's just you
- **Organization** ($99/year) - Choose if you have a company

**Select "Individual"** for personal projects.

### Step 5: Enter Personal Information

Fill out:
- **First Name**
- **Last Name**
- **Email** (usually pre-filled from Apple ID)
- **Phone Number**

Tap **"Continue"**

### Step 6: Review and Purchase

1. Review your information
2. You'll see the **$99/year** cost
3. Tap **"Purchase"** or **"Continue to Purchase"**
4. Complete payment with your Apple ID payment method

### Step 7: Wait for Approval

- **Processing time**: Usually 24-48 hours
- You'll get an **email** when approved
- Status shows in the Apple Developer app

**While you wait**, you can continue with the next steps (they'll work once approved).

---

## Part 2: Setting Up App Store Connect

### Step 1: Access App Store Connect

**Option A: On Your Computer (Easier)**
1. Go to: https://appstoreconnect.apple.com
2. Sign in with your **Apple ID** (same one you used for Developer account)

**Option B: On Your Phone**
1. Open Safari on iPhone
2. Go to: https://appstoreconnect.apple.com
3. Sign in with your **Apple ID**

**Note**: App Store Connect works better on a computer, but phone works too.

### Step 2: Accept Agreements

1. You may see agreements to accept
2. Read and accept **"Paid Applications Agreement"** (if shown)
3. Accept any other required agreements

### Step 3: Create Your App

1. Click **"My Apps"** (top left)
2. Click **"+"** button (top left)
3. Select **"New App"**

### Step 4: Fill Out App Information

Fill in these fields:

- **Platform**: Select **"iOS"**
- **Name**: **"Lock-In"** (or whatever you want)
- **Primary Language**: **"English"**
- **Bundle ID**: 
  - Click **"+"** to create new
  - **Description**: "Lock-In App"
  - **Bundle ID**: `com.lockin.app` (must match your `app.json`)
  - Click **"Register"**
- **SKU**: `lockin-001` (any unique identifier)
- **User Access**: **"Full Access"**

Click **"Create"**

### Step 5: Complete App Information

You'll see several tabs. For beta testing, you only need minimal info:

#### **App Information Tab**
- **Category**: Select **"Health & Fitness"**
- **Subcategory**: Select **"Fitness"**
- **Privacy Policy URL**: (optional for beta, required for production)

#### **Pricing and Availability Tab**
- **Price**: Select **"Free"**
- **Availability**: Leave default (all countries) or select specific ones

#### **App Privacy Tab** (Required)
1. Click **"Get Started"** or **"Answer Questions"**
2. Answer the privacy questions:

   **Does your app collect data?**
   - Select **"Yes"**

   **What types of data?**
   - ✅ **Health & Fitness** - Select this
   - ✅ **User ID** - Select this
   - ✅ **Email Address** - Select this

   **How is data used?**
   - Select **"App Functionality"** (for all)
   - Select **"Analytics"** (optional)

   **Is data linked to user?**
   - Select **"Yes"** (for user ID and email)
   - Select **"No"** (for health data - anonymized)

   **Is data used for tracking?**
   - Select **"No"** (unless you're using ads)

3. Click **"Save"**

**That's it for now!** You can add more details later.

---

## Part 3: Building Your App for TestFlight

### Step 1: Install EAS CLI (If Not Already)

Open Terminal on your computer:

```bash
npm install -g eas-cli
```

### Step 2: Login to EAS

```bash
eas login
```

Enter your Expo account credentials (create one at expo.dev if needed).

### Step 3: Set Environment Variables

Make sure your Supabase credentials are set:

```bash
# Check if they're already set
eas secret:list

# If not, set them:
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-supabase-url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-supabase-anon-key
```

Replace `your-supabase-url` and `your-supabase-anon-key` with your actual Supabase values.

### Step 4: Build for TestFlight

```bash
eas build --platform ios --profile testflight
```

**What happens:**
1. EAS will ask if you want to configure credentials
2. Select **"Yes"** (first time)
3. It will ask for your Apple ID
4. Enter your **Apple ID** (same one from Developer account)
5. EAS handles code signing automatically

**Build time**: ~15-20 minutes

You'll see:
- Build queued
- Build in progress
- Build complete with a URL

### Step 5: Check Build Status

```bash
eas build:list
```

Or check the EAS dashboard: https://expo.dev/accounts/[your-account]/projects/lock-in/builds

---

## Part 4: Submitting to TestFlight

### Step 1: Wait for Processing

1. Go to **App Store Connect** → **TestFlight**
2. Your build will appear under **"iOS Builds"**
3. Status will be **"Processing"** (5-15 minutes)
4. Wait until it says **"Ready to Submit"**

### Step 2: Complete TestFlight Information

1. Click on your app (**"Lock-In"**)
2. Go to **"TestFlight"** tab
3. You'll see sections to fill out:

#### **Test Information**
- **What to Test**: 
  ```
  Test fitness tracking, league creation, joining leagues, 
  and real-time score updates. Focus on HealthKit integration 
  and sync functionality.
  ```
- **Feedback Email**: Your email address
- **Beta App Description**: 
  ```
  Lock-In is a fitness competition app where you compete 
  with friends in weekly challenges based on steps, sleep, 
  calories, workouts, and distance.
  ```
- **Marketing URL**: (optional - your website if you have one)
- **Privacy Policy URL**: (optional for beta)

4. Click **"Save"**

### Step 3: Submit for Beta Review (External Testing Only)

**For Internal Testing** (recommended for friends):
- ✅ No review needed!
- ✅ Instant access
- ✅ Skip this step

**For External Testing** (if you want public link):
1. Click **"Submit for Review"**
2. Wait 24-48 hours for approval
3. You'll get an email when approved

---

## Part 5: Adding Friends as Testers

### Option 1: Internal Testing (Recommended - No Review!)

1. In **TestFlight** tab, click **"Internal Testing"**
2. Click **"+"** → **"Create Group"**
3. Name it: **"Friends & Family"**
4. Click **"Create"**

5. **Add Build to Group:**
   - Click on your group (**"Friends & Family"**)
   - Click **"+"** next to **"Builds"**
   - Select your build
   - Click **"Add"**

6. **Add Testers:**
   - Click **"+"** next to **"Testers"**
   - Enter email addresses (one per line or comma-separated)
   - Click **"Add"**

7. **Send Invites:**
   - Testers will automatically get an email
   - Or click **"Invite"** button to send manually

**Done!** Testers can install immediately (no Apple review needed).

### Option 2: External Testing (Requires Review)

1. Click **"External Testing"**
2. Click **"+"** → **"Create Group"**
3. Name it: **"Public Beta"**
4. Add build and testers (same as above)
5. Click **"Submit for Review"**
6. Wait 24-48 hours
7. Once approved, share the public TestFlight link

---

## Part 6: Your Friends Install the App

### What Your Friends Need to Do:

1. **Install TestFlight App** (if they don't have it)
   - Download from App Store (free)

2. **Accept Invite**
   - Open email invite
   - Tap **"View in TestFlight"** or **"Start Testing"**
   - Or open TestFlight app and accept invite there

3. **Install Your App**
   - In TestFlight, tap **"Install"** or **"Update"**
   - App installs like normal app

4. **Open and Test**
   - App appears on home screen
   - They can use it like any app
   - They'll get notifications for updates

---

## Troubleshooting

### "Apple Developer Account Not Active"
- **Wait**: Takes 24-48 hours after payment
- **Check**: Apple Developer app or email for status
- **Contact**: Apple Support if stuck

### "Bundle ID Already in Use"
- **Fix**: Change `bundleIdentifier` in `app.json` to something unique
- Example: `com.yourname.lockin`
- Then recreate app in App Store Connect

### "Build Failed"
- **Check**: `eas build:list` for error details
- **Common**: Missing environment variables
- **Fix**: Set Supabase secrets (Step 3 above)

### "Can't Find Build in TestFlight"
- **Wait**: Processing takes 5-15 minutes
- **Check**: Make sure build completed successfully
- **Refresh**: App Store Connect page

### "Friends Can't Install"
- **Check**: They have TestFlight app installed
- **Check**: They accepted email invite
- **Check**: Their iOS version (needs iOS 13+)

---

## Quick Reference

### Commands You'll Use

```bash
# Build for TestFlight
eas build --platform ios --profile testflight

# Check build status
eas build:list

# Set environment variables
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-key

# View secrets
eas secret:list

# Publish OTA update (after build)
eas update --branch production --message "Bug fixes"
```

### Important URLs

- **Apple Developer**: https://developer.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev
- **TestFlight**: (in App Store Connect)

---

## Timeline

### First Time Setup
- **Apple Developer Account**: 24-48 hours (approval)
- **App Store Connect Setup**: 30 minutes
- **Build**: 15-20 minutes
- **TestFlight Processing**: 5-15 minutes
- **Beta Review** (external only): 24-48 hours

**Total**: ~2-4 days for first beta

### Updates
- **OTA Updates**: Instant (no rebuild)
- **Native Updates**: 15-20 minutes build + 5-15 minutes processing

---

## Next Steps After Setup

1. ✅ **Test Yourself First**
   - Install on your own device
   - Make sure everything works
   - Test HealthKit permissions

2. ✅ **Add Close Friends**
   - Start with 2-3 people
   - Get initial feedback
   - Fix critical bugs

3. ✅ **Expand Testing**
   - Add more testers
   - Collect feedback
   - Iterate quickly

4. ✅ **Prepare for Production**
   - Fix all bugs
   - Polish UI/UX
   - Complete App Store listing
   - Submit for public release

---

## Summary

**Complete Process:**
1. ✅ Apple Developer app → Enroll ($99/year)
2. ✅ Wait 24-48 hours for approval
3. ✅ App Store Connect → Create app
4. ✅ Fill out basic info + privacy
5. ✅ Build: `eas build --platform ios --profile testflight`
6. ✅ TestFlight → Add build
7. ✅ Add friends as internal testers
8. ✅ They install and test!

**Time**: ~2-4 days total
**Cost**: $99/year (one-time payment)

You're all set! 🚀

