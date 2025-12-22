# Dependency Update Automation

**Branch:** `chore/dependency-automation`
**Description:** Set up automated dependency updates using Renovate Bot with intelligent grouping and scheduling

## Goal

Automate dependency updates to reduce maintenance burden, improve security posture, and keep dependencies current with intelligent grouping, automated testing, and selective auto-merge capabilities.

## Implementation Steps

### Step 1: Create Renovate Configuration

**Files:** `renovate.json`
**What:** Create Renovate configuration with recommended extends, package grouping (React, Next.js, Expo, Testing, ESLint), range strategy, and vulnerability alerts enabled.
**Testing:** Install Renovate GitHub App; verify initial onboarding PR is created with all detected dependencies

### Step 2: Configure Package Groups

**Files:** `renovate.json` (packageRules section)
**What:** Define intelligent package groups: React ecosystem, Next.js, Expo, TypeScript, Testing (Jest), Build tools (Turbo, ESLint, Prettier), DevDependencies.
**Testing:** Review first batch of Renovate PRs; verify dependencies are grouped logically (e.g., all React packages in one PR)

### Step 3: Set Update Schedules

**Files:** `renovate.json` (schedule configuration)
**What:** Configure update schedules: security updates (immediate), major versions (weekly, manual review required), minor/patch (weekly, can auto-merge if tests pass).
**Testing:** Wait for scheduled time; verify PRs are created according to schedule; check that security updates aren't delayed

### Step 4: Configure Auto-merge Rules

**Files:** `renovate.json` (automerge rules), `.github/workflows/auto-merge.yml` (optional)
**What:** Enable auto-merge for patch updates in devDependencies and specific trusted packages (prettier, eslint plugins) if all CI checks pass; require manual review for everything else.
**Testing:** Wait for patch update PR; verify it auto-merges after CI passes; verify major updates don't auto-merge

### Step 5: Add Dependency Dashboard

**Files:** `renovate.json` (enable dependencyDashboard)
**What:** Enable Renovate's dependency dashboard issue that provides overview of all pending updates, allowing manual triggering and visibility into update status.
**Testing:** Check Issues tab; verify "Dependency Dashboard" issue exists with list of all pending updates

### Step 6: Configure PR Templates for Dependency Updates

**Files:** `renovate.json` (prBodyTemplate configuration)
**What:** Customize PR descriptions to include changelog links, compatibility notes, migration guides, and testing instructions specific to the dependency.
**Testing:** Review generated dependency PRs; verify descriptions are informative and include relevant links

### Step 7: Set Up Dependency Review Action

**Files:** `.github/workflows/dependency-review.yml`
**What:** Add GitHub Dependency Review Action that scans PRs for vulnerable dependencies and license compliance issues before merging.
**Testing:** Create test PR with dependency change; verify workflow runs and reports on security/license status

### Step 8: Document Dependency Update Process

**Files:** `docs/DEPENDENCY_MANAGEMENT.md`, `CONTRIBUTING.md` (update)
**What:** Document how Renovate works, how to handle breaking changes, how to manually trigger updates, and how to add/remove package groups.
**Testing:** Review documentation with team; ensure process is clear for all contributors

## Renovate Configuration Structure

```json
{
	"extends": ["config:recommended", ":preserveSemverRanges"],
	"rangeStrategy": "bump",
	"schedule": ["after 10pm every weekday", "before 5am every weekday"],
	"timezone": "America/Los_Angeles",
	"packageRules": [
		{
			"groupName": "React ecosystem",
			"matchPackagePatterns": ["^react", "^@types/react"],
			"schedule": ["every weekend"]
		},
		{
			"groupName": "Next.js",
			"matchPackageNames": ["next", "@next/*"],
			"schedule": ["every weekend"]
		},
		{
			"groupName": "Expo",
			"matchPackagePatterns": ["^expo", "^@expo/"],
			"schedule": ["every weekend"]
		},
		{
			"matchDepTypes": ["devDependencies"],
			"matchUpdateTypes": ["patch"],
			"automerge": true,
			"automergeType": "pr",
			"automergeStrategy": "squash"
		}
	],
	"vulnerabilityAlerts": {
		"labels": ["security"],
		"enabled": true
	}
}
```

## Auto-merge Criteria

**Safe to Auto-merge:**

- ✅ Patch updates to devDependencies
- ✅ Minor updates to devDependencies with high confidence
- ✅ Updates to tooling (Prettier, ESLint configs)
- ✅ Updates that pass ALL CI checks

**Requires Manual Review:**

- ⛔ Major version updates (any package)
- ⛔ Updates to production dependencies
- ⛔ Updates with breaking changes
- ⛔ Updates that fail CI checks

## Expected Benefits

**Time Savings:**

- Reduce manual dependency update effort by 70-80%
- Automated testing of updates reduces QA time
- Grouped updates reduce PR review overhead

**Security:**

- Faster response to vulnerability disclosures
- Automated security scanning of updates
- Dependency dashboard provides visibility

**Code Quality:**

- Stay current with ecosystem improvements
- Reduce technical debt from outdated dependencies
- Access to latest features and performance improvements

## Notes

- Start conservative with auto-merge, expand over time
- Monitor auto-merged PRs for unexpected issues
- Consider staging deployments before production auto-merge
- Review Renovate logs regularly for configuration improvements
- Adjust grouping and schedules based on team workflow
