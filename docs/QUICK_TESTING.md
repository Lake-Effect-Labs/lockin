# Quick Testing Guide - Before Full Build

## ⚡ Fast Testing Options

Since you're on Windows, you can't run iOS locally. Here are your options:

---

## Option 1: Development Build (Recommended) ⭐

**Time:** 20-30 minutes  
**Tests:** Native modules, real crashes  
**Best for:** Testing crash fixes before TestFlight

### Steps:

```bash
# Build development version
eas build --platform ios --profile development
```

**After build completes:**
1. EAS will show a download link (QR code or URL)
2. Open link on your iPhone
3. Install the app
4. Go to **Settings → General → VPN & Device Management**
5. Trust the developer certificate
6. Open app and test!

**Advantages:**
- ✅ Tests native modules (HealthKit, SecureStore, etc.)
- ✅ Catches real crashes
- ✅ Much faster than TestFlight (20-30 min vs 90 min)
- ✅ Same code path as production

**Disadvantages:**
- ⏱️ Still takes 20-30 minutes
- 📱 Requires physical iPhone

---

## Option 2: Preview Build

**Time:** 30-45 minutes  
**Tests:** Production-like environment  
**Best for:** Final testing before TestFlight

```bash
eas build --platform ios --profile preview
```

**Advantages:**
- ✅ Production-like build
- ✅ Tests everything
- ✅ Faster than TestFlight

**Disadvantages:**
- ⏱️ Takes longer than development build
- 📱 Requires physical iPhone

---

## Option 3: Expo Go (Limited Testing)

**Time:** 2 minutes  
**Tests:** Basic UI/logic only  
**Best for:** Quick UI checks

```bash
npx expo start
```

**Advantages:**
- ✅ Instant testing
- ✅ Works on Windows

**Disadvantages:**
- ❌ **Won't catch native module crashes**
- ❌ No HealthKit, SecureStore, Push Notifications
- ❌ Won't test the crash you're seeing
- ❌ Different code path than production

**Use this only for:**
- Testing UI changes
- Checking error messages display correctly
- Quick logic checks

**Don't use this for:**
- Testing crash fixes
- Testing native modules
- Final validation

---

## 🎯 Recommended Workflow

1. **Make crash fix** (you did this ✅)
2. **Test with Development Build** (20-30 min)
   ```bash
   eas build --platform ios --profile development
   ```
3. **If crash is fixed:** Build TestFlight version
4. **If crash persists:** Check crash logs, fix, repeat step 2

---

## 💡 Pro Tip

You can run the development build command and do other work while it builds. EAS will notify you when it's done!

---

## 🔍 What Each Build Tests

| Feature | Expo Go | Development | Preview | TestFlight |
|---------|---------|-------------|---------|------------|
| UI/Logic | ✅ | ✅ | ✅ | ✅ |
| Native Modules | ❌ | ✅ | ✅ | ✅ |
| HealthKit | ❌ | ✅ | ✅ | ✅ |
| SecureStore | ❌ | ✅ | ✅ | ✅ |
| Push Notifications | ❌ | ✅ | ✅ | ✅ |
| Production Config | ❌ | ❌ | ✅ | ✅ |
| App Store Ready | ❌ | ❌ | ❌ | ✅ |

---

**For your crash fix, use Development Build!** 🚀

