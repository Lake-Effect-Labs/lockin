# 🚀 Lock-In Production Readiness Checklist

## Overall Status: ⚠️ ALMOST READY - Action Items Below

---

## ✅ COMPLETE - Code & Features

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ | Email/password + magic link |
| League System | ✅ | Create, join, leave, max 20 players |
| Matchups | ✅ | Round-robin scheduling, winner determination |
| Scoring Engine | ✅ | 5 metrics, configurable points |
| Playoffs | ✅ | Top 4, semifinals, finals, champion |
| Health Integration | ✅ | iOS HealthKit + Android Health Connect |
| Fake Data Mode | ✅ | For testing without health hardware |
| Offline Support | ✅ | Network monitoring, cached data |
| Error Handling | ✅ | Standardized errors, retry logic |
| Push Notifications | ✅ | Expo Notifications configured |
| State Management | ✅ | Zustand stores |
| Navigation | ✅ | Expo Router with typed routes |
| UI Components | ✅ | Full component library |
| Test Suite | ✅ | Simulation engine with validation |

---

## ❌ ACTION REQUIRED - Before Production

### 1. 🔑 Environment Configuration

**Create `.env` file with real credentials:**

```bash
# Copy from env.example
cp env.example .env
```

Then fill in:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 2. 🗄️ Supabase Setup

- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Run SQL migration: `supabase/migrations/001_initial_schema.sql`
- [ ] Enable Email Auth in Authentication settings
- [ ] Configure email templates (optional but recommended)
- [ ] Set up RLS policies (included in migration)

### 3. 🖼️ App Assets (REQUIRED)

Create these image files in `/assets/`:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024x1024 | App store icon |
| `splash.png` | 1284x2778 | Splash screen |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon |
| `favicon.png` | 48x48 | Web favicon |
| `notification-icon.png` | 96x96 | Push notification icon |

**Quick generation tools:**
- [icon.kitchen](https://icon.kitchen/) - Free icon generator
- [appicon.co](https://appicon.co/) - App icon generator
- Figma/Canva for custom designs

### 4. 📱 EAS Configuration

**Update `eas.json`:**
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR-APPLE-ID@email.com",
        "ascAppId": "YOUR-APP-STORE-CONNECT-APP-ID"
      }
    }
  }
}
```

**Update `app.json`:**
```json
{
  "extra": {
    "eas": {
      "projectId": "YOUR-EXPO-PROJECT-ID"
    }
  }
}
```

### 5. 🔐 Apple Developer Setup (iOS)

- [ ] Apple Developer account ($99/year)
- [ ] Create App ID with HealthKit capability
- [ ] Create provisioning profiles
- [ ] App Store Connect app listing

### 6. 🤖 Google Play Setup (Android)

- [ ] Google Play Developer account ($25 one-time)
- [ ] Create app listing
- [ ] Generate signing key
- [ ] Create `google-services.json` for Play Console API

---

## 📋 Pre-Launch Testing Checklist

### Run These Tests:

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm start

# 3. Test on device via Expo Go
# Scan QR code with phone

# 4. Run test suite in app
# Settings → Debug & Testing → Run Full Test Suite
```

### Manual Testing:

- [ ] Sign up new user
- [ ] Create a league
- [ ] Join league with code
- [ ] Verify matchup displays
- [ ] Sync health data (or use fake mode)
- [ ] Check standings update
- [ ] Test offline mode (airplane mode)
- [ ] Verify push notifications work

---

## 🏗️ Build Commands

```bash
# Login to Expo
npx eas login

# Configure project (first time)
npx eas build:configure

# Development build (for testing health features)
npx eas build --platform ios --profile development
npx eas build --platform android --profile development

# Production build
npx eas build --platform ios --profile production
npx eas build --platform android --profile production

# Submit to stores
npx eas submit --platform ios
npx eas submit --platform android
```

---

## ⚠️ Known Limitations

1. **Health Data on Expo Go**: HealthKit/Health Connect require a development build, not Expo Go
2. **Push Notifications**: Require physical device, not simulator
3. **Deep Links**: Test with `npx uri-scheme open lockin://` 

---

## 🔒 Security Checklist

- [x] Supabase RLS policies configured
- [x] Secure token storage (expo-secure-store)
- [x] No hardcoded secrets in code
- [ ] **TODO**: Add `.env` to `.gitignore`
- [ ] **TODO**: Set up production Supabase project (separate from dev)

---

## 📊 Recommended: Analytics & Monitoring

Consider adding before launch:

1. **Sentry** - Error tracking
   ```bash
   npx expo install @sentry/react-native
   ```

2. **Expo Updates** - OTA updates
   ```bash
   npx expo install expo-updates
   ```

3. **Analytics** - User behavior
   - Mixpanel, Amplitude, or PostHog

---

## ✅ Final Checklist

Before submitting to app stores:

- [ ] `.env` file configured with production Supabase
- [ ] All asset images created
- [ ] EAS project ID set
- [ ] Apple Developer account ready
- [ ] Google Play account ready
- [ ] App Store screenshots prepared (6.5", 5.5")
- [ ] Play Store screenshots prepared
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] App description written
- [ ] Keywords/tags selected
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Run full test suite - all passing

---

## 🎯 Quick Start for Production

```bash
# 1. Set up environment
cp env.example .env
# Edit .env with your Supabase credentials

# 2. Install dependencies  
npm install

# 3. Create assets (use icon.kitchen or similar)

# 4. Login to Expo
npx eas login

# 5. Build for production
npx eas build --platform all --profile production

# 6. Submit to stores
npx eas submit --platform all
```

---

**Questions?** Check the README.md for detailed setup instructions.

