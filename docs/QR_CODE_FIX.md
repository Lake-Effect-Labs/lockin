# Fix "No Usable Data Found" QR Code Error

## 🔍 What This Error Means

"No usable data found" means the QR code scanner can't read the data in the QR code. This is different from a connection error.

---

## ✅ Quick Fixes

### Fix 1: Use the Right Scanner App

**For Expo Go:**
- ✅ Use the **Expo Go app** to scan (not iPhone Camera)
- ✅ Open Expo Go → Tap "Scan QR Code"
- ❌ Don't use iPhone's built-in Camera app

**For Development Build:**
- ✅ Use iPhone Camera app (it will open the dev build)
- ✅ Or manually enter the URL shown in terminal

### Fix 2: Make Sure Dev Server is Running

```bash
# Stop any running servers (Ctrl+C)
# Then start fresh:
npx expo start --tunnel
```

Wait for:
- ✅ QR code to appear in terminal
- ✅ "Metro waiting on..." message
- ✅ URL shown (like `exp://...`)

### Fix 3: Check QR Code Format

The QR code should contain an `exp://` URL, not `http://`

**Correct format:**
```
exp://u.expo.dev/...
```

**Wrong format:**
```
http://192.168.1.100:8081
```

If you see `http://`, try tunnel mode:
```bash
npx expo start --tunnel
```

### Fix 4: Clear and Restart

```bash
# Stop server (Ctrl+C)
# Clear cache
npx expo start --clear --tunnel
```

### Fix 5: Check Your Expo CLI Version

```bash
npx expo --version
```

Update if needed:
```bash
npm install -g expo-cli@latest
```

---

## 📱 Step-by-Step: Scanning QR Code

### Method 1: Expo Go App (For Testing Without HealthKit)

1. **Install Expo Go** from App Store
2. **Start dev server:**
   ```bash
   npx expo start --tunnel
   ```
3. **Open Expo Go app** on iPhone
4. **Tap "Scan QR Code"** button (bottom of screen)
5. **Point camera at QR code** in terminal
6. ✅ Should connect automatically

### Method 2: iPhone Camera (For Development Build)

1. **Build development build:**
   ```bash
   eas build --platform ios --profile development
   ```
2. **Install the .ipa** on your iPhone
3. **Start dev server:**
   ```bash
   npx expo start --tunnel
   ```
4. **Open iPhone Camera app**
5. **Point at QR code** in terminal
6. **Tap the notification** that appears
7. ✅ Opens your dev build app

---

## 🚨 Common Issues

### Issue: QR Code Shows `http://` Instead of `exp://`

**Cause:** Using LAN mode instead of tunnel

**Fix:**
```bash
# Use tunnel mode
npx expo start --tunnel
```

### Issue: QR Code is Too Small/Blurry

**Fix:**
1. Zoom in on terminal/console
2. Make terminal window larger
3. Increase font size temporarily
4. Try scanning from further away

### Issue: Scanner Says "Invalid Format"

**Cause:** Using wrong scanner app

**Fix:**
- For Expo Go: Use Expo Go app's scanner
- For Dev Build: Use iPhone Camera app

### Issue: QR Code Keeps Changing/Refreshing

**Cause:** Server restarting or network issues

**Fix:**
```bash
# Stop server
# Clear cache
npx expo start --clear --tunnel
# Wait for stable QR code before scanning
```

---

## 🔧 Advanced Troubleshooting

### Check What URL is in QR Code

1. Look at terminal output
2. Find the line that says:
   ```
   › Metro waiting on exp://...
   ```
3. Copy that URL manually
4. Try opening it directly in Expo Go:
   - Open Expo Go
   - Tap "Enter URL manually"
   - Paste the URL

### Manual Connection (If QR Code Fails)

1. **Get the URL from terminal:**
   ```
   exp://u.expo.dev/abc123...
   ```

2. **In Expo Go:**
   - Tap "Enter URL manually"
   - Paste the URL
   - Tap "Connect"

3. **Or send to yourself:**
   - Copy URL
   - Send via iMessage/Email
   - Tap link on phone

### Check Network Connection

```bash
# Test if tunnel is working
curl https://exp.host

# Should return HTML, not error
```

---

## 💡 Pro Tips

### Tip 1: Use Tunnel Mode Always
```bash
npx expo start --tunnel
```
Works even if phone and computer are on different networks.

### Tip 2: Save QR Code as Image
Some terminals let you right-click QR code → Save as image → Send to phone

### Tip 3: Use Expo Dev Tools
Open `http://localhost:19002` in browser for web-based QR code viewer

### Tip 4: Check Expo Account
Make sure you're logged in:
```bash
npx expo login
```

---

## 🎯 Still Not Working?

### Try These in Order:

1. ✅ **Restart dev server:**
   ```bash
   npx expo start --clear --tunnel
   ```

2. ✅ **Check Expo Go version:**
   - Update Expo Go from App Store
   - Make sure it's latest version

3. ✅ **Try manual URL entry:**
   - Copy URL from terminal
   - Enter manually in Expo Go

4. ✅ **Check firewall/antivirus:**
   - Temporarily disable
   - See if QR code generates

5. ✅ **Use development build:**
   ```bash
   eas build --platform ios --profile development
   ```
   Then use iPhone Camera to scan

---

## 📞 Get More Help

If nothing works:
1. Check Expo status: https://status.expo.dev
2. Expo Discord: https://chat.expo.dev
3. Check terminal for specific error messages
4. Try on a different network/device

