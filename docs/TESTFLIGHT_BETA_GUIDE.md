# TestFlight Beta Distribution Guide
## Getting Your App to Friends for Testing

This guide walks you through getting your Lock-In app on TestFlight so your friends can download and test it.

---

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] **Apple Developer Account** ($99/year)
  - Sign up at: https://developer.apple.com/programs/
  - Takes 24-48 hours to activate
  
- [ ] **App Store Connect Access**
  - Automatically available once Apple Developer account is active
  - Access at: https://appstoreconnect.apple.com

- [ ] **EAS CLI Installed**
  ```bash
  npm install -g eas-cli
  ```

- [ ] **Logged into EAS**
  ```bash
  eas login
  ```

- [ ] **Environment Variables Set**
  - Supabase URL and keys configured in EAS secrets

---

## Step 1: Set Up App Store Connect

### 1.1 Create Your App

1. Go to **App Store Connect**: https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Lock-In (or whatever you want)
   - **Primary Language**: English
   - **Bundle ID**: `com.lockin.app` (must match `app.json`)
   - **SKU**: `lockin-001` (any unique identifier)
   - **User Access**: Full Access

4. Click **"Create"**

### 1.2 Complete App Information

You'll need to fill out some basic info (can be minimal for beta):

1. **App Information**:
   - **Category**: Health & Fitness
   - **Subcategory**: Fitness
   - **Privacy Policy URL**: (optional for beta, required for production)

2. **Pricing and Availability**:
   - Set to **Free**
   - Select countries (or leave default)

3. **App Privacy**:
   - Click **"Get Started"**
   - Answer questions about data collection:
     - ✅ Health & Fitness data (HealthKit)
     - ✅ User ID (for accounts)
     - ✅ Email (for authentication)
   - This is required even for TestFlight

---

## Step 2: Configure EAS for TestFlight

### 2.1 Add TestFlight Build Profile

Update your `eas.json` to add a TestFlight-specific profile:

```json
{
  "cli": {
    "version": ">= 5.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Debug",
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Release"
      }
    },
    "testflight": {
      "distribution": "store",
      "ios": {
        "buildConfiguration": "Release"
      },
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2.2 Set Environment Variables

Make sure your Supabase credentials are set in EAS:

```bash
# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-supabase-url

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-supabase-anon-key
```

---

## Step 3: Build for TestFlight

### 3.1 Build the App

```bash
# Build for TestFlight
eas build --platform ios --profile testflight
```

This will:
- Build your app with production settings
- Sign it with your Apple Developer certificate
- Upload it directly to App Store Connect
- Takes ~15-20 minutes

### 3.2 What Happens During Build

1. EAS builds your app in the cloud
2. Code signing happens automatically
3. App is uploaded to App Store Connect
4. You'll get a build URL when it's done

**Note**: First build might take longer as EAS sets up certificates.

---

## Step 4: Submit to TestFlight

### 4.1 Wait for Processing

After the build completes:
1. Go to **App Store Connect** → **TestFlight**
2. Your build will appear under **"iOS Builds"**
3. Wait for processing (usually 5-15 minutes)
4. Status will change from **"Processing"** → **"Ready to Submit"**

### 4.2 Complete TestFlight Information

Before you can distribute, you need to fill out:

1. **Test Information**:
   - **What to Test**: Brief description of what testers should focus on
   - Example: "Test fitness tracking, league creation, and real-time score updates"

2. **Feedback Email**: Your email for tester feedback

3. **Beta App Description**: What the app does (can be brief)

4. **Marketing URL** (optional): Your website or landing page

5. **Privacy Policy URL** (optional for beta, required for production)

### 4.3 Submit for Beta Review

1. Click **"Submit for Review"**
2. Apple reviews TestFlight builds (usually 24-48 hours)
3. You'll get an email when approved

**Note**: TestFlight reviews are faster and less strict than App Store reviews.

---

## Step 5: Add Testers

### 5.1 Internal Testing (Up to 100 Testers)

**Fastest option** - No Apple review needed:

1. Go to **TestFlight** → **Internal Testing**
2. Click **"+"** → **"Create Group"**
3. Name it: "Friends & Family"
4. Add your build to the group
5. Click **"Add Testers"**
6. Enter email addresses of your friends
7. They'll get an email invite

**Advantages**:
- ✅ No Apple review needed
- ✅ Instant access
- ✅ Up to 100 testers
- ✅ Perfect for friends/family

### 5.2 External Testing (Up to 10,000 Testers)

**Requires Apple review** - But allows more testers:

1. Go to **TestFlight** → **External Testing**
2. Click **"+"** → **"Create Group"**
3. Name it: "Public Beta"
4. Add your build to the group
5. Fill out test information
6. Click **"Submit for Review"**
7. Once approved, share the public TestFlight link

**Advantages**:
- ✅ Up to 10,000 testers
- ✅ Public link (easier sharing)
- ⚠️ Requires Apple review (24-48 hours)

---

## Step 6: Testers Install the App

### 6.1 For Internal Testers

1. Testers receive an email invite
2. They click **"View in TestFlight"** or **"Start Testing"**
3. If they don't have TestFlight app, they'll be prompted to download it
4. Once in TestFlight, they tap **"Install"** or **"Update"**
5. App installs like a normal app

### 6.2 For External Testers

1. Share the public TestFlight link
2. Testers open the link on their iPhone
3. They're prompted to install TestFlight (if needed)
4. Then they can install your app

---

## Step 7: Updating Your Beta

When you make changes and want to push updates:

### 7.1 Code Changes (JavaScript/TypeScript)

For non-native changes, use **OTA Updates** (no rebuild needed):

```bash
# Publish update
eas update --branch production --message "Fixed sync bug"

