# Push to GitHub - Quick Steps

## Step 1: Create Repository on GitHub

1. Go to: https://github.com/organizations/lake-effect-labs/repositories/new
   - Or: https://github.com/new (then select "lake-effect-labs" org)

2. Fill in:
   - **Repository name:** `lockin`
   - **Description:** "Fitness competition app - compete in leagues with friends using Apple HealthKit data"
   - **Visibility:** Private (recommended)
   - **DO NOT** check "Add a README file" (we already have one)
   - **DO NOT** add .gitignore or license

3. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repo, GitHub will show you commands. Run these:

```bash
git remote add origin https://github.com/lake-effect-labs/lockin.git
git branch -M main
git push -u origin main
```

That's it! Your code will be pushed to GitHub.

---

**Alternative:** If you prefer SSH:
```bash
git remote add origin git@github.com:lake-effect-labs/lockin.git
git branch -M main
git push -u origin main
```




