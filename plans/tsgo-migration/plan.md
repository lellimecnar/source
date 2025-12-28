# Tsgo Migration

- **Branch:** `tsgo-migration`
- **Description:** Migrate all workspaces from `tsc` to `tsgo` (from `@typescript/native-preview`) for TypeScript compilation and type-checking, and ensure publishable libraries emit JS+types via `tsgo`.

## Goal

- Replace all direct `tsc` invocations in workspace `package.json` scripts (build/dev/type-check) with `tsgo` equivalents.
- Use `@typescript/native-preview`’s `tsgo` binary as a **drop-in replacement** for `tsc` (same flags, same `tsconfig` consumption).
- Ensure **libraries meant to be imported/published** (non-app workspaces like `packages/*` and `card-stack/*`) are compiled by `tsgo` (TS → JS + `.d.ts`), rather than relying on Next/SWC, Metro/Babel, or other app-level transpilers to compile TS sources.
- Preserve Turbo build graph behavior and caching expectations (`dist/**`, `.next/**`, CSS builds).
- Keep the developer experience intact (watch mode, CI, local workflows).

---

## Findings (Current State)

## Publishability & Build Responsibility Matrix

This repo has three distinct workspace types with different expectations:

1. **Apps** (Next.js / Expo):

- Not published.
- Use framework transpilers/bundlers (Next/SWC, Metro/Babel) to build the app.
- Still run `tsgo --noEmit` for type-checking.

2. **Runtime libraries** (published or imported by other workspaces):

- Must be **dist-first**.
- Must compile TS → JS + `.d.ts` via `tsgo`.
- Must not rely on apps/frameworks to transpile library TS sources.

3. **Config/tooling packages** (eslint/jest/prettier/tailwind/ts presets, config plugins):

- Typically publishable as configuration entrypoints (often JS/JSON/TS configs), but in this repo they are currently marked `private: true`.
- Must have stable entrypoints via `exports` (even if private) so imports are well-defined.
- TS compilation is usually unnecessary unless the package’s published surface is TS runtime code.

### Classified workspaces (based on current `package.json`)

**Runtime libraries that REQUIRE a `tsgo` build producing `dist/**`:\*\*

- `packages/utils` (`@lellimecnar/utils`): publishable runtime library (not `private`). Currently emits _types only_; must emit JS + types.
- `packages/polymix` (`polymix`): publishable runtime library (not `private`). Already dist-first with `exports` to `dist/**`.
- `packages/ui-spec/*` (`@ui-spec/*`): publishable runtime libs/CLI (not `private`). Already dist-first with `exports` to `dist/**`.
- `card-stack/core` (`@card-stack/core`): runtime library (not `private`). Currently **src-first** (`exports`/`main`/`types` point to `src/**`); must become dist-first.
- `card-stack/deck-standard` (`@card-stack/deck-standard`): runtime library (not `private`) already points `main/types` to `dist/**` but currently lacks an explicit build script and lacks `exports`; should be standardized.
- `packages/ui` (`@lellimecnar/ui`): runtime component library (not `private`) but currently **exports TS source files** while only shipping `dist/global.css` in `files`. This is inconsistent; must become dist-first and update `exports` to `dist/**`.
- - Additionally, its current export surface includes helper-style modules (e.g. `./lib`, `./lib/utils`) which should be trimmed; only intentional public entrypoints should remain.
- `packages/ui-nativewind` (`@lellimecnar/ui-nativewind`): runtime component library (not `private`) but currently **src-first** (`exports` and `main` point to `src/**`); must become dist-first.

**Apps (type-check only via `tsgo --noEmit`, no library-style dist build required):**

- `web/miller.pub`
- `web/readon.app`
- `mobile/readon`

**Config/tooling packages (entrypoints must be explicit; typically no TS build):**

