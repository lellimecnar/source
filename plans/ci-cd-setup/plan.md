# CI/CD Pipeline Setup

**Branch:** `ci/github-actions-setup`
**Description:** Establish automated testing, linting, type-checking, and building via GitHub Actions

## Goal

Implement a complete CI/CD pipeline that automatically validates all pull requests and pushes to main branches, ensuring code quality and preventing regressions from reaching production.

## Implementation Steps

### Step 1: Create Main CI Workflow

**Files:** `.github/workflows/ci.yml`
**What:** Create primary CI workflow that runs on all PRs and pushes to master/develop, executing lint, type-check, test, and build tasks in parallel where possible.
**Testing:** Push to feature branch; verify workflow triggers, runs all jobs successfully, and provides clear feedback

### Step 2: Create Security Scanning Workflow

**Files:** `.github/workflows/security.yml`
**What:** Create workflow that runs dependency audit (`pnpm audit`) on schedule (weekly) and on pushes to master, alerting on medium+ severity vulnerabilities.
**Testing:** Manually trigger workflow via GitHub Actions UI; verify audit runs and reports are generated

### Step 3: Add Test Coverage Reporting

**Files:** `.github/workflows/coverage.yml`, `package.json` (add test:coverage script)
**What:** Create workflow that generates test coverage report and posts summary as PR comment; configure to require minimum coverage thresholds.
**Testing:** Create PR with test changes; verify coverage report appears as comment with delta from base branch

### Step 4: Create Changesets Release Workflow

**Files:** `.github/workflows/release.yml`, `package.json` (add changeset dependencies)
**What:** Set up automated release workflow using Changesets that creates release PRs, manages versioning, and publishes packages (if applicable).
**Testing:** Create changeset file; verify release PR is created automatically with correct version bumps

### Step 5: Add Required Status Checks

**Files:** `.github/PULL_REQUEST_TEMPLATE.md`, repository settings documentation
**What:** Create PR template with checklist (tests pass, types check, no lint errors, changeset added); document required branch protection rules.
**Testing:** Create test PR; verify template appears with all checkboxes; document how to enable branch protection

### Step 6: Add Lighthouse CI for Performance Monitoring

**Files:** `.github/workflows/lighthouse.yml`, `lighthouserc.js`
**What:** Create workflow that runs Lighthouse CI on web apps for every PR, measuring performance, accessibility, and best practices; posts results as PR comment.
**Testing:** Create PR with web app changes; verify Lighthouse runs and performance scores are commented

### Step 7: Add Dependabot Configuration

**Files:** `.github/dependabot.yml`
**What:** Configure Dependabot for automated dependency updates with appropriate grouping (React, Next.js, Expo) and schedule (weekly).
**Testing:** Wait for Dependabot to create first update PR; verify grouping works correctly and PRs are well-formatted

## GitHub Actions Workflow Files Structure

```
.github/
├── workflows/
│   ├── ci.yml                 # Main CI: lint, test, type-check, build
│   ├── security.yml           # Security: audit, secret scanning
│   ├── coverage.yml           # Test coverage reporting
│   ├── release.yml            # Automated releases with changesets
│   ├── lighthouse.yml         # Performance monitoring
│   └── preview-deploy.yml     # [OPTIONAL] Preview deployments
├── PULL_REQUEST_TEMPLATE.md   # PR checklist
└── PACKAGE_TEMPLATE.md        # Package creation guide
```

## Required GitHub Repository Settings

**Branch Protection Rules for `master`:**

- [ ] Require status checks to pass before merging
  - [ ] CI / test
  - [ ] CI / lint
  - [ ] CI / type-check
  - [ ] CI / build
- [ ] Require branches to be up to date before merging
- [ ] Require linear history (optional but recommended)
- [ ] Do not allow bypassing the above settings

**Secrets Configuration:**

- [ ] `TURBO_TOKEN` - For remote caching (after rotation)
- [ ] `CONTEXT7_API_KEY` - If needed in CI
- [ ] `GITHUB_TOKEN` - Auto-provided by GitHub Actions

## Notes

- Ensure all workflows use `pnpm` cache action for faster installs
- Consider using `actions/upload-artifact` for build outputs
- Lighthouse CI should not block PRs, only provide information
- Start with permissive settings, tighten over time as team adapts
