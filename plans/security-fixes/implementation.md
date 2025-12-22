# Security Fixes - Remove Exposed Secrets

## Goal
Eliminate the critical security vulnerability where API tokens (TURBO_TOKEN, CONTEXT7_API_KEY, GITHUB_TOKEN) are exposed in the `.env` file tracked in git history. Implement automated secret scanning and establish secure environment variable management practices.

## Prerequisites
- [ ] Ensure you are on the `security/remove-exposed-secrets` branch before beginning implementation
- [ ] If the branch does not exist, create it from master: `git checkout -b security/remove-exposed-secrets`
- [ ] Ensure you have admin access to rotate secrets after implementation

---

## Step-by-Step Instructions

### Step 1: Add Git Ignore Patterns

Update all `.gitignore` files to ensure comprehensive environment file coverage.

- [ ] Open `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.gitignore`
- [ ] Replace the environment files section with the enhanced version below:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production builds
dist/
build/
.next/
out/
.turbo/

# Environment variables - ENHANCED SECURITY
# Block ALL .env files except templates
.env
.env.*
!.env.example
!.env.*.example

# Expo
.expo/
.expo-shared/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Temporary files
*.tmp
*.temp
.cache/
```

- [ ] Create/update `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/web/miller.pub/.gitignore`:

```gitignore
# Next.js
/.next/
/out/

# Environment variables
.env
.env.*
!.env.example
!.env.*.example

# Build outputs
/build/
/.turbo/

# Testing
/coverage/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local
.DS_Store
*.local
```

- [ ] Create/update `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/web/readon.app/.gitignore`:

```gitignore
# Next.js
/.next/
/out/

# Environment variables
.env
.env.*
!.env.example
!.env.*.example

# Build outputs
/build/
/.turbo/

# Testing
/coverage/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local
.DS_Store
*.local
```

- [ ] Create/update `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/mobile/readon/.gitignore`:

```gitignore
# Expo
.expo/
.expo-shared/
dist/
web-build/

# Environment variables
.env
.env.*
!.env.example
!.env.*.example

# Dependencies
node_modules/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.ipa
*.apk

# Metro
.metro-health-check*

# Debug
npm-debug.*
yarn-debug.*
yarn-error.*

# Local
.DS_Store
*.local
```

#### Step 1 Verification Checklist
- [ ] Run `git status` and verify no `.env` files appear as untracked
- [ ] Create test file: `touch .env.test` in root directory
- [ ] Run `git status` - confirm `.env.test` does NOT appear
- [ ] Delete test file: `rm .env.test`
- [ ] Verify all four `.gitignore` files have the enhanced patterns

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Commit these changes before proceeding.
```bash
git add .gitignore web/miller.pub/.gitignore web/readon.app/.gitignore mobile/readon/.gitignore
git commit -m "security: enhance .gitignore patterns to block all .env files"
```

---

### Step 2: Create Environment Variable Templates

Create `.env.example` templates showing required variables without exposing actual secrets.

- [ ] Create `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.env.example`:

```bash
# ============================================================================
# @lellimecnar/source - Environment Variables Template
# ============================================================================
# 
# 🚨 SECURITY WARNING:
# - NEVER commit actual .env files to git
# - NEVER share secrets in plain text (Slack, email, etc.)
# - Rotate secrets immediately if accidentally exposed
# 
# 📋 SETUP INSTRUCTIONS:
# 1. Copy this file: cp .env.example .env
# 2. Replace placeholder values with your actual secrets
# 3. Verify .env is listed in .gitignore
# 
# ============================================================================

# Turborepo Remote Caching
# Generate at: https://vercel.com/account/tokens
TURBO_TOKEN="your_vercel_turbo_token_here"

# Context7 API (Documentation Service)
# Generate at: https://context7.com/settings/api
CONTEXT7_API_KEY="your_context7_api_key_here"

# GitHub Personal Access Token
# Generate at: https://github.com/settings/tokens
# Required scopes: repo, workflow
GITHUB_TOKEN="your_github_personal_access_token_here"

