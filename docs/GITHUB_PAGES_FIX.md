# Fix: GitHub Pages Showing README Instead of Privacy Policy

## The Problem
GitHub Pages is showing your README.md instead of index.html (privacy policy).

## Solution

### Option 1: Ensure index.html is in root (You've done this ✅)

### Option 2: Check GitHub Pages Settings

1. Go to your repo: `https://github.com/YOUR_USERNAME/lockin`
2. Click **Settings** → **Pages**
3. Under **Source**, make sure:
   - **Deploy from a branch** is selected
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)` ← **This is important!**
4. Click **Save**

### Option 3: Force GitHub Pages to Use index.html

If it's still showing README, try one of these:

**Method A: Rename README temporarily**
```bash
git mv README.md README.md.bak
git commit -m "Temporarily hide README for GitHub Pages"
git push
```

**Method B: Add a .nojekyll file** (tells GitHub not to process Jekyll)
```bash
echo "" > .nojekyll
git add .nojekyll
git commit -m "Add .nojekyll to force index.html"
git push
```

**Method C: Use docs/ folder** (Alternative)
1. Move index.html to `docs/index.html`
2. In GitHub Pages settings, set folder to `/docs`
3. Your URL will be: `https://YOUR_USERNAME.github.io/lockin/`

### Option 4: Verify index.html is pushed

Make sure index.html is committed and pushed:
```bash
git status
git add index.html
git commit -m "Ensure privacy policy index.html is committed"
git push origin main
```

## After Making Changes

1. Wait 1-2 minutes for GitHub Pages to rebuild
2. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
3. Visit: `https://YOUR_USERNAME.github.io/lockin/`

## Why This Happens

GitHub Pages uses Jekyll by default, which can sometimes prioritize README.md. The `.nojekyll` file tells GitHub to serve static files directly without Jekyll processing.

