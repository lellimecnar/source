<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath spec-compliance plan (packages/jsonpath/\*)

## Research Executed

### File Analysis

- plans/jsonpath-spec-compliance/plan.md
  - Phase 1/2 target file list and intended deltas.
- package.json
  - Root scripts use Turborepo for `test`, `test:coverage`, `test:watch`.
- turbo.json
  - `test` task has no `dependsOn` and outputs `coverage/**`.
- vitest.config.ts
  - Root vitest “projects” does **not** include `packages/jsonpath/*`.

Phase 1 / Phase 2 files (as referenced by the plan):

- packages/jsonpath/core/src/registry.ts
  - Provides `functionRegistry` Map + `registerFunction` only (no `get/has/unregister`).
- packages/jsonpath/core/src/types.ts
  - Defines `FunctionDefinition` with `signature`, `returns`, `evaluate`.
  - Defines `QueryResult` interface as **method-based** (`values()`, `paths()`, `nodes()`, etc.)
- packages/jsonpath/core/src/errors.ts
  - ErrorCode is a small union (broad categories) + a class hierarchy (`JSONPathError`, `JSONPathSyntaxError`, etc.).
- packages/jsonpath/core/src/index.ts
  - Re-exports: `types`, `errors`, `registry`, `utils`.

- packages/jsonpath/functions/src/registry.ts
  - Contains a separate `FunctionRegistry` class + `globalRegistry` + built-ins registered there.
- packages/jsonpath/functions/src/index.ts
  - `export * from './registry.js'`.

- packages/jsonpath/evaluator/src/evaluator.ts
  - Resolves functions via `@jsonpath/functions` `globalRegistry`, not core registry.
- packages/jsonpath/evaluator/src/query-result.ts
  - `QueryResult` class uses getters + `path: string[]`, diverging from core `QueryResult` interface.
- packages/jsonpath/evaluator/src/index.ts
  - Re-exports evaluator + query result.

Pointer plan files:

- packages/jsonpath/pointer/src/pointer.ts
  - Implements `JSONPointer.parse/format` (escape/unescape is inline), `evaluate`, `evaluatePointer`.
- packages/jsonpath/pointer/src/index.ts
  - `export * from './pointer.js'`.

Patch plan files:

- packages/jsonpath/patch/src/patch.ts
  - Implements `PatchOperation` union + `applyPatch` with helpers.
  - No separate `apply.ts`, `types.ts`, `builder.ts`, or `diff.ts` currently.
- packages/jsonpath/patch/src/index.ts
  - `export * from './patch.js'`.

### Code Search Results

- Function registry split:
  - `FunctionRegistry` class exists in packages/jsonpath/functions/src/registry.ts
  - `functionRegistry` Map exists in packages/jsonpath/core/src/registry.ts
- Evaluator function resolution:
  - `globalRegistry.get(expr.name)` used in packages/jsonpath/evaluator/src/evaluator.ts
- QueryResult divergence:
  - Class `QueryResult` in packages/jsonpath/evaluator/src/query-result.ts
  - Core interface `QueryResult` in packages/jsonpath/core/src/types.ts
- Pointer escaping:
  - `~0`/`~1` replacement is inline in `JSONPointer.parse/format`.
- Patch patterns:
  - `applyPatch` exists; `diff`/`PatchBuilder` do not exist.

### External Research

- (not executed; request was repo-specific)

### Project Conventions

- Standards referenced: ESM packages, preserve-modules build output, Vitest per-package, tests under `src/__tests__`.
- Instructions followed: workspace monorepo rules in AGENTS.md; plan authoring and implementation style from plans/\*/implementation.md.

## Key Discoveries

### Project Structure

- JSONPath suite is located in `packages/jsonpath/*` with per-package `src/` and `src/__tests__/`.
- Each JSONPath package is ESM (`"type": "module"`) with `exports["."]` pointing at `./dist/index.js` + `./dist/index.d.ts`.
- Many sources use ESM-style import specifiers ending in `.js` (e.g. `./query-result.js`), matching the build output convention.

### Implementation Patterns

### Current testing framework + how to run tests

All JSONPath packages use **Vitest**:

- Per-package scripts (example: packages/jsonpath/core/package.json):
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `test:coverage`: `vitest run --coverage`
- Per-package config location:
  - packages/jsonpath/<pkg>/vitest.config.ts
- Jest:
  - No Jest configs exist under `packages/jsonpath/**`.

Important nuance:

- Root vitest “projects” in vitest.config.ts does **not** include JSONPath packages (it matches `packages/*/vitest.config.ts`, not `packages/jsonpath/*/vitest.config.ts`).

#### Key commands (repo root)

- Run a single package’s unit tests:
  - `pnpm --filter @jsonpath/core test`
- Run all JSONPath packages’ unit tests:
  - `pnpm --filter @jsonpath/* test`
- Run tests via Turborepo filtering:
  - `pnpm turbo test -F @jsonpath/core`
  - `pnpm turbo test -F @jsonpath/*`

