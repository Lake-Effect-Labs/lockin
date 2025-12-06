# Expo Go Connection Troubleshooting Guide

## ⚠️ Important: Your Project Requires a Development Build

**Your app uses native modules (`react-native-health` for HealthKit) that Expo Go cannot run.**

Expo Go is a sandbox app that doesn't support custom native code. Since you're using HealthKit, you **must** use a development build instead.

---

## 🔍 Why QR Code Isn't Working

### Reason 1: Native Modules Not Supported in Expo Go
- ✅ You have `expo-dev-client` installed
- ✅ You're using `react-native-health` (HealthKit)
- ✅ You have HealthKit entitlements configured

**Solution:** Use a development build (see below)

### Reason 2: Network Issues (If Using Expo Go for Other Features)

If you're trying to use Expo Go for non-health features, try these fixes:

#### Fix 1: Use Tunnel Mode
```bash
npx expo start --tunnel
```
This uses Expo's servers to connect, bypassing local network issues.

#### Fix 2: Check Network Connection
- Make sure phone and computer are on the **same Wi-Fi network**
- Try disabling VPN/firewall temporarily
- Check Windows Firewall isn't blocking port 8081

#### Fix 3: Use LAN Mode Explicitly
```bash
npx expo start --lan
```

#### Fix 4: Clear Cache and Restart
```bash
# Stop the server (Ctrl+C)
# Then:
npx expo start --clear
```

#### Fix 5: Check Metro Bundler Port
```bash
# Check if port 8081 is in use
netstat -ano | findstr :8081

# If something is using it, kill it or use different port:
npx expo start --port 8082
```

---

## ✅ Proper Solution: Use Development Build

Since you need HealthKit, you **must** create a development build:

### Step 1: Build Development Version

```bash
# Make sure you're logged in
eas login

# Build for iOS (physical device)
eas build --platform ios --profile development

# This takes 10-15 minutes
```

### Step 2: Install on Your Phone

After the build completes:

1. **EAS will give you a download link** (QR code or URL)
2. **Open the link on your iPhone**
3. **Install the app** (may need to trust developer in Settings)
4. **Open the app** - it will connect to your dev server automatically

### Step 3: Start Dev Server

```bash
# Start the Metro bundler
npm start

# Or with tunnel (if local network issues)
npx expo start --tunnel
```

The development build app will automatically connect to your dev server when you open it.

---

## 🚀 Quick Test Without HealthKit

If you just want to test the UI/features without HealthKit:

### Option 1: Use Fake Data Mode
1. Start the app: `npm start`
2. Scan QR code with Expo Go
3. Go to Settings → Enable "Fake Data Mode"
4. HealthKit features won't work, but you can test everything else

### Option 2: Remove Native Modules Temporarily

**⚠️ Not recommended** - Only for quick testing:

1. Comment out HealthKit plugin in `app.json`:
```json
// [
//   "react-native-health",
//   {
//     "isClinicalDataEnabled": false
//   }
// ],
```

2. Remove from `package.json` temporarily
3. Run `npm install`
4. Restart: `npm start`

**Remember to restore these before building!**

---

## 🔧 Common Connection Issues

### Issue: "Unable to connect to Metro bundler"

**Solutions:**
1. Check firewall isn't blocking port 8081
2. Try tunnel mode: `npx expo start --tunnel`
3. Restart Metro: Stop server (Ctrl+C), then `npm start -- --clear`
4. Check your IP address matches what Expo shows

### Issue: QR Code Scans But App Won't Load

**Solutions:**
1. Make sure Metro bundler is running
2. Check console for errors
3. Try tunnel mode
4. Restart Expo Go app on phone
5. Clear Expo Go cache (shake device → "Reload")

### Issue: "Network request failed"

**Solutions:**
1. Ensure same Wi-Fi network
2. Try tunnel mode: `npx expo start --tunnel`
3. Check Windows Firewall settings
4. Disable VPN temporarily

---

## 📱 Development Build vs Expo Go

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| HealthKit | ❌ No | ✅ Yes |
| Custom Native Modules | ❌ No | ✅ Yes |
| Setup Time | ⚡ Instant | ⏱️ 10-15 min build |
| Updates | ⚡ Instant | ⚡ Instant (code only) |
| Best For | Quick UI testing | Full feature testing |

---

## 🎯 Recommended Workflow

### For Development:
1. **Build development version once:** `eas build --platform ios --profile development`
2. **Install on phone** (takes 10-15 minutes, one-time)
3. **Use dev build for all testing** - connects instantly to Metro
4. **Code changes reload instantly** (just like Expo Go)

### For Quick UI Tests:
1. Use Expo Go with **Fake Data Mode** enabled
2. Test UI/UX without health features
3. Switch to dev build when testing health features

---

## 🆘 Still Having Issues?

### Check These:
1. ✅ Are you using a development build? (Required for HealthKit)
2. ✅ Is Metro bundler running? (`npm start`)
3. ✅ Are phone and computer on same network?
4. ✅ Is Windows Firewall blocking port 8081?
5. ✅ Have you tried tunnel mode? (`--tunnel`)

### Get Help:
- Check Expo docs: https://docs.expo.dev/
- Expo Discord: https://chat.expo.dev/
- Check Metro bundler logs for specific errors

---

## 💡 Pro Tip

**Use tunnel mode for reliability:**
```bash
npx expo start --tunnel
```

This uses Expo's servers, so it works even if:
- Phone and computer are on different networks
- Firewall is blocking local connections
- You're on a restricted network

The only downside is it's slightly slower than LAN mode.