# Testers get update automatically (or can pull to refresh)
```

**Advantages**:
- ✅ Instant updates (no rebuild)
- ✅ No Apple review
- ✅ Testers get updates automatically

### 7.2 Native Changes (New Dependencies, HealthKit Changes)

For native changes, rebuild:

```bash
# Rebuild
eas build --platform ios --profile testflight

# New build appears in TestFlight automatically
# Testers get notification to update
```

---

## Troubleshooting

### Build Fails

**Error**: "No Apple ID credentials found"
- **Fix**: Run `eas build:configure` and follow prompts
- Or set credentials: `eas credentials`

**Error**: "Bundle identifier already in use"
- **Fix**: Change `bundleIdentifier` in `app.json` to something unique
- Example: `com.yourname.lockin`

**Error**: "Missing entitlements"
- **Fix**: Make sure HealthKit entitlements are in `app.json` (you already have them ✅)

### TestFlight Issues

**Build stuck in "Processing"**
- Wait up to 30 minutes
- If still stuck, contact Apple Support

**Testers can't install**
- Make sure they have TestFlight app installed
- Check they accepted the email invite
- Verify their iOS version is compatible (iOS 13+)

**App crashes on launch**
- Check EAS build logs
- Verify environment variables are set correctly
- Test on a physical device first

---

## Quick Reference Commands

```bash
# Build for TestFlight
eas build --platform ios --profile testflight

# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Publish OTA update (no rebuild)
eas update --branch production --message "Bug fixes"

# Set environment variables
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-key

# View secrets
eas secret:list
```

---

## Cost Breakdown

### One-Time Costs
- **Apple Developer Account**: $99/year
- **EAS Builds**: Free tier (unlimited builds, slower queue)

### Ongoing Costs
- **EAS Priority Queue** (optional): $29/month for faster builds
- **Supabase**: Free tier (2GB bandwidth, 200 concurrent connections)

**Total for Beta**: ~$99/year (just Apple Developer account)

---

## Timeline Estimate

### First Time Setup
- **Apple Developer Account**: 24-48 hours (approval)
- **App Store Connect Setup**: 1-2 hours
- **First Build**: 15-20 minutes
- **TestFlight Processing**: 5-15 minutes
- **Beta Review** (external only): 24-48 hours

**Total**: ~2-4 days for first beta release

### Subsequent Updates
- **OTA Updates**: Instant (no review)
- **Native Updates**: 15-20 minutes build + 5-15 minutes processing

---

## Best Practices

### 1. Start with Internal Testing
- Add 5-10 close friends first
- Get feedback before expanding
- Fix critical bugs before external testing

### 2. Communicate with Testers
- Create a simple feedback form (Google Forms works)
- Set expectations (what to test, known bugs)
- Respond to feedback quickly

### 3. Version Your Builds
- Update `version` in `app.json` for each major release
- Use semantic versioning: `1.0.0` → `1.0.1` → `1.1.0`

### 4. Monitor Crashes
- Consider adding Sentry (free tier available)
- Check TestFlight crash reports in App Store Connect

### 5. Test Yourself First
- Always test on your own device before distributing
- Make sure HealthKit permissions work
- Verify sync functionality

---

## Next Steps After Beta

Once beta testing is complete:

1. **Fix Critical Bugs**: Address issues found during testing
2. **Polish UI/UX**: Based on tester feedback
3. **Prepare for Production**:
   - Complete App Store listing
   - Add screenshots
   - Write app description
   - Set up pricing
4. **Submit for App Store Review**:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

---

## Summary

**Quick Path to TestFlight**:

1. ✅ Get Apple Developer account ($99/year)
2. ✅ Create app in App Store Connect
3. ✅ Build: `eas build --platform ios --profile testflight`
4. ✅ Submit to TestFlight (fill out info)
5. ✅ Add internal testers (friends)
6. ✅ Share invites!

**Time to First Beta**: ~2-4 days
**Cost**: $99/year (Apple Developer)

Your app is already well-configured for TestFlight! Just need to build and submit. 🚀