- `packages/config-eslint` (`@lellimecnar/eslint-config`): `private: true`, already has `exports`.
- `packages/config-jest` (`@lellimecnar/jest-config`): `private: true`, has `files` but **no `exports`** today.
- `packages/config-prettier` (`@lellimecnar/prettier-config`): `private: true`, has `main` but **no `exports`** today.
- `packages/config-tailwind` (`@lellimecnar/tailwind-config`): `private: true`, has `exports`.
- `packages/config-typescript` (`@lellimecnar/typescript-config`): `private: true`, has `exports`.
- `packages/config-babel` (`@lellimecnar/babel-preset`): `private: true`, has `exports`.
- `packages/expo-with-modify-gradle` (`@lellimecnar/expo-with-modify-gradle`): `private: true`, has `exports`.

### Orchestration (pnpm + Turbo)

- Root scripts in `package.json`:
  - `pnpm build` → `turbo build`
  - `pnpm type-check` → `turbo type-check`
  - `pnpm test` → `turbo test`
  - `pnpm lint` → `turbo lint`
- Turbo pipeline in `turbo.json`:
  - `build` depends on `^build` and caches `dist/**` and `.next/**` (excluding `.next/cache/**`).
  - `type-check` depends on `^build` and has **no declared outputs**.
  - `dev` is persistent / not cached.
- CI workflow `.github/workflows/ci.yml` runs:
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

### Where `tsc` is invoked today

**Build-time `tsc` (emits `dist/**`):\*\*

- `packages/utils`:
  - `build`: `tsc -p tsconfig.build.json`
  - `tsconfig.build.json` sets:
    - `outDir: ./dist`, `declaration: true`, `declarationMap: true`, `emitDeclarationOnly: true`, `noEmit: false`
  - Note: this configuration emits **only** `.d.ts` (+ `.d.ts.map`) into `dist/`.
- `packages/polymix`:
  - `build`: `tsc -p tsconfig.build.json` (after cleaning `dist/`)
  - `dev`: `tsc -p tsconfig.build.json --watch`
  - `tsconfig.json` sets `outDir/rootDir`, `noEmit: false`, `declaration + maps`, `sourceMap`, `module: NodeNext`, decorators flags.
  - `tsconfig.build.json` extends `tsconfig.json` and primarily adjusts include/exclude.
- `packages/ui-spec/*` (multiple packages):
  - `@ui-spec/core`, `@ui-spec/cli`, `@ui-spec/react`, `@ui-spec/router`, `@ui-spec/router-react`, `@ui-spec/validate-jsonschema`
  - Each has `build: tsc -p tsconfig.json` producing `dist/**`.

**Type-check-only `tsc` (`--noEmit`):**

- Root-level `pnpm type-check` (via Turbo) runs each workspace `type-check` script.
- These workspaces have `type-check` scripts that call `tsc`:
  - `web/miller.pub`: `tsc --noEmit`
  - `web/readon.app`: `tsc --noEmit`
  - `mobile/readon`: `tsc --noEmit`
  - `packages/ui`: `tsc --noEmit`
  - `packages/ui-nativewind`: `tsc --noEmit`
  - `packages/utils`: `tsc --noEmit`
  - `packages/polymix`: `tsc --noEmit`
  - `packages/config-*`:
    - `@lellimecnar/typescript-config`, `@lellimecnar/eslint-config`, `@lellimecnar/jest-config`, `@lellimecnar/prettier-config`, `@lellimecnar/tailwind-config`, `@lellimecnar/expo-with-modify-gradle`
  - `card-stack/*`:
    - `@card-stack/core`: `tsc --noEmit`
    - `@card-stack/deck-standard`: `tsc --noEmit`

### tsconfig inheritance & notable compiler options

- Global: root `tsconfig.json` extends `@lellimecnar/typescript-config`.
- `@lellimecnar/typescript-config` presets:
  - `base.json` extends `@vercel/style-guide/typescript/node20` and sets:
    - `allowJs: true`, `checkJs: true`, `resolveJsonModule: true`, `esModuleInterop: true`, `noEmit: true`.
  - `next.json` extends `base.json` and sets:
    - `plugins: [{ name: "next" }]`, `incremental: true`, `jsx: preserve`.
  - `react.json` extends `base.json` and sets:
    - `jsx: react-jsx`, `target: ES6`.

