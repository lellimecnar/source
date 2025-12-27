# Dependency Update Automation

## Goal

Automate dependency updates using Renovate Bot with intelligent grouping, scheduling, and selective auto-merge to reduce maintenance burden while maintaining code quality and security.

## Prerequisites

Make sure you are currently on the `chore/dependency-automation` branch before beginning implementation.
If not, create and switch to this branch from master.

```bash
# Check current branch
git branch --show-current

# If not on chore/dependency-automation, create it
git checkout -b chore/dependency-automation
```

---

## Step-by-Step Instructions

### Step 1: Create Renovate Configuration File

- [x] Create the Renovate configuration file in the repository root
- [x] Copy and paste the code below into `.github/renovate.json`:

```json
{
	"$schema": "https://docs.renovatebot.com/renovate-schema.json",
	"extends": ["config:recommended", ":preserveSemverRanges"],
	"rangeStrategy": "bump",
	"schedule": ["after 10pm every weekday", "before 5am every weekday"],
	"timezone": "America/Los_Angeles",
	"dependencyDashboard": true,
	"dependencyDashboardTitle": "🤖 Dependency Updates Dashboard",
	"prHourlyLimit": 2,
	"prConcurrentLimit": 10,
	"labels": ["dependencies"],
	"vulnerabilityAlerts": {
		"enabled": true,
		"labels": ["security", "dependencies"]
	},
	"lockFileMaintenance": {
		"enabled": true,
		"schedule": ["before 3am on Monday"]
	},
	"packageRules": [
		{
			"description": "Group React ecosystem updates",
			"groupName": "React ecosystem",
			"matchPackagePatterns": ["^react", "^@types/react"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "react"]
		},
		{
			"description": "Group Next.js updates",
			"groupName": "Next.js",
			"matchPackageNames": ["next", "@next/eslint-plugin-next"],
			"matchPackagePatterns": ["^@next/"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "nextjs"]
		},
		{
			"description": "Group Expo SDK updates (must stay in sync)",
			"groupName": "Expo SDK",
			"matchPackagePatterns": ["^expo", "^@expo/"],
			"matchPackageNames": ["react-native", "jest-expo"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "expo"],
			"rangeStrategy": "replace"
		},
		{
			"description": "Group TypeScript and related tooling",
			"groupName": "TypeScript",
			"matchPackageNames": [
				"typescript",
				"ts-jest",
				"ts-mixer",
				"@typescript-eslint/eslint-plugin",
				"@typescript-eslint/parser"
			],
			"matchPackagePatterns": ["^@types/"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "typescript"]
		},
		{
			"description": "Group Jest and testing utilities",
			"groupName": "Testing",
			"matchPackageNames": [
				"jest",
				"jest-expo",
				"ts-jest",
				"@types/jest",
				"@faker-js/faker"
			],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "testing"]
		},
		{
			"description": "Group ESLint and plugins",
			"groupName": "ESLint",
			"matchPackageNames": [
				"eslint",
				"eslint-config-prettier",
				"eslint-config-turbo"
			],
			"matchPackagePatterns": ["^eslint-plugin-", "^@typescript-eslint/"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "linting"]
		},
		{
			"description": "Group Tailwind CSS and related packages",
			"groupName": "Tailwind CSS",
			"matchPackageNames": [
				"tailwindcss",
				"postcss",
				"autoprefixer",
				"nativewind",
				"@tailwindcss/typography",
				"tailwindcss-animate",
				"tailwindcss-opentype"
			],
			"matchPackagePatterns": ["^tailwindcss-", "^@tailwindcss/"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "styling"]
		},
		{
			"description": "Group Radix UI primitives",
			"groupName": "Radix UI",
			"matchPackagePatterns": ["^@radix-ui/"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "ui"]
		},
		{
			"description": "Group build tools",
			"groupName": "Build tools",
			"matchPackageNames": ["turbo", "prettier"],
			"schedule": ["every weekend"],
			"labels": ["dependencies", "tooling"]
		},
		{
			"description": "Auto-merge patch updates to devDependencies",
			"matchDepTypes": ["devDependencies"],
			"matchUpdateTypes": ["patch"],
			"automerge": true,
			"automergeType": "pr",
			"automergeStrategy": "squash",
			"labels": ["dependencies", "automerge"]
		},
		{
			"description": "Auto-merge minor updates to trusted tooling",
			"matchPackageNames": ["prettier", "@lellimecnar/prettier-config"],
			"matchPackagePatterns": ["^eslint-plugin-", "^@types/"],
			"matchUpdateTypes": ["minor", "patch"],
			"matchDepTypes": ["devDependencies"],
			"automerge": true,
			"automergeType": "pr",
			"automergeStrategy": "squash",
			"labels": ["dependencies", "automerge"]
		},
		{
			"description": "Never auto-merge major version updates",
			"matchUpdateTypes": ["major"],
			"automerge": false,
			"labels": ["dependencies", "major-update"]
		},
		{
			"description": "Never auto-merge production dependencies",
			"matchDepTypes": ["dependencies"],
			"automerge": false
		},
		{
			"description": "Update overrides field in root package.json",
			"matchFiles": ["package.json"],
			"matchDepTypes": ["overrides"],
			"enabled": true
		}
	],
	"ignorePaths": [
		"**/node_modules/**",
		"**/dist/**",
		"**/build/**",
		"**/.next/**",
		"**/.expo/**",
		"**/.turbo/**"
	],
	"prBodyTemplate": "{{{header}}}{{{table}}}{{{notes}}}{{{changelogs}}}{{{configDescription}}}{{{controls}}}{{{footer}}}",
	"prBodyColumns": [
		"Package",
		"Change",
		"Age",
		"Adoption",
		"Passing",
		"Confidence"
	],
	"prBodyNotes": [
		"This PR was automatically generated by Renovate Bot.",
		"",
		"**Testing Checklist:**",
		"- [ ] All CI checks pass",
		"- [ ] `pnpm install` completes without errors",
		"- [ ] `pnpm build` succeeds for all workspaces",
		"- [ ] `pnpm test` passes for all workspaces",
		"- [ ] `pnpm lint` passes with no errors",
		"- [ ] Manual smoke testing of affected applications",
		"",
		"**Auto-merge Criteria:**",
		"- ✅ Patch updates to devDependencies (if all checks pass)",
		"- ✅ Minor updates to ESLint plugins and type definitions (if all checks pass)",
		"- ⛔ Major version updates (always require manual review)",
		"- ⛔ Production dependencies (always require manual review)"
	]
}
```

