<!-- markdownlint-disable-file -->

# Task Research Notes: DataMap JSONPath Migration (json-p3 → @jsonpath/\*)

## Research Executed

### File Analysis

- [plans/data-map-jsonpath-migration/plan.md](../../plans/data-map-jsonpath-migration/plan.md)
  - Migration plan, proposed API mapping and file list; note: plan references `src/DataMap.ts` but actual file is `src/datamap.ts`.
- [package.json](../../package.json)
  - Root scripts, engines, and toolchain versions.
- [turbo.json](../../turbo.json)
  - Turbo tasks and dependency ordering (e.g., `test` depends on `^build`).
- [pnpm-workspace.yaml](../../pnpm-workspace.yaml)
  - Workspace globs include `packages/data-map/*` and `packages/jsonpath/*`.
- [packages/data-map/core/package.json](../../packages/data-map/core/package.json)
  - Current dependency on `json-p3`; scripts for `test`, `test:coverage`, `type-check`.
- [packages/data-map/core/AGENTS.md](../../packages/data-map/core/AGENTS.md)
  - Documents filtered turbo commands; currently states “MUST use json-p3”.
- [packages/data-map/core/vitest.config.ts](../../packages/data-map/core/vitest.config.ts)
  - Local aliases for `@jsonpath/*` packages pointing to TS source; local coverage thresholds.
- [packages/data-map/core/vite.config.ts](../../packages/data-map/core/vite.config.ts)
  - Vite node lib build w/ `preserveModules`; externals are derived from `dependencies` and `peerDependencies`.
- [packages/data-map/core/tsconfig.json](../../packages/data-map/core/tsconfig.json)
  - Extends shared TS config; `moduleResolution: Bundler`; excludes `*.spec.ts` and `src/**/__tests__/**`.
- [packages/config-vitest/base.ts](../../packages/config-vitest/base.ts)
  - `vitestBaseConfig()` defaults: reporters include `json` output to `test-output.json`; coverage provider is `v8`.

### Code Search Results

- `json-p3|jsonpatch|jsonpath\.|JSONPointer` (in `packages/data-map/core/src/**`)
  - Matches in [packages/data-map/core/src/datamap.ts](../../packages/data-map/core/src/datamap.ts), [packages/data-map/core/src/patch/apply.ts](../../packages/data-map/core/src/patch/apply.ts), [packages/data-map/core/src/patch/builder.ts](../../packages/data-map/core/src/patch/builder.ts), [packages/data-map/core/src/patch/array.ts](../../packages/data-map/core/src/patch/array.ts), and [packages/data-map/core/src/**tests**/jsonpath-integration.spec.ts](../../packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts).
- `detectPathType|PathType|SubscriptionManager|subscribe|patch` (in `packages/data-map/core/src/**`)
  - `detectPathType` lives in [packages/data-map/core/src/path/detect.ts](../../packages/data-map/core/src/path/detect.ts) and is consumed by [packages/data-map/core/src/subscription/manager.ts](../../packages/data-map/core/src/subscription/manager.ts).

### External Research

- None (all findings from local repo source).

### Project Conventions

- Standards referenced: pnpm workspace filtering, Turbo task execution, per-package Vite builds, Vitest-based tests.
- Instructions followed: monorepo conventions in [AGENTS.md](../../AGENTS.md) and package-specific conventions in [packages/data-map/core/AGENTS.md](../../packages/data-map/core/AGENTS.md).

## Key Discoveries

### Project Structure

- Toolchain versions are enforced at root:
  - Node: `^24.12.0`
  - pnpm: `^9.12.2` / `packageManager: pnpm@9.12.2`
  - See [package.json](../../package.json).
- Turborepo tasks define a “build-first” pipeline: `test`, `type-check`, and `lint` depend on `^build`.
  - See [turbo.json](../../turbo.json).
- `@data-map/core` is a publishable ESM package built via Vite with `preserveModules` and DTS output.
  - See [packages/data-map/core/vite.config.ts](../../packages/data-map/core/vite.config.ts).

### Implementation Patterns

**Where DataMap and patch/subscription modules live**

- Main class entry is [packages/data-map/core/src/datamap.ts](../../packages/data-map/core/src/datamap.ts) (lowercase).
- Patch logic:
  - Apply: [packages/data-map/core/src/patch/apply.ts](../../packages/data-map/core/src/patch/apply.ts)
  - Builder: [packages/data-map/core/src/patch/builder.ts](../../packages/data-map/core/src/patch/builder.ts)
  - Array helpers: [packages/data-map/core/src/patch/array.ts](../../packages/data-map/core/src/patch/array.ts)