Notable per-workspace config patterns:

- Next.js apps (`web/miller.pub`, `web/readon.app`):
  - Extend `@lellimecnar/typescript-config/next.json`.
  - Set `isolatedModules: true` and include `.next/types/**/*.ts`.
  - `miller.pub` also includes `../../packages/ui/src/components/page.tsx` explicitly.
  - Both have custom `paths` mapping into monorepo sources.
- Expo app (`mobile/readon`):
  - Extends `expo/tsconfig.base`.
  - Includes `.expo/types/**/*.ts` and Expo Router route glob patterns.
- Card-stack packages (`card-stack/core`, `card-stack/deck-standard`):
  - Extend `@lellimecnar/typescript-config`.
  - Set `module/moduleResolution: NodeNext` and enable `experimentalDecorators` + `emitDecoratorMetadata`.
- UI packages (`packages/ui`, `packages/ui-nativewind`):
  - Extend `@lellimecnar/typescript-config/react.json` and use path aliases.
  - Their `build` scripts are Tailwind CSS compilation (not TS compilation).

### Build outputs and artifact references

- Turbo caches `dist/**` and `.next/**` by default.
- Root `.gitignore` ignores `dist/`, `build/`, `.next/`, `.turbo/`, and Expo `.expo/`.
- Next apps generate `.next/types/**` which are included in TS type-check.
- Expo app may generate `.expo/types/**` which is included in TS type-check.

### Special constraints / packages to treat carefully

- Next.js apps:
  - `next.config.js` uses `transpilePackages: ['@lellimecnar/ui', '@lellimecnar/utils']` and a webpack alias pointing `@lellimecnar/utils` to `packages/utils/src/index.ts`.
  - TS configs use Next’s TS plugin and reference `.next/types`.

**Library compilation gap (new requirement):**

- Several libraries are currently effectively “source-first”:
  - `@lellimecnar/utils` is explicitly aliased to `src/` in Next, and its `build` only emits types.
  - `@lellimecnar/ui` and `@lellimecnar/ui-nativewind` do not emit JS outputs via a TS compiler.
- To satisfy “libraries compile with `tsgo` only”, this migration includes converting these to “dist-first” packages where TS → JS happens in the library build.
- Expo app:
  - Extends Expo base TS config; may rely on Expo-specific defaults.
- Decorators:
  - `polymix` and `card-stack/*` set `emitDecoratorMetadata` + `experimentalDecorators`.
- ts-jest:
  - Several packages use `ts-jest` for tests; it relies on the `typescript` package/TS compiler API even if builds move to `tsgo`.

---

## Risks / Unknowns (tsc → tsgo)

> These are **migration-specific** risks based on current configs and typical compiler parity gaps.

### Tool identity & installation

- `tsgo` is provided by the `@typescript/native-preview` package.
- Primary risk is operational (install/CI portability) rather than CLI differences, since it is intended as a drop-in `tsc` replacement.

### Feature parity gaps to validate early

- **Config parsing / extends**:
  - Must support `extends` chains including external presets (`@vercel/style-guide/...`, `expo/tsconfig.base`).
- **TS language service plugins** (`plugins: [{ name: "next" }]`):
  - Note: `tsc` does not apply language service plugins during compilation/type-check; they primarily affect editor/tsserver behavior.
  - This is _not_ expected to block `tsgo` as a `tsc` replacement, but diagnostics may still vary slightly between compilers.
- **Incremental builds**:
  - `@lellimecnar/typescript-config/next.json` sets `incremental: true`. If `tsgo` doesn’t implement TS incremental semantics (or writes incompatible `.tsbuildinfo`), local dev/CI behavior could diverge.
- **Declaration emit and maps**:
  - Several packages rely on `declaration`, `declarationMap`, and `emitDeclarationOnly`.
  - `packages/utils` is currently configured as “types-only emit”; `tsgo` must match output shape and sourcemap mapping.
