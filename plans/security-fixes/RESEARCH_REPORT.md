# Security Fixes Implementation - Comprehensive Research Report

**Date:** December 21, 2024  
**Project:** @lellimecnar/source  
**Purpose:** Implementation research for security fixes (secret scanning, git ignore, environment templates, Husky hooks)

---

## 1. PROJECT STRUCTURE ANALYSIS

### 1.1 Root Package Configuration

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/package.json`

```json
{
	"name": "@lellimecnar/source",
	"private": true,
	"packageManager": "pnpm@9.12.2",
	"engines": {
		"node": "^20",
		"pnpm": "^9"
	},
	"scripts": {
		"miller.pub": "pnpm --filter miller.pub",
		"readon": "pnpm --filter readon",
		"readon.app": "pnpm --filter readon.app",
		"build": "turbo build",
		"dev": "turbo dev",
		"lint": "turbo lint",
		"test": "turbo test",
		"test:watch": "turbo test:watch",
		"type-check": "turbo type-check",
		"clean": "turbo clean; git clean -xdf node_modules .turbo .next .expo",
		"format": "turbo lint -- --fix --fix-type=directive,problem,suggestion,layout",
		"ui": "pnpm --filter @lellimecnar/ui"
	}
}
```

**Key Observations:**

- ✅ Enforces pnpm@9.12.2 via `packageManager` field
- ✅ Enforces Node.js ^20 via engines
- ✅ All scripts use turbo or pnpm --filter pattern
- ⚠️ **NO husky or lint-staged dependencies** (needs installation)
- ⚠️ **NO pre-commit or security-related scripts** (needs addition)

### 1.2 Turborepo Configuration

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/turbo.json`

```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": ["$TURBO_DEFAULT$", ".env*"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"]
		},
		"test": {
			"outputs": ["coverage/**"],
			"dependsOn": []
		},
		"lint": {
			"dependsOn": ["^build"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		}
	}
}
```

**Key Observations:**

- ✅ Build task already includes `.env*` in inputs (aware of environment files)
- ℹ️ No security-related tasks defined yet

### 1.3 Workspace Configuration

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/pnpm-workspace.yaml`

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'card-stack/*'
```

**Workspace Packages Identified:**

- `web/miller.pub` - Next.js personal site
- `web/readon.app` - Next.js reading app
- `mobile/readon` - Expo React Native app
- `packages/ui` - Web UI library (shadcn/ui + Tailwind)
- `packages/ui-nativewind` - Mobile UI library (NativeWind)
- `packages/utils` - Shared utilities
- `packages/config-*` - Shared configs (eslint, jest, prettier, tailwind, typescript, babel)
- `card-stack/core` - Card game engine core
- `card-stack/deck-standard` - Standard deck implementation

---

## 2. CURRENT GIT IGNORE STATE

### 2.1 Root .gitignore

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.gitignore`

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next/
out/
build
.swc/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# turbo
.turbo

# ui
dist/
```

**Analysis:**

- ✅ `.env` is listed but **FILE CURRENTLY EXISTS AND IS TRACKED** (major issue!)
- ✅ Ignores `.env.local`, `.env.*.local` patterns
- ✅ Covers Next.js, Turbo, and build artifacts
- ⚠️ **MISSING:** Husky hooks directory (`.husky/_/`)
- ⚠️ **MISSING:** Common secret patterns (`.envrc`, `.env.development`, `.env.production`)
- ⚠️ **MISSING:** Editor-specific files (.idea, .vscode - though .vscode exists)

### 2.2 Web App .gitignore Files

**Files:**

- `web/miller.pub/.gitignore`
- `web/readon.app/.gitignore`

Both files are **IDENTICAL** with Next.js defaults:

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel
```

**Analysis:**

- ⚠️ **CRITICAL:** Does NOT ignore `.env` (only `.env.local` and `.env.*.local`)
- ⚠️ **MISSING:** `.env.development`, `.env.production` patterns
- ℹ️ Uses relative paths (`/node_modules` vs `node_modules`) - Next.js convention

### 2.3 Mobile App .gitignore

**File:** `mobile/readon/.gitignore`

```gitignore
# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo
```

**Analysis:**

- ⚠️ **CRITICAL:** Only ignores `.env*.local` pattern, NOT `.env` itself
- ✅ Good coverage of Expo-specific artifacts
- ✅ Ignores native certificate files (`.jks`, `.p8`, `.p12`, `.mobileprovision`)
- ⚠️ **MISSING:** `.env`, `.env.development`, `.env.production` patterns

---

## 3. EXISTING ENVIRONMENT FILES

### 3.1 Exposed .env File (CRITICAL SECURITY ISSUE)

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.env`

