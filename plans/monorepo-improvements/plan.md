# Monorepo Improvements

**Branch:** `feature/monorepo-improvements`
**Description:** Implement tooling, performance, and developer experience improvements across the monorepo.

## Goal
Enhance the repository's maintainability, performance, and testing capabilities by introducing standard tooling (Changesets, Lefthook, Syncpack), optimizing web application builds (Turbopack, React Compiler), and expanding the testing strategy (Storybook, Playwright).

## Implementation Steps

### Step 1: Versioning & Release Management (Changesets)
**Files:** `package.json`, `.changeset/config.json`, `.changeset/README.md`
**What:** Install `@changesets/cli` and initialize it to manage package versioning and changelogs.
**Testing:** Run `pnpm changeset` to verify it prompts for changes.

### Step 2: Git Hooks (Lefthook)
**Files:** `package.json`, `lefthook.yml`
**What:** Install `lefthook` and configure a pre-commit hook to run linting on changed files.
**Testing:** Make a dummy commit with a lint error and verify it is blocked.

### Step 3: Dependency Management (Syncpack)
**Files:** `package.json`, `.syncpackrc` (optional)
**What:** Install `syncpack` and run it to ensure dependency versions are consistent across the monorepo.
**Testing:** Run `pnpm syncpack list-mismatches` and verify it reports clean or fixed versions.

### Step 4: Web Performance (Turbopack, React Compiler, Bundle Analyzer)
**Files:** `web/miller.pub/package.json`, `web/miller.pub/next.config.js`, `web/readon.app/package.json`, `web/readon.app/next.config.js`
**What:**
1.  Update `dev` scripts to use `--turbo`.
2.  Enable `experimental.reactCompiler` in Next.js config.
3.  Add `@next/bundle-analyzer` and configure it in Next.js config.
**Testing:** Run `pnpm dev` to verify apps start with Turbopack. Run build with `ANALYZE=true` to verify bundle analyzer opens.

### Step 5: UI Development (Storybook)
**Files:** `packages/ui/package.json`, `packages/ui/.storybook/*`, `packages/ui/src/**/*.stories.tsx`
**What:** Initialize Storybook in the `@lellimecnar/ui` package and add a sample story.
**Testing:** Run `pnpm --filter @lellimecnar/ui storybook` and verify the UI loads.

### Step 6: E2E Testing (Playwright)
**Files:** `pnpm-workspace.yaml`, `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/tests/example.spec.ts`
**What:** Create a new `e2e` workspace and configure Playwright for end-to-end testing.
**Testing:** Run `pnpm --filter e2e test` to verify the example test passes.

### Step 7: Unit Test Migration (Vitest) [NEEDS CLARIFICATION]
**Files:** `packages/config-jest/*`, `packages/config-vitest/*`, `packages/utils/jest.config.js`, `card-stack/*/jest.config.js`
**What:** Create a new `config-vitest` package and migrate `utils` and `card-stack` packages from Jest to Vitest.
**Testing:** Run `pnpm test` and verify all tests pass with the new runner.
**Clarification:** Migrating to Vitest replaces the existing Jest setup. Do you want this included in this PR, or should it be a separate "Phase 2" PR to keep this one smaller?
