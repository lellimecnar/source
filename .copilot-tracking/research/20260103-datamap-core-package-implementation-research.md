<!-- markdownlint-disable-file -->

# Task Research Notes: DataMap Core Package (packages/data-map/core)

## Research Executed

### File Analysis

- plans/data-map/plan.md
  - Defines the intended new workspace `packages/data-map/core` and its files, including `detectPathType` + JSON Pointer utilities, and mandates `json-p3` as the only JSONPath/Pointer/Patch engine.
  - Calls out package registration change required: add `packages/data-map/*` to pnpm workspace patterns.
- spec/spec-data-datamap.md
  - Normative DataMap specification: JSONPath + JSON Pointer reads, RFC 6902 patch semantics, subscription system (static + dynamic), strict vs non-strict behavior, and performance targets.
- package.json (repo root)
  - Monorepo: pnpm workspaces + Turborepo.
  - Toolchain versions:
    - Node engine: `^24.12.0`
    - pnpm: `9.12.2`
    - TypeScript: `~5.5`
    - Vite: `^7.3.0`
    - Vitest: `^4.0.16`
    - Turbo: `^2.3.3`
    - tsgo: via `@typescript/native-preview` (`7.0.0-dev.20251228.1`)
- pnpm-workspace.yaml
  - Current workspace globs do not include `packages/data-map/*`; required to add it for `@data-map/*` packages.
- turbo.json
  - Task graph expectations:
    - `build` depends on `^build` and outputs `dist/**`.
    - `test` has no upstream dependencies and outputs `coverage/**`.
    - `lint` and `type-check` depend on `^build`.
- packages/\* templates (library patterns)
  - packages/utils (minimal library package)
  - packages/polymix and packages/card-stack/core (library + vitest scripts)
  - packages/config-vite, packages/config-vitest, packages/config-typescript, packages/config-eslint (shared configs)

### Code Search Results

- json-p3
  - No direct code usage found in `packages/**` (as of current workspace state). Usage exists in specs/plans.
- vite.config.ts pattern
  - Found in: `packages/utils`, `packages/polymix`, `packages/card-stack/core`, `packages/card-stack/deck-standard`.
- vitest.config.ts pattern
  - Found in: `packages/utils`, `packages/polymix`, `packages/card-stack/*`, `packages/ui`.

### External Research

- #fetch:https://github.com/jg-rp/json-p3
  - Confirms package scope: JSONPath + JSON Pointer + JSON Patch, zero runtime deps, docs at `https://jg-rp.github.io/json-p3/`.
- #fetch:https://jg-rp.github.io/json-p3/quick-start
  - Confirms import patterns and common APIs: `import { jsonpath, jsonpointer, jsonpatch, JSONPointer, JSONPatch } from "json-p3"` and top-level re-exports like `query`, `compile`, `apply`.
  - Confirms pointer resolution semantics and error/fallback behavior.
  - Confirms patch application is sequential and generally mutates in place unless root replaced.
- #fetch:https://jg-rp.github.io/json-p3/api/namespaces/jsonpath/functions/query
  - Confirms `jsonpath.query(path, value)` returns `JSONPathNodeList`.
- #fetch:https://jg-rp.github.io/json-p3/api/namespaces/jsonpath/functions/compile
- #fetch:https://jg-rp.github.io/json-p3/api/namespaces/jsonpath/classes/JSONPathNodeList
- #fetch:https://jg-rp.github.io/json-p3/api/namespaces/jsonpath/classes/JSONPathNode
- #fetch:https://jg-rp.github.io/json-p3/api/namespaces/jsonpointer/classes/JSONPointer
  - Confirms `resolve`, `resolveWithParent`, `exists`, `join`, `parent`, and error semantics.
- #fetch:https://jg-rp.github.io/json-p3/api/namespaces/jsonpatch/functions/apply
  - Confirms `jsonpatch.apply(ops, value)` signature.

### Project Conventions

