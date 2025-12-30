<!-- markdownlint-disable-file -->

# Task Research Notes: jsonpath implementation plan support

## Research Executed

### File Analysis

- package.json
  - Monorepo scripts (`turbo build/test/type-check`) and toolchain versions: Node `^24.12.0`, pnpm `9.12.2`, TypeScript `~5.5`, Vite `^7.3.0`, Vitest `^4.0.16`, `vite-plugin-dts` `^4.5.4`, `vite-tsconfig-paths` `^6.0.3`.

- vitest.config.ts
  - Root Vitest uses `test.projects` globs to run per-workspace `vitest.config.ts` files (packages, card-stack, ui-spec, web).

- turbo.json
  - Pipeline ground truth:
    - `build` depends on `^build`, outputs `dist/**` and `.next/**` (excluding `.next/cache/**`), and includes `.env*` in task inputs.
    - `test` outputs `coverage/**`.
    - `test:coverage`/`test:ci` depend on `^build` and include `vitest.config.*`/`vite.config.*` in task inputs.
    - `dev` and `test:watch` are persistent and not cached.

- scripts/node/verify-dist-exports.mjs
  - Validates that any `package.json` `main`, `types`, and `exports` targets pointing at `./dist/*` actually exist on disk; used by root script `verify:exports`.

- packages/config-vite/base.ts
  - Shared Vite base config: adds `vite-tsconfig-paths` plugin and sets `build.emptyOutDir: true`.

- packages/config-vite/node.ts
  - Node build config composes `viteBaseConfig()`; packages can override target/externalization.

- packages/config-vite/browser.ts
  - Browser build config composes `viteBaseConfig()`.

- packages/config-vitest/base.ts
  - Shared Vitest base config: `globals: true`, `passWithNoTests: true`, coverage via `@vitest/coverage-v8`, and shared `setupFiles` (`setup/reflect-metadata.ts`).

- packages/config-vitest/browser.ts
  - `vitestBrowserConfigHappyDom()` uses `happy-dom`, extends `setupFiles` with `setup/testing-library.ts`.
  - `vitestBrowserConfigHappyDomNextAppRouter()` further extends `setupFiles` with `setup/next-app-router.ts`.

- packages/config-vitest/browser-jsdom.ts
  - `vitestBrowserConfigJsdom()` swaps environment to `jsdom` while preserving the happy-dom baseline config.

- packages/polymix/vite.config.ts
  - Representative library build: `build.lib.entry = 'src/index.ts'`, format `es`, output `preserveModules: true`, `preserveModulesRoot: 'src'`, `entryFileNames: '[name].js'`.
  - Types via `vite-plugin-dts` with `entryRoot: 'src'`, `tsconfigPath: 'tsconfig.json'`, `outDir: 'dist'`.
  - Externalization: `node:` builtins + `dependencies`/`peerDependencies` (incl deep imports `dep/*`).

- packages/polymix/package.json
  - ESM library publishing: `type: "module"`, `exports` points to `./dist/index.js` and `./dist/index.d.ts`, `files: ["dist"]`, `prepack` runs build.

- packages/ui-spec/cli/package.json
  - CLI `bin` points at `./dist/bin/uispec.js`.
  - `postbuild` copies `bin/` into `dist/bin/` to satisfy the bin entry.

- packages/ui-spec/core/src/bindings/jsonpath.ts
  - Existing JSON traversal utilities (repo-local behavioral contract):
    - `readJsonPath(json, path, { evalMode })` uses `jsonpath-plus` `JSONPath` with `{ wrap: true, eval: evalMode ?? 'safe' }`.
      - Return shape: `[]` -> `undefined`; `[x]` -> `x`; `[..., many]` -> array.
    - `findJsonPathPointers(json, path, { evalMode })` uses `resultType: 'pointer'` and returns a string[] (or `[]`).
    - JSON Pointer helpers:
      - `getByJsonPointer(root, pointer)`: `''` and `'/'` return root.
      - `setByJsonPointer(root, pointer, value)`: forbids setting `''`/`'/'` (returns `{ ok:false }`); traverses object/array containers; sets `current[last] = value`.
      - `removeByJsonPointer(root, pointer)`: forbids removing `''`/`'/'` (returns `{ ok:false }`); array removal uses `splice(index, 1)` when last segment is numeric; otherwise deletes object property.