#### Step 1 Verification Checklist

- [ ] File `.github/renovate.json` exists in repository root
- [ ] JSON is valid (no syntax errors)
- [ ] Configuration includes all 9 package groups (React, Next.js, Expo, TypeScript, Testing, ESLint, Tailwind, Radix UI, Build tools)
- [ ] Auto-merge rules are configured for patch updates to devDependencies
- [ ] Vulnerability alerts are enabled with "security" label
- [ ] Dependency dashboard is enabled

#### Step 1 STOP & COMMIT

**STOP & COMMIT:** Stage and commit the Renovate configuration file.

```bash
git add .github/renovate.json
git commit -m "chore: add Renovate bot configuration with intelligent grouping"
```

---

### Step 2: Create CI Workflow for Pull Request Validation

- [x] Create GitHub Actions workflow directory if it doesn't exist
- [x] Copy and paste the code below into `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches:
      - master
      - main
  push:
    branches:
      - master
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  install:
    name: Install Dependencies
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

  lint:
    name: Lint
    runs-on: ubuntu-latest
    needs: install
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linter
        run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    needs: install
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run type check
        run: pnpm type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: install
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: install
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all workspaces
        run: pnpm build
```

#### Step 2 Verification Checklist

- [ ] File `.github/workflows/ci.yml` exists
- [ ] Workflow triggers on pull requests to master/main branches
- [ ] Workflow includes 5 jobs: install, lint, typecheck, test, build
- [ ] pnpm version is set to 9.12.2 (matches packageManager field)
- [ ] Node.js version is set to 20 (matches engines.node)
- [ ] pnpm cache is configured for faster installations
- [ ] All jobs use `--frozen-lockfile` flag

#### Step 2 STOP & COMMIT

**STOP & COMMIT:** Stage and commit the CI workflow file.

```bash
git add .github/workflows/ci.yml
git commit -m "chore: add CI workflow for PR validation"
```

---

### Step 3: Create Dependency Review Workflow

- [x] Copy and paste the code below into `.github/workflows/dependency-review.yml`:

```yaml
name: Dependency Review

on:
  pull_request:
    branches:
      - master
      - main

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: moderate
          comment-summary-in-pr: always
          deny-licenses: GPL-2.0, GPL-3.0
          allow-licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD
```

#### Step 3 Verification Checklist

- [ ] File `.github/workflows/dependency-review.yml` exists
- [ ] Workflow triggers on pull requests to master/main branches
- [ ] Workflow has write permissions for pull-requests (to post comments)
- [ ] Fail threshold is set to "moderate" severity vulnerabilities
- [ ] GPL licenses are denied (copyleft)
- [ ] Common permissive licenses are allowed (MIT, Apache, BSD, ISC)
- [ ] Summary will be commented on every PR

#### Step 3 STOP & COMMIT

**STOP & COMMIT:** Stage and commit the dependency review workflow.

```bash
git add .github/workflows/dependency-review.yml
git commit -m "chore: add dependency review workflow for security scanning"
```

---

### Step 4: Create CONTRIBUTING.md with Dependency Update Process

- [x] Copy and paste the code below into `CONTRIBUTING.md`:

````markdown
# Contributing to @lellimecnar/source

Thank you for your interest in contributing! This document provides guidelines and workflows for contributing to this monorepo.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Dependency Management](#dependency-management)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Code Style](#code-style)

## Getting Started

### Prerequisites

- **Node.js:** ^20 (required)
- **pnpm:** 9.12.2 (enforced via `packageManager` field)

### Installation

```bash
# Clone the repository
git clone https://github.com/lellimecnar/source.git
cd source

# Install dependencies
pnpm install
```
````

### Project Structure

This is a **pnpm + Turborepo** monorepo with the following workspaces:

- **`web/*`**: Next.js applications (miller.pub, readon.app)
- **`mobile/*`**: Expo/React Native applications (readon)
- **`packages/*`**: Shared libraries and configurations
- **`card-stack/*`**: Domain logic packages (card game engine)

See [AGENTS.md](./AGENTS.md) for comprehensive project documentation.

## Development Workflow

### Running Development Servers

```bash
# Start all development servers
pnpm dev

# Start specific workspace
pnpm miller.pub dev
pnpm readon.app dev
pnpm readon dev  # Mobile app
```

### Building

```bash
# Build all workspaces
pnpm build

# Build specific workspace
pnpm --filter @lellimecnar/ui build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
pnpm --filter @card-stack/core test
```

### Linting and Type Checking

```bash
# Lint all workspaces
pnpm lint

# Auto-fix linting issues
pnpm format

# Type check all workspaces
pnpm type-check
```

### Clean Build Artifacts

```bash
# Remove all build artifacts and node_modules
pnpm clean
```

## Dependency Management

### Automated Dependency Updates

This project uses **Renovate Bot** for automated dependency updates with intelligent grouping and scheduling.

#### How It Works

1. **Dependency Dashboard:** Check the [Dependency Dashboard](https://github.com/lellimecnar/source/issues) issue for pending updates
2. **Automated PRs:** Renovate creates PRs for dependency updates grouped by ecosystem (React, Next.js, Expo, etc.)
3. **Scheduled Updates:** Non-security updates run on weeknights after 10pm PST
4. **Security Updates:** Vulnerability fixes are created immediately with "security" label
5. **Auto-merge:** Patch updates to devDependencies auto-merge after CI passes

#### Update Groups

Renovate groups dependencies into logical sets:

- **React ecosystem:** react, react-dom, @types/react, @types/react-dom
- **Next.js:** next, @next/\*
- **Expo SDK:** expo, expo-\*, react-native (must stay in sync)
- **TypeScript:** typescript, ts-_, @typescript-eslint/_, @types/\*
- **Testing:** jest, jest-expo, @faker-js/faker
- **ESLint:** eslint, eslint-plugin-_, eslint-config-_
- **Tailwind CSS:** tailwindcss, postcss, autoprefixer, nativewind, tailwindcss-\*
- **Radix UI:** @radix-ui/\*
- **Build tools:** turbo, prettier

#### Auto-merge Rules

**✅ Safe to Auto-merge (if CI passes):**

- Patch updates to devDependencies
- Minor updates to ESLint plugins and type definitions

**⛔ Requires Manual Review:**

- Major version updates (any package)
- Production dependencies (any update type)
- Updates that fail CI checks

#### Manually Triggering Updates

To manually trigger a dependency update:

1. Go to the [Dependency Dashboard](https://github.com/lellimecnar/source/issues) issue
2. Check the box next to the dependency you want to update
3. Renovate will create a PR within minutes

#### Handling Breaking Changes

When a major version update PR is created:

1. **Review Release Notes:** Click the changelog link in the PR description
2. **Check Migration Guide:** Look for breaking changes and migration steps
3. **Test Locally:**

   ```bash
   # Fetch the PR branch
   git fetch origin pull/XXX/head:renovate-major-update
   git checkout renovate-major-update

   # Install dependencies
   pnpm install

   # Run full test suite
   pnpm build
   pnpm test
   pnpm lint

   # Test affected applications manually
   pnpm miller.pub dev
   pnpm readon.app dev
   pnpm readon dev
   ```

4. **Apply Code Changes:** Make necessary code changes to accommodate breaking changes
5. **Commit to PR Branch:** Push fixes to the PR branch or request changes
6. **Merge After CI Passes:** Once all checks pass and manual testing is complete, approve and merge

### Manual Dependency Updates

If you need to manually update a dependency:

#### Updating a Single Dependency

```bash
# Update a specific package
pnpm --filter <workspace-name> update <package-name>

# Example: Update lodash in utils package
pnpm --filter @lellimecnar/utils update lodash
```

#### Updating Across All Workspaces

```bash
# Update a dependency in all workspaces that use it
pnpm update <package-name> -r

# Example: Update TypeScript in all workspaces
pnpm update typescript -r
```

#### Updating Overrides

If the dependency is in the root `package.json` `overrides` field:

1. Update the version in `package.json` overrides
2. Update the version in individual workspace `package.json` files (if explicitly listed)
3. Run `pnpm install` to regenerate the lockfile
4. Test thoroughly before committing

### Adding New Dependencies

#### Adding to a Specific Workspace

```bash
# Add a runtime dependency
pnpm --filter <workspace-name> add <package-name>

# Add a dev dependency
pnpm --filter <workspace-name> add -D <package-name>

# Example: Add axios to miller.pub
pnpm --filter miller.pub add axios
```

#### Adding a Workspace Dependency

Always use the `workspace:*` protocol for internal packages:

```json
{
	"dependencies": {
		"@lellimecnar/ui": "workspace:*"
	}
}
```

**Never** use file paths or version numbers for workspace dependencies.

#### Adding to Root (Shared Tools)

Only add shared development tools to the root `package.json`:

```bash
# Add a shared dev tool at the root
pnpm add -Dw <package-name>

# Example: Add a new linting tool
pnpm add -Dw eslint-plugin-example
```

### Version Constraints

This project uses strict version constraints via the `overrides` field in root `package.json`:

- **TypeScript:** ~5.5 (patch updates only)
- **React:** ^18.3.1 (minor and patch updates allowed)
- **ESLint:** ^8.57.1 (v8 only, not v9)
- **Jest:** ^29 (v29 only)
- **Next.js:** ^15.2.3 (latest)

When updating these dependencies, **always update the override** along with individual package versions.

### Lockfile Maintenance

Renovate automatically maintains the lockfile weekly (Monday at 3am PST). This updates indirect dependencies without changing direct dependencies.

To manually update the lockfile:

```bash
pnpm install --lockfile-only
```

## Testing

### Test Organization

- Tests are co-located with source files: `src/**/*.spec.ts`
- Each workspace with tests has a `jest.config.js`
- Shared Jest configuration: `@lellimecnar/jest-config`

### Writing Tests

```typescript
// Example: src/utils/formatDate.spec.ts
import { formatDate } from './formatDate';

describe('formatDate', () => {
	it('should format a date correctly', () => {
		const date = new Date('2025-12-21');
		expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-12-21');
	});
});
```

### Test Coverage

To generate coverage reports:

```bash
# Run tests with coverage
pnpm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Pull Requests

### PR Guidelines

1. **Branch Naming:**
   - Feature: `feat/description`
   - Bug fix: `fix/description`
   - Chore: `chore/description`
   - Documentation: `docs/description`

2. **Commit Messages:**
   - Follow [Conventional Commits](https://www.conventionalcommits.org/)
   - Examples: `feat: add user authentication`, `fix: resolve memory leak in card shuffle`

3. **PR Description:**
   - Clearly describe what the PR does
   - Reference any related issues
   - Include screenshots for UI changes
   - List any breaking changes

4. **Before Submitting:**
   - [ ] All tests pass (`pnpm test`)
   - [ ] Linting passes (`pnpm lint`)
   - [ ] Type checking passes (`pnpm type-check`)
   - [ ] Build succeeds (`pnpm build`)
   - [ ] Manual testing completed

### CI Requirements

All PRs must pass the following CI checks:

- **Lint:** ESLint checks for code quality and style
- **Type Check:** TypeScript compiler verifies types
- **Test:** Jest runs all unit tests
- **Build:** Turborepo builds all workspaces
- **Dependency Review:** Security scan for vulnerabilities and license compliance

### Review Process

1. **Automated Checks:** CI must pass before review
2. **Code Review:** At least one approval required
3. **Testing:** Manual testing for UI/UX changes
4. **Merge:** Squash and merge (one commit per PR)

## Code Style

### ESLint Configuration

- **Base:** Vercel Style Guide + Tailwind + Turbo
- **TypeScript:** Strict mode enabled
- **Import Ordering:** Enforced via ESLint

### Prettier Configuration

- **Tabs:** Uses tabs (not spaces)
- **Auto-formatting:** Run `pnpm format` before committing

### TypeScript Guidelines

- **Strict Mode:** Always enabled
- **Type Annotations:** Use explicit types for public APIs
- **Any Type:** Avoid `any`; use `unknown` or proper types
- **Null Safety:** Use optional chaining (`?.`) and nullish coalescing (`??`)

### Import Conventions

```typescript
// ✅ CORRECT: Granular imports from UI package
import { Button } from '@lellimecnar/ui/button';
import { cn } from '@lellimecnar/ui/lib/utils';

// ❌ WRONG: No barrel exports
import { Button } from '@lellimecnar/ui';

// ✅ CORRECT: Workspace dependencies
"dependencies": {
  "@lellimecnar/ui": "workspace:*"
}
```

### File Naming

- **Components:** PascalCase (e.g., `Button.tsx`)
- **Utilities:** camelCase (e.g., `formatDate.ts`)
- **Routes (Next.js):** lowercase (e.g., `page.tsx`, `layout.tsx`)
- **Routes (Expo):** lowercase with underscore prefix for special files (e.g., `_layout.tsx`)
- **Config Files:** lowercase with dots (e.g., `jest.config.js`)

## Additional Resources

- **Project Architecture:** See [Project_Architecture_Blueprint.md](./Project_Architecture_Blueprint.md)
- **Technology Stack:** See [Technology_Stack_Blueprint.md](./Technology_Stack_Blueprint.md)
- **Folder Structure:** See [Project_Folders_Structure_Blueprint.md](./Project_Folders_Structure_Blueprint.md)
- **Common Workflows:** See [Project_Workflow_Documentation.md](./Project_Workflow_Documentation.md)
- **Developer Guide:** See [AGENTS.md](./AGENTS.md)

## Questions?

If you have questions or need help:

1. Check the documentation files listed above
2. Search existing issues: https://github.com/lellimecnar/source/issues
3. Open a new issue with the "question" label

Thank you for contributing! 🎉

````

#### Step 4 Verification Checklist
- [ ] File `CONTRIBUTING.md` exists in repository root
- [ ] Document includes comprehensive dependency management section
- [ ] Renovate Bot workflow is documented
- [ ] Auto-merge rules are clearly explained
- [ ] Manual update procedures are included
- [ ] Breaking change handling is documented
- [ ] Version constraint policy is explained
- [ ] Workspace dependency conventions are documented

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Stage and commit the contributing guidelines.

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contribution guidelines with dependency management process"
````

---

### Step 5: Create Detailed Dependency Management Documentation

- [x] Create a docs directory if it doesn't exist
- [x] Copy and paste the code below into `docs/DEPENDENCY_MANAGEMENT.md`:

````markdown
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
````

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

````

#### Step 5 Verification Checklist
- [ ] Directory `docs/` exists (create if necessary)
- [ ] File `docs/DEPENDENCY_MANAGEMENT.md` exists
- [ ] Document includes comprehensive Renovate configuration explanation
- [ ] All 9 update groups are documented with rationale
- [ ] Auto-merge rules are explained in detail
- [ ] Troubleshooting section covers common issues
- [ ] Examples provided for handling major updates
- [ ] Monorepo-specific considerations are documented

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Stage and commit the dependency management documentation.

```bash
git add docs/DEPENDENCY_MANAGEMENT.md
git commit -m "docs: add comprehensive dependency management guide"
````

---

### Step 6: Install Renovate Bot on GitHub Repository

**Note:** This step requires manual action in GitHub's web interface.

- [x] Navigate to https://github.com/apps/renovate
- [x] Click "Install" or "Configure" if already installed
- [x] Select the `lellimecnar/source` repository
- [x] Grant the required permissions:
  - Read access to code
  - Read and write access to pull requests, issues, and workflows
- [x] Click "Install" to complete setup

#### Step 6 Verification Checklist

- [ ] Renovate Bot is installed on the repository
- [ ] Bot has necessary permissions
- [ ] Within 1 hour, an "Configure Renovate" onboarding PR should be created
- [ ] Review the onboarding PR to see detected dependencies
- [ ] Merge the onboarding PR to activate Renovate

**What to Expect:**

1. **Onboarding PR:** Renovate will create a PR titled "Configure Renovate" with a `renovate.json` file (close this PR since we already have configuration)
2. **Dependency Dashboard:** An issue titled "Dependency Dashboard" will be created listing all detected dependencies
3. **Initial Update PRs:** Renovate will scan for outdated dependencies and create grouped PRs according to the schedule

#### Step 6 STOP & VERIFY

**STOP & VERIFY:** Wait for Renovate onboarding PR or Dependency Dashboard issue to appear. This confirms Renovate is working.

---

### Step 7: Configure Branch Protection Rules (Optional but Recommended)

**Note:** This step is optional but highly recommended to enforce quality gates.

- [x] Navigate to repository Settings → Branches
- [x] Click "Add rule" or edit existing rule for `master` branch
- [x] Configure the following settings:

**Required Settings:**

- ☑ Require a pull request before merging
- ☑ Require approvals: 1
- ☑ Dismiss stale pull request approvals when new commits are pushed
- ☑ Require status checks to pass before merging
  - ☑ Require branches to be up to date before merging
  - Add required status checks:
    - `Lint`
    - `Type Check`
    - `Test`
    - `Build`
    - `Dependency Review`
- ☑ Require conversation resolution before merging
- ☑ Do not allow bypassing the above settings

**Optional Settings:**

- ☑ Require linear history (forces squash or rebase)
- ☑ Include administrators (applies rules to repo admins too)

- [x] Click "Create" or "Save changes"

#### Step 7 Verification Checklist

- [ ] Branch protection rule exists for `master` branch
- [ ] All CI checks are required before merge
- [ ] At least 1 approval is required
- [ ] Admins are included in protection (optional)
- [ ] Test by creating a draft PR: status checks should appear as required

**Benefits:**

- Prevents accidental merge of failing PRs
- Ensures all dependency updates pass CI
- Blocks auto-merge if CI fails
- Enforces code review process

#### Step 7 STOP & COMMIT

**STOP:** No Git commit needed for this step (GitHub web UI configuration only).

---

### Step 8: Verify Renovate Configuration and Create Test Issue

- [x] Wait for Renovate to complete initial scan (may take up to 1 hour)
- [x] Check the "Dependency Dashboard" issue in repository Issues tab
- [x] Copy and paste the command below into terminal to verify configuration:

```bash
# Validate Renovate configuration locally
npx -p renovate -c renovate-config-validator .github/renovate.json
```

- [ ] Expected output: "INFO: Renovate config file is valid"

#### Step 8 Verification Checklist

- [ ] Renovate configuration validation passes
- [ ] "Dependency Dashboard" issue exists with list of dependencies
- [ ] Issue includes checkboxes for all detected dependencies
- [ ] Issue shows update groups (React ecosystem, Next.js, Expo SDK, etc.)
- [ ] No error messages in Renovate bot logs

**Manual Testing:**

- [ ] In Dependency Dashboard, check a box next to any dependency
- [ ] Wait 5-10 minutes
- [ ] A PR should be created for that dependency
- [ ] Verify PR includes changelog links and testing instructions
- [ ] Verify CI checks run automatically on the PR
- [ ] Close the test PR (no need to merge)

**Success Indicators:**

- ✅ Renovate creates PRs according to schedule
- ✅ PRs are grouped by ecosystem
- ✅ PRs include detailed descriptions with changelogs
- ✅ CI runs on all PRs
- ✅ Auto-merge works for patch devDependencies (after CI passes)
- ✅ Security updates are labeled "security"

#### Step 8 STOP & DOCUMENT

**STOP:** Create a final commit documenting the implementation completion.

```bash
# Add any final documentation updates
git add .

# Commit with implementation complete message
git commit -m "chore: complete dependency automation implementation

- Renovate Bot configured with intelligent grouping
- CI workflow validates all PRs
- Dependency review scans for security vulnerabilities
- Comprehensive documentation added
- Auto-merge enabled for safe updates
- Branch protection recommended (manual step)

Related: plans/dependency-automation/plan.md"
```

---

## Final Verification

### Post-Implementation Checklist

After completing all steps, verify the following:

#### Configuration Files

- [x] `.github/renovate.json` exists and is valid JSON
- [x] `.github/workflows/ci.yml` exists and defines 5 jobs
- [x] `.github/workflows/dependency-review.yml` exists
- [x] `CONTRIBUTING.md` exists with dependency section
- [x] `docs/DEPENDENCY_MANAGEMENT.md` exists

#### Renovate Bot

- [ ] Renovate Bot is installed on repository
- [ ] "Dependency Dashboard" issue exists
- [ ] Issue shows grouped dependencies
- [ ] Test PR creation works (via checkbox)

#### CI/CD

- [ ] CI workflow runs on pull requests
- [ ] All 5 jobs execute (install, lint, typecheck, test, build)
- [ ] Dependency review workflow runs on PRs
- [ ] Status checks appear on PRs

#### Documentation

- [ ] CONTRIBUTING.md links to dependency management docs
- [ ] DEPENDENCY_MANAGEMENT.md includes troubleshooting
- [ ] All update groups are documented
- [ ] Auto-merge rules are explained

#### Branch Protection (Optional)

- [ ] Branch protection rule exists for master
- [ ] Required status checks include all CI jobs
- [ ] At least 1 approval required

### Next Steps

1. **Monitor Initial PRs:**
   - Watch for Renovate PRs over the next week
   - Review PR descriptions for quality
   - Test auto-merge behavior

2. **Adjust Configuration:**
   - Fine-tune update schedules if needed
   - Add/remove packages from auto-merge rules
   - Adjust rate limits based on team capacity

3. **Team Training:**
   - Share CONTRIBUTING.md with team
   - Walk through dependency update process
   - Demonstrate Dependency Dashboard usage

4. **Ongoing Maintenance:**
   - Review Dependency Dashboard weekly
   - Monitor auto-merged PRs for issues
   - Update documentation as needed

---

## Rollback Plan

If issues arise and you need to disable Renovate:

### Temporary Disable

Edit `.github/renovate.json` and set:

```json
{
	"enabled": false
}
```

Commit and push. Renovate will stop creating PRs.

### Permanent Removal

1. Uninstall Renovate Bot from repository settings
2. Delete `.github/renovate.json`
3. Close all open Renovate PRs
4. Close Dependency Dashboard issue

### Revert All Changes

```bash
# Return to master branch
git checkout master

# Delete the feature branch
git branch -D chore/dependency-automation

# All changes will be discarded
```

---

## Success Metrics

After 2-4 weeks of operation, you should see:

### Quantitative Metrics

- **Time Savings:** 70-80% reduction in manual dependency update time
- **PR Volume:** 5-10 dependency PRs per week (grouped)
- **Auto-merge Rate:** 40-60% of PRs auto-merge (patch devDependencies)
- **Security Response Time:** < 24 hours for vulnerability fixes

### Qualitative Metrics

- **Developer Experience:** Less manual dependency management toil
- **Code Quality:** Access to latest bug fixes and features
- **Security Posture:** Faster patching of vulnerabilities
- **Technical Debt:** Reduced outdated dependency backlog

---

**Implementation Complete!**

You have successfully set up automated dependency management with Renovate Bot. The system will now:

- 🤖 Automatically scan for dependency updates
- 📦 Group related dependencies into single PRs
- 🔒 Flag security vulnerabilities immediately
- ✅ Auto-merge safe updates after CI passes
- 📊 Provide visibility via Dependency Dashboard
- 🧪 Validate all updates through comprehensive CI pipeline

For questions or issues, refer to `docs/DEPENDENCY_MANAGEMENT.md` or check the Dependency Dashboard issue.