- Standards referenced:
  - packages/config-vitest/base.ts (Vitest defaults)
  - packages/config-typescript/\*.json (tsconfig baselines)
  - Root AGENTS.md (monorepo structure, commands, testing)
  - .github/copilot-instructions.md (workspace:\* usage; UI package has granular exports)

## Key Discoveries

### Project Structure

- Monorepo: pnpm workspaces + Turborepo.
  - Apps: `web/*` (Next.js 14+), `mobile/*` (Expo)
  - Packages:
    - Shared libraries: `packages/*`
    - Domain packages: `packages/card-stack/*`
- Workspace dependency policy:
  - Never use file-path dependencies.

### Implementation Patterns (Library Packages)

#### package.json patterns (libraries)

- Minimal library example: packages/utils/package.json
  - `type: "module"`
  - `exports["."] = { types: "./dist/index.d.ts", default: "./dist/index.js" }`
  - `main` + `types` mirror exports
  - devDeps include shared workspace configs:
    - `@lellimecnar/eslint-config` `workspace:*`
    - `@lellimecnar/typescript-config` `workspace:*`

- Library-with-tests example: packages/polymix/package.json and packages/card-stack/core/package.json
  - Adds scripts:
    - `test: vitest run`
    - `test:coverage: vitest run --coverage`
  - Includes `files: ["dist"]` when publishable.

Observed in packages/utils/vite.config.ts (also polymix, card-stack/core):

- Uses shared config: `mergeConfig(viteNodeConfig(), { ... })`
- Type declarations:
  - `vite-plugin-dts` with `entryRoot: 'src'`, `outDir: 'dist'`, `tsconfigPath: 'tsconfig.json'`
  - `build.lib.entry = 'src/index.ts'`, formats `['es']`
  - Rollup output:
    - `preserveModules: true`
    - `entryFileNames: '[name].js'`
- Externalization:
  - Externalize all `dependencies` and `peerDependencies` (plus `node:` builtins) via a function.

#### Vitest config pattern

- `vitestBaseConfig()` from packages/config-vitest/base.ts
  - `globals: true`
  - `passWithNoTests: true`
  - coverage provider `v8`, reporters include `text`, `html`, `lcov`, `json`
  - `setupFiles` loads optional `reflect-metadata`

- Root tsconfig.json extends `@lellimecnar/typescript-config`.
  - exclude `dist`, `node_modules`, often excludes `src/**/*.spec.ts`

#### Exports patterns

- “Granular exports” (tree-shakeable UI): packages/ui exports many subpaths and explicitly warns not to import from package root.
  - This granular pattern appears specific to `@lellimecnar/ui` and not required for generic packages.

#### Test naming and layout

- Co-located tests under `src/**` with `*.spec.ts` naming.
- Vitest is configured per-package, not at repo root.
  - Root: `pnpm build` → `turbo build`
  - Packages: `build` generally runs `vite build` for library packages.

- Test:
  - Root: `pnpm test` → `turbo test -- --passWithNoTests`
- Turbo execution model:
  - Filter a single workspace with `turbo run -F <workspace>` (also used in root scripts like `pnpm ui`).

### External Docs: json-p3 APIs needed for DataMap core

#### JSONPath

- Imports and entry points:
  - `import { jsonpath } from 'json-p3'`
  - `jsonpath.compile(path)` returns `JSONPathQuery` (compiled query object).
  - Top-level re-exports exist (per quick start): `import { query, compile } from 'json-p3'`.

  - `JSONPathNodeList.values()` returns an array of matched values.
  - `JSONPathNodeList.pointers()` returns `JSONPointer[]` for each match.
  - `JSONPathNodeList.paths()` returns normalized JSONPath strings.
  - `JSONPathNodeList.locations()` returns location arrays (`(string|number)[][]`).
  - `JSONPathNodeList.valuesOrSingular()` returns a single value if only one node.

#### JSON Pointer

- Resolve:
  - `jsonpointer.resolve(pointerString, value)` (convenience) or `new JSONPointer(pointerString).resolve(value)`.
  - Errors: throws `JSONPointerResolutionError` subclasses when missing/invalid.
  - Fallback: `pointer.resolve(value, fallback)` returns fallback instead of throwing.
  - `resolveWithParent(value)` returns `[parent, target]`, using a sentinel `UNDEFINED` when parent/target missing.

