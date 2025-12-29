# tsgo + Vite + Vitest Migration (Monorepo-wide)

**Branch:** `tsgo-vite-vitest-migration`
**Description:** Standardize on `tsgo` for type-checking, adopt Vite for **library** builds only (no change to Next.js build tooling), migrate Jest→Vitest everywhere except Expo/RN workspaces, and enforce ESM-only outputs for publishable packages.

## Goal

Standardize the monorepo on faster, modern tooling: `tsgo` for type-checking, Vite for **publishable library** builds, and Vitest for unit tests where feasible.
Next.js apps keep `next build` (no Vite build adoption), and Expo/RN workspaces keep Jest (`jest-expo`) for test reliability.

**Decisions (locked-in):**

- **ESM-only** for publishable packages using `"type": "module"` (remove CJS/`exports.require`).
- Vite library builds use **preserve modules** output (no single-file bundling).
- Vitest browser tests **force `happy-dom` by default**, and also provide a **`jsdom` variant** (testing-only) for rare cases.
- Shared web/Next testing setup includes **React Testing Library + Next.js helpers**.
- All React Native libraries/apps keep **Jest** for now.
- Coverage target is **80% minimum** monorepo-wide, but is **not enforced yet** (reports only; does not fail CI).
- Root workflows always rely on Turborepo (`pnpm -w test` → `turbo test`, etc.); no separate “test:rn” root task.

**Additional constraints:**

- Coverage reporting ignores packages where **no tests run** (for any reason).
- Add a shared Vite config package at `packages/config-vite` (`@lellimecnar/vite-config`) following existing config-package patterns.
  - Individual packages opt into browser-specific test/build behavior by importing `@lellimecnar/vite-config/browser` as needed.
- Next.js helpers/mocks should be **composable**:
  - Provide **granular imports** (small modules)
  - Provide **presets** that are composed of those granular imports
- Library build entry strategy is decided per-package.
- CLI packages use a **bin shim**.

---

## Research Findings (Current State)

### Root tooling

- Turborepo pipeline is defined in [turbo.json](../../turbo.json).
  - `build` depends on `^build` and caches `dist/**`, `.next/**` (excluding `.next/cache/**`).
  - `test` and `test:coverage` are configured for Jest-era inputs (`jest.config.js`, `jest.config.ts`).
  - `type-check` depends on `^build`.
- Root scripts are in [package.json](../../package.json).
  - `build`: `turbo build`
  - `test`: `turbo test -- --no-watchman --passWithNoTests`
  - `type-check`: `turbo type-check`
- Root devDependencies include `jest` and `typescript`.

### TypeScript type-checking

- Almost every workspace defines a `type-check` script as `tsc --noEmit` (or `tsc -p ... --noEmit`).
- Root [tsconfig.json](../../tsconfig.json) extends `@lellimecnar/typescript-config`.
- `@lellimecnar/typescript-config` package exports base/next/react tsconfigs and currently expects `typescript` in peers/devDeps.

### Testing (Jest/ts-jest today)

- Jest config files exist in:
  - `card-stack/core/jest.config.js`
  - `card-stack/deck-standard/jest.config.js`
  - `packages/utils/jest.config.js`
  - `packages/polymix/jest.config.js`
  - `packages/ui/jest.config.js`
  - `packages/ui-nativewind/jest.config.cjs`
  - `packages/ui-spec/*/jest.config.js`
  - `web/miller.pub/jest.config.js`
  - `web/readon.app/jest.config.js`
- There is a shared preset package:
  - `@lellimecnar/jest-config` at `packages/config-jest` exporting `jest-preset.js` and `browser/jest-preset.js`.
  - It depends on `ts-jest` and is widely used as a preset.
- Patterns by app type:
  - Next.js apps (`web/*`) use `next/jest` wrapper in their `jest.config.js`.
  - React web packages like `@lellimecnar/ui` use `ts-jest` with `jsdom`, plus CSS module mocking via `identity-obj-proxy`.
  - Expo/RN packages (`mobile/readon`, `packages/ui-nativewind`) use `jest-expo` + `babel-jest` and extensive `transformIgnorePatterns`.