- **Module system semantics**:
  - `module: NodeNext` and `moduleResolution: NodeNext` are used (polymix, card-stack). Output semantics must match ESM/CJS expectations.
- **Path mapping**:
  - Many workspaces use `compilerOptions.paths` for monorepo-relative imports.
- **Allow/check JS**:
  - Base config uses `allowJs: true` + `checkJs: true`. If `tsgo` doesn’t support `checkJs`, the config packages may lose coverage.
- **Decorators**:
  - `experimentalDecorators` + `emitDecoratorMetadata` must produce equivalent metadata typing and/or declaration output.
- **Watch mode**:
  - `polymix` uses `tsc --watch`; parity for watch mode (and stable output) matters.

### Ecosystem tooling coupling

- **ts-jest**:
  - Even if builds use `tsgo`, Jest via `ts-jest` will likely still require `typescript` installed.
  - Assumption: keep `typescript` as a devDependency (at least temporarily) for tooling that depends on the TS compiler API.

---

## Rollout strategy (dual compiler / canary)

### Dual-compiler approach (optional, time-boxed)

- Because `tsgo` is a drop-in for `tsc`, the simplest migration is to replace `tsc` → `tsgo` in scripts.
- To reduce risk, keep a temporary _opt-in_ fallback lane in CI that still runs `tsc` for comparison during rollout.
- Avoid introducing a custom wrapper unless an actual compatibility issue is discovered.

### Canary strategy

- Canary `tsgo` first on **library build packages** that emit `dist/**` (ui-spec packages, polymix).
- Then convert “source-first” libraries to “dist-first” (utils, ui, ui-nativewind, card-stack).
- Finally migrate **type-check-only** workspaces (web apps, mobile app, config packages).

### CI changes

- Add a temporary CI comparison lane that runs `pnpm type-check` with `tsc` (baseline) alongside the `tsgo` lane.
- When stable, remove the `tsc` lane.

### Rollback plan

- Keep `typescript` + `tsc` available for at least one release cycle.
- If a critical regression occurs, revert script replacements (`tsgo` → `tsc`) in a single follow-up commit.

---

## Implementation Steps (Single PR, commit-by-commit)

> Each step below is intended to be a separate commit in ONE PR on branch `tsgo-migration`.

### Step 1: Add `@typescript/native-preview` (introduces `tsgo`) and keep behavior unchanged

- **Files:**
  - `package.json`
  - `pnpm-lock.yaml`
  - (Optional) `docs/tsgo-migration.md`
- **What:**
  - Add `@typescript/native-preview` at the repo root so `tsgo` is available as a workspace tool.
  - Keep existing `tsc` scripts unchanged in this commit to reduce churn and to establish a clean baseline.
  - Record the expected invariants for this migration:
    - `tsgo` is used wherever we previously used `tsc`.
    - libraries emit JS + `.d.ts` from their own builds.
- **Testing:**
  - `pnpm type-check`
  - `pnpm build`
  - `pnpm test`

### Step 2: Replace `tsc --noEmit` with `tsgo --noEmit` everywhere (pure type-checking)

- **Files:**
  - `web/miller.pub/package.json`
  - `web/readon.app/package.json`
  - `mobile/readon/package.json`
  - `packages/ui/package.json`
  - `packages/ui-nativewind/package.json`
  - `packages/utils/package.json`
  - `packages/polymix/package.json`
  - `packages/config-eslint/package.json`
  - `packages/config-jest/package.json`
  - `packages/config-prettier/package.json`
  - `packages/config-tailwind/package.json`
  - `packages/config-typescript/package.json`
  - `packages/expo-with-modify-gradle/package.json`
  - `card-stack/core/package.json`
  - `card-stack/deck-standard/package.json`
  - `packages/ui-spec/*/package.json`
- **What:**
  - Replace all `tsc --noEmit` calls with `tsgo --noEmit`.
  - Leave build scripts unchanged for now.
