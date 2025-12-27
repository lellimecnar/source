# CI/CD Pipeline Setup - Implementation Guide

## Goal

Implement a complete CI/CD pipeline using GitHub Actions that automatically validates all pull requests and pushes to master, running tests, linting, type-checking, and builds in parallel to ensure code quality and prevent regressions.

## Prerequisites

Make sure you are currently on the `ci/github-actions-setup` branch before beginning implementation.

```bash
# Check current branch
git branch --show-current

# If not on the correct branch, create and switch to it
git checkout -b ci/github-actions-setup
```

---

## Step 1: Create Main CI Workflow

This workflow runs on every pull request and push to master, executing all quality checks in parallel.

- [x] Create the `.github/workflows` directory structure:

```bash
mkdir -p .github/workflows
```

- [x] Copy and paste code below into `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Checks (Type-check + Lint)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

  test:
    name: Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Run tests
        run: pnpm test

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Build all packages
        run: pnpm build
```

### Step 1 Verification Checklist

- [ ] File `.github/workflows/ci.yml` exists
- [ ] Commit and push the changes to the `ci/github-actions-setup` branch
- [ ] Navigate to GitHub repository → Actions tab
- [ ] Verify the "CI" workflow appears in the workflows list
- [ ] Verify all three jobs (quality, test, build) are triggered
- [ ] All jobs should complete successfully (green checkmarks)
- [ ] Check that jobs run in parallel (similar start times)
- [ ] Verify total workflow time is under 5 minutes

#### Step 1 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): add main CI workflow with parallel quality checks, tests, and builds"
git push -u origin ci/github-actions-setup
```

---

## Step 2: Create Security Scanning Workflow

This workflow runs weekly and on pushes to master to audit dependencies for security vulnerabilities.

- [x] Copy and paste code below into `.github/workflows/security.yml`:

````yaml
name: Security

on:
  push:
    branches: [master, main]
  schedule:
    # Run every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run security audit
        run: pnpm audit --audit-level=moderate
        continue-on-error: true

      - name: Generate audit report
        if: always()
        run: |
          echo "## Security Audit Report" > audit-report.md
          echo "" >> audit-report.md
          echo "Generated on: $(date)" >> audit-report.md
          echo "" >> audit-report.md
          pnpm audit --json > audit.json || true
          echo '```json' >> audit-report.md
          cat audit.json >> audit-report.md
          echo '```' >> audit-report.md

      - name: Upload audit report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-audit-report
          path: audit-report.md
          retention-days: 30
````

### Step 2 Verification Checklist

- [ ] File `.github/workflows/security.yml` exists
- [ ] Commit and push the changes
- [ ] Navigate to GitHub repository → Actions tab
- [ ] Click on "Security" workflow → "Run workflow" button (top right)
- [ ] Select the `ci/github-actions-setup` branch and click "Run workflow"
- [ ] Verify the workflow runs successfully
- [ ] Check that the audit report artifact is uploaded
- [ ] Download and review the audit report artifact

#### Step 2 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add .github/workflows/security.yml
git commit -m "feat(ci): add security scanning workflow with weekly dependency audits"
git push
```

---

## Step 3: Add Test Coverage Reporting

This workflow generates test coverage reports and posts them as PR comments.

- [x] Update root `package.json` to add test coverage script. Find the `"scripts"` section and add:

```bash
# First, let's check the current scripts section
grep -A 20 '"scripts"' package.json
```

- [x] Add the `test:coverage` script to root `package.json` in the scripts section:

```json
"test:coverage": "turbo test --coverage"
```

- [x] Copy and paste code below into `.github/workflows/coverage.yml`:

```yaml
name: Coverage

on:
  pull_request:
    branches: [master, main]

permissions:
  contents: read
  pull-requests: write

