# Dependency Management

This document provides comprehensive guidance on managing dependencies in the @lellimecnar/source monorepo.

## Table of Contents

- [Overview](#overview)
- [Renovate Bot Configuration](#renovate-bot-configuration)
- [Update Groups](#update-groups)
- [Scheduling](#scheduling)
- [Auto-merge Rules](#auto-merge-rules)
- [Handling Different Update Types](#handling-different-update-types)
- [Monorepo-Specific Considerations](#monorepo-specific-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

### Automation Strategy

This project uses **Renovate Bot** for automated dependency updates with the following goals:

- **Reduce maintenance burden:** Automatically create PRs for updates
- **Improve security posture:** Fast response to vulnerability disclosures
- **Keep dependencies current:** Access to latest features and performance improvements
- **Intelligent grouping:** Reduce PR review overhead by grouping related updates
- **Selective auto-merge:** Safe updates merge automatically after CI passes

### Key Principles

1. **Security First:** Security updates are processed immediately
2. **Group Related Updates:** Framework ecosystems updated together
3. **Test Everything:** All updates must pass CI before merging
4. **Manual Review for Major Changes:** Major version updates always require human review
5. **Respect Version Constraints:** Honor the `overrides` field in root package.json

## Renovate Bot Configuration

### Configuration File

Renovate is configured via `.github/renovate.json` in the repository root.

### Core Settings

```json
{
	"extends": ["config:recommended", ":preserveSemverRanges"],
	"rangeStrategy": "bump",
	"schedule": ["after 10pm every weekday", "before 5am every weekday"],
	"timezone": "America/Los_Angeles",
	"dependencyDashboard": true
}
```

**Settings Explained:**

- **config:recommended:** Renovate's recommended base configuration
- **:preserveSemverRanges:** Keeps `^` and `~` prefixes when updating versions
- **rangeStrategy: bump:** Updates both range and version (e.g., `^1.0.0` → `^2.0.0`)
- **schedule:** Non-security updates run overnight on weekdays
- **timezone:** Pacific Time (America/Los_Angeles)
- **dependencyDashboard:** Creates an issue with all pending updates

### Rate Limiting

```json
{
	"prHourlyLimit": 2,
	"prConcurrentLimit": 10
}
```

- **prHourlyLimit:** Maximum 2 PRs created per hour
- **prConcurrentLimit:** Maximum 10 open PRs at once

This prevents PR spam and allows manageable review workload.

## Update Groups

Dependencies are grouped by ecosystem to reduce the number of PRs and ensure related packages update together.

### 1. React Ecosystem

**Packages:**

- react
- react-dom
- @types/react
- @types/react-dom

**Schedule:** Every weekend

**Rationale:** React and React DOM must stay in sync. Type definitions should match runtime versions.

### 2. Next.js

**Packages:**

- next
- @next/\* (all @next scoped packages)
- @next/eslint-plugin-next

**Schedule:** Every weekend

**Rationale:** Next.js plugins and tools are versioned alongside the framework.

### 3. Expo SDK

**Packages:**

- expo
- @expo/\* (all @expo scoped packages)
- react-native
- jest-expo

**Schedule:** Every weekend

**Rationale:** Expo SDK packages are tightly coupled and must be updated together. React Native version is pinned to Expo-compatible version.

**Special Setting:** `rangeStrategy: "replace"` - Replaces version constraints instead of bumping them, since Expo uses `~` for SDK packages.

### 4. TypeScript

**Packages:**

- typescript
- @types/\* (all type definitions)
- ts-jest
- ts-mixer
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser

**Schedule:** Every weekend

**Rationale:** TypeScript compiler, type definitions, and tooling should stay in sync to avoid compatibility issues.

### 5. Testing

**Packages:**

- jest
- jest-expo
- ts-jest
- @types/jest
- @faker-js/faker

**Schedule:** Every weekend

**Rationale:** Test framework and utilities should update together to ensure compatibility.

### 6. ESLint

**Packages:**

- eslint
- eslint-plugin-\* (all ESLint plugins)
- eslint-config-\* (all ESLint configs)
- @typescript-eslint/\* (TypeScript ESLint tools)

**Schedule:** Every weekend

**Rationale:** ESLint and its plugins have peer dependency relationships and should update together.

### 7. Tailwind CSS

**Packages:**

- tailwindcss
- @tailwindcss/\* (all Tailwind scoped packages)
- tailwindcss-\* (all Tailwind plugins)
- postcss
- autoprefixer
- nativewind

**Schedule:** Every weekend

**Rationale:** Tailwind CSS, PostCSS, and plugins form the styling toolchain and should update together.

### 8. Radix UI

**Packages:**

- @radix-ui/\* (all Radix UI primitives)

**Schedule:** Every weekend

**Rationale:** Radix UI primitives share common APIs and should update together.

### 9. Build Tools

**Packages:**

- turbo
- prettier

**Schedule:** Every weekend

**Rationale:** Build system and formatter are infrastructure tools that rarely have breaking changes.

## Scheduling

### Update Schedules

| Update Type              | Schedule                | Rationale                                                   |
| ------------------------ | ----------------------- | ----------------------------------------------------------- |
| **Security Updates**     | Immediate (no schedule) | Security vulnerabilities need fast response                 |
| **Non-security Updates** | Weeknights 10pm-5am PST | Off-hours to avoid disrupting development                   |
| **Grouped Updates**      | Weekends                | Larger ecosystem updates reviewed during lower-traffic time |
| **Lockfile Maintenance** | Monday 3am PST          | Weekly lockfile updates for indirect dependencies           |

### Why Off-Hours?

- **Minimize Disruption:** Developers aren't actively working
- **CI Resources Available:** CI runners have capacity
- **Time for Review:** PRs are ready for review when team arrives Monday morning

## Auto-merge Rules

### Safe to Auto-merge (✅)

#### 1. Patch Updates to devDependencies

```json
{
	"matchDepTypes": ["devDependencies"],
	"matchUpdateTypes": ["patch"],
	"automerge": true
}
```

**Example:** `prettier: 3.6.2` → `prettier: 3.6.3`

**Why Safe:**

- DevDependencies don't affect production runtime
- Patch updates only include bug fixes (no breaking changes)
- All CI checks must still pass

#### 2. Minor Updates to Trusted Tooling

```json
{
	"matchPackageNames": ["prettier", "@lellimecnar/prettier-config"],
	"matchPackagePatterns": ["^eslint-plugin-", "^@types/"],
	"matchUpdateTypes": ["minor", "patch"],
	"matchDepTypes": ["devDependencies"],
	"automerge": true
}
```

**Examples:**

- `eslint-plugin-react: 7.37.5` → `eslint-plugin-react: 7.38.0`
- `@types/node: 22.10.5` → `@types/node: 22.11.0`

**Why Safe:**

- Formatters and linters don't affect application behavior
- Type definitions are dev-time only
- High confidence in these tools' semver compliance

### Requires Manual Review (⛔)

#### 1. Major Version Updates

```json
{
	"matchUpdateTypes": ["major"],
	"automerge": false
}
```

**Example:** `react: 18.3.1` → `react: 19.0.0`

**Why Manual Review:**

- Breaking changes require code modifications
- Migration guide review needed
- Extensive testing required

#### 2. Production Dependencies

```json
{
	"matchDepTypes": ["dependencies"],
	"automerge": false
}
```

**Example:** `next: 15.2.3` → `next: 15.2.4` (even patch updates)

**Why Manual Review:**

- Runtime dependencies affect end users
- Even patch updates can introduce regressions
- Need validation in staging environment

#### 3. Failed CI Checks

If any CI check fails, auto-merge is automatically blocked regardless of other rules.

## Handling Different Update Types

### Patch Updates (x.y.Z)

**What They Include:**

- Bug fixes
- Security patches
- Performance improvements
- No breaking changes

**Action:**

- **DevDependencies:** Auto-merge after CI passes ✅
- **Dependencies:** Manual review required ⛔

**Example Workflow:**

1. Renovate creates PR
2. CI runs automatically
3. If all checks pass:
   - DevDependencies: Auto-merges
   - Dependencies: Awaits approval
4. If checks fail: Blocked until fixed

### Minor Updates (x.Y.z)

**What They Include:**

- New features
- Deprecations (with backward compatibility)
- No breaking changes

**Action:**

- **Trusted tooling (ESLint plugins, type definitions):** Auto-merge ✅
- **Everything else:** Manual review required ⛔

**Example Workflow:**

1. Renovate creates PR
2. Review release notes in PR description
3. Check for deprecation warnings
4. Approve and merge if no concerns

### Major Updates (X.y.z)

**What They Include:**

- Breaking changes
- API redesigns
- Removed features

**Action:**

- **All packages:** Manual review required ⛔

**Example Workflow:**

1. Renovate creates PR with "major-update" label
2. **Review Migration Guide:**
   - Click changelog link in PR description
   - Read BREAKING CHANGES section
   - Identify affected code
3. **Test Locally:**
   ```bash
   git fetch origin pull/XXX/head:renovate-major
   git checkout renovate-major
   pnpm install
   pnpm build
   pnpm test
   ```
4. **Apply Code Changes:**
   - Update APIs per migration guide
   - Fix breaking changes
   - Update tests
5. **Push Fixes:**
   ```bash
   git add .
   git commit -m "fix: apply migration for X.y.z"
   git push origin renovate-major
   ```
6. **Merge After CI Passes**

### Security Updates

**What They Include:**

- CVE fixes
- Security patches

**Action:**

- **Immediate processing** (no schedule delay)
- **Labeled "security"** for visibility
- **Auto-merge:** Only if patch to devDependency and CI passes

**Example Workflow:**

1. Renovate detects vulnerability
2. Creates PR immediately with "security" label
3. Team is notified via GitHub notifications
4. If safe to auto-merge: Merges automatically
5. If manual review needed: Prioritize over other work

## Monorepo-Specific Considerations

### Workspace Dependencies

**Rule:** Always use `workspace:*` protocol for internal packages.

```json
{
	"dependencies": {
		"@lellimecnar/ui": "workspace:*"
	}
}
```

**Renovate Behavior:**

- Does NOT create PRs for `workspace:*` dependencies
- These are always local packages, no updates needed

### Overrides Field

The root `package.json` has an `overrides` field that enforces specific versions across all workspaces:

```json
{
	"overrides": {
		"typescript": "~5.5",
		"react": "^18.3.1",
		"eslint": "^8.57.1"
	}
}
```

**Renovate Behavior:**

- Updates the override when updating the package
- All workspaces automatically use the overridden version

**Manual Override Updates:**

1. Update version in root `package.json` overrides
2. Update version in individual workspace `package.json` (if explicitly listed)
3. Run `pnpm install` to regenerate lockfile
4. Test thoroughly

### Turborepo Task Dependencies

Build tasks have dependencies in `turbo.json`:

```json
{
	"build": {
		"dependsOn": ["^build"]
	}
}
```

**Impact on Updates:**

- Changes to build tooling affect all workspaces
- CI builds all workspaces in dependency order
- Broken builds block the entire pipeline

**Testing Strategy:**

- Always run `pnpm build` locally after tooling updates
- Watch for cascading failures

## Troubleshooting

### Issue: Renovate PR Fails CI

**Symptoms:**

- Red X on Renovate PR
- CI checks fail (lint, test, build)

**Diagnosis:**

1. Click "Details" on failed check
2. Read error message in CI logs
3. Identify failing workspace

**Solutions:**

**Option A: Temporary Incompatibility**

- Add a comment to the PR: `@renovatebot rebase`
- Renovate will rebase and retry CI

**Option B: Breaking Change**

- Checkout the PR branch locally
- Fix the code to accommodate the breaking change
- Push fix to the PR branch
- CI will re-run

**Option C: Known Issue**

- Check package release notes for known issues
- Add a comment: `@renovatebot ignore this dependency`
- Create a tracking issue for manual update later

### Issue: Conflicting Dependency Versions

**Symptoms:**

- pnpm install fails with peer dependency conflicts
- Multiple PRs updating the same dependency

**Diagnosis:**

- Check which packages have version conflicts
- Review `overrides` field in root package.json

**Solutions:**

**Option A: Update Override**

1. Update the version in root `package.json` overrides
2. Run `pnpm install`
3. Commit and push

**Option B: Close Duplicate PRs**

- Close older PRs, keep the newest
- Renovate will rebase remaining PRs

### Issue: Lock File Out of Sync

**Symptoms:**

- CI fails with "Lock file out of sync" error
- Local install differs from CI

**Diagnosis:**

- Lock file was manually edited or is corrupted

**Solutions:**

**Regenerate Lock File:**

```bash
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: regenerate lock file"
git push
```

**Enable Lock File Maintenance:**

- Renovate has weekly lock file maintenance enabled
- It will fix this automatically on Monday mornings

### Issue: Too Many Renovate PRs

**Symptoms:**

- 20+ open Renovate PRs
- Overwhelming to review

**Diagnosis:**

- Rate limits may be too high
- Grouping may not be configured correctly

**Solutions:**

**Option A: Lower Rate Limits**
Edit `.github/renovate.json`:

```json
{
	"prHourlyLimit": 1,
	"prConcurrentLimit": 5
}
```

**Option B: Review Dependency Dashboard**

- Go to Dependency Dashboard issue
- Uncheck PRs you want to postpone
- Renovate will close them

**Option C: Merge Auto-mergeable PRs**

- Filter PRs by label "automerge"
- Review and approve quickly (CI already passed)

### Issue: Renovate Bot Stops Working

**Symptoms:**

- No new PRs from Renovate
- Dependency Dashboard is stale

**Diagnosis:**

- Configuration error in `.github/renovate.json`
- Renovate Bot needs re-authorization

**Solutions:**

**Validate Configuration:**

```bash
# Use Renovate's config validator
npx -p renovate -c renovate-config-validator .github/renovate.json
```

**Check Renovate Job Logs:**

- Go to Renovate Bot app in GitHub repository settings
- View recent job logs for errors

**Re-install Renovate:**

- Go to https://github.com/apps/renovate
- Configure repository access
- Re-authorize

### Issue: Security Update Needed Urgently

**Symptoms:**

- CVE disclosed in a dependency
- Renovate hasn't created PR yet

**Diagnosis:**

- Renovate may be in rate limit window
- Dependency may not be directly used

**Solutions:**

**Manual Update:**

```bash
# Update the vulnerable package
pnpm update <package-name> -r

# If in overrides, update there too
# Edit package.json manually

# Install and test
pnpm install
pnpm test
pnpm build

# Commit
git add .
git commit -m "security: update <package> to fix CVE-XXXX-XXXX"
git push
```

**Trigger Renovate Manually:**

- Go to Dependency Dashboard issue
- Check the box next to the vulnerable package
- Renovate will create PR immediately

## Advanced Configuration

### Customizing Update Groups

To add a new update group, edit `.github/renovate.json`:

```json
{
	"packageRules": [
		{
			"groupName": "My Custom Group",
			"matchPackageNames": ["package-a", "package-b"],
			"matchPackagePatterns": ["^@my-scope/"],
			"schedule": ["every weekend"]
		}
	]
}
```

### Excluding Packages from Updates

To prevent Renovate from updating a specific package:

```json
{
	"packageRules": [
		{
			"matchPackageNames": ["problematic-package"],
			"enabled": false
		}
	]
}
```

### Pinning a Dependency Version

To prevent updates until manually unblocked:

```json
{
	"packageRules": [
		{
			"matchPackageNames": ["stay-on-v3"],
			"allowedVersions": "^3.0.0"
		}
	]
}
```

## Best Practices

### 1. Review Dependency Dashboard Weekly

- Check for pending updates
- Manually trigger high-priority updates
- Close outdated PRs

### 2. Test Major Updates Locally

- Never merge major version updates without local testing
- Run full test suite and manual smoke tests
- Check for console warnings in dev mode

### 3. Monitor Auto-merged PRs

- Even though CI passed, bugs can slip through
- Review auto-merged PRs weekly
- Rollback if regressions are discovered

### 4. Keep Overrides Minimal

- Only use `overrides` for strict version enforcement
- Too many overrides can cause conflicts
- Prefer peer dependencies when possible

### 5. Update Lock File Weekly

- Renovate does this automatically on Mondays
- Keeps indirect dependencies current
- Reduces security vulnerabilities

### 6. Document Breaking Changes

- When fixing a major update PR, add a comment explaining changes
- Update documentation if APIs change
- Add migration notes for team members

## Additional Resources

- **Renovate Documentation:** https://docs.renovatebot.com/
- **Renovate Configuration Reference:** https://docs.renovatebot.com/configuration-options/
- **Dependency Dashboard:** Check GitHub Issues for "Dependency Dashboard"
- **CI Workflow:** `.github/workflows/ci.yml`
- **Dependency Review Workflow:** `.github/workflows/dependency-review.yml`

---

**Last Updated:** December 21, 2025  
**Maintainer:** See CONTRIBUTING.md for contact information
