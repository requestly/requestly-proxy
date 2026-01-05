# Quick Start: 2-Step Release Process

## TL;DR

```
Step 1: Actions → "Create Release PR" → Run workflow → Select type
Step 2: Review PR → Merge PR → ✨ Auto-published!
```

## Step-by-Step Guide

### 🚀 Step 1: Create Release PR

1. Go to **[Actions](../../actions)** tab in GitHub
2. Select **"Create Release PR"** workflow
3. Click **"Run workflow"**
4. Select release type:
   - **`auto`** (recommended) - automatically determines version from commits
   - **`patch`** - bug fixes (1.3.12 → 1.3.13)
   - **`minor`** - new features (1.3.12 → 1.4.0)
   - **`major`** - breaking changes (1.3.12 → 2.0.0)
5. Click **"Run workflow"** button
6. Wait ~1 minute for PR to be created

**Result:** A PR will be created with title like `[Release] v1.3.13`

### 👀 Step 2: Review & Merge

1. Open the created PR
2. Review the changes:
   - Check version number in PR title
   - Review release notes
   - Verify CHANGELOG.md looks correct
3. Request reviews if needed
4. Click **"Merge pull request"**

**Result:** Package automatically published to npm! 🎉

### ✅ Step 3: Verify

After merge, the publish workflow runs automatically:
- Check **[Actions](../../actions)** tab for workflow status
- Verify on **[npm](https://www.npmjs.com/package/@requestly/requestly-proxy)**
- Check **[Releases](../../releases)** for GitHub release

## When to Use What

| Scenario | Release Type | Example |
|----------|--------------|---------|
| Bug fixes only | `patch` | 1.3.12 → 1.3.13 |
| New features (backward compatible) | `minor` | 1.3.12 → 1.4.0 |
| Breaking changes | `major` | 1.3.12 → 2.0.0 |
| Not sure? Let it decide | `auto` | Determined by commits |

## Tips

💡 **Use `auto` type** - It analyzes your commit messages and determines the right version bump

💡 **Write good commit messages** - Use conventional commits:
```bash
feat: add new feature     # triggers minor bump
fix: resolve bug          # triggers patch bump
feat!: breaking change    # triggers major bump
```

💡 **Review before merging** - The PR lets you verify everything before publishing

💡 **No rush** - You can keep the PR open, make changes, and merge when ready

## Emergency Release

Need to publish without PR? Use workflow dispatch:
1. Make sure version in `package.json` is correct
2. Actions → "Publish Release" → Run workflow

⚠️ **Not recommended** - Always use the PR process when possible!

## Example Release Flow

```bash
# 1. Make your changes using conventional commits
git add .
git commit -m "feat: add new proxy feature"
git commit -m "fix: resolve connection timeout issue"
git push origin main

# 2. Create release PR (GitHub Actions)
# Go to Actions → "Create Release PR" → Run workflow
# Select release type: 'auto'
# Click "Run workflow"

# 3. Review the generated PR
# - Check the version number
# - Review CHANGELOG.md updates
# - Verify the release notes

# 4. Merge the release PR
# Click "Merge pull request" on the PR

# 5. Automated publish workflow runs
# - ✅ Creates tag v1.4.0
# - ✅ Creates GitHub release with notes
# - ✅ Publishes @requestly/requestly-proxy@1.4.0 to npm

# 6. Verify the release
# Check npm: https://www.npmjs.com/package/@requestly/requestly-proxy
# Check GitHub: https://github.com/requestly/rq-proxy/releases

# 7. Done! 🎉
```

## Troubleshooting

### PR not created
- Check the Actions tab for errors
- Verify you have write permissions to the repository
- Ensure all dependencies are installed

### Publish workflow not triggering
- Ensure PR branch is exactly `release`
- Verify PR was merged (not just closed)
- Check that PR target was `main` branch

### npm publish fails
- Verify `NPM_TOKEN` secret is set in repository settings
- Check token has publish permissions
- Ensure version doesn't already exist on npm

---

**Questions?** Check the workflow files in `.github/workflows/` or contact the maintainers.