### Build tooling (no Vite today)

- No `vite.config.*` / `vitest.config.*` files exist in the repo currently.
- No `tsup` / `rollup` / `esbuild` build configs were found in active use.
- Current builds are mostly `tsc`-based for JS+types, plus Tailwind CLI for CSS-only outputs:
  - `packages/utils`: `tsc -p tsconfig.build.json`
  - `packages/polymix`: `tsc -p tsconfig.build.json` (with a `clean` step)
  - `packages/ui-spec/*`: `tsc -p tsconfig.json`
  - `card-stack/deck-standard`: no `build` script (but points `main/types` at `dist/*`)
  - `card-stack/core`: exports TypeScript source (`src/index.ts`) and has no build step.
  - `packages/ui` and `packages/ui-nativewind`: build only Tailwind CSS to `dist/global.css` and export TS source for JS.

### Notable mismatches / observations

- `packages/utils/tsconfig.build.json` is configured to `emitDeclarationOnly: true` but package.json points `main` to `./dist/index.js`. This implies either:
  - JS is expected to be produced elsewhere (not observed), or
  - the package is currently “publishable by manifest” but not actually producing runtime JS. Moving to Vite library builds would resolve this by producing JS artifacts.
- `card-stack/deck-standard` has `main/types` pointing at `dist/*` but no `build` script. This is a publishability/build-gap that should be addressed during the migration.

---

## Publishability / Build Responsibility Matrix

### Framework-built (do NOT move to Vite build)

- `web/miller.pub` — Next.js build (`next build`), keep `transpilePackages` pattern for `@lellimecnar/ui`.
- `web/readon.app` — Next.js build (`next build`), keep `transpilePackages` pattern.
- `mobile/readon` — Expo build (`expo start/build`), Metro handles bundling.

### Vite library builds (preferred targets, ESM-only)

These should produce real `dist/` JS outputs + `.d.ts` so they are publishable and consistent. **All publishable packages become ESM-only** (no CJS output, no `exports.require`).

- `packages/utils` — Vite library build (single entry), ESM output only.
- `packages/polymix` — Vite library build, migrate from dual-mode to ESM-only and update `exports` accordingly.
- `packages/ui-spec/core` — Vite library build.
- `packages/ui-spec/react` — Vite library build (React peer deps externalized).
- `packages/ui-spec/router` — Vite library build.
- `packages/ui-spec/router-react` — Vite library build.
- `packages/ui-spec/validate-jsonschema` — Vite library build.
- `packages/ui-spec/cli` — Vite library build with CLI-friendly output (bin entry) using a bin shim copied into `dist/`.
- `card-stack/core` — Convert to Vite library build so it becomes publishable (today exports TS source).
- `card-stack/deck-standard` — Add Vite library build (it already claims `dist/*`).

### Non-Vite “asset-only” builds (keep current approach)

These packages intentionally ship TS source for consumers to transpile and only build CSS artifacts:

- `packages/ui` — Keep Tailwind CLI producing `dist/global.css`, keep granular TS exports pointing to `src/*`.

### Expo/RN workspaces (framework-built, Jest-only tests)

These keep Metro for bundling and Jest (`jest-expo`) for tests:

- `mobile/readon` — Expo app.
- `packages/ui-nativewind` — RN component library (NativeWind) aligned with Expo/Jest test tooling.

> Note: Any additional React Native libraries added in the future also remain Jest-only until a separate RN testing migration is planned.

### Config-only packages (no build output responsibility)

- `packages/config-eslint`
- `packages/config-prettier`
- `packages/config-tailwind`
- `packages/config-typescript`
- `packages/config-babel`
- `packages/expo-with-modify-gradle`
- `packages/config-jest` — retained for Expo/RN (jest-expo) consumers; removed only if/when Expo/RN also migrates off Jest.

---

## Risks / Unknowns (tsgo + Vite + Vitest Specific)

### tsgo (`@typescript/native-preview`) risks

