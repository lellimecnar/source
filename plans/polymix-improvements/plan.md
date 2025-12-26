# Polymix Enhancements & Compatibility

**Branch:** `feat/polymix-improvements`
**Description:** Add `init` lifecycle support, improve robustness, and ensure compatibility with `ts-mixer` patterns.

## Goal
Enhance `@lellimecnar/polymix` to support the `init` method pattern used in `@card-stack/core`, improve the robustness of mixin composition, and prepare the library to serve as a drop-in replacement for `ts-mixer`.

## Implementation Steps

### Step 1: Implement `init` Lifecycle Support
**Files:** `packages/polymix/src/core.ts`, `packages/polymix/src/__tests__/lifecycle.spec.ts`
**What:** 
- Modify the generated constructor in `mix` to check for and invoke `init()` methods on all mixins.
- Ensure `init` is called with the constructor arguments (or a subset, depending on design - `ts-mixer` passes all args).
- Add a new test file `lifecycle.spec.ts` to verify `init` execution order and argument passing.
**Testing:** Run `pnpm --filter @lellimecnar/polymix test` and verify new lifecycle tests pass.

### Step 2: Robust Metadata Discovery & Base Class Handling
**Files:** `packages/polymix/src/utils.ts`, `packages/polymix/src/core.ts`
**What:**
- Wrap property discovery in `utils.ts` (instantiation of dummy objects) in `try/catch` blocks to handle mixins with side-effect-heavy getters.
- In `core.ts`, add a runtime warning if the "implicit base class" heuristic is triggered, encouraging the use of `.with(Base)` instead.
- Ensure `.with(Base)` correctly handles the prototype chain and `instanceof` checks.
**Testing:** Verify existing tests pass. Add a test case for a mixin with a throwing getter to ensure it doesn't crash composition.

### Step 3: TS-Mixer Compatibility Verification
**Files:** `packages/polymix/src/__tests__/compatibility.spec.ts`
**What:**
- Create a test suite that mimics the usage patterns in `@card-stack/core` (e.g., `Mix(Base, Mixin)` vs `mix(Mixin).with(Base)`).
- Verify that property copying and prototype chains behave as expected for `card-stack` migration.
**Testing:** Run the new compatibility suite.