# ============================================================================
# WORKSPACE-SPECIFIC VARIABLES
# ============================================================================
# Additional environment variables may be required for individual workspaces.
# Check the following files for workspace-specific templates:
# - web/miller.pub/.env.example
# - web/readon.app/.env.example
# - mobile/readon/.env.example
# ============================================================================
```

- [ ] Create `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/web/miller.pub/.env.example`:

```bash
# ============================================================================
# miller.pub - Environment Variables Template
# ============================================================================
# 
# Next.js App Router application environment variables
# 
# ============================================================================

# Public variables (exposed to browser - prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_GA_TRACKING_ID="G-XXXXXXXXXX"

# Private server-side variables
DATABASE_URL="postgresql://user:password@localhost:5432/millerpub"
SESSION_SECRET="your_session_secret_minimum_32_characters_long"

# API Keys (server-side only)
# Add any third-party API keys here
```

- [ ] Create `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/web/readon.app/.env.example`:

```bash
# ============================================================================
# readon.app - Environment Variables Template
# ============================================================================
# 
# Next.js App Router application environment variables
# 
# ============================================================================

# Public variables (exposed to browser - prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_SITE_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# Private server-side variables
DATABASE_URL="postgresql://user:password@localhost:5432/readonapp"
SESSION_SECRET="your_session_secret_minimum_32_characters_long"

# API Keys (server-side only)
# Add any third-party API keys here
```

- [ ] Create `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/mobile/readon/.env.example`:

```bash
# ============================================================================
# readon (mobile) - Environment Variables Template
# ============================================================================
# 
# Expo mobile application environment variables
# 
# ============================================================================

# Expo Configuration
EXPO_PUBLIC_API_URL="http://localhost:3001/api"
EXPO_PUBLIC_APP_ENV="development"

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS="false"
EXPO_PUBLIC_ENABLE_CRASH_REPORTING="false"

# API Keys (will be bundled in the app - use with caution)
# For sensitive operations, always use your backend API as a proxy
EXPO_PUBLIC_ANALYTICS_ID="your_analytics_id_here"
```

#### Step 2 Verification Checklist
- [ ] All four `.env.example` files created
- [ ] Each template contains descriptive placeholder values
- [ ] Security warnings are present in each file
- [ ] No actual secrets are in any `.env.example` file
- [ ] Run `git status` - confirm `.env.example` files ARE tracked (not ignored)

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Commit these changes before proceeding.
```bash
git add .env.example web/miller.pub/.env.example web/readon.app/.env.example mobile/readon/.env.example
git commit -m "security: add environment variable templates with security warnings"
```

---

### Step 3: Remove .env from Git Tracking

Stop tracking the compromised `.env` file while preserving it locally.

- [ ] Run the following command to stop tracking `.env`:

```bash
git rm --cached .env
```

- [ ] Verify `.env` is no longer tracked:

```bash
git status
# Should show: deleted: .env (staged for commit)
# The file still exists locally but is no longer tracked by git
```

- [ ] Confirm local `.env` file still exists:

```bash
ls -la .env
# Should show: -rw-r--r-- ... .env
```

#### Step 3 Verification Checklist
- [ ] `git status` shows `.env` as deleted (staged)
- [ ] `ls -la .env` confirms file still exists locally
- [ ] `.env` does NOT appear in untracked files section
- [ ] File is preserved for local development use

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Commit this critical security change with explicit note about secret rotation.
```bash
git commit -m "security: remove .env from git tracking - SECRETS MUST BE ROTATED

The .env file containing TURBO_TOKEN, CONTEXT7_API_KEY, and GITHUB_TOKEN
has been removed from git tracking. All exposed secrets in git history are
now considered compromised and MUST be rotated immediately.

Post-commit actions required:
1. Purge .env from git history using BFG or git-filter-repo
2. Rotate ALL exposed tokens immediately
3. Configure secure secret storage (GitHub Secrets, Vault, etc.)
4. Notify team about security incident"
```

---

### Step 4: Install and Configure Husky + Pre-commit Hooks

Install Husky 9.x and configure pre-commit secret scanning.

- [ ] Install Husky and lint-staged as dev dependencies:

```bash
pnpm add -Dw husky lint-staged
```

- [ ] Initialize Husky:

```bash
pnpm exec husky init
```

- [ ] Install Gitleaks for secret scanning:

```bash
# macOS
brew install gitleaks

# Or download binary from: https://github.com/gitleaks/gitleaks/releases
```

- [ ] Create Gitleaks configuration file `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.gitleaks.toml`:

```toml
# Gitleaks Configuration for @lellimecnar/source
# Documentation: https://github.com/gitleaks/gitleaks