- **Feature parity**: `tsgo` may not support every TS compiler edge-case or plugin behavior that `tsc` currently tolerates (especially around incremental/project references, or very new TS features).
- **tsconfig behavior**: validate that `tsgo -p <tsconfig>` respects the same `extends` chain and module resolution settings used across `@lellimecnar/typescript-config`.
- **Ecosystem expectations**: Next.js and Expo tooling still expect `typescript` to exist (for IDE/type tooling). Plan should likely keep `typescript` installed even if `tsgo` becomes the CI type-check engine.

### Vitest migration risks

- **Next.js tests**: Current Next test setup uses `next/jest` (which configures SWC/Next transforms). In Vitest, you’ll rely on Vitest’s transform pipeline for tests only. **This plan does not adopt Vite for Next builds**; it only replaces the test runner.
- **React Testing Library + jest-dom**: matchers must be switched to the Vitest-compatible import (`@testing-library/jest-dom/vitest`) and/or appropriate setup.
- **Jest-specific APIs**: `jest.mock`, `jest.fn`, fake timers, snapshot formatting, and `jest.requireActual` require migration to `vi.*` equivalents.
- **Coverage semantics differ**: Vitest thresholds apply differently than Jest in some cases (e.g., global thresholds include all included files). Existing thresholds may need recalibration.

### Expo / React Native limitations

- **RN transform story**: Today `jest-expo` + `babel-jest` + `transformIgnorePatterns` are critical to running RN tests.
  - Vitest does not have a first-party “jest-expo equivalent”.
- **Decision (per constraints)**: keep Jest for Expo/RN workspaces during this migration.

### Vite library build risks

- **ESM-only change**: Some packages appear to be consumed as CommonJS and/or have `exports` with `require` keys (`polymix`). This plan standardizes on ESM-only, which may require updating downstream consumers and/or documentation.
- **Externalization**: Ensure React, React DOM, and other peer deps are externalized to avoid duplicate React copies.
- **Monorepo resolution**: Vite/Vitest may need config tweaks for pnpm/workspace resolution patterns and path aliases.
- **CLI output**: `@ui-spec/cli` uses `bin` pointing at `dist/index.js`. Vite needs to produce an executable file (shebang/banner + executable bit), and avoid bundling Node built-ins incorrectly.

### Decorators / metadata

- `polymix` and some libs reference `reflect-metadata` / decorators. Vite build config may need explicit decorator lowering strategy if any package uses legacy decorators at runtime.

### CSS pipeline

- `@lellimecnar/ui` and `@lellimecnar/ui-nativewind` currently rely on Tailwind CLI builds. Introducing Vite for them would add complexity and potentially change CSS output behavior. Plan keeps Tailwind CLI.

---

## Implementation Steps (Commit-by-Commit PR Plan)

### Step 1: Add migration scaffolding + agree on conventions

**Files:**

- `turbo.json`
- `package.json`
- `plans/tsgo-vite-vitest-migration/plan.md`

**What:**

- Update Turborepo task inputs so future Vite/Vitest configs are tracked (e.g. include `vite.config.*`, `vitest.config.*`).
- Keep existing task names (`build`, `test`, `test:coverage`, `type-check`) to avoid changing dev muscle memory.

**Testing:**

- `pnpm -w lint`

---

### Step 2: Introduce `tsgo` as the monorepo type-check engine

**Files:**

- `package.json`
- Workspace `package.json` files that define `type-check` scripts:
  - `web/miller.pub/package.json`
  - `web/readon.app/package.json`
  - `mobile/readon/package.json`
  - `packages/*/package.json`
  - `card-stack/*/package.json`

**What:**

- Add `@typescript/native-preview` to root devDependencies (and keep `typescript` for framework expectations).
- Replace `tsc --noEmit` with `tsgo --noEmit` (or `tsgo -p <tsconfig> --noEmit` where a specific project file is used).
- Ensure scripts stay workspace-local (no `cd` usage).

**Testing:**

- `pnpm -w type-check`
- Spot-check: `pnpm --filter miller.pub type-check` and `pnpm --filter readon type-check`

---

### Step 3: Create shared Vitest config package (`@lellimecnar/vitest-config`)