- **Testing:**
  - `pnpm type-check` (full repo)

### Step 3: Canary migrate existing library builds from `tsc` to `tsgo` (no behavior change expected)

- **Files:**
  - `packages/ui-spec/*/package.json`
  - `packages/polymix/package.json`
  - (Optional) `packages/utils/package.json` (type-check already migrated in Step 2)
- **What:**
  - Replace `tsc -p ...` with `tsgo -p ...` in packages that already build their own `dist/**`.
  - Preserve watch mode where it exists (e.g. `polymix` `--watch`).
- **Testing:**
  - `pnpm --filter "@ui-spec/*" build`
  - `pnpm --filter polymix build`
  - `pnpm --filter polymix test`

### Step 4: Define & apply `package.json` entrypoint standards across the monorepo

- **Files:**
  - All workspace `package.json` files (apps, libs, config packages)
  - (Optional) `docs/package-contracts.md`
- **What:**
  - Establish and apply a consistent “package manifest contract” so every workspace has correct, explicit entrypoints.
  - Enforce by package type:
    - **Apps**: set `private: true` (if not already), no `main/types/exports` required beyond app needs.
    - **Runtime libraries**: require `exports` and `files` and make them point to build outputs.
    - **Config/tooling**: require `exports` (even if `private`) pointing to the config entry file(s); add `files` if needed.
  - Concretely, require these fields where applicable:
    - Runtime libs (ESM-only):
      - `type: "module"`
      - `engines.node: ">=24"` (matches repo’s Node requirement)
      - `exports` (root + any subpaths) using `types` + `import` targets (no `require` targets)
      - `types` (top-level, optional if every `exports` entry declares `types`, but keep for compatibility)
      - `files: ["dist"]`
      - `sideEffects` (keep existing setting; CSS packages include `**/*.css`)
    - CLI packages: include `bin` and ensure it points to a built JS file.
    - Config packages: `exports` pointing at `.js/.json/.ts` config entrypoints; `files` enumerating shipped config files.

  - Granular exports policy:
    - Preserve existing granular export paths (e.g. `@lellimecnar/ui/button`).
    - Only introduce wildcard/pattern exports if they do **not** change public import paths and do not create ambiguous duplicates (i.e. avoid both a wildcard and an explicit export that resolve to the same specifier).
    - Do **not** export internal helper/util modules as public API (e.g. avoid `./lib` and `./lib/utils` in `@lellimecnar/ui`).

  - Root export policy (locked):
    - It is acceptable to **omit** the root export (`exports["."]`) for packages where you don’t want consumers importing “the whole package”.
    - If the package can be organized such that tree-shaking produces effectively the same result as granular imports, prefer providing a root export for convenience.

  - `@lellimecnar/ui` export policy (locked):
    - Export modules that are **useful to package consumers**.
    - Keep component exports and other consumer-facing modules as supported public API.
    - Explicitly include these non-component entrypoints as public API: `./icons`, `./qrcode`, `./theme`, `./hooks`.
    - Keep helper-style/internal modules unexported.

- **Testing:**
  - No functional behavior change expected; run `pnpm type-check` to ensure JSON edits didn’t break tooling.

#### `exports` examples (copy patterns, adjust paths)

These examples are intentionally **ESM-only** and show the preferred structure for this migration.

**Example: ESM-only runtime library (single entrypoint)**

```json
{
	"type": "module",
	"main": "./dist/index.js",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"import": "./dist/index.js"
		}
	},
	"types": "./dist/index.d.ts",
	"files": ["dist"]
}
```

Applies to: `@lellimecnar/utils`, `@card-stack/core`, `@card-stack/deck-standard`, `@ui-spec/*` (root export), and any similar single-entry libraries.

**Example: `polymix` (currently dual-mode) → ESM-only**

```json
{
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"import": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"sideEffects": false
}
```

Note: remove `require` targets from `exports`.