jobs:
  coverage:
    name: Test Coverage Report
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests with coverage
        run: pnpm --filter "@card-stack/*" test -- --coverage --coverageReporters=json-summary --coverageReporters=text

      - name: Generate coverage summary
        id: coverage
        run: |
          # Extract coverage from card-stack/core
          if [ -f "card-stack/core/coverage/coverage-summary.json" ]; then
            CORE_COVERAGE=$(node -e "
              const fs = require('fs');
              const coverage = JSON.parse(fs.readFileSync('card-stack/core/coverage/coverage-summary.json', 'utf8'));
              const total = coverage.total;
              console.log(JSON.stringify({
                lines: total.lines.pct,
                statements: total.statements.pct,
                functions: total.functions.pct,
                branches: total.branches.pct
              }));
            ")
            echo "core_coverage=$CORE_COVERAGE" >> $GITHUB_OUTPUT
          fi

          # Extract coverage from card-stack/deck-standard
          if [ -f "card-stack/deck-standard/coverage/coverage-summary.json" ]; then
            DECK_COVERAGE=$(node -e "
              const fs = require('fs');
              const coverage = JSON.parse(fs.readFileSync('card-stack/deck-standard/coverage/coverage-summary.json', 'utf8'));
              const total = coverage.total;
              console.log(JSON.stringify({
                lines: total.lines.pct,
                statements: total.statements.pct,
                functions: total.functions.pct,
                branches: total.branches.pct
              }));
            ")
            echo "deck_coverage=$DECK_COVERAGE" >> $GITHUB_OUTPUT
          fi

      - name: Comment coverage on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const coreCoverage = ${{ steps.coverage.outputs.core_coverage || '{}' }};
            const deckCoverage = ${{ steps.coverage.outputs.deck_coverage || '{}' }};

            let comment = '## 📊 Test Coverage Report\n\n';

            if (Object.keys(coreCoverage).length > 0) {
              comment += '### @card-stack/core\n';
              comment += '| Metric | Coverage |\n';
              comment += '|--------|----------|\n';
              comment += `| Lines | ${coreCoverage.lines}% |\n`;
              comment += `| Statements | ${coreCoverage.statements}% |\n`;
              comment += `| Functions | ${coreCoverage.functions}% |\n`;
              comment += `| Branches | ${coreCoverage.branches}% |\n\n`;
            }

            if (Object.keys(deckCoverage).length > 0) {
              comment += '### @card-stack/deck-standard\n';
              comment += '| Metric | Coverage |\n';
              comment += '|--------|----------|\n';
              comment += `| Lines | ${deckCoverage.lines}% |\n`;
              comment += `| Statements | ${deckCoverage.statements}% |\n`;
              comment += `| Functions | ${deckCoverage.functions}% |\n`;
              comment += `| Branches | ${deckCoverage.branches}% |\n\n`;
            }

            comment += '_Coverage reports generated by Jest_';

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Step 3 Verification Checklist

- [ ] Root `package.json` has `test:coverage` script
- [ ] File `.github/workflows/coverage.yml` exists
- [ ] Commit and push the changes
- [ ] Create a test PR (can modify a test file or documentation)
- [ ] Verify the "Coverage" workflow runs on the PR
- [ ] Check that a coverage report comment appears on the PR with tables showing percentages
- [ ] Verify coverage percentages are displayed for both card-stack packages

#### Step 3 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add package.json .github/workflows/coverage.yml
git commit -m "feat(ci): add test coverage reporting with PR comments"
git push
```

---

## Step 4: Create Changeset Release Workflow

This workflow automates versioning and releases using Changesets.

- [x] Install Changesets as a dev dependency at the root:

```bash
pnpm add -D -w @changesets/cli
```

- [x] Initialize Changesets:

```bash
pnpm changeset init
```

- [x] Copy and paste code below into `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - master
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          commit: 'chore(release): version packages'
          title: 'chore(release): version packages'
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [x] Update `.changeset/config.json` to configure the monorepo correctly:

```json
{
	"$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
	"changelog": "@changesets/cli/changelog",
	"commit": false,
	"fixed": [],
	"linked": [],
	"access": "restricted",
	"baseBranch": "master",
	"updateInternalDependencies": "patch",
	"ignore": ["@lellimecnar/config-*"],
	"___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
		"onlyUpdatePeerDependentsWhenOutOfRange": true
	}
}
```

### Step 4 Verification Checklist

- [ ] Changesets is installed (`@changesets/cli` in root `package.json` devDependencies)
- [ ] `.changeset` directory exists with `config.json` and `README.md`
- [ ] File `.github/workflows/release.yml` exists
- [ ] Commit and push all changes
- [ ] Create a test changeset to verify the workflow:

```bash
pnpm changeset add
# Select a package (e.g., @card-stack/core)
# Select "patch" for version bump
# Add summary: "Test changeset for CI/CD setup"
```

- [ ] Commit the changeset file and push
- [ ] Verify that a "Version Packages" PR is created automatically by the release workflow
- [ ] The PR should contain version bumps and CHANGELOG updates

#### Step 4 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add package.json pnpm-lock.yaml .changeset .github/workflows/release.yml
git commit -m "feat(ci): add Changesets release automation workflow"
git push
```

---

## Step 5: Add PR Template and Documentation

Create a pull request template with quality checklists and document branch protection rules.

- [x] Create `.github` directory if it doesn't exist (it should already exist from previous steps)

- [x] Copy and paste code below into `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test updates
- [ ] CI/CD changes
- [ ] Dependency updates

## Quality Checklist

<!-- All items must be checked before merging -->

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## CI/CD Checklist

<!-- These should pass automatically via GitHub Actions -->

- [ ] ✅ All tests pass (`pnpm test`)
- [ ] ✅ Type checking passes (`pnpm type-check`)
- [ ] ✅ Linting passes (`pnpm lint`)
- [ ] ✅ Build succeeds (`pnpm build`)

## Changeset

<!-- Required for all non-documentation changes -->

- [ ] I have added a changeset describing this change (`pnpm changeset add`)
- [ ] OR this change does not require a version bump (documentation, tests, CI only)

## Testing Instructions

<!-- Provide steps for reviewers to test your changes -->

1.
2.
3.

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes -->

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Related Issues

<!-- Link related issues using #issue_number -->

Closes #
```

- [x] Copy and paste code below into `.github/BRANCH_PROTECTION.md`:

```markdown
# Branch Protection Rules

This document describes the required branch protection rules for the `master` branch to ensure code quality and prevent regressions.

## GitHub Repository Settings

Navigate to: **Settings → Branches → Add branch protection rule**

### Protected Branch: `master`

#### Require a pull request before merging

- [x] **Require approvals:** 1
- [x] **Dismiss stale pull request approvals when new commits are pushed**
- [x] **Require review from Code Owners** (optional, if CODEOWNERS file exists)

#### Require status checks to pass before merging

- [x] **Require branches to be up to date before merging**
- [x] **Status checks that are required:**
  - `quality` (CI / Quality Checks)
  - `test` (CI / Tests)
  - `build` (CI / Build)

#### Require conversation resolution before merging

- [x] **Require conversation resolution before merging**

#### Require linear history

- [x] **Require linear history** (recommended - enforces rebase or squash merging)

#### Do not allow bypassing the above settings

- [x] **Do not allow bypassing the above settings**
- [ ] **Allow specified actors to bypass** (optional - for emergency hotfixes)

## Additional Settings

### General Repository Settings

Navigate to: **Settings → General**

#### Pull Requests

- [x] **Allow squash merging**
- [x] **Default to pull request title**
- [x] **Allow merge commits** (optional)
- [x] **Allow rebase merging**
- [x] **Automatically delete head branches**

### Actions Settings

Navigate to: **Settings → Actions → General**

#### Workflow permissions

- [x] **Read and write permissions** (required for Changesets to create PRs)
- [x] **Allow GitHub Actions to create and approve pull requests**

## Environment Variables & Secrets

Navigate to: **Settings → Secrets and variables → Actions**

### Required Secrets

None required initially. The `GITHUB_TOKEN` is automatically provided.

### Optional Secrets (for future enhancements)

- `TURBO_TOKEN` - For Vercel Remote Caching
- `VERCEL_TOKEN` - For preview deployments
- `CONTEXT7_API_KEY` - If needed in CI

## Enabling Branch Protection

1. Go to your GitHub repository
2. Navigate to **Settings → Branches**
3. Click **Add branch protection rule**
4. Set branch name pattern: `master`
5. Enable all checkboxes as described above
6. Under "Require status checks to pass before merging", search and add:
   - `quality`
   - `test`
   - `build`
7. Click **Create** or **Save changes**

## Verifying Branch Protection

1. Create a test branch and make a small change
2. Open a pull request to `master`
3. Verify that:
   - All CI checks run automatically
   - You cannot merge until all checks pass
   - The merge button shows "Merge blocked" until checks complete
   - Reviewers can see all status check results

## Notes

- Start with permissive settings and tighten over time as the team adapts
- Consider requiring code owners for critical packages
- The "linear history" setting is recommended but optional
- Coverage workflow is informational only and not required for merge
```

### Step 5 Verification Checklist

- [ ] File `.github/PULL_REQUEST_TEMPLATE.md` exists
- [ ] File `.github/BRANCH_PROTECTION.md` exists
- [ ] Create a new test PR to verify the template appears automatically
- [ ] Verify all checkboxes are present in the PR description
- [ ] Verify the template formatting is correct and readable
- [ ] Review `.github/BRANCH_PROTECTION.md` for completeness

#### Step 5 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add .github/PULL_REQUEST_TEMPLATE.md .github/BRANCH_PROTECTION.md
git commit -m "feat(ci): add PR template and branch protection documentation"
git push
```

---

## Step 6: Add Lighthouse CI for Performance Monitoring

This workflow runs Lighthouse performance audits on web applications for every PR.

- [ ] Install Lighthouse CI dependencies at the root:

```bash
pnpm add -D -w @lhci/cli
```

- [ ] Copy and paste code below into `lighthouserc.js` at the root:

```javascript
module.exports = {
	ci: {
		collect: {
			numberOfRuns: 3,
			startServerCommand: 'pnpm miller.pub build && pnpm miller.pub start',
			url: ['http://localhost:3000'],
			startServerReadyPattern: 'Ready',
			startServerReadyTimeout: 60000,
			settings: {
				preset: 'desktop',
				throttling: {
					rttMs: 40,
					throughputKbps: 10240,
					cpuSlowdownMultiplier: 1,
				},
			},
		},
		assert: {
			preset: 'lighthouse:recommended',
			assertions: {
				'categories:performance': ['error', { minScore: 0.8 }],
				'categories:accessibility': ['error', { minScore: 0.9 }],
				'categories:best-practices': ['error', { minScore: 0.9 }],
				'categories:seo': ['error', { minScore: 0.9 }],
			},
		},
		upload: {
			target: 'temporary-public-storage',
		},
	},
};
```

- [ ] Copy and paste code below into `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [master, main]
    paths:
      - 'web/**'
      - 'packages/ui/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  lighthouse:
    name: Performance Audit
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build miller.pub
        run: pnpm miller.pub build

      - name: Run Lighthouse CI
        run: |
          pnpm lhci autorun --upload.target=temporary-public-storage || echo "Lighthouse CI failed, but continuing..."
        continue-on-error: true
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Comment Lighthouse results on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const comment = `## ⚡ Lighthouse Performance Audit

            Lighthouse CI has completed performance testing for this PR.

            **Note:** This check is informational and does not block merging.

            ### What was tested
            - Performance metrics (FCP, LCP, TTI, TBT, CLS)
            - Accessibility
            - Best practices
            - SEO

            ### Review the full report
            Check the workflow run for detailed metrics and recommendations.

            _Generated by Lighthouse CI_`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Step 6 Verification Checklist

- [x] `@lhci/cli` is installed in root `package.json` devDependencies
- [x] File `lighthouserc.js` exists at the root
- [x] File `.github/workflows/lighthouse.yml` exists
- [ ] Commit and push all changes
- [ ] Create a test PR that modifies something in `web/miller.pub` (e.g., update a component or page)
- [ ] Verify the "Lighthouse CI" workflow is triggered
- [ ] Check that a Lighthouse comment appears on the PR
- [ ] Verify the workflow completes (may take 5-10 minutes)

**Note:** The Lighthouse job may fail initially if the Next.js app has build issues or missing environment variables. This is informational only and doesn't block PRs.

#### Step 6 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add package.json pnpm-lock.yaml lighthouserc.js .github/workflows/lighthouse.yml
git commit -m "feat(ci): add Lighthouse CI for performance monitoring"
git push
```

---

## Step 7: Add Dependabot Configuration

Configure automated dependency updates with appropriate grouping and scheduling.

- [ ] Copy and paste code below into `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # pnpm lockfile maintenance
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    open-pull-requests-limit: 10
    groups:
      # Group React ecosystem updates
      react:
        patterns:
          - 'react'
          - 'react-dom'
          - '@types/react'
          - '@types/react-dom'
      # Group Next.js ecosystem updates
      nextjs:
        patterns:
          - 'next'
          - '@next/*'
      # Group Expo ecosystem updates
      expo:
        patterns:
          - 'expo'
          - 'expo-*'
          - '@expo/*'
      # Group testing dependencies
      testing:
        patterns:
          - 'jest'
          - '@jest/*'
          - '@testing-library/*'
          - 'ts-jest'
      # Group linting dependencies
      linting:
        patterns:
          - 'eslint'
          - 'eslint-*'
          - '@typescript-eslint/*'
          - 'prettier'
      # Group build tools
      build-tools:
        patterns:
          - 'turbo'
          - 'typescript'
          - '@types/*'
      # Group Tailwind ecosystem
      tailwind:
        patterns:
          - 'tailwindcss'
          - '@tailwindcss/*'
          - 'tailwindcss-animate'
      # Group Radix UI components
      radix-ui:
        patterns:
          - '@radix-ui/*'
    labels:
      - 'dependencies'
      - 'automated'
    commit-message:
      prefix: 'chore(deps)'
      include: 'scope'

  # GitHub Actions updates
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    labels:
      - 'dependencies'
      - 'github-actions'
    commit-message:
      prefix: 'chore(ci)'
```

### Step 7 Verification Checklist

- [ ] File `.github/dependabot.yml` exists
- [ ] YAML syntax is valid (no indentation errors)
- [ ] Commit and push the changes
- [ ] Navigate to GitHub repository → Insights → Dependency graph → Dependabot
- [ ] Verify Dependabot is enabled and the configuration is recognized
- [ ] Wait for Dependabot to create its first PR (may take a few hours or until next Monday)
- [ ] When PRs appear, verify:
  - Dependencies are grouped correctly (e.g., all React deps in one PR)
  - PR titles follow the pattern: `chore(deps): bump <group> group`
  - PRs have the `dependencies` and `automated` labels

**Note:** You can manually trigger Dependabot by going to Insights → Dependency graph → Dependabot → "Check for updates" button.

#### Step 7 STOP & COMMIT

**STOP & COMMIT:** Stop here and commit this change before proceeding.

```bash
git add .github/dependabot.yml
git commit -m "feat(ci): add Dependabot configuration for automated dependency updates"
git push
```

---

## Final Steps: Branch Protection and Workflow Verification

After all workflows are committed and pushed, enable branch protection and verify the complete CI/CD pipeline.

### Enable Branch Protection Rules

- [ ] Navigate to GitHub repository → Settings → Branches
- [ ] Click "Add branch protection rule"
- [ ] Set branch name pattern: `master`
- [ ] Enable the following settings:
  - [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - [x] Status checks required (search and select):
    - `quality` (from CI workflow)
    - `test` (from CI workflow)
    - `build` (from CI workflow)
  - [x] Require conversation resolution before merging
  - [x] Require linear history (recommended)
  - [x] Do not allow bypassing the above settings
- [ ] Click "Create" to save the rules

### Enable Actions Permissions

- [ ] Navigate to GitHub repository → Settings → Actions → General
- [ ] Under "Workflow permissions":
  - [x] Select "Read and write permissions"
  - [x] Check "Allow GitHub Actions to create and approve pull requests"
- [ ] Click "Save"

### Final Verification

- [ ] Create a pull request from `ci/github-actions-setup` to `master`
- [ ] Verify all workflows are triggered automatically:
  - [x] CI workflow (quality, test, build jobs)
  - [x] Coverage workflow (posts coverage comment)
  - [x] Lighthouse CI workflow (if web files changed)
- [ ] Verify the PR template appears with all checklists
- [ ] Verify you cannot merge until all required status checks pass
- [ ] Verify all status checks complete successfully
- [ ] Review all workflow runs in the Actions tab
- [ ] Merge the PR once all checks pass
- [ ] Verify the Security workflow runs after merge to master
- [ ] Verify the Release workflow runs after merge to master

### Success Criteria

✅ All CI/CD workflows are operational:

- Main CI runs on every PR and push to master
- Security scans run weekly and on master pushes
- Coverage reports are posted on PRs
- Lighthouse audits run on web changes
- Dependabot creates grouped dependency update PRs
- Release workflow creates version PRs via Changesets

✅ Branch protection is enforced:

- Cannot merge without passing CI checks
- All required status checks are configured
- PR template guides contributors

✅ Documentation is complete:

- Branch protection rules documented
- PR template with quality checklists
- Contributors understand the CI/CD process

---

## Troubleshooting

### Workflow Not Triggering

- Verify the workflow file is in `.github/workflows/`
- Check YAML syntax (use a YAML validator)
- Ensure the branch exists and matches the trigger conditions
- Check Actions tab for error messages

### Workflow Failing

- Review the workflow run logs in GitHub Actions tab
- Common issues:
  - Missing dependencies: Run `pnpm install` locally first
  - Build failures: Ensure `pnpm build` works locally
  - Test failures: Ensure `pnpm test` passes locally
  - Type errors: Ensure `pnpm type-check` passes locally

### Changesets Not Creating PRs

- Verify Actions permissions are set to "Read and write"
- Verify "Allow GitHub Actions to create and approve pull requests" is enabled
- Check that changesets are being committed to the repository
- Review release workflow logs for errors

### Dependabot Not Creating PRs

- Verify `.github/dependabot.yml` syntax is correct
- Check Insights → Dependency graph → Dependabot for status
- Dependabot runs on schedule (Monday 9 AM UTC)
- Manually trigger via "Check for updates" button

### Coverage Report Not Posting

- Verify the coverage workflow has `pull-requests: write` permission
- Ensure tests are running with `--coverage` flag
- Check that `coverage-summary.json` files are being generated
- Review workflow logs for GitHub API errors

---

## Next Steps

After completing this implementation:

1. **Monitor CI/CD Performance**
   - Track workflow execution times
   - Optimize slow jobs
   - Consider Turborepo Remote Caching for faster builds

2. **Enhance Testing**
   - Add integration tests for web and mobile apps
   - Increase test coverage in packages
   - Add E2E tests with Playwright

3. **Add Preview Deployments**
   - Create preview deployment workflow for Vercel/Netlify
   - Enable preview URLs in PR comments

4. **Improve Security**
   - Add CodeQL analysis workflow
   - Enable secret scanning
   - Add SAST (Static Application Security Testing)

5. **Documentation**
   - Create CONTRIBUTING.md with CI/CD guidelines
   - Document common CI/CD issues and solutions
   - Add CI/CD status badges to README.md

---

## Summary

You have successfully implemented a complete CI/CD pipeline with:

- ✅ Parallel quality checks (type-check + lint)
- ✅ Automated testing with coverage reporting
- ✅ Build verification for all packages
- ✅ Security scanning and dependency audits
- ✅ Performance monitoring with Lighthouse CI
- ✅ Automated releases with Changesets
- ✅ Grouped dependency updates with Dependabot
- ✅ Branch protection and PR templates
- ✅ Comprehensive documentation

Your repository now has a robust, automated CI/CD pipeline that ensures code quality, prevents regressions, and streamlines the development workflow.