#### JSON Patch

- Imports:
  - `import { jsonpatch, JSONPatch } from 'json-p3'`
- Apply operations:
  - `jsonpatch.apply(ops, value)` applies RFC 6902 operations sequentially.
  - Behavior note (guide): modifies the target document in place unless the root is replaced.
- Patch builder:
  - `new JSONPatch().add(pointer, value).remove(pointer)...` and `.toArray()` to get op objects.

#### Gotchas relevant to DataMap

- JSONPath results are node lists, not raw values. DataMap should usually convert results to:
  - values via `values()` / `valuesOrSingular()`
  - pointers via `pointers()` or per-node `toPointer()` so internal reverse indexes can remain JSON Pointer keyed.
- JSONPointer resolution can throw by default; DataMap strict/non-strict needs to control whether to catch errors or supply fallback.
- JSON Patch application mutates in place by default; DataMap spec’s “immutable snapshot returns” should be implemented by returning cloned/structurally-shared snapshots rather than relying on json-p3 to be immutable.

## Complete Examples

```ts
import {
	jsonpath,
	jsonpointer,
	jsonpatch,
	JSONPointer,
	JSONPatch,
} from 'json-p3';

const nodes = jsonpath.query('$.users[*].name', { users: [{ name: 'A' }] });
const values = nodes.values();
const pointers = nodes.pointers().map((p) => p.toString());

const v = jsonpointer.resolve('/users/0/name', { users: [{ name: 'A' }] });
jsonpatch.apply([{ op: 'replace', path: '/users/0/name', value: 'B' }], {
	users: [{ name: 'A' }],
});

const patch = new JSONPatch().replace('/users/0/name', 'C');
const ops = patch.toArray();
```

### API and Schema Documentation

- DataMap must treat JSON Pointer as canonical internal key format for indexing, metadata map keys, and reverse subscription lookup.
- DataMap must accept both JSONPath and JSON Pointer strings for public APIs and detect type (plan Step 1).

### Configuration Examples

## Recommended Approach

- Use `@lellimecnar/eslint-config` with a package-local `.eslintrc.cjs` that re-includes `src/**/*` and sets `parserOptions.project` to the package tsconfig.
- Depend on `json-p3` directly (externalized in Vite rollup external function) and use its:
  - `jsonpath.query` / `jsonpath.compile`
  - `JSONPathNodeList.pointers()` and/or `JSONPathNode.toPointer()` to get JSON Pointers
  - `jsonpointer.resolve` (or `JSONPointer.resolve`) for pointer reads
  - `jsonpatch.apply` (or `JSONPatch.apply`) for RFC 6902 patch application

This aligns with repo constraints:

- “Single JSONPath engine” rule is satisfied.
- Workspace dependency patterns are respected.
- Turbo task graph stays consistent.

## Implementation Guidance

- **Objectives**:
  - Produce a Vite-built ESM library package with types to `dist/`.
  - Implement DataMap core per plan/spec using json-p3 for all path/query/patch operations.
  - Ensure strict/non-strict behavior is test-covered.
- **Key Tasks**:
  - Add `packages/data-map/*` to pnpm-workspace.yaml.
  - Scaffold `packages/data-map/core` copying library package config templates.
  - Add initial utilities: `detectPathType`, JSON Pointer helpers.
  - Integrate json-p3 read APIs (`jsonpath`, `jsonpointer`) and patch application (`jsonpatch`).
- **Dependencies**:
  - Internal: `@lellimecnar/*-config` workspace packages.
  - External: `json-p3` (pin exact version if required by surrounding specs/plans).
- **Success Criteria**:
  - `pnpm exec turbo -F @data-map/core build` produces `dist/**` with `.d.ts`.
  - `pnpm exec turbo -F @data-map/core test` runs `vitest run` and passes.
  - `pnpm exec turbo -F @data-map/core lint` and `type-check` align with repo defaults.
