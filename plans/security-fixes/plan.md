# Security Fixes - Remove Exposed Secrets

**Branch:** `security/remove-exposed-secrets`
**Description:** Remove exposed secrets from git history, secure environment variables, and add automated secret scanning

## Goal
Eliminate the critical security vulnerability where API tokens (TURBO_TOKEN, CONTEXT7_API_KEY, GITHUB_TOKEN) are exposed in the `.env` file tracked in git history. Implement preventive measures to avoid future secret exposures.

## Implementation Steps

### Step 1: Add Git Ignore Patterns
**Files:** `.gitignore`, `web/miller.pub/.gitignore`, `web/readon.app/.gitignore`, `mobile/readon/.gitignore`
**What:** Ensure all `.env` files (not just `.env.local` and `.env.*.local`) are properly ignored by git across all workspace packages.
**Testing:** Run `git status` and verify `.env` files are not tracked; create test `.env` file in each directory to confirm ignore works

### Step 2: Create Environment Variable Templates
**Files:** `.env.example`, `web/miller.pub/.env.example`, `web/readon.app/.env.example`, `mobile/readon/.env.example`
**What:** Create template files with placeholder values showing required environment variables without exposing actual secrets.
**Testing:** Verify templates contain all necessary variables with descriptive placeholder values and security warnings

### Step 3: Remove .env from Git Tracking
**Files:** `.env`
**What:** Remove `.env` file from git tracking using `git rm --cached .env` (keeps local file but stops tracking). Document in commit message that secrets must be rotated.
**Testing:** Verify `.env` no longer appears in `git status` and is listed in ignored files

### Step 4: Install and Configure Husky + Pre-commit Hooks
**Files:** `package.json`, `.husky/pre-commit`, `.husky/_/.gitignore`, `package.json` scripts
**What:** Install husky and lint-staged; create pre-commit hook that runs secret scanning (gitleaks or similar) and blocks commits containing potential secrets.
**Testing:** Attempt to commit a file containing fake API key patterns and verify hook blocks the commit

### Step 5: Add GitHub Secret Scanning Workflow
**Files:** `.github/workflows/security.yml`
**What:** Create GitHub Actions workflow that runs on all pushes to scan for exposed secrets using truffleHog or gitleaks.
**Testing:** Push to feature branch and verify workflow runs successfully; test with intentional secret-like pattern in non-sensitive file

### Step 6: Documentation and Secret Rotation Guide
**Files:** `SECURITY.md`, `README.md`, `AGENTS.md`
**What:** Create security policy documenting how to handle secrets, add secret rotation instructions to README, update AGENTS.md with new `.env` workflow.
**Testing:** Review documentation completeness; verify all developers understand new secret management process

## Post-Implementation Requirements

**CRITICAL MANUAL STEPS** (Cannot be automated):

1. **Purge Git History:** Run BFG Repo-Cleaner or git-filter-repo to remove `.env` from all commits
   ```bash
   # Option 1: BFG (recommended)
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   
   # Option 2: git-filter-repo
   git filter-repo --path .env --invert-paths
   git push --force
   ```

2. **Rotate ALL Secrets Immediately:**
   - [ ] TURBO_TOKEN - Generate new at vercel.com/[account]/tokens
   - [ ] CONTEXT7_API_KEY - Regenerate at context7.com/settings/api
   - [ ] GITHUB_TOKEN - Revoke and create new at github.com/settings/tokens

3. **Configure Secrets Storage:**
   - [ ] Add secrets to GitHub Secrets (Settings → Secrets and variables → Actions)
   - [ ] Consider using Doppler, Vault, or 1Password for team secret management
   - [ ] Update CI/CD to pull from secure secret store

4. **Notify Team:**
   - [ ] Alert all team members about exposed secrets
   - [ ] Provide instructions for obtaining new credentials
   - [ ] Document new secret management workflow

## Notes

- This is a **CRITICAL SECURITY** issue requiring immediate attention
- Git history cleanup requires force-push (coordinate with team)
- All exposed tokens are now considered compromised and must be rotated
- Consider this a security incident and document lessons learned