**Files:**

- `packages/config-vitest/package.json` (new)
- `packages/config-vitest/base.ts` (new)
- `packages/config-vitest/browser.ts` (new)
- `packages/config-vitest/browser-jsdom.ts` (new)
- `packages/config-vitest/AGENTS.md` (new, minimal)

**What:**

- Mirror the existing `@lellimecnar/jest-config` pattern: a shared config package that depends on `vitest` and exports reusable configs.
- Provide:
  - Node base config (for most libraries)
  - Coverage defaults (provider `v8`, output `coverage/`)

- Configure monorepo-wide coverage policy in the shared config (non-blocking initially):
  - 80% minimum coverage target (lines/branches/functions/statements)
  - Coverage provider: `v8`
  - Coverage output directory: `coverage/`
  - Do not fail CI if target is not met (reporting-only)
  - Ignore packages where no tests run (for any reason)

- Include shared web/Next test setup helpers (composable exports):
  - React Testing Library defaults
  - `@testing-library/jest-dom` via the Vitest entry (`@testing-library/jest-dom/vitest`)
  - Next.js helpers/mocks exported as:
    - granular modules (e.g. navigation, image, headers, server)
    - presets built by composing those granular modules (e.g. an “app router” preset)

- Browser environment variants for tests:
  - Default browser preset uses `happy-dom`
  - Optional browser preset uses `jsdom`

**Testing:**

- `pnpm --filter @lellimecnar/vitest-config type-check`

---

### Step 4: Create shared Vite config package (`@lellimecnar/vite-config`)

**Files:**

- `packages/config-vite/package.json` (new)
- `packages/config-vite/base.ts` (new)
- `packages/config-vite/browser.ts` (new)
- `packages/config-vite/node.ts` (new)
- `packages/config-vite/AGENTS.md` (new, minimal)

**What:**

- Introduce a shared Vite config package following the same structural conventions as existing config packages.
- Export composable presets:
  - `@lellimecnar/vite-config` (base)
  - `@lellimecnar/vite-config/node`
  - `@lellimecnar/vite-config/browser` (browser-friendly Vite defaults; test environment is configured via `@lellimecnar/vitest-config`)
- Keep adoption opt-in: individual packages choose whether they import base/node/browser.

- Standardize package-level Vite configuration shape:
  - Each package has a `vite.config.ts` that is **composed from imports** from `@lellimecnar/vite-config`.
  - Keep each package’s config minimal and focused on package-specific entrypoints/externalization.

**Testing:**

- `pnpm --filter @lellimecnar/vite-config type-check`

---

### Step 5: Migrate pure Node libraries from Jest → Vitest (low risk)

**Files:**

- `packages/utils/package.json`
- `packages/utils/jest.config.js` (remove)
- `packages/utils/vitest.config.ts` (new)
- `packages/utils/src/**/*.spec.ts` (test-only edits as needed)
- `packages/polymix/package.json`
- `packages/polymix/jest.config.js` (remove)
- `packages/polymix/vitest.config.ts` (new)
- `card-stack/core/package.json`
- `card-stack/core/jest.config.js` (remove)
- `card-stack/core/vitest.config.ts` (new)
- `card-stack/deck-standard/package.json`
- `card-stack/deck-standard/jest.config.js` (remove)
- `card-stack/deck-standard/vitest.config.ts` (new)
- `packages/config-jest/*` (keep for now; will remove later)

**What:**

- Add `@lellimecnar/vitest-config` to devDependencies of each migrated package.
- Replace `test`, `test:watch`, `test:coverage` scripts with Vitest equivalents:
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `test:coverage`: `vitest run --coverage`
- Update Jest globals and mock APIs (`jest.*` → `vi.*`).

**Testing:**

- `pnpm --filter @lellimecnar/utils test`
- `pnpm --filter polymix test`
- `pnpm --filter @card-stack/core test`
- `pnpm --filter @card-stack/deck-standard test`

---

### Step 6: Migrate ui-spec packages from Jest → Vitest

**Files:**