**Example: `@lellimecnar/ui` (granular subpath exports; keep surface, point to `dist/**`)\*\*

This assumes the `tsgo` build preserves source-relative structure under `dist/` (e.g. `src/components/button.tsx` → `dist/components/button.js` + `dist/components/button.d.ts`). No flattening.

```json
{
	"type": "module",
	"engines": { "node": ">=24" },
	"main": "./dist/index.js",
	"sideEffects": ["**/*.css"],
	"exports": {
		"./global.css": "./dist/global.css",

		"./icons": {
			"types": "./dist/icons/index.d.ts",
			"import": "./dist/icons/index.js"
		},
		"./qrcode": {
			"types": "./dist/qrcode/index.d.ts",
			"import": "./dist/qrcode/index.js"
		},
		"./theme": {
			"types": "./dist/theme/index.d.ts",
			"import": "./dist/theme/index.js"
		},
		"./hooks": {
			"types": "./dist/hooks/index.d.ts",
			"import": "./dist/hooks/index.js"
		},

		"./button": {
			"types": "./dist/components/button.d.ts",
			"import": "./dist/components/button.js"
		},
		"./checkbox": {
			"types": "./dist/components/checkbox.d.ts",
			"import": "./dist/components/checkbox.js"
		}
	},
	"types": "./dist/index.d.ts",
	"files": ["dist"]
}
```

Note: `packages/ui` currently does not appear to have a `src/hooks` directory; during implementation, create a stable public hooks entrypoint (e.g. `src/hooks/index.ts`) that re-exports whichever hooks are intended to be public, so the `./hooks` export target exists in `dist/**`.

Granular exports rule: if you introduce a wildcard like `"./components/*"`, do it only if it does not change public import paths and does not overlap with an explicit export that would resolve to the same specifier.

**Example: `@lellimecnar/ui-nativewind` (few subpaths; move `src/**`→`dist/**`)**

```json
{
	"type": "module",
	"main": "./dist/index.js",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"import": "./dist/index.js"
		},
		"./components": {
			"types": "./dist/components/index.d.ts",
			"import": "./dist/components/index.js"
		},
		"./view": {
			"types": "./dist/components/view.d.ts",
			"import": "./dist/components/view.js"
		}
	},
	"types": "./dist/index.d.ts",
	"files": ["dist"]
}
```

**Example: config package (private, JS entrypoint via `exports`)**

For config packages, prefer explicit `exports` even when `private: true`.

```json
{
	"private": true,
	"exports": {
		".": "./jest-preset.js",
		"./browser": "./browser/jest-preset.js"
	},
	"files": ["./jest-preset.js", "./browser/jest-preset.js"]
}
```

### Step 5: Convert runtime libraries from “src-first” to “dist-first” builds via `tsgo`

- **Files:**
  - `packages/utils/package.json`
  - `packages/utils/tsconfig.build.json`
  - `packages/ui/package.json`
  - `packages/ui/tsconfig.build.json` (new)
  - `packages/ui-nativewind/package.json`
  - `packages/ui-nativewind/tsconfig.build.json` (new)
  - `card-stack/core/package.json`
  - `card-stack/core/tsconfig.build.json` (new)
  - `card-stack/deck-standard/package.json`
  - `card-stack/deck-standard/tsconfig.build.json` (new)
  - (Optional) a shared root preset: `tsconfig.build.base.json` (new) to reduce per-package duplication