- packages/ui-spec/core/src/store/store.ts
  - Store semantics relevant to JSONPath mutation design:
    - Reads delegate to `readJsonPath(data, path, { evalMode })`.
    - Writes are pointer-backed: `findJsonPathPointers(data, path)` then apply per pointer.
    - Write result accounting:
      - `matched` is number of pointers.
      - `changed` increments per pointer when `!Object.is(before, after)`.
      - `errors` collects `{ path, pointer, message }` for failed pointer ops.
    - Ensures top-level reference changes for “external-store semantics” by cloning via `JSON.parse(JSON.stringify(data))` when data is a plain object or array.
    - Supports batching (`batch`, `transaction`) to defer notifications.

- specs/jsonpath.md
  - Product constraints to align future `@jsonpath/*` work:
    - Plugin-first ecosystem; `@jsonpath/core` is framework-only.
    - RFC 9535 behavior bundled in `@jsonpath/plugin-rfc-9535`.
    - Script expressions are sandboxed via `ses`.
    - CLI config is JSON only.
    - Mutation is pointer-backed.
    - Validation is an ecosystem: validate plugin + validator adapters.

- plans/jsonpath/plan.md
  - Confirms grounding points used for this research note (existing `jsonpath-plus` usage + pointer approach) and flags spec contradictions to resolve.

### Code Search Results

- "\"bin\"\\s\*:"
  - 1 match: packages/ui-spec/cli/package.json

- postbuild|prepack|copy|cp
  - `prepack` pattern: packages/polymix/package.json
  - CLI bin copy pattern: packages/ui-spec/cli/package.json (`postbuild` copies `bin` → `dist/bin`)