- Subscription manager:
  - [packages/data-map/core/src/subscription/manager.ts](../../packages/data-map/core/src/subscription/manager.ts)

**Current json-p3 usage patterns (what will change)**

- JSONPath query is performed via `json-p3` in `DataMap.resolve()`:
  - `jsonpath.query(pathOrPointer, data)`
  - pointers are derived via `nodes.pointers().map(p => p.toString())`
  - See [packages/data-map/core/src/datamap.ts](../../packages/data-map/core/src/datamap.ts).
- JSON Patch apply is done via `jsonpatch.apply(ops, working)` and assumes in-place mutation of `working`.
  - See [packages/data-map/core/src/patch/apply.ts](../../packages/data-map/core/src/patch/apply.ts).
- JSON Pointer operations are done via `new JSONPointer(pointer).resolve(...)` and `.exists(...)`.
  - See [packages/data-map/core/src/patch/builder.ts](../../packages/data-map/core/src/patch/builder.ts) and [packages/data-map/core/src/patch/array.ts](../../packages/data-map/core/src/patch/array.ts).

**detectPathType implementation**

- `detectPathType()` rules are very small and are relied on by subscription registration:
  - `''` or starts with `/` or starts with `#/` or equals `#` → `pointer`
  - `^\d+(#|\/|$)` → `relative-pointer`
  - otherwise → `jsonpath`
  - See [packages/data-map/core/src/path/detect.ts](../../packages/data-map/core/src/path/detect.ts).

**Important: subscription JSONPath semantics are internal, not json-p3**

- Subscriptions compile JSONPath-like patterns using an internal compiler:
  - [packages/data-map/core/src/path/compile.ts](../../packages/data-map/core/src/path/compile.ts)
- That compiler supports `$`, `.`, `..`, `[*]`, index segments, slices, and filter forms `?(...)`.
- This is separate from `json-p3` and from `@jsonpath/*` evaluator semantics. Migration should not assume the same parser is used for subscriptions.

**Existing error types in @data-map/core**

- DataMap generally throws plain `Error` with string messages (no custom error hierarchy today).
  - Examples in [packages/data-map/core/src/datamap.ts](../../packages/data-map/core/src/datamap.ts) and [packages/data-map/core/src/path/compile.ts](../../packages/data-map/core/src/path/compile.ts).
- Pointer parsing utilities also throw plain `Error` (e.g., invalid pointer format) in [packages/data-map/core/src/utils/pointer.ts](../../packages/data-map/core/src/utils/pointer.ts).

### Complete Examples

```ts
// Current behavior: JSONPath queries use json-p3 and return JSON Pointer strings.
// Source: packages/data-map/core/src/datamap.ts
const nodes = jsonpath.query(pathOrPointer, this._data as any);
const pointers = nodes.pointers().map((p) => p.toString());
const values = nodes.values();
```

```ts
// Native @jsonpath/jsonpath facade behavior: args are (root, path) and QueryResult
// has pointerStrings() (JSON Pointer) vs normalizedPaths() (JSONPath string).
// Source: packages/jsonpath/jsonpath/src/facade.ts and packages/jsonpath/evaluator/src/query-result.ts
const result = query(root, path);
const pointers = result.pointerStrings();
const normalized = result.normalizedPaths();
```

### API and Schema Documentation

**@jsonpath/jsonpath** (local source)

- `query(root, path, options?) → QueryResult`
- `compileQuery(path, options?) → CompiledQuery`
- `stream(root, path, options?) → Generator<QueryResultNode>`
- Re-exports errors: `JSONPathError`, `JSONPathSyntaxError`, `JSONPathTypeError`
- Source: [packages/jsonpath/jsonpath/src/facade.ts](../../packages/jsonpath/jsonpath/src/facade.ts)

**@jsonpath/evaluator**

- `QueryResult` methods include:
  - `values(): T[]`
  - `pointerStrings(): string[]` (JSON Pointer strings)
  - `normalizedPaths(): string[]` (RFC 9535 normalized JSONPath strings)
  - `pointers(): JSONPointer[]`
- `QueryResultNode` type is `CoreQueryNode` alias.
- Source: [packages/jsonpath/evaluator/src/query-result.ts](../../packages/jsonpath/evaluator/src/query-result.ts)