### Existing exports style and conventions

- JSONPath packages are **not** using granular subpath exports today.
- Public API is via `src/index.ts` re-exporting one or more local modules.

Examples:

- packages/jsonpath/pointer/src/index.ts
  - `export * from './pointer.js'`
- packages/jsonpath/patch/src/index.ts
  - `export * from './patch.js'`
- packages/jsonpath/core/src/index.ts
  - `export * from './types.js'`, `./errors.js`, `./registry.js`, `./utils.js`

### Error handling patterns

packages/jsonpath/core/src/errors.ts defines:

- `ErrorCode` union (broad categories):
  - `SYNTAX_ERROR | TYPE_ERROR | REFERENCE_ERROR | POINTER_ERROR | PATCH_ERROR | FUNCTION_ERROR | INVALID_ARGUMENT`
- Base error `JSONPathError` (includes `code`, optional `position`, optional `path`, `toJSON()`)
- Derived errors:
  - `JSONPathSyntaxError`, `JSONPathTypeError`, `JSONPathReferenceError`, `JSONPointerError`, `JSONPatchError`

### FunctionRegistry / function resolution (current)

There are two registries today:

- packages/jsonpath/core/src/registry.ts
  - `functionRegistry: Map<string, FunctionDefinition>`
  - `registerFunction(definition)`

- packages/jsonpath/functions/src/registry.ts
  - `FunctionRegistry` class (stores `FunctionDefinition { name, execute, validate? }`)
  - `globalRegistry` instance
  - Built-in functions are registered into `globalRegistry`

Evaluator resolves functions using `globalRegistry`:

```ts
const fn = globalRegistry.get(expr.name);
if (!fn)
	throw new JSONPathError(`Unknown function: ${expr.name}`, 'FUNCTION_ERROR');
return fn.execute(...args);
```

### Existing QueryResult and how it deviates from the plan

Core defines a spec-oriented interface:

- packages/jsonpath/core/src/types.ts
  - `QueryResult` is method-based (e.g. `values(): T[]`, `paths(): PathSegment[][]`, `pointers(): string[]`, `normalizedPaths(): string[]`, iterator support).
  - `QueryNode` includes `root`, `parent`, `parentKey`.

Evaluator implementation diverges:

- packages/jsonpath/evaluator/src/query-result.ts
  - `QueryResultNode { value: any; path: string[] }`
  - `QueryResult` uses getters (`get values`, `get paths`, `get nodes`, `get first`)
  - `first` returns a value (not a node)
  - path storage uses `string[]` (indices are stored as strings)
  - has `toStrings()` that formats a `$...`-style path; no pointer or normalized-path support.

### Existing pointer resolve/escape/unescape

- packages/jsonpath/pointer/src/pointer.ts
  - Has `JSONPointer.parse(pointer)` and `JSONPointer.format(tokens)` with inline `~0`/`~1` escaping.
  - No standalone `escape(token)` / `unescape(token)` exports.
  - Resolution is via class method `evaluate(root)`; missing `exists`, `resolveOrThrow`, `resolveWithParent` variants.

### Existing patch apply/diff/builder patterns

- packages/jsonpath/patch/src/patch.ts
  - `PatchOperation` is a discriminated union with `op` string literals.
  - `applyPatch(target, patch)` deep clones with `JSON.parse(JSON.stringify(target))` and then mutates the clone.
  - Uses `JSONPointer` to locate parents and keys.
  - No diff generator or fluent builder exists.

## Recommended Approach

Implement the plan by consolidating around `@jsonpath/core`:

- Treat `@jsonpath/core` registry + `FunctionDefinition` as the canonical API.
- Refactor `@jsonpath/functions` to export built-in definitions compatible with core and register them into core (instead of owning a separate registry).
- Update evaluator to resolve functions from core registry (not from `globalRegistry`).

This is the least invasive path because core already defines the spec-typed `FunctionDefinition` and already exposes `functionRegistry`.

## Implementation Guidance

- **Objectives**: Align registry, QueryResult, pointer utilities/mutations, and patch split APIs with Phase 1/2 plan.
- **Key Tasks**:
  - Add core registry management API (`get/has/unregister`) and update evaluator to use it.
  - Replace `@jsonpath/functions` registry class usage with core registration.
  - Rewrite evaluator `QueryResult` to match core interface (methods + iterator + richer node metadata).
  - Add pointer files per plan: `mutations.ts`, `utils.ts`, `validation.ts`, `resolve.ts`.
  - Split patch into plan’s new modules (`types.ts`, `diff.ts`, `builder.ts`, and apply options).
- **Dependencies**:
  - Vitest configs for evaluator/pointer/patch/jsonpath/compiler alias sibling `src/` for tests; keep those aliases in sync with any file moves.
  - Preserve `.js` extension import style within package sources.
- **Success Criteria**:
  - All JSONPath packages’ tests pass when run via `pnpm --filter @jsonpath/* test`.
