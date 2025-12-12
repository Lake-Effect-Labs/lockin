# GitHub Pages Setup for Privacy Policy

## Quick Setup (5 minutes)

### Option 1: Clean URL with GitHub Organization (Recommended)

**Get `https://lock-in.github.io/` (cleanest URL)**

**Steps:**

1. **Create GitHub Organization:**
   - Go to: https://github.com/organizations/new
   - Organization name: `lock-in` (must match exactly)
   - Choose "Free" plan
   - Create organization

2. **Create Repository:**
   - In the new organization, click "New repository"
   - Repository name: `lock-in.github.io` (MUST be exactly this)
   - Make it Public
   - Don't initialize with README
   - Create repository

3. **Add your privacy policy:**
   ```bash
   # Clone the new repo
   git clone https://github.com/lock-in/lock-in.github.io.git
   cd lock-in.github.io
   
   # Copy your index.html
   cp ../lockin/index.html .
   
   # Commit and push
   git add index.html
   git commit -m "Add privacy policy"
   git push origin main
   ```

4. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from branch `main`
   - Folder: `/ (root)`
   - Save

5. **Your privacy policy will be live at:**
   ```
   https://lock-in.github.io/
   ```

**✅ This gives you the cleanest URL!**

---

### Option 2: GitHub Pages in Your Personal Repo

**Steps:**

1. **Create a `gh-pages` branch:**
   ```bash
   git checkout -b gh-pages
   ```

2. **Copy the privacy policy HTML:**
   ```bash
   cp docs/privacy.html index.html
   ```

3. **Commit and push:**
   ```bash
   git add index.html
   git commit -m "Add privacy policy for GitHub Pages"
   git push origin gh-pages
   ```

4. **Enable GitHub Pages:**
   - Go to your GitHub repo: `https://github.com/YOUR_USERNAME/lockin`
   - Click **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Select branch: `gh-pages`
   - Select folder: `/ (root)`
   - Click **Save**

5. **Your privacy policy will be live at:**
   ```
   https://YOUR_USERNAME.github.io/lockin/
   ```

6. **Update your app:**
   - Update `app/(app)/settings.tsx` with your GitHub Pages URL
   - Update App Store Connect with the same URL

---

### Option 2: Use `docs/` folder (Alternative)

If you want to keep it in your main branch:

1. **Move the HTML file:**
   ```bash
   mv docs/privacy.html docs/index.html
   ```

2. **Enable GitHub Pages from `docs/` folder:**
   - Go to Settings → Pages
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`)
   - Folder: `/docs`
   - Save

3. **Your URL will be:**
   ```
   https://YOUR_USERNAME.github.io/lockin/
   ```

---

## Custom Domain (Optional)

If you own `lockin.app`:

1. **Create a CNAME file:**
   ```bash
   echo "privacy.lockin.app" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. **Update DNS:**
   - Add CNAME record: `privacy.lockin.app` → `YOUR_USERNAME.github.io`

3. **Enable custom domain in GitHub:**
   - Settings → Pages → Custom domain → Enter `privacy.lockin.app`

---

## Testing

After setup, test your privacy policy:
- Open: `https://YOUR_USERNAME.github.io/lockin/`
- Check mobile responsiveness
- Verify all links work

---

## Updating the Privacy Policy

1. Edit `docs/privacy.html` (or `index.html` in gh-pages branch)
2. Commit and push
3. GitHub Pages updates automatically (may take 1-2 minutes)

---

## Alternative: Netlify (Also Free)

If you prefer Netlify:

1. **Sign up:** https://netlify.com
2. **Drag and drop** the `docs/privacy.html` file
3. **Get instant URL:** `https://random-name.netlify.app`
4. **Custom domain:** Add your domain in Netlify settings

**Pros:**
- Instant deployment
- Custom domain support
- HTTPS automatically

**Cons:**
- Need separate account
- Less integrated with GitHub

---

## Recommended: GitHub Pages

**Why GitHub Pages is best:**
- ✅ Free forever
- ✅ Integrated with your repo
- ✅ Easy to update (just push)
- ✅ HTTPS automatically
- ✅ Custom domain support
- ✅ No separate account needed

---

## Next Steps

1. ✅ Set up GitHub Pages
2. ✅ Test the privacy policy URL
3. ✅ Update `app/(app)/settings.tsx` with the URL
4. ✅ Add URL to App Store Connect