**@jsonpath/pointer**

- `JSONPointer.resolve()` exists explicitly as “DataMap compatibility alias” for `evaluate()`.
- `JSONPointer.exists()` is implemented (distinguishes missing vs present undefined).
- `evaluatePointer(root, pointer)` helper exists.
- Source: [packages/jsonpath/pointer/src/pointer.ts](../../packages/jsonpath/pointer/src/pointer.ts)

**@jsonpath/patch**

- `PatchOperation` is structurally identical to DataMap’s `Operation` union.
- `applyPatch(target, patch, options?)` clones and returns new value by default; `mutate: true` copies the final result back into `target`.
- The compat layer `@jsonpath/compat-json-p3` implements `jsonpatch.apply(patch, target)` as `applyPatch(target, patch, { mutate: true })`.
- Sources:
  - [packages/jsonpath/patch/src/patch.ts](../../packages/jsonpath/patch/src/patch.ts)
  - [packages/jsonpath/compat-json-p3/src/jsonpatch.ts](../../packages/jsonpath/compat-json-p3/src/jsonpatch.ts)

### Configuration Examples

```ts
// @data-map/core vitest aliases jsonpath packages to local TS source.
// Source: packages/data-map/core/vitest.config.ts
resolve: {
  alias: {
    '@jsonpath/jsonpath': path.resolve(__dirname, '../../jsonpath/jsonpath/src/index.ts'),
    '@jsonpath/patch': path.resolve(__dirname, '../../jsonpath/patch/src/index.ts'),
    '@jsonpath/pointer': path.resolve(__dirname, '../../jsonpath/pointer/src/index.ts'),
    '@jsonpath/core': path.resolve(__dirname, '../../jsonpath/core/src/index.ts'),
    ...
  }
}
```

### Technical Requirements

- `@data-map/core` currently depends on `json-p3` and uses its:
  - `jsonpath.query(path, data)`
  - `jsonpatch.apply(patch, target)` (mutating)
  - `JSONPointer.resolve()/exists()`
- Any migration must preserve DataMap’s internal assumption that JSONPath queries yield JSON Pointer strings for subscription addressing and event emission.

## Recommended Approach

Use `@jsonpath/jsonpath` facade + `@jsonpath/pointer` + `@jsonpath/patch` directly (no compat layer) and adapt DataMap to:

- Swap `query` argument order (native expects `(data, path)`), and extract pointer strings via `QueryResult.pointerStrings()` (not `normalizedPaths()`).
- Replace `jsonpatch.apply()` with `applyPatch()`:
  - DataMap’s current flow clones the document, applies patch, and returns the new doc; this maps naturally to `applyPatchImmutable(...)` or `applyPatch(..., { mutate: false })`.
  - If strict/non-strict behavior relies on json-p3 quirks, validate against tests in `src/__tests__/spec-compliance.spec.ts`.
- Keep subscription pattern compiler as-is (it is separate from `json-p3` and from `@jsonpath/*`).
- Introduce a DataMap-specific error normalization layer only if required by the plan; today the package throws plain `Error`.

## Implementation Guidance

- **Objectives**: Replace runtime JSONPath/Pointer/Patch engine (`json-p3`) with workspace-native `@jsonpath/*` without changing DataMap’s outward semantics.
- **Key Tasks**:
  - Update `packages/data-map/core/package.json` deps (remove `json-p3`, add `@jsonpath/jsonpath`, `@jsonpath/pointer`, `@jsonpath/patch` using `workspace:*`).
  - Update DataMap query sites to use `query(data, path)` and `pointerStrings()`.
  - Update patch apply to use `applyPatch` results correctly (mutating vs non-mutating).
  - Update pointer usage in patch helpers to import from `@jsonpath/pointer`.
  - Update/replace tests that assert json-p3 parity (see `jsonpath-integration.spec.ts` and REQ-001 block in `spec-compliance.spec.ts`).
- **Dependencies**:
  - Workspace packages under `packages/jsonpath/*` (resolved via `workspace:*`).
  - Vitest config aliases already point `@jsonpath/*` imports at local sources.
- **Success Criteria**:
  - `pnpm --filter @data-map/core type-check` passes.
  - `pnpm --filter @data-map/core test` passes.
  - `pnpm --filter @data-map/core test:coverage` meets thresholds set in [packages/data-map/core/vitest.config.ts](../../packages/data-map/core/vitest.config.ts).
