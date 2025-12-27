# Build System Improvements

**Branch:** `chore/build-system-improvements`
**Description:** Standardize build tasks, add missing type-check scripts, and optimize Turborepo configuration

## Goal

Create a consistent and complete build system across all packages by adding missing type-check scripts, enhancing Turborepo task configuration, and establishing patterns for future workspace packages.

## Implementation Steps

### Step 1: Add type-check Task to Turborepo

**Files:** `turbo.json`
**What:** Add `type-check` task to Turborepo configuration with proper dependencies on upstream builds and no outputs (since it's a validation task).
**Testing:** Run `pnpm type-check` from root and verify it cascades through all workspaces correctly

### Step 2: Add Missing Type-Check Scripts - Card Stack

**Files:** `card-stack/core/package.json`, `card-stack/deck-standard/package.json`
**What:** Add `"type-check": "tsc --noEmit"` script to both card-stack packages to enable TypeScript validation without compilation.
**Testing:** Run `pnpm --filter @card-stack/core type-check` and `pnpm --filter @card-stack/deck-standard type-check`; verify no errors

### Step 3: Add Missing Type-Check Scripts - Packages

**Files:** `packages/utils/package.json`, `packages/config-prettier/package.json`, `packages/config-babel/package.json`, `packages/config-eslint/package.json`, `packages/config-jest/package.json`, `packages/config-tailwind/package.json`, `packages/config-typescript/package.json`, `packages/expo-with-modify-gradle/package.json`
**What:** Add `"type-check": "tsc --noEmit"` to all config and utility packages that are currently missing this script.
**Testing:** Run `pnpm type-check` from root; verify all packages execute type checking without errors

### Step 4: Add Missing Type-Check Script - Mobile

**Files:** `mobile/readon/package.json`
**What:** Add `"type-check": "tsc --noEmit"` to the mobile app package.
**Testing:** Run `pnpm readon type-check`; verify Expo app type checks successfully

### Step 5: Enhance Turborepo Task Configuration

**Files:** `turbo.json`
**What:** Add additional tasks (`format`, `test:coverage`, `test:ci`) and enhance existing task configurations with better caching, inputs, and environment variable handling.
**Testing:** Run each new task from root; verify caching behavior with `turbo` cache hit/miss indicators

### Step 6: Add Node Version File

**Files:** `.nvmrc`
**What:** Create `.nvmrc` file specifying `24.12.0` (or latest LTS 24.x) to ensure consistent Node.js version across development environments and CI.
**Testing:** Run `nvm use` in project root; verify correct Node version is activated; test that CI picks up correct version

### Step 7: Update Root Package Scripts

**Files:** `package.json` (root)
**What:** Add convenience scripts for workspace management: `graph`, `outdated`, `update-interactive`, `why`, `clean:hard`.
**Testing:** Execute each new script to verify functionality; `pnpm graph` should show dependency tree

### Step 8: Create Package Template Documentation

**Files:** `.github/PACKAGE_TEMPLATE.md`
**What:** Document the required structure and scripts for new packages (package.json fields, required scripts: build, test, lint, type-check, AGENTS.md file).
**Testing:** Review against existing packages to ensure template matches established patterns

## Notes

- All changes are backward compatible
- Type-check may reveal existing type errors that need fixing
- Coordinate with team before running `clean:hard` which removes lock file
- Consider creating GitHub issue templates for "New Package" requests
