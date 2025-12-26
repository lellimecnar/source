# Polymix Implementation

**Branch:** `feat/polymix-implementation`
**Description:** Implement the `@lellimecnar/polymix` library for advanced TypeScript mixins.

## Goal
Create a robust, type-safe mixin library that supports `instanceof` checks, constructor side effects, and method composition strategies, solving limitations of existing libraries like `ts-mixer`. This library will be used by the card game engine and other parts of the monorepo.

## Implementation Steps

### Step 1: Scaffold Package Structure
**Files:**
- `packages/polymix/package.json`
- `packages/polymix/tsconfig.json`
- `packages/polymix/.eslintrc.js`
- `packages/polymix/jest.config.js`
- `packages/polymix/src/index.ts` (empty initial)

**What:** Initialize the package with standard monorepo configurations, extending root configs for TypeScript, ESLint, and Jest.
**Testing:** Run `pnpm install` to link the workspace and `pnpm build` to verify configuration validity.

### Step 2: Implement Core Types and Utilities
**Files:**
- `packages/polymix/src/types.ts`
- `packages/polymix/src/utils.ts`

**What:** Extract and implement the complex variadic tuple types (for mixin composition) and utility functions (like `applyMixins`) from `prototype.ts`.
**Testing:** Create a basic test file importing these types/utils and verify `pnpm build` passes without type errors.

### Step 3: Implement Composition Strategies
**Files:**
- `packages/polymix/src/strategies.ts`
- `packages/polymix/src/strategies.spec.ts`

**What:** Implement the `Strategy` object containing logic for method merging (e.g., `pipe`, `override`, `merge`).
**Testing:** Add unit tests in `src/strategies.spec.ts` to verify each strategy function behaves as expected.

### Step 4: Implement Core Mixin Logic
**Files:**
- `packages/polymix/src/core.ts`
- `packages/polymix/src/core.spec.ts`
- `packages/polymix/src/index.ts`

**What:** Implement the main `Mix` function, including the Proxy handler for constructor side effects and the `Symbol.hasInstance` implementation for native `instanceof` support. Export main API from `index.ts`.
**Testing:** Add unit tests in `src/core.spec.ts` to verify basic class mixing and instantiation.

### Step 5: Implement Decorators
**Files:**
- `packages/polymix/src/decorators.ts`
- `packages/polymix/src/decorators.spec.ts`
- `packages/polymix/src/index.ts` (export update)

**What:** Implement `@Use` for applying mixins to existing classes and `@delegate` for explicit method delegation, along with metadata reflection support.
**Testing:** Co-locate tests in `src/decorators.spec.ts` using decorated classes.

### Step 6: Migrate Tests and Cleanup
**Files:**
- `packages/polymix/src/__tests__/polymix.spec.ts`
- `plans/polymix-implementation/CHAT.md`
- `plans/polymix-implementation/DESIGN.md`
- `plans/polymix-implementation/GUIDE.md`
- `plans/polymix-implementation/PRIOR_ART.md`
- `plans/polymix-implementation/prototype.ts`

**What:** Convert the comprehensive demo code from `prototype.ts` into a full Jest test suite covering all edge cases. Remove the temporary research/prototype files.
**Testing:** Run `pnpm test` to ensure 100% pass rate on the full suite.

### Step 7: Documentation
**Files:**
- `packages/polymix/README.md`

**What:** Create comprehensive documentation based on `GUIDE.md` and `DESIGN.md`, explaining installation, usage, and API.
**Testing:** Verify Markdown rendering and ensure all code examples in README are valid.