- `packages/ui-spec/*/package.json`
- `packages/ui-spec/*/jest.config.js` (remove)
- `packages/ui-spec/*/vitest.config.ts` (new)
- `packages/ui-spec/*/src/**/*.spec.ts` (test-only edits as needed)

**What:**

- Same pattern as Step 4, using Node environment.
- Ensure `reflect-metadata` setup is replicated if tests require it.

**Testing:**

- `pnpm --filter @ui-spec/core test`
- `pnpm --filter @ui-spec/react test`
- `pnpm --filter @ui-spec/router test`
- `pnpm --filter @ui-spec/router-react test`
- `pnpm --filter @ui-spec/validate-jsonschema test`
- `pnpm --filter @ui-spec/cli test`

---

### Step 7: Migrate web UI library (`@lellimecnar/ui`) tests from Jest → Vitest (browser)

**Files:**

- `packages/ui/package.json`
- `packages/ui/jest.config.js` (remove)
- `packages/ui/vitest.config.ts` (new)
- `packages/ui/jest.setup.js` (rename or replace with Vitest setup)
- `packages/ui/src/**/*.spec.tsx` (test-only edits as needed)

**What:**

- Switch to a browser environment by opting into `@lellimecnar/vite-config/browser` (uses `happy-dom`).
- Replace `@testing-library/jest-dom` setup with `@testing-library/jest-dom/vitest` import.
- Preserve CSS module mocking behavior (Vitest: configure `test.css` handling via Vite, or keep `identity-obj-proxy` mapping with alias/plugins as needed).

**Testing:**

- `pnpm --filter @lellimecnar/ui test`

---

### Step 8: Migrate Next.js app tests from Jest → Vitest (browser)

**Files:**

- `web/miller.pub/package.json`
- `web/miller.pub/jest.config.js` (remove)
- `web/miller.pub/vitest.config.ts` (new)
- `web/readon.app/package.json`
- `web/readon.app/jest.config.js` (remove)
- `web/readon.app/vitest.config.ts` (new)
- `web/*/jest.setup.js` (replace with Vitest setup)
- `web/*/src/**/*.spec.tsx` (test-only edits as needed)

**What:**

- Replace `next/jest` flow with Vitest config **for tests only** (Next build remains unchanged).
- Replicate alias mapping (`@/` → `src/`).
- Ensure test env matches app expectations by opting into `@lellimecnar/vite-config/browser` (uses `happy-dom`) + URL.
- Use the shared Next.js test helpers from `@lellimecnar/vitest-config` as composable imports so both apps share the same mocks and setup.

**Testing:**

- `pnpm --filter miller.pub test`
- `pnpm --filter readon.app test`

---

### Step 9: Expo/RN tests: keep Jest (jest-expo), stop using ts-jest

**Files:**

- `mobile/readon/package.json`
- `mobile/readon/**` test setup files (only if needed to remove ts-jest assumptions)
- `packages/ui-nativewind/package.json`
- `packages/ui-nativewind/jest.config.cjs` (keep)

**What:**

- Keep `jest-expo` for Expo/RN reliability.
- Ensure these workspaces do not depend on `ts-jest` and are aligned to Babel/Metro expectations.
- Keep `packages/config-jest` available for Expo/RN presets.

**Testing:**

- `pnpm --filter readon test`
- `pnpm --filter @lellimecnar/ui-nativewind test`

---

### Step 10: Introduce Vite library builds for publishable TS packages (ESM-only)

**Files:**

- New `vite.config.ts` files for:
  - `packages/utils/vite.config.ts`
  - `packages/polymix/vite.config.ts`
  - `packages/ui-spec/*/vite.config.ts`
  - `card-stack/core/vite.config.ts`
  - `card-stack/deck-standard/vite.config.ts`
- Update their `package.json` build scripts to `vite build`.
- Update `exports`/`main`/`types` only as needed to preserve existing public entrypoints.

**What:**

- Use Vite library mode (`build.lib`) with:
  - Explicit entry file(s) per-package (single or multiple entrypoints, whichever fits the package’s public API).
  - `rollupOptions.external` listing dependencies/peer deps.
  - **Output format `es` only**.
