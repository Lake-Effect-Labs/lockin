# TestFlight Beta Checklist
## Quick Reference for Getting Your App to Friends

### ✅ Prerequisites
- [ ] Apple Developer Account ($99/year) - https://developer.apple.com/programs/
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into EAS: `eas login`
- [ ] Environment variables set in EAS secrets

### ✅ App Store Connect Setup
- [ ] Created app in App Store Connect
- [ ] Bundle ID matches: `com.lockin.app`
- [ ] Filled out app information (minimal is fine for beta)
- [ ] Completed App Privacy questionnaire

### ✅ Build & Submit
- [ ] Build for TestFlight: `eas build --platform ios --profile testflight`
- [ ] Wait for build to complete (~15-20 min)
- [ ] Build appears in TestFlight (wait 5-15 min for processing)
- [ ] Fill out TestFlight information
- [ ] Submit for beta review (if external testing)

### ✅ Add Testers
- [ ] Create Internal Testing group (no review needed!)
- [ ] Add build to group
- [ ] Add tester email addresses
- [ ] Send invites

### ✅ First Update
- [ ] Testers install app
- [ ] Collect feedback
- [ ] Fix bugs
- [ ] Push OTA update: `eas update --branch production --message "Fixes"`

---

## Quick Commands

```bash
# Build for TestFlight
eas build --platform ios --profile testflight

# Check build status
eas build:list

# Publish OTA update (no rebuild needed)
eas update --branch production --message "Bug fixes"

# Set environment variables
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-key
```

---

## Timeline
- **Apple Developer Account**: 24-48 hours (first time)
- **First Build**: 15-20 minutes
- **TestFlight Processing**: 5-15 minutes
- **Beta Review** (external): 24-48 hours

**Total**: ~2-4 days to first beta

---

## Cost
- **Apple Developer**: $99/year
- **EAS Builds**: Free (unlimited, slower queue)
- **Supabase**: Free tier

**Total**: $99/year

---

## Need Help?
See `TESTFLIGHT_BETA_GUIDE.md` for detailed instructions.