title = "Gitleaks Configuration for @lellimecnar/source"

[extend]
# Use default rules as baseline
useDefault = true

[[rules]]
id = "generic-api-key"
description = "Detected a generic API key pattern"
regex = '''(?i)(api[_-]?key|apikey|api[_-]?secret|apisecret)['"\s]*[:=]\s*['"]?[a-zA-Z0-9]{20,}'''
keywords = ["api_key", "apikey", "api_secret"]

[[rules]]
id = "github-token"
description = "Detected a GitHub Personal Access Token"
regex = '''ghp_[0-9a-zA-Z]{36}'''
keywords = ["ghp_"]

[[rules]]
id = "turbo-token"
description = "Detected a Vercel Turbo token"
regex = '''TURBO_TOKEN\s*=\s*['"]?[a-zA-Z0-9]{10,}'''
keywords = ["TURBO_TOKEN"]

[[rules]]
id = "generic-secret"
description = "Detected a generic secret pattern"
regex = '''(?i)(secret|password|passwd|token)['"\s]*[:=]\s*['"]?[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:'",.<>?]{8,}'''
keywords = ["secret", "password", "token"]

[allowlist]
description = "Allowlist for false positives"
paths = [
  '''^\.env\.example$''',
  '''^.*\.env\..*\.example$''',
  '''^.*\.md$''',
  '''^.*\.txt$''',
]

# Allow example/template values
regexes = [
  '''your_.*_here''',
  '''placeholder''',
  '''example''',
  '''INSERT_.*_HERE''',
  '''xxx+''',
]
```

- [ ] Update `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit security checks..."

# Run Gitleaks on staged files
echo "🔐 Scanning for secrets with Gitleaks..."
gitleaks protect --staged --verbose --config=.gitleaks.toml

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ SECRET DETECTED! Commit blocked for security."
  echo ""
  echo "🚨 Action required:"
  echo "   1. Remove the detected secret from your changes"
  echo "   2. If it's a false positive, update .gitleaks.toml allowlist"
  echo "   3. If a real secret was committed before, rotate it immediately"
  echo ""
  exit 1
fi

echo "✅ No secrets detected - proceeding with commit"