- **What:**
  - For each library package that is intended to be imported/published, ensure it has a `tsgo` build that emits:
    - runtime JS into `dist/**`
    - `.d.ts` (and maps where desired)

  - Output format decisions (locked):
    - **ESM-only** output for runtime libraries.
    - **No sourcemaps**: do not emit `.js.map`.
    - **No declaration maps**: do not emit `.d.ts.map`.

  - Output structure decision (locked):
    - Preserve a stable folder layout in `dist/**` that mirrors source layout closely enough to support granular subpath exports without flattening.

  - Practical implications for build `tsconfig.build.json` (per library):
    - Set `target: "ES2022"`.
    - Use the **most compatible** ESM emit settings for Node + modern browsers:
      - Prefer `module: "NodeNext"` and `moduleResolution: "NodeNext"` so emitted JS has correct import specifiers for Node ESM (including `.js` extensions on relative imports).
      - Keep ESM-only (no CJS outputs).
    - Set `sourceMap: false`.
    - Set `declarationMap: false`.
    - Ensure `declaration: true`.
    - Ensure `noEmit: false`.
  - Update `package.json` entrypoints to match the output layout:
    - For `@lellimecnar/ui`: keep its granular subpath export surface, but switch targets from `./src/**` to `./dist/**`.
    - For `@lellimecnar/ui-nativewind`: switch `exports`/`main` from `./src/**` to `./dist/**`.
    - For `@card-stack/core`: change `exports`/`main`/`types` from `./src/index.ts` to `./dist/index.js` and `./dist/index.d.ts`.
    - For `@card-stack/deck-standard`: add `exports` and ensure build produces `dist/index.js` + `dist/index.d.ts`.
  - `@lellimecnar/utils`:
    - Change from “types-only emit” to “JS + types emit” by removing `emitDeclarationOnly`.
  - `@lellimecnar/ui` and `@lellimecnar/ui-nativewind`:
    - Add a `tsconfig.build.json` and a `build:ts` that compiles TS sources via `tsgo`.
    - Update `build` to run **both** TS + CSS builds (separate commands, single entrypoint).
  - `@card-stack/*`:
    - Add a proper build that emits `dist/**` and update `package.json` entrypoints accordingly.
    - Standardize on the same ESM emit settings as other runtime libs (prefer `module: "NodeNext"` for compatibility).

  - `@ui-spec/cli` output decision (locked):
    - Keep a single-file CLI entrypoint at `dist/index.js` to match the existing `bin` contract.

- **Testing:**
  - `pnpm --filter @lellimecnar/utils build`
  - `pnpm --filter @lellimecnar/ui build`
  - `pnpm --filter @lellimecnar/ui-nativewind build`
  - `pnpm --filter @card-stack/core build`
  - `pnpm --filter @card-stack/deck-standard build`
  - Verify `dist/**` exists and `package.json` `main`/`types` resolve to real files.

### Step 6: Update consumers so apps no longer compile library TS from source

- **Files:**
  - `web/miller.pub/next.config.js`
  - `web/readon.app/next.config.js`
  - `mobile/readon/metro.config.js` (if it aliases to source packages)
  - Any app-level TS path aliases pointing into `packages/*/src`
- **What:**
  - Remove (or reduce) app-level aliases that point to `packages/*/src/**` for runtime imports.
  - Prefer importing library packages via their published entrypoints (now `dist/**`).
  - Reduce the need for `transpilePackages` where possible (optional), since libraries now ship JS.
- **Testing:**
  - `pnpm miller.pub build`
  - `pnpm readon.app build`
  - `pnpm readon dev:web` (or the repo’s standard mobile web build)

### Step 7: Switch remaining library build scripts to `tsgo` (tsc fully removed from libraries)

- **Files:**
  - Any remaining `packages/*/package.json` and `card-stack/*/package.json` that still reference `tsc`
- **What:**
  - Ensure all library workspaces build via `tsgo -p tsconfig.build.json` (or equivalent).
  - Ensure watch mode uses `tsgo --watch` where previously `tsc --watch` existed.
- **Testing:**
  - `pnpm build` (full repo)

### Step 8: Update Turbo/CI to standardize on `tsgo`

- **Files:**
  - `.github/workflows/ci.yml`
  - `turbo.json` (only if needed)
- **What:**
  - CI runs `pnpm type-check` and `pnpm build` using `tsgo`.
  - Add a temporary comparison lane (optional) that runs `pnpm type-check` with `tsc` for parity.
- **Testing:**
  - CI green: `type-check`, `lint`, `test`, `build`.

