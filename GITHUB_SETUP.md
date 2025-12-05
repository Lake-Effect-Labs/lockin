# GitHub Repository Setup

## Option 1: Create via GitHub Web (Easiest)

1. Go to: https://github.com/organizations/lake-effect-labs/repositories/new
2. Repository name: `lockin` (or `lock-in`)
3. Description: "Fitness competition app - compete in leagues with friends using Apple HealthKit data"
4. Visibility: **Private** (recommended for now)
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

Then run these commands:

```bash
git remote add origin https://github.com/lake-effect-labs/lockin.git
git branch -M main
git push -u origin main
```

## Option 2: Create via GitHub API (If you have token)

If you have a GitHub personal access token:

```bash
# Set your token (replace YOUR_TOKEN)
$env:GITHUB_TOKEN="YOUR_TOKEN"

# Create repo
curl -X POST `
  -H "Authorization: token $env:GITHUB_TOKEN" `
  -H "Accept: application/vnd.github.v3+json" `
  https://api.github.com/orgs/lake-effect-labs/repos `
  -d '{"name":"lockin","description":"Fitness competition app","private":true}'

# Then add remote and push
git remote add origin https://github.com/lake-effect-labs/lockin.git
git branch -M main
git push -u origin main
```

## Option 3: Install GitHub CLI

```bash
# Install GitHub CLI
winget install --id GitHub.cli

# Then login
gh auth login

# Create repo
gh repo create lake-effect-labs/lockin --private --source=. --remote=origin --push
```

---

**Recommended:** Use Option 1 (web interface) - it's the easiest!