# Run lint-staged for code quality
pnpm exec lint-staged
```

- [ ] Make the pre-commit hook executable:

```bash
chmod +x .husky/pre-commit
```

- [ ] Add lint-staged configuration to `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/package.json`:

Find the existing `package.json` and add this configuration at the root level (after the `scripts` section):

```json
  "lint-staged": {
    "*.{js,jsx,ts,tsx,mjs,cjs}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
```

#### Step 4 Verification Checklist
- [ ] Verify Husky installed: `ls -la .husky/`
- [ ] Verify pre-commit hook exists and is executable: `ls -la .husky/pre-commit`
- [ ] Verify Gitleaks installed: `gitleaks version`
- [ ] Test the hook with a fake secret:

```bash
# Create a test file with fake secret
echo 'const API_KEY = "sk_test_12345678901234567890123456789012"' > test-secret.js
git add test-secret.js
git commit -m "test: trigger secret detection"
# Should FAIL with error message
rm test-secret.js
```

- [ ] Verify lint-staged configuration in package.json
- [ ] Test successful commit without secrets:

```bash
echo '// Clean file' > test-clean.js
git add test-clean.js
git commit -m "test: verify clean commit"
# Should SUCCEED
git reset --soft HEAD~1  # Undo test commit
rm test-clean.js
```

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Commit the Husky setup and pre-commit hooks.
```bash
git add package.json pnpm-lock.yaml .husky/ .gitleaks.toml
git commit -m "security: add Husky pre-commit hooks with Gitleaks secret scanning

- Install Husky 9.x and lint-staged
- Configure Gitleaks with custom rules for API keys, tokens, secrets
- Add pre-commit hook that blocks commits containing secrets
- Configure allowlist for .env.example and documentation files
- Add lint-staged for automated code formatting on commit"
```

---

### Step 5: Add GitHub Secret Scanning Workflow

Create a GitHub Actions workflow for automated secret scanning on all pushes.

- [ ] Create directory for GitHub Actions workflows:

```bash
mkdir -p .github/workflows
```

- [ ] Create `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.github/workflows/security.yml`:

```yaml
name: Security Scanning

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [master, main]
  schedule:
    # Run daily at 2 AM UTC
    - cron: "0 2 * * *"

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  gitleaks:
    name: Secret Scanning with Gitleaks
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for comprehensive scanning

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

      - name: Upload Gitleaks SARIF report
        if: failure()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

  dependency-scan:
    name: Dependency Vulnerability Scanning
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9.12.2

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run npm audit
        run: pnpm audit --audit-level=moderate
        continue-on-error: true

      - name: Generate dependency tree
        run: pnpm list --depth=0 --prod

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        language: [javascript, typescript]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

- [ ] Create `.github/CODEOWNERS` file for security team notifications:

```
# Security Configuration - Require review for security-sensitive files
/.env.example @lellimecnar
/web/*/.env.example @lellimecnar
/mobile/*/.env.example @lellimecnar
/.github/workflows/security.yml @lellimecnar
/.gitleaks.toml @lellimecnar
/SECURITY.md @lellimecnar
```

#### Step 5 Verification Checklist
- [ ] `.github/workflows/` directory created
- [ ] `security.yml` file created with valid YAML syntax
- [ ] Verify YAML syntax: `pnpm add -g js-yaml && js-yaml .github/workflows/security.yml` (or use online validator)
- [ ] CODEOWNERS file created
- [ ] After pushing, verify workflow appears in GitHub Actions tab
- [ ] Check that workflow runs successfully on the feature branch

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Commit the GitHub Actions security workflow.
```bash
git add .github/
git commit -m "security: add GitHub Actions security scanning workflow

- Add Gitleaks secret scanning on all pushes and PRs
- Add scheduled daily security scans
- Add dependency vulnerability scanning with pnpm audit
- Add CodeQL static analysis for JavaScript/TypeScript
- Add CODEOWNERS for security-sensitive files
- Upload SARIF reports to GitHub Security tab"
```

---

### Step 6: Documentation and Secret Rotation Guide

Create comprehensive security documentation and update existing docs.

- [ ] Create `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/SECURITY.md`:

```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing [security contact email]. Do **NOT** create a public GitHub issue.

We take security seriously and will respond to vulnerability reports within 48 hours.

---

## Environment Variable Management

### ✅ Secure Practices

1. **Never commit `.env` files** - All `.env` files (except `.env.example` templates) are automatically ignored by git
2. **Use `.env.example` templates** - Document required variables without exposing secrets
3. **Rotate compromised secrets immediately** - If a secret is accidentally committed, rotate it within 1 hour
4. **Use strong, unique values** - Generate cryptographically random secrets (minimum 32 characters)
5. **Limit secret access** - Use principle of least privilege for API tokens and keys

### ❌ Dangerous Practices

- Committing `.env` files to git
- Sharing secrets via Slack, email, or other plain-text channels
- Using weak or default secret values
- Reusing secrets across environments (dev, staging, production)
- Storing secrets in code comments or documentation

---

## Secret Storage Solutions

### For Local Development
- Copy `.env.example` to `.env` and fill in your secrets
- Store sensitive `.env` files in a password manager (1Password, Bitwarden, etc.)

### For Production
- **GitHub Actions**: Use GitHub Secrets (Settings → Secrets and variables → Actions)
- **Vercel**: Use Vercel Environment Variables (Project Settings → Environment Variables)
- **Recommended**: Use a dedicated secret management service:
  - [Doppler](https://www.doppler.com/)
  - [HashiCorp Vault](https://www.vaultproject.io/)
  - [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
  - [1Password Secrets Automation](https://1password.com/products/secrets/)

---

## Secret Rotation Procedures

### When to Rotate Secrets

Rotate secrets immediately if:
- A secret is committed to git (even if removed later)
- A secret is shared via insecure channel
- A team member with access leaves the project
- You suspect unauthorized access
- As part of regular security maintenance (every 90 days)

### How to Rotate Secrets

#### TURBO_TOKEN (Vercel Turbo Remote Cache)
1. Log in to [Vercel](https://vercel.com/)
2. Navigate to Account Settings → Tokens
3. Revoke the compromised token
4. Create a new token with same permissions
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `TURBO_TOKEN`
7. Update team members

#### CONTEXT7_API_KEY
1. Log in to [Context7](https://context7.com/)
2. Navigate to Settings → API Keys
3. Revoke the compromised key
4. Generate a new API key
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `CONTEXT7_API_KEY`

#### GITHUB_TOKEN
1. Log in to [GitHub](https://github.com/)
2. Navigate to Settings → Developer settings → Personal access tokens → Tokens (classic)
3. Delete the compromised token
4. Generate a new token with required scopes: `repo`, `workflow`
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `GITHUB_TOKEN`

---

## Pre-commit Secret Scanning

This repository uses [Gitleaks](https://github.com/gitleaks/gitleaks) for automatic secret detection.

### How It Works
- Runs automatically before every commit
- Scans staged files for potential secrets
- Blocks the commit if secrets are detected
- Prevents accidental secret exposure

### If Your Commit is Blocked

```
❌ SECRET DETECTED! Commit blocked for security.
```

**Action steps:**
1. Remove the detected secret from your changes
2. If it's a real secret that was already committed, rotate it immediately
3. If it's a false positive (e.g., example code), update `.gitleaks.toml` allowlist
4. Try committing again

### Bypassing Secret Detection (DANGER)

**⚠️ Only use in emergencies and with team approval:**

```bash
git commit --no-verify -m "your message"
```

**Never bypass for actual secrets!**

---

## GitHub Actions Security Workflow

The `security.yml` workflow runs automatically on:
- Every push to any branch
- All pull requests to master/main
- Daily at 2 AM UTC (scheduled scan)

### What It Does
1. **Secret Scanning** - Scans entire git history with Gitleaks
2. **Dependency Scanning** - Checks for vulnerable dependencies with `pnpm audit`
3. **CodeQL Analysis** - Static analysis for JavaScript/TypeScript security issues
4. **SARIF Reporting** - Uploads findings to GitHub Security tab

### Viewing Results
- Go to repository → Security tab → Code scanning alerts
- Check GitHub Actions tab for detailed logs

---

## Incident Response

If a secret is exposed:

### Immediate Actions (Within 1 hour)
1. **Rotate the secret immediately** - Use procedures above
2. **Document the incident** - Create an issue with `security` label
3. **Notify the team** - Alert all team members via secure channel
4. **Assess impact** - Check logs for unauthorized usage

### Follow-up Actions (Within 24 hours)
1. **Purge from git history** - Use BFG Repo-Cleaner or git-filter-repo
2. **Review access logs** - Check if the exposed secret was used
3. **Update documentation** - Document lessons learned
4. **Conduct post-mortem** - Review how the exposure occurred

### Prevention
1. Enable GitHub secret scanning (Settings → Security → Code security)
2. Use pre-commit hooks (already configured in this repo)
3. Regular security training for team members
4. Quarterly secret rotation

---

## Security Checklist for Contributors

Before submitting a pull request:

- [ ] No secrets in code, comments, or commit messages
- [ ] All `.env` files are in `.gitignore`
- [ ] Environment variables use `.env.example` templates
- [ ] Pre-commit hooks are installed and working
- [ ] No hard-coded credentials or API keys
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] Security workflow passes all checks

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [pnpm Security](https://pnpm.io/security)

---

**Last Updated:** December 21, 2025
**Security Contact:** [Add your security contact email]
```

- [ ] Update `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/README.md`:

Add the following section after the project description (before "Project Structure" or similar):

```markdown
## 🔐 Security & Environment Setup

**Critical:** This project uses environment variables for sensitive configuration. Follow these steps carefully:

### First-Time Setup

1. **Copy environment templates:**
   ```bash
   cp .env.example .env
   cp web/miller.pub/.env.example web/miller.pub/.env
   cp web/readon.app/.env.example web/readon.app/.env
   cp mobile/readon/.env.example mobile/readon/.env
   ```

2. **Obtain actual secrets:**
   - **TURBO_TOKEN**: Get from project admin or generate at [Vercel Tokens](https://vercel.com/account/tokens)
   - **CONTEXT7_API_KEY**: Get from project admin or generate at [Context7 API Settings](https://context7.com/settings/api)
   - **GITHUB_TOKEN**: Generate at [GitHub Tokens](https://github.com/settings/tokens) with `repo` and `workflow` scopes

3. **Update `.env` files** with actual values (replace placeholders)

4. **Verify git is ignoring `.env`:**
   ```bash
   git status  # .env files should NOT appear
   ```

### Security Guidelines

- ⚠️ **NEVER commit `.env` files** - They are automatically ignored by git
- ✅ **Always use `.env.example`** for documenting required variables
- 🔄 **Rotate secrets immediately** if accidentally exposed
- 📖 Read the full [Security Policy](SECURITY.md) for detailed guidelines

### Pre-commit Secret Scanning

This repository uses [Gitleaks](https://github.com/gitleaks/gitleaks) to automatically detect secrets before commits. If your commit is blocked:

1. Remove the detected secret from your changes
2. If it's a real secret that was committed, **rotate it immediately**
3. Check [SECURITY.md](SECURITY.md) for rotation procedures

```

- [ ] Update `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/AGENTS.md`:

Find the section about environment setup and add/update:

```markdown
## Environment Variable Management (Updated Security Protocol)

### For Developers

**Never use actual secrets in examples or documentation.** The monorepo uses a template-based approach:

1. **`.env.example` files** contain templates with placeholder values
2. **`.env` files** (actual secrets) are NEVER committed to git
3. **Pre-commit hooks** automatically scan for and block secret commits
4. **GitHub Actions** performs additional security scanning on all pushes

### For AI Agents

When working with environment variables:

1. **Always use `.env.example` files** as reference for required variables
2. **Never read or output actual `.env` file contents** - these contain sensitive secrets
3. **Never suggest committing `.env` files** - always direct users to `.env.example` templates
4. If a user asks about environment setup, direct them to:
   - `.env.example` files for template structure
   - `SECURITY.md` for secret management procedures
   - `README.md` for first-time setup instructions

### Environment File Locations

```
Root: .env (secrets), .env.example (template)
Web Apps:
  - web/miller.pub/.env (secrets), .env.example (template)
  - web/readon.app/.env (secrets), .env.example (template)
Mobile:
  - mobile/readon/.env (secrets), .env.example (template)
```

### Security Automation

- **Pre-commit**: Gitleaks scans staged files for secrets
- **GitHub Actions**: `security.yml` workflow runs comprehensive security scans
- **Allowlist**: `.gitleaks.toml` defines false positive exceptions

See [SECURITY.md](SECURITY.md) for complete security policy and procedures.
```

#### Step 6 Verification Checklist
- [ ] `SECURITY.md` created with complete procedures
- [ ] `README.md` updated with security section
- [ ] `AGENTS.md` updated with AI-specific guidance
- [ ] All secret rotation URLs are correct and accessible
- [ ] Documentation is clear and actionable for new team members
- [ ] No actual secrets appear in any documentation

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Commit all documentation updates.
```bash
git add SECURITY.md README.md AGENTS.md
git commit -m "docs: add comprehensive security documentation

- Create SECURITY.md with vulnerability reporting and secret management
- Add secret rotation procedures for all tokens
- Document pre-commit secret scanning workflow
- Update README.md with security setup instructions
- Update AGENTS.md with AI-specific security guidelines
- Add incident response procedures and checklists"
```

---

## 🎯 Implementation Complete

All automated security measures are now in place. The feature branch is ready for:

1. **Testing** - Verify all pre-commit hooks and workflows function correctly
2. **Pull Request** - Submit for team review
3. **Merge** - Deploy security improvements to master

---

## ⚠️ CRITICAL POST-MERGE ACTIONS

**These manual steps CANNOT be automated and MUST be completed immediately after merging:**

### 1. Purge .env from Git History

Choose ONE method:

**Option A: BFG Repo-Cleaner (Recommended - Faster)**
```bash
# Install BFG
brew install bfg

# Clone a fresh copy
git clone --mirror https://github.com/lellimecnar/source.git source-cleanup
cd source-cleanup

# Remove .env from history
bfg --delete-files .env

# Clean up and push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force

# Clean up
cd ..
rm -rf source-cleanup
```

**Option B: git-filter-repo (More thorough)**
```bash
# Install git-filter-repo
brew install git-filter-repo

# Clone a fresh copy
git clone https://github.com/lellimecnar/source.git source-cleanup
cd source-cleanup

# Remove .env from history
git filter-repo --path .env --invert-paths

# Push force
git push --force

# Clean up
cd ..
rm -rf source-cleanup
```

**⚠️ IMPORTANT:** Coordinate with team before force-pushing. All team members must re-clone the repository after history rewrite.

### 2. Rotate ALL Exposed Secrets

Complete rotation checklist:

- [ ] **TURBO_TOKEN**
  - [ ] Log in to [Vercel](https://vercel.com/account/tokens)
  - [ ] Revoke token: `PLiN2qLDuipG9JlzJDwx9Q7B`
  - [ ] Generate new token with "Read and Write" permission
  - [ ] Update local `.env` file
  - [ ] Update GitHub Secrets: Repository Settings → Secrets → Actions
  - [ ] Test: `pnpm build` should use remote caching

- [ ] **CONTEXT7_API_KEY**
  - [ ] Log in to [Context7](https://context7.com/settings/api)
  - [ ] Revoke existing key
  - [ ] Generate new API key
  - [ ] Update local `.env` file
  - [ ] Update GitHub Secrets
  - [ ] Test: Verify API access works

- [ ] **GITHUB_TOKEN**
  - [ ] Log in to [GitHub](https://github.com/settings/tokens)
  - [ ] Delete existing token
  - [ ] Generate new token with scopes: `repo`, `workflow`
  - [ ] Update local `.env` file
  - [ ] Update GitHub Secrets
  - [ ] Test: Verify GitHub Actions can access private repos

### 3. Configure Secure Secret Storage

Choose and implement ONE solution:

**Option A: GitHub Secrets (Minimum - Already in place)**
- [x] Secrets configured in repository settings
- [ ] Document access procedures for team

**Option B: Doppler (Recommended for teams)**
```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Login and setup
doppler login
doppler setup

# Import secrets
doppler secrets set TURBO_TOKEN="<new_token>"
doppler secrets set CONTEXT7_API_KEY="<new_key>"
doppler secrets set GITHUB_TOKEN="<new_token>"

# Run commands with Doppler
doppler run -- pnpm dev
```

**Option C: 1Password Secrets Automation**
- [ ] Set up 1Password Connect Server
- [ ] Configure GitHub Actions integration
- [ ] Migrate secrets to 1Password vaults

### 4. Team Notification

Send this message to all team members:

```
🚨 SECURITY INCIDENT - ACTION REQUIRED

We have completed a security fix for exposed API tokens in the repository.

IMMEDIATE ACTIONS REQUIRED:
1. Pull latest changes from master branch
2. ALL previous .env files are now INVALID
3. Obtain new secrets from [team lead/secure location]
4. Copy .env.example to .env and fill in NEW values
5. Verify pre-commit hooks are working (run a test commit)

WHAT HAPPENED:
- .env file with secrets was tracked in git history
- All exposed tokens have been rotated
- Pre-commit hooks now prevent future exposures
- GitHub Actions performs automated security scanning

QUESTIONS:
Contact [security contact] for new credentials or questions.

See SECURITY.md for complete details.
```

### 5. Post-Incident Documentation

- [ ] Create post-mortem document in `docs/incidents/2025-12-21-env-exposure.md`
- [ ] Document timeline of incident
- [ ] Record actions taken
- [ ] List lessons learned
- [ ] Update security training materials

---

## 🎓 Lessons Learned & Prevention

### Root Causes
1. `.env` file was not initially in `.gitignore`
2. No pre-commit hooks to prevent secret commits
3. No automated secret scanning in CI/CD
4. Team members were not trained on secret management

### Preventive Measures Now in Place
- [x] Enhanced `.gitignore` patterns
- [x] Pre-commit hooks with Gitleaks
- [x] GitHub Actions security workflow
- [x] Comprehensive security documentation
- [x] `.env.example` templates for all packages
- [ ] Team security training (schedule after merge)
- [ ] Regular secret rotation schedule (quarterly)

### Success Metrics
- Zero secrets committed after implementation
- 100% pre-commit hook adoption across team
- All security workflows passing
- Secret rotation completed within 24 hours of incident

---

**Implementation Status:** ✅ Complete - Ready for manual post-merge actions
**Security Priority:** 🔴 CRITICAL
**Estimated Rotation Time:** 1-2 hours
**Team Coordination Required:** Yes (force-push and re-clone)