### Step 9: Add enforcement to prevent reintroducing `tsc`

- **Files:**
  - `.github/workflows/ci.yml` (or a repo script run by CI)
  - `packages/config-eslint/base.js` (or the appropriate shared config file)
- **What:**
  - Add a simple guard (grep) that fails CI if `\btsc\b` appears in workspace scripts.
  - Keep the guard narrowly scoped to scripts (avoid false positives in docs).

  - Add ESLint enforcement to prevent cross-workspace “non-entrypoint” imports:
    - Disallow importing into another workspace’s internal paths (e.g. `@lellimecnar/utils/src/*`, `@lellimecnar/ui/src/*`, `@card-stack/core/src/*`).
    - Allow only the package entrypoints declared in `exports`.
    - Apply to cross-workspace imports only: any workspace importing another workspace must use that dependency’s public entrypoints.
    - This applies to **all** imports, including type-only imports; types must be surfaced via `exports`.
    - Implementation approach should reuse existing ESLint ecosystem already in the repo (prefer `no-restricted-imports` and/or `import/no-internal-modules` rules over introducing a new plugin unless strictly needed).

- **Testing:**
  - CI fails when `tsc` is reintroduced.
  - ESLint fails when a non-entrypoint import is introduced across packages.

### Step 10: Optional cleanup (time-boxed)

- **Files:**
  - Root `package.json` (optional)
  - Documentation (optional)
- **What:**
  - Keep Jest/`ts-jest`/`typescript` unchanged during this migration to avoid churn, since Jest is expected to be replaced by Vitest soon.
  - Document the new standard: “use `tsgo` for TS compilation/type-checking; runtime libraries ship ESM-only `dist/**` outputs with declarations (no sourcemaps)”.
- **Testing:**
  - No additional tests beyond existing CI.

---

## Verification checklist (definition of done)

- `pnpm build` succeeds on CI and locally.
- `pnpm type-check` succeeds on CI and locally with `TS_COMPILER=tsgo`.
- `pnpm test` succeeds.
- For all packages that emit `dist/**`:
  - `dist/` contains expected ESM JS + `.d.ts` outputs (no `.map` files).
  - `package.json` `main`/`types` resolve to files that actually exist after build.
  - `package.json` `exports` do not reference `src/**` for runtime entrypoints.
  - `package.json` `exports` do not include `require` targets for runtime libraries.

---

## Locked decisions (applied in this plan)

- Runtime libraries ship **ESM-only** output.
- Preserve granular subpath exports; only add wildcards when they don’t change import paths and don’t create duplicates.
- Do not export internal helper/util modules as public API (trim `@lellimecnar/ui` helper exports like `./lib` and `./lib/utils`).
- `@lellimecnar/ui` exports these consumer-facing modules: `./icons`, `./qrcode`, `./theme`, `./hooks`.
- Config/tooling packages remain `private: true`.
- Keep Jest/`ts-jest`/`typescript` unchanged during this migration (Vitest migration is out of scope).
- Declarations are required; sourcemaps and declaration maps are not.
- Preserve `dist/**` folder structure (no flattening).
- Target environments are Node and modern browsers.
- Compile target is **ES2022**.
- Runtime library emit settings should be chosen for maximum compatibility (prefer `module/moduleResolution: NodeNext`).
- Enforce consistent `exports` shape for runtime libraries and keep `main` for compatibility.
- Add an ESLint rule to prevent cross-package non-entrypoint imports (cross-workspace only).
- No deep imports, including type-only deep imports; types must be exported via public entrypoints.
- `@ui-spec/cli` remains a single-file CLI entrypoint (`dist/index.js`).
- `@lellimecnar/ui` only exports consumer-facing modules; helper/internal modules stay unexported.
- Root export is optional for packages where it’s undesirable; prefer it only when tree-shaking makes it equivalent.
- For `@lellimecnar/ui` and `@lellimecnar/ui-nativewind`, `build` runs both TS and CSS outputs (via separate underlying commands).