**Current Content:**

```dotenv
TURBO_TOKEN="PLiN2qLDuipG9JlzJDwx9Q7B"
```

**Status:**

- ❌ **ACTIVELY TRACKED IN GIT** despite being in `.gitignore`
- ❌ Contains exposed Turbo token (must be rotated immediately)
- ❌ This token is now considered compromised

**Additional Notes from Plan:**

- Plan mentions other exposed tokens: `CONTEXT7_API_KEY`, `GITHUB_TOKEN`
- These may have been removed or in git history

### 3.2 No .env.example Files Found

**Searched patterns:** `**/.env*`

**Results:**

- ✅ No `.env.example` files exist (good baseline - we'll create them)
- ✅ No `.env.development`, `.env.production`, etc. files found
- ⚠️ Only the compromised `.env` file exists at root

---

## 4. HUSKY & GIT HOOKS RESEARCH

### 4.1 Current State

**Searched for:**

- `.husky/` directory: **NOT FOUND**
- `husky` in package.json dependencies: **NOT FOUND**
- Existing git hooks: **NONE CONFIGURED**

**Conclusion:** Fresh installation required.

### 4.2 Latest Stable Versions (December 2024)

```json
{
	"devDependencies": {
		"husky": "^9.1.7",
		"lint-staged": "^15.2.11"
	}
}
```

**Installation Commands for pnpm:**

```bash
# Install dependencies
pnpm add -Dw husky lint-staged

# Initialize husky (creates .husky/ directory)
pnpm exec husky init

# This creates:
# - .husky/ directory
# - .husky/pre-commit hook (sample)
# - Adds "prepare": "husky" script to package.json
```

### 4.3 Husky 9.x Modern Pattern

Husky 9 uses a simplified approach:

**Script in package.json:**

```json
{
	"scripts": {
		"prepare": "husky"
	}
}
```

**Pre-commit hook file:** `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Run secret scanning (gitleaks)
pnpm exec gitleaks protect --staged --verbose
```

**Note:** The `_/husky.sh` helper is auto-created by husky and should be gitignored.

---

## 5. SECRET SCANNING TOOL RESEARCH

### 5.1 Tool Comparison: Gitleaks vs TruffleHog

| Feature                | Gitleaks              | TruffleHog    |
| ---------------------- | --------------------- | ------------- |
| **Language**           | Go (single binary)    | Python        |
| **Speed**              | Very fast             | Moderate      |
| **Installation**       | Homebrew, binary, npm | pip, binary   |
| **Pre-commit Support** | ✅ Excellent          | ✅ Good       |
| **Custom Rules**       | ✅ TOML config        | ✅ Regexes    |
| **False Positives**    | Low-moderate          | Moderate-high |
| **Active Development** | ✅ Very active        | ✅ Active     |
| **GitHub Stars**       | ~18k                  | ~16k          |

**Recommendation:** **Gitleaks** (preferred for this project)

**Reasons:**

- Single Go binary (easier installation, no Python dependency)
- Better performance for large repos
- Excellent pnpm/npm integration
- Active community and frequent updates
- Mature pre-commit scanning

### 5.2 Gitleaks Installation

**Method 1: NPM Package (Recommended for pnpm monorepo)**

```bash
pnpm add -Dw gitleaks
```

This installs the gitleaks binary wrapper as a dev dependency.

**Method 2: System-wide (macOS with Homebrew)**

```bash
brew install gitleaks
```

**Version:** Latest stable is `v8.21.2` (December 2024)

### 5.3 Gitleaks Pre-commit Usage

**Command to scan staged files:**

```bash
gitleaks protect --staged --verbose
```

**Options:**

- `--staged`: Only scan staged files (fast for pre-commit)
- `--verbose`: Show detailed output
- `-v`: Show version
- `--no-git`: Scan directory without git
- `--config`: Use custom config file

**Exit codes:**

- `0`: No leaks found
- `1`: Leaks found (blocks commit)

### 5.4 Gitleaks Configuration (Optional)

**File:** `.gitleaks.toml` (root)

```toml
title = "@lellimecnar/source secret scanning config"

[extend]
# Use default gitleaks rules
useDefault = true

[allowlist]
description = "Allowlist for false positives"
regexes = [
  # Allow example/placeholder tokens
  '''TURBO_TOKEN=["']your-turbo-token-here["']''',
  '''GITHUB_TOKEN=["']ghp_your_token_here["']''',
  '''API_KEY=["']your-api-key-here["']'''
]
paths = [
  # Ignore example files
  '''\.env\.example$''',
  '''\.env\.template$''',
  # Ignore test fixtures
  '''.*/tests?/fixtures?/.*'''
]
```

---

## 6. GITHUB ACTIONS SETUP

### 6.1 Current State

**Directory:** `.github/` exists but contains only:

- `copilot-instructions.md`

**Workflows directory:** `.github/workflows/` **DOES NOT EXIST**

**Conclusion:** No existing CI/CD workflows. Fresh setup required.

### 6.2 GitHub Actions Workflow Structure

**File:** `.github/workflows/security.yml`

```yaml
name: Security Scanning

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]
  schedule:
    # Run weekly on Mondays at 2am UTC
    - cron: '0 2 * * 1'

jobs:
  secret-scan:
    name: Scan for Exposed Secrets
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for comprehensive scan

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }} # Optional: for Gitleaks Pro
```

**Alternative: Using gitleaks Docker image directly**

```yaml
- name: Run Gitleaks
  run: |
    docker run -v ${PWD}:/path ghcr.io/gitleaks/gitleaks:latest detect --source="/path" --verbose
```

### 6.3 Additional Recommended Workflows

**Dependency Scanning:**

```yaml
name: Dependency Check

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 2 * * 1'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.12.2
      - name: Run pnpm audit
        run: pnpm audit --audit-level=moderate
```

---

## 7. DOCUMENTATION FILES

### 7.1 SECURITY.md Status

**File:** `SECURITY.md`

**Status:** **DOES NOT EXIST** (needs creation)

**Location:** Root directory (`/SECURITY.md`)

### 7.2 README.md Structure

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/README.md`

**Current Structure:**

```markdown
# @lellimecnar/source

## 🚀 Technology Stack

## 🏗️ Project Architecture

## 🏁 Getting Started

### Prerequisites

### Installation

### Development

### Build

## 📂 Project Structure

## ✨ Key Features

## 🔄 Development Workflow

### Workspace Management

### UI Component Development

## 📏 Coding Standards

## 🧪 Testing
```

**Observations:**

- ✅ Well-structured with emojis
- ✅ Clear Getting Started section
- ⚠️ **NO security section** (needs addition)
- ⚠️ **NO environment variable documentation** (needs addition)

### 7.3 AGENTS.md Structure

**File:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/AGENTS.md`

**Current Structure:**

```markdown
# AGENTS.md - Developer Guide & AI Instructions

## 1. Project Overview

## 2. Monorepo Structure

## 3. Tech Stack Summary

## 4. Setup & Installation

## 5. Development Commands

## 6. Architecture & Patterns

## 7. Testing Strategy

## 8. Pull Request Guidelines
```

**Observations:**

- ✅ Comprehensive developer guide
- ✅ Aimed at AI agents and developers
- ⚠️ **NO security/secret management section** (needs addition under section 4 or 9)

---

## 8. CODE PATTERNS

### 8.1 Package.json Script Patterns

**Consistent patterns across the monorepo:**

```json
{
  "scripts": {
    "dev": "next dev" | "expo start" | "tailwindcss --watch",
    "build": "next build" | "tailwindcss",
    "start": "next start" | "expo start",
    "lint": "eslint .",
    "test": "jest" | "jest --watchAll",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  }
}
```

**Observations:**

- ✅ Consistent naming (`dev`, `build`, `lint`, `test`, `type-check`)
- ✅ All test scripts use Jest
- ✅ TypeScript checking via `tsc --noEmit`
- ℹ️ No pre-commit or security scripts yet

### 8.2 ESLint Configuration Pattern

**Root:** `.eslintrc.js`

```javascript
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	ignorePatterns: [
		'./apps/**',
		'./mobile/**',
		'./web/**',
		'./packages/**',
		'**/dist/**',
		'**/build/**',
		'**/node_modules/**',
	],
};
```

**Pattern:** Extends shared configs from `@lellimecnar/eslint-config` package

### 8.3 Prettier Configuration Pattern

**Root:** `.prettierrc.js`

```javascript
const baseConfig = require('@lellimecnar/prettier-config');

module.exports = {
	...baseConfig,
};
```

**Pattern:** Imports and extends shared preset

### 8.4 Environment Variable Usage

**Search Results:**

- ✅ No `process.env.*` or `import.meta.env.*` usage in source files
- ℹ️ Only found in node_modules (expected)
- ℹ️ Turbo uses `.env` files (configured in turbo.json)

**Conclusion:** Clean baseline - no hardcoded secrets in code

---

## 9. IMPLEMENTATION RECOMMENDATIONS

### 9.1 Git Ignore Enhancements

**Files to modify:**

1. Root `.gitignore`
2. `web/miller.pub/.gitignore`
3. `web/readon.app/.gitignore`
4. `mobile/readon/.gitignore`

**Patterns to add:**

```gitignore
# Environment variables (comprehensive)
.env
.env.*
!.env.example
!.env.template
.envrc

# Husky
.husky/_

# Gitleaks
.gitleaks.toml.baseline

# Security scanning results
gitleaks-report.json
trufflehog-report.json
```

### 9.2 Environment Template Structure

**File:** `.env.example`

```bash
################################################################################
# @lellimecnar/source - Environment Variables Template
################################################################################
#
# SECURITY NOTICE:
# - NEVER commit .env files with real values to version control
# - Copy this file to .env and fill in your values
# - Rotate all secrets if accidentally exposed
#
################################################################################

# Turborepo Remote Caching Token
# Get yours at: https://vercel.com/account/tokens
TURBO_TOKEN="your-turbo-token-here"

# Context7 API Key (if using documentation features)
# Get yours at: https://context7.com/settings/api
CONTEXT7_API_KEY="your-context7-api-key-here"

# GitHub Personal Access Token (for CI/CD)
# Create at: https://github.com/settings/tokens
# Scopes needed: repo, workflow
GITHUB_TOKEN="ghp_your_github_token_here"
```

### 9.3 Package.json Scripts to Add

```json
{
	"scripts": {
		"prepare": "husky",
		"security:scan": "gitleaks detect --verbose",
		"security:scan:staged": "gitleaks protect --staged --verbose"
	}
}
```

### 9.4 Lint-staged Configuration

**File:** `.lintstagedrc.js` (or in package.json)

```javascript
module.exports = {
	'*.{js,jsx,ts,tsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],
	'*.{json,md,yml,yaml}': ['prettier --write'],
};
```

Or in `package.json`:

```json
{
	"lint-staged": {
		"*.{js,jsx,ts,tsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
		"*.{json,md,yml,yaml}": ["prettier --write"]
	}
}
```

---

## 10. SECURITY.md Template

**File:** `/SECURITY.md`

```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing [SECURITY_EMAIL]. Please do NOT create a public GitHub issue.

Include the following in your report:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and aim to patch critical vulnerabilities within 7 days.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Measures

This project implements the following security practices:

### Secret Management

- All sensitive environment variables must be stored in `.env` files (gitignored)
- `.env.example` templates provided with placeholder values
- Pre-commit hooks scan for accidentally committed secrets
- GitHub Actions scan all pushes for exposed secrets

### Automated Scanning

- **Pre-commit:** Gitleaks scans staged files before each commit
- **CI/CD:** GitHub Actions runs security scans on all branches
- **Schedule:** Weekly full repository scans

### Environment Variables

Required secrets (NEVER commit these):

- `TURBO_TOKEN` - Vercel Turborepo remote caching token
- `CONTEXT7_API_KEY` - Context7 documentation API key
- `GITHUB_TOKEN` - GitHub personal access token

Obtain these from:

- Turbo: https://vercel.com/account/tokens
- Context7: https://context7.com/settings/api
- GitHub: https://github.com/settings/tokens

### Best Practices

1. Never commit `.env` files
2. Use `.env.example` for documentation
3. Rotate secrets immediately if exposed
4. Use GitHub Secrets for CI/CD credentials
5. Enable branch protection rules

## Incident Response

If secrets are accidentally committed:

1. **STOP** - Do not push to remote
2. Rotate ALL exposed credentials immediately
3. Run `git reset HEAD~1` to undo commit (if not pushed)
4. If already pushed:
   - Force push after rotating secrets: `git push --force`
   - Consider using BFG Repo-Cleaner to purge history
   - Notify team members

## Dependency Security

This project uses:

- `pnpm audit` for vulnerability scanning
- Dependabot for automated updates
- Regular dependency reviews

Run `pnpm audit` before releases.

## Contact

For security concerns, contact: [SECURITY_EMAIL]
```

---

## 11. WARNINGS AND CRITICAL NOTES

### 11.1 Current Critical Issues

1. ❌ **`.env` file is tracked in git despite being in .gitignore**
   - This happens when a file was committed BEFORE being added to .gitignore
   - Must use `git rm --cached .env` to stop tracking

2. ❌ **Exposed TURBO_TOKEN in git history**
   - Token: `PLiN2qLDuipG9JlzJDwx9Q7B`
   - **MUST BE ROTATED IMMEDIATELY**
   - History must be purged (BFG or git-filter-repo)

3. ⚠️ **Incomplete .gitignore patterns in workspace packages**
   - Web apps don't ignore `.env` (only `.env.local`)
   - Mobile app doesn't ignore `.env` (only `.env*.local`)

4. ⚠️ **No pre-commit hooks or secret scanning**
   - Easy to accidentally commit secrets again
   - No safety net until hooks are installed

### 11.2 Existing Patterns to Preserve

✅ **Preserve these patterns:**

1. **Script naming:** Keep `dev`, `build`, `lint`, `test`, `type-check` standard
2. **pnpm workspace protocol:** Continue using `workspace:*` for dependencies
3. **Shared configs:** Maintain pattern of extending from `@lellimecnar/config-*` packages
4. **Monorepo structure:** Don't modify workspace boundaries
5. **Documentation style:** Emojis in headings, clear sections
6. **ESLint/Prettier patterns:** Extend shared configs, don't duplicate rules

---

## 12. RECOMMENDED IMPLEMENTATION ORDER

Based on this research, follow this sequence:

1. **IMMEDIATE (Do first):**
   - [ ] Rotate TURBO_TOKEN at Vercel
   - [ ] Stop tracking `.env` with `git rm --cached .env`
   - [ ] Update all .gitignore files

2. **HIGH PRIORITY (Same session):**
   - [ ] Install Husky and Gitleaks: `pnpm add -Dw husky gitleaks`
   - [ ] Initialize Husky: `pnpm exec husky init`
   - [ ] Create pre-commit hook with secret scanning
   - [ ] Create `.env.example` files in all workspaces

3. **MEDIUM PRIORITY (Same day):**
   - [ ] Create `.github/workflows/security.yml`
   - [ ] Create `SECURITY.md` documentation
   - [ ] Update `README.md` with security section
   - [ ] Update `AGENTS.md` with environment workflow

4. **POST-IMPLEMENTATION (After merge):**
   - [ ] Purge git history with BFG Repo-Cleaner
   - [ ] Force push to remote
   - [ ] Notify team of new workflow
   - [ ] Add secrets to GitHub Secrets

---

## 13. INSTALLATION COMMANDS REFERENCE

### 13.1 Install Dependencies

```bash
# Install Husky, lint-staged, and Gitleaks
pnpm add -Dw husky lint-staged gitleaks

# Initialize Husky (creates .husky/ directory and prepare script)
pnpm exec husky init
```

### 13.2 Create Pre-commit Hook

```bash
# Create pre-commit hook file
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run lint-staged (format and lint)
npx lint-staged

# Run secret scanning
echo "🔐 Scanning for secrets..."
pnpm exec gitleaks protect --staged --verbose

echo "✅ Pre-commit checks passed!"
EOF

# Make executable
chmod +x .husky/pre-commit
```

### 13.3 Test Husky Hook

```bash
# Create a test file with a fake secret
echo 'const token = "AKIAIOSFODNN7EXAMPLE"' > test-secret.js

# Try to commit (should be blocked)
git add test-secret.js
git commit -m "Test secret detection"

# Clean up
git reset HEAD test-secret.js
rm test-secret.js
```

### 13.4 Stop Tracking .env

```bash
# Remove from git tracking (keeps local file)
git rm --cached .env

# Verify it's no longer tracked
git status

# Commit the removal
git commit -m "security: stop tracking .env file [requires token rotation]"
```

---

## 14. FILES TO CREATE

### 14.1 New Files Required

1. **Root Directory:**
   - `.env.example` - Environment template
   - `.lintstagedrc.js` - Lint-staged config
   - `SECURITY.md` - Security policy
   - `.husky/pre-commit` - Pre-commit hook
   - `.husky/_/.gitignore` - Ignore Husky internals

2. **GitHub Directory:**
   - `.github/workflows/security.yml` - Security scanning workflow
   - `.github/workflows/dependency-check.yml` - (Optional) Dependency audit

3. **Workspace Directories:**
   - `web/miller.pub/.env.example`
   - `web/readon.app/.env.example`
   - `mobile/readon/.env.example`

### 14.2 Files to Modify

1. **Root Directory:**
   - `.gitignore` - Add comprehensive env patterns, Husky, Gitleaks
   - `package.json` - Add prepare script, security scripts, new devDependencies
   - `README.md` - Add security section
   - `AGENTS.md` - Add environment workflow section

2. **Workspace Directories:**
   - `web/miller.pub/.gitignore` - Add `.env` pattern
   - `web/readon.app/.gitignore` - Add `.env` pattern
   - `mobile/readon/.gitignore` - Add `.env` pattern (update from `.env*.local`)

### 14.3 Files to Remove from Git Tracking

1. `.env` - Stop tracking (use `git rm --cached .env`)

---

## 15. TESTING CHECKLIST

After implementation, verify:

### 15.1 Git Ignore Tests

- [ ] Create `.env` file in root → Not tracked by git
- [ ] Create `.env` in web/miller.pub → Not tracked
- [ ] Create `.env` in web/readon.app → Not tracked
- [ ] Create `.env` in mobile/readon → Not tracked
- [ ] `.env.example` files ARE tracked

### 15.2 Husky Hook Tests

- [ ] Create file with fake AWS key pattern → Commit blocked
- [ ] Create file with fake GitHub token → Commit blocked
- [ ] Create normal code file → Commit succeeds
- [ ] Bypass with `--no-verify` → Commit succeeds (expected)

### 15.3 Environment Template Tests

- [ ] `.env.example` has all required variables
- [ ] `.env.example` has NO real secrets
- [ ] `.env.example` has security warning
- [ ] `.env.example` has instructions

### 15.4 GitHub Actions Tests

- [ ] Push to feature branch → Workflow runs
- [ ] Add file with fake secret → Workflow fails
- [ ] Normal push → Workflow succeeds

---

## 16. RELEVANT EXTERNAL DOCUMENTATION

### 16.1 Official Documentation

- **Husky 9:** https://typicode.github.io/husky/
- **Gitleaks:** https://github.com/gitleaks/gitleaks
- **lint-staged:** https://github.com/lint-staged/lint-staged
- **pnpm:** https://pnpm.io/
- **Turborepo:** https://turbo.build/

### 16.2 Security Resources

- **GitHub Secret Scanning:** https://docs.github.com/en/code-security/secret-scanning
- **BFG Repo-Cleaner:** https://rtyley.github.io/bfg-repo-cleaner/
- **git-filter-repo:** https://github.com/newren/git-filter-repo
- **OWASP Secrets Management:** https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

## CONCLUSION

This research provides all necessary information to implement comprehensive security fixes for the `@lellimecnar/source` monorepo. The project has a clean baseline (no hardcoded secrets in code, consistent patterns) but critical gaps in secret management (exposed .env, no pre-commit scanning, incomplete .gitignore patterns).

**Priority actions:**

1. Rotate compromised TURBO_TOKEN immediately
2. Install Husky + Gitleaks with pre-commit hooks
3. Update all .gitignore files comprehensively
4. Create environment templates with security warnings
5. Add GitHub Actions security workflow
6. Document security practices in SECURITY.md

**Timeline estimate:**

- Immediate actions: 30 minutes
- Implementation: 2-3 hours
- Testing and documentation: 1-2 hours
- Git history cleanup: 1 hour (coordinate with team)

---

**Report Generated:** December 21, 2024  
**Next Step:** Begin implementation following `PLAN.md` with this research as reference