- viteNodeConfig\(|@lellimecnar/vite-config/node
  - Matches in many packages’ `vite.config.ts`, including card-stack, utils, ui-spec packages, and polymix (shared pattern).

- readJsonPath\(|findJsonPathPointers\(|getByJsonPointer\(|setByJsonPointer\(|removeByJsonPointer\(
  - Verified in: `packages/ui-spec/core/src/bindings/jsonpath.ts` and used by `packages/ui-spec/core/src/store/store.ts`.

- JSON\.parse\(JSON\.stringify\(
  - Verified in `packages/ui-spec/core/src/store/store.ts` to force top-level reference updates after pointer writes.

### External Research

- #fetch:https://vite.dev/guide/build.html#library-mode
  - Library mode uses `build.lib` and recommends externalizing deps you don’t want bundled (example external `['vue']`).
  - Library mode produces `es`+`umd` for single entry, and `es`+`cjs` for multiple entries.

- #fetch:https://rollupjs.org/configuration-options/#output-preservemodules
  - `output.preserveModules`: creates separate chunks for all modules using original module names; requires `output.dir`; tree-shaking still applies; can emit plugin “virtual” files as real output.

- #fetch:https://rollupjs.org/configuration-options/#output-preservemodulesroot
  - `output.preserveModulesRoot`: strips a directory prefix from output paths when `preserveModules` is enabled; explicitly called out as useful in monorepos and when non-externalized third-party modules affect output structure.

- #fetch:https://vitest.dev/guide/workspace
  - “Workspace” is deprecated in favor of `test.projects` (functionally the same).
  - Root config with `test.projects` can be glob patterns or inline configs.
  - Project configs don’t inherit root config unless `extends: true` is used; some options are root-only (notably `coverage`, `reporters`).

- #fetch:https://vitest.dev/config/projects.html#projects
  - `projects` is an array of project configurations (default `[]`), each representing a Vitest project.

- #fetch:https://www.rfc-editor.org/rfc/rfc9535
  - Execution semantics:
    - A valid query produces a nodelist; an empty nodelist is a valid result.
    - Segment results are concatenated in input nodelist order; duplicate nodes are not removed.
    - “A syntactically valid segment MUST NOT produce errors when executing the query.”
  - Validity vs runtime mismatch:
    - Implementations MUST raise an error for queries that are not well-formed and valid (validity includes I-JSON integer range and well-typed function usage).
    - No additional well-formedness/validity errors are raised during application to a value; mismatches generally yield empty results.
  - Security:
    - Avoid delegating to programming language `eval()`; implement full syntax directly.
    - Mitigate DoS vectors from expensive queries and naive recursion.
    - Validate/escape variables when forming queries.

- #fetch:https://ajv.js.org/api.html
  - `ajv.compile(schema)` returns a validating function with `validate.errors` populated on failure.
  - Ajv error objects include `instancePath` (JSON Pointer), `schemaPath`, `params`, and optional `message`.
  - `ajv.errorsText(errors, { separator, dataVar })` formats errors for display.

- #fetch:https://zod.dev/?id=basic-usage
  - `.parse()` returns typed data on success and throws `ZodError` on failure.
  - `ZodError.issues` provides structured issue info (including `path`, `code`, and `message`).
  - `.safeParse()` returns a discriminated union `{ success: boolean, data? , error? }`.

- #fetch:https://www.npmjs.com/package/jsonpath-plus
  - Options relevant to repo usage:
    - `wrap` controls array wrapping behavior.
    - `resultType` supports returning `pointer`.
    - `eval` supports `'safe'`, `'native'`, and `false`, plus custom evaluators and sandboxing (`sandbox`).

- #fetch:https://github.com/dchester/jsonpath#readme
  - Script expressions are “statically evaluated” via `static-eval`, limiting scope and side effects.

- #fetch:https://github.com/endojs/endo/blob/master/packages/ses/README.md
  - SES introduces `lockdown()` (tamper-proofs intrinsics) and `harden()` (deep freezes object graphs).
  - `Compartment` provides isolated globals with controlled endowments.
  - Docs include caveats relevant for sandbox designs (e.g., avoid sharing mutable endowments; reentrancy considerations).

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo; per-package Vite library builds; per-package Vitest configs aggregated via root `test.projects`; ESM package publishing with granular `exports` and `files: ["dist"]`.
- Instructions followed: repository workspace rules in AGENTS.md and .github/copilot-instructions.md; Task Researcher constraints (research-only, write only under `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- Libraries are built with Vite in “library mode” patterns, producing ESM output to `dist/` while preserving module structure (`preserveModules`) to keep stable file-level imports.
- Tests are configured per package, aggregated from root via `vitest.config.ts` using `test.projects` globs.
- Published packages rely on `package.json` `exports` pointing into `./dist/*`, and the repo enforces that with `scripts/node/verify-dist-exports.mjs`.
- CLI packages use `bin` pointing to `dist/bin/*` and copy runtime bin shims into dist in `postbuild`.
- Turborepo pipeline constraints matter for future `@jsonpath/*` packages:
  - `build` produces `dist/**`; `test` produces `coverage/**`.
  - `test:ci`/`test:coverage` depend on upstream `^build`.

### Implementation Patterns

- **Vite library builds (Node)**
  - Shared config entry-point: `@lellimecnar/vite-config/node` → `viteNodeConfig()` (composes `viteBaseConfig()`).
  - Package-specific `vite.config.ts` adds:
    - `vite-plugin-dts` configured with `entryRoot: 'src'` and `outDir: 'dist'`.
    - Rollup output with `preserveModules: true` and `preserveModulesRoot: 'src'`.
    - Externalization function: `node:` builtins + all `dependencies` and `peerDependencies` (including deep imports).

- **Vitest multi-project**
  - Root config uses `test.projects` globs.
  - Shared config entry-point: `@lellimecnar/vitest-config` and its browser variants.
  - Coverage is configured in the shared base config (monorepo-wide behavior).

- **Repo-local JSONPath read/write contract (already in use)**
  - Reads: `readJsonPath` normalizes `jsonpath-plus` results into `undefined | value | value[]`.
  - Selection-to-mutation bridge: `findJsonPathPointers` (`resultType: 'pointer'`) + JSON Pointer get/set/remove.
  - Store writes iterate pointers and report `{ matched, changed, errors }`, then deep-clone to force a top-level reference change.

- **Standards constraints that may differ from existing libraries**
  - RFC 9535 explicitly requires that syntactically valid segments do not throw during execution; instead, many mismatches yield empty results.
  - Result ordering can be non-deterministic in some cases (especially involving objects), so conformance tests must avoid asserting strict ordering unless guaranteed.

### Complete Examples

```ts
// Representative library build pattern (from packages/polymix/vite.config.ts)
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: { entry: 'src/index.ts', formats: ['es'] },
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

### API and Schema Documentation

- **Vite “Library Mode”**: `build.lib` for libraries, and explicitly recommends externalizing dependencies (example shows `rollupOptions.external: ['vue']`). See: https://vite.dev/guide/build.html#library-mode
- **Rollup preserved-module output**:
  - `output.preserveModules` creates per-module output chunks and still tree-shakes. See: https://rollupjs.org/configuration-options/#output-preservemodules
  - `output.preserveModulesRoot` strips a directory prefix and is described as useful for monorepos. See: https://rollupjs.org/configuration-options/#output-preservemodulesroot
- **Vitest projects**: “workspace” deprecated in favor of `test.projects` (same concept). See: https://vitest.dev/guide/workspace

### Configuration Examples

```ts
// Root Vitest multi-project setup (from vitest.config.ts)
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/*/vitest.config.ts',
			'packages/card-stack/*/vitest.config.ts',
			'packages/ui-spec/*/vitest.config.ts',
			'web/*/vitest.config.ts',
		],
	},
});
```

```json
// CLI bin + postbuild dist-copy (from packages/ui-spec/cli/package.json)
{
	"bin": {
		"uispec": "./dist/bin/uispec.js"
	},
	"scripts": {
		"build": "vite build",
		"postbuild": "node -e \"require('node:fs').cpSync('bin', 'dist/bin', { recursive: true })\""
	}
}
```

### Technical Requirements

- Node engine: `^24.12.0` (root `package.json`)
- pnpm: `9.12.2` (root `package.json` `packageManager`)
- TypeScript: `~5.5`
- Vite: `^7.3.0` for library builds
- Vitest: `^4.0.16` for tests, with multi-project via `test.projects`
- `vite-tsconfig-paths` used in shared base configs for both Vite and Vitest

## Recommended Approach

Build any new JSONPath-focused library/CLI in this monorepo by following the established Vite+Vitest+exports conventions:

- Use Vite “library mode” style config with Rollup output `preserveModules: true` + `preserveModulesRoot: 'src'` to keep stable per-module output and align with the repo’s dist structure.
- Generate types into `dist/` with `vite-plugin-dts` configured with `entryRoot: 'src'` and `outDir: 'dist'` (matching existing packages).
- Externalize all runtime deps (and peers) using the existing pattern: treat `node:` builtins as external and externalize `dependencies` + `peerDependencies` including deep imports.
- If a CLI is needed, keep the runtime shim under `bin/` and copy it into `dist/bin` during `postbuild`, with `package.json` `bin` pointing to `./dist/bin/<name>.js`.
- Treat the repo’s existing JSONPath + pointer-backed mutation behavior as a compatibility anchor:
  - `readJsonPath` return shaping (`undefined` vs scalar vs array) is already relied upon.
  - Pointer helpers explicitly forbid root mutation (`''`/`'/'`) and define array removal as `splice`.
  - Store writes already define how to count `matched`/`changed` and how to surface errors.

- For the future `@jsonpath/*` implementation work (per specs/jsonpath.md), plan the engine around RFC 9535 constraints:
  - Separate query validity errors (must throw) from runtime mismatches (typically empty nodelists).
  - Avoid `eval()`-based implementations; treat script expressions as an opt-in feature and sandbox them.
  - Treat DoS risks (expensive queries, naive recursion) as a first-class design concern.

## Implementation Guidance

- **Objectives**: Produce a plugin-first JSONPath ecosystem aligned to specs/jsonpath.md while preserving repo conventions (dist-based exports, Vitest projects, Turbo pipeline) and grounding behavior in existing ui-spec semantics.
- **Key Tasks**:
  - Codify the existing ui-spec JSONPath/pointer/store contracts as explicit “expected behavior” for any new compat packages.
  - Use RFC 9535 semantics and security guidance as the primary correctness baseline for the RFC plugin bundle.
  - Design validator adapters around real-world error shapes (Ajv `instancePath` is JSON Pointer; Zod provides `issues` with `path`).
  - Keep mutation pointer-backed and explicitly forbid root mutation (match existing behavior).
- **Dependencies**: `@lellimecnar/vite-config` (node/browser), `@lellimecnar/vitest-config`, `jsonpath-plus` (for compatibility baseline) and `ses` (for sandbox plugin), plus validator libraries (Ajv, Zod) for adapters.
- **Success Criteria**:
  - New packages build to `dist/**` and pass `verify:exports`.
  - Tests run under root `test.projects` and conform to Turbo `test`/`test:ci`/`test:coverage` conventions.
  - RFC 9535 conformance tests pass with correct error-vs-empty-result behavior.
