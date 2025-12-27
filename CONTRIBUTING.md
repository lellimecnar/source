# Contributing to @lellimecnar/source

Thank you for your interest in contributing! This document provides guidelines and workflows for contributing to this monorepo.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Dependency Management](#dependency-management)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Code Style](#code-style)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- **Node.js:** ^24 (required)
- **pnpm:** 9.12.2 (enforced via `packageManager` field)

### Installation

```bash
# Clone the repository
git clone https://github.com/lellimecnar/source.git
cd source

# Install dependencies
pnpm install
```

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

We use `pnpm` workspaces.

- **Add dependency to specific package:**
  ```bash
  pnpm --filter @lellimecnar/ui add react-day-picker
  ```
- **Add dev dependency:**
  ```bash
  pnpm --filter @lellimecnar/ui add -D @types/react
  ```

## Testing

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

## Code Style

We use **ESLint** and **Prettier** to enforce code style.

- **Linting:** Run `pnpm lint` to check for issues.
- **Formatting:** Run `pnpm format` to auto-format code.
- **Configuration:** Shared configs are in `packages/config-eslint` and `packages/config-prettier`.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

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