- Configure **preserve modules** output so dist structure mirrors source modules (stable subpath exports, better tree-shaking):
  - `build.rollupOptions.output.preserveModules = true`
  - `build.rollupOptions.output.preserveModulesRoot` aligned to `src/`

- Standardize artifact naming for ESM-only + preserve-modules:
  - Emitted JS files are `.js` under `dist/`.
  - Emitted type declarations are `.d.ts` under `dist/`.
  - `package.json` `exports`/`main`/`types` (or `exports.types`) point to real `dist/**/*.js` and `dist/**/*.d.ts` targets.

- Use recommended Vite plugins as needed:
  - `vite-plugin-dts` to emit `.d.ts` into `dist/` aligned with preserve-modules output.
  - `vite-tsconfig-paths` (or equivalent) for TS path alias parity in build/test.
  - `@vitejs/plugin-react` (where React/JSX is part of the library build).

- Add an automated validation step to prevent broken publishes:
  - Add a repo script under `scripts/node/` that verifies each publishable package’s `exports` map resolves to files that exist under `dist/` after build.
  - Run this script via Turborepo once migrated packages have Vite builds.

- CLI packages:
  - Keep a source `bin/` directory in the package.
  - Copy `bin/` → `dist/` via `prebuild`/`postbuild` scripts so the shim lands in `dist/`.
  - Point `package.json#bin` at the copied file under `dist/`.

**Testing:**

- `pnpm --filter @lellimecnar/utils build`
- `pnpm --filter polymix build`
- `pnpm --filter @ui-spec/core build`
- `pnpm --filter @card-stack/core build`
- `pnpm --filter @card-stack/deck-standard build`

---

### Step 11: Fix “build-gap” packages to ensure dist outputs exist

**Files:**

- `card-stack/deck-standard/package.json`
- `card-stack/core/package.json`
- `packages/utils/package.json`

**What:**

- Ensure every package that advertises `dist/*` in `main/types/exports` actually produces those files in `pnpm --filter <pkg> build`.
- Align Turbo `build` outputs already configured (`dist/**`).

**Testing:**

- `pnpm -w build`

---

### Step 12: Update Turborepo test pipeline to Vitest-era inputs

**Files:**

- `turbo.json`

**What:**

- Replace Jest config inputs with Vitest config inputs (e.g. `vitest.config.*`).
- Keep `coverage/**` as cache output.
- Ensure root scripts continue to call `turbo test` / `turbo test:coverage` and that each workspace’s `test` script selects the correct runner (Vitest for most, Jest for Expo/RN).

- Ensure coverage reporting doesn’t fail packages where no tests run (for any reason).

**Testing:**

- `pnpm -w test`
- `pnpm -w test:coverage`

---

### Step 13: Remove Jest + ts-jest tooling and clean up configs

**Files:**

- Root `package.json`
- All migrated workspace `package.json` devDependencies

Delete (where migrated to Vitest):

- `packages/config-jest/*`
- `**/jest.config.*`
- any `jest.setup.js` replaced by vitest setup

**What:**

- Remove `jest`/`ts-jest` from workspaces that migrated to Vitest.
- Keep `jest-expo`/`babel-jest` and `@lellimecnar/jest-config` **only** for Expo/RN workspaces.
- Remove `ts-jest` broadly (Vitest does not need it), and ensure no remaining presets pull it in unnecessarily.

**Testing:**

- `pnpm -w test`
- `pnpm -w type-check`
- `pnpm -w build`

---

### Step 14: Final validation + documentation updates

**Files:**

- `AGENTS.md` (only if commands/patterns change)
- `docs/TESTING.md` (if it documents Jest)
- `docs/DEPENDENCY_MANAGEMENT.md` (if toolchain guidance changes)

**What:**

- Update docs to reflect new commands:
  - Vitest as the test runner.
  - `tsgo` as type-check engine.
  - Vite for **library** builds (Next builds unchanged; Expo tests remain Jest).

**Testing:**

- `pnpm -w lint`
- `pnpm -w test`
- `pnpm -w build`
- `pnpm -w type-check`
