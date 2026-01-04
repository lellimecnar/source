<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Integration Readiness (plans/jsonpath-integration-readiness/plan.md)

## Research Executed

### File Analysis

- [package.json](package.json)
  - Root scripts use `turbo` for build/test/lint/type-check; pnpm is enforced (`pnpm@9.12.2`), Node `^24.12.0`.
  - `postinstall` clones the RFC 9535 compliance suite (`scripts/node/download-compliance-tests.mjs`).
- [turbo.json](turbo.json)
  - `test` has no `dependsOn`; `test:coverage` depends on `^build`.
  - `dev` and `test:watch` are persistent and non-cached.
- [pnpm-workspace.yaml](pnpm-workspace.yaml)
  - Monorepo workspaces include `packages/jsonpath/*` and `packages/data-map/*`.
- [docs/TESTING.md](docs/TESTING.md)
  - Vitest is the default runner; Expo/RN uses Jest (`jest-expo`).
  - Tests are co-located: `src/**/*.spec.*` and/or `src/**/__tests__/**`.
- [docs/api/jsonpath.md](docs/api/jsonpath.md)
  - Documents facade (`@jsonpath/jsonpath`) + pointer/patch/merge-patch high-level APIs.
- [scripts/node/download-compliance-tests.mjs](scripts/node/download-compliance-tests.mjs)
  - Clones `jsonpath-standard/jsonpath-compliance-test-suite` into `node_modules/jsonpath-compliance-test-suite/`.

### Code Search Results

- `from 'json-p3'|jsonpatch|JSONPointer` (packages/data-map/core)
  - Found direct `json-p3` dependencies and use sites:
    - [packages/data-map/core/src/datamap.ts](packages/data-map/core/src/datamap.ts)
    - [packages/data-map/core/src/patch/apply.ts](packages/data-map/core/src/patch/apply.ts)
    - [packages/data-map/core/src/patch/builder.ts](packages/data-map/core/src/patch/builder.ts)
    - [packages/data-map/core/src/patch/array.ts](packages/data-map/core/src/patch/array.ts)
- `jsonpath-compliance-test-suite` (packages/jsonpath)
  - Evaluator reads RFC 9535 CTS from node_modules:
    - [packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts](packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts)
- `json-patch-test-suite` (packages/jsonpath)
  - Patch package uses external RFC 6902 suite loader:
    - [packages/jsonpath/patch/src/**tests**/rfc6902-compliance.spec.ts](packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts)
    - [packages/jsonpath/patch/src/**tests**/**fixtures**/load-rfc-tests.ts](packages/jsonpath/patch/src/__tests__/__fixtures__/load-rfc-tests.ts)

### External Research

- None (intentionally). Used local docs + existing test-suite integrations already in repo.

### Project Conventions

- Standards referenced: pnpm workspaces, Turborepo task orchestration, per-package `vite build` outputs to `dist/`, per-package Vitest configs.
- Instructions followed: workspace `AGENTS.md` patterns (pnpm/turbo), monorepo testing guide in [docs/TESTING.md](docs/TESTING.md).

## Key Discoveries

### Project Structure

- Monorepo type/tooling
  - **pnpm + Turborepo** orchestration.
  - Root scripts (from [package.json](package.json)):
    - `pnpm build` → `turbo build`
    - `pnpm test` → `turbo test -- --passWithNoTests`
    - `pnpm test:watch` → `turbo test:watch`
    - `pnpm test:coverage` → `turbo test:coverage`
    - `pnpm type-check` → `turbo type-check`
  - TypeScript uses workspace config via [tsconfig.json](tsconfig.json) extending `@lellimecnar/typescript-config`.

- How tests are run and where configs live
  - Root Vitest "meta" config is [vitest.config.ts](vitest.config.ts); it delegates to per-workspace configs under:
    - `packages/*/vitest.config.ts`
    - `packages/card-stack/*/vitest.config.ts`
    - `packages/ui-spec/*/vitest.config.ts`
    - `web/*/vitest.config.ts`
  - Most packages use **Vitest** via package-level scripts (`vitest run`, `vitest run --coverage`, `vitest`).
  - Jest exists for React Native UI (Expo preset): [packages/ui-nativewind/jest.config.cjs](packages/ui-nativewind/jest.config.cjs).
  - Each `@jsonpath/*` package has its own [packages/jsonpath/\*/vitest.config.ts](packages/jsonpath) (see list in workspace search results).

### Implementation Patterns (jsonpath suite)

#### Package architecture and dependencies (workspace-local)

Each package is ESM (`"type": "module"`) and exports only the package root `.` (no granular subpath exports). All are `sideEffects: false`.

- Facade:
  - [packages/jsonpath/jsonpath/package.json](packages/jsonpath/jsonpath/package.json)
    - Depends on `@jsonpath/{compiler,core,evaluator,functions,lexer,merge-patch,parser,patch,pointer}`.
  - Entry exports: [packages/jsonpath/jsonpath/src/index.ts](packages/jsonpath/jsonpath/src/index.ts) re-exports `facade`, `config`, `cache`, `transform`.
  - Main API surface (verified in [packages/jsonpath/jsonpath/src/facade.ts](packages/jsonpath/jsonpath/src/facade.ts)):
    - `parseQuery(query: string): QueryNode`
    - `query(root: any, path: string, options?: EvaluatorOptions): QueryResult`
    - `queryValues(root: any, path: string, options?: EvaluatorOptions): any[]`
    - `queryPaths(root: any, path: string, options?: EvaluatorOptions): string[]` (returns RFC 9535 normalized paths)
    - `compileQuery(path: string): CompiledQuery`
    - `value(root, path, options?): any | undefined`
    - `exists(root, path, options?): boolean`
    - `count(root, path, options?): number`
    - `stream(root, path, options?): IterableIterator<{ value: any; path: string }>`
    - `match` alias for `query`
    - `validateQuery(path: string): { valid: boolean; error?: string }`
    - Re-exports: `parse`, `evaluate`, `compile`, `JSONPointer`, `evaluatePointer`, and select error classes.

- Core:
  - Error hierarchy in [packages/jsonpath/core/src/errors.ts](packages/jsonpath/core/src/errors.ts)
    - Base: `JSONPathError extends Error` with `code` union `ErrorCode` plus metadata: `position?`, `path?`, `token?`, `value?`, `cause?`.
    - Specializations include:
      - `JSONPathSyntaxError`, `JSONPathTypeError`, `JSONPathReferenceError`
      - `JSONPointerError`, `JSONPatchError`
      - `JSONPathSecurityError`, `JSONPathLimitError`, `JSONPathTimeoutError`, `JSONPathFunctionError`
  - QueryResult and evaluator options types live in [packages/jsonpath/core/src/types.ts](packages/jsonpath/core/src/types.ts)
    - `QueryResult<T>` interface currently defines:
      - `values(): T[]`
      - `paths(): PathSegment[][]`
      - `pointers(): string[]`
      - `normalizedPaths(): string[]`
      - `nodes(): QueryNode<T>[]`, `first()`, `last()`, `isEmpty()`, `length`, `map`, `filter`, `forEach`, `parents()`.
  - Registry pattern (note: duplicated per plan step): [packages/jsonpath/core/src/registry.ts](packages/jsonpath/core/src/registry.ts)
    - `functionRegistry` Map plus `registerFunction/getFunction/hasFunction/unregisterFunction`.

- Functions:
  - Built-ins are registered at import time in [packages/jsonpath/functions/src/registry.ts](packages/jsonpath/functions/src/registry.ts) (calls `registerBuiltins()` at module scope).
  - Currently defined built-ins (verified): `length`, `count`, `match`, `search`, `value`.
  - Exports: [packages/jsonpath/functions/src/index.ts](packages/jsonpath/functions/src/index.ts) → `export * from './registry.js'`.

- Parser + Lexer:
  - Parser exports in [packages/jsonpath/parser/src/index.ts](packages/jsonpath/parser/src/index.ts): `nodes`, `parser`, `walk`, `transform`.
  - AST node enum and types in [packages/jsonpath/parser/src/nodes.ts](packages/jsonpath/parser/src/nodes.ts)
    - `NodeType` includes `Query`, `ChildSegment`, `DescendantSegment`, selector node types, and expression node types.
    - `isSingularQuery(query: QueryNode): boolean` implements RFC 9535 singular-query detection.
  - Parser implementation in [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts)
    - Uses `Lexer` from `@jsonpath/lexer` and throws `JSONPathSyntaxError`.
  - Lexer exports in [packages/jsonpath/lexer/src/index.ts](packages/jsonpath/lexer/src/index.ts): `tokens`, `lexer`, and `CHAR_FLAGS`.

- Evaluator:
  - Evaluator pulls built-ins by importing `@jsonpath/functions` (side-effect import) in [packages/jsonpath/evaluator/src/evaluator.ts](packages/jsonpath/evaluator/src/evaluator.ts)
  - It fetches functions via `getFunction` from `@jsonpath/core`.
  - Result class is [packages/jsonpath/evaluator/src/query-result.ts](packages/jsonpath/evaluator/src/query-result.ts):
    - `QueryResult.pointers(): string[]` returns JSON Pointer strings (generated from segment paths).
    - `QueryResult.normalizedPaths(): string[]` returns RFC 9535 normalized path strings (`$['a'][0]...`).

- Pointer:
  - Primary class is [packages/jsonpath/pointer/src/pointer.ts](packages/jsonpath/pointer/src/pointer.ts)
    - `JSONPointer.parse(pointer: string): string[]` (RFC 6901 token decoding + tilde validation)
    - `JSONPointer.format(tokens: string[]): string`
    - Instance: `evaluate(root: any): any`, `getTokens(): string[]`, `toString(): string`.
  - Functional resolution helpers (used by other libs) in [packages/jsonpath/pointer/src/resolve.ts](packages/jsonpath/pointer/src/resolve.ts):
    - `resolve<T>(data, pointer): T | undefined`
    - `resolveOrThrow<T>(data, pointer): T` (throws `Error` currently)
    - `exists(data, pointer): boolean`
    - `resolveWithParent(data, pointer): { value; parent; key }`
  - Immutable mutation utilities in [packages/jsonpath/pointer/src/mutations.ts](packages/jsonpath/pointer/src/mutations.ts):
    - `set<T>(data, pointer, value): T`
    - `remove<T>(data, pointer): T`
    - `append<T>(data, pointer, value): T` (supports `'-'` token)
  - Utility conversion and token helpers in [packages/jsonpath/pointer/src/utils.ts](packages/jsonpath/pointer/src/utils.ts):
    - `parent(pointer: string): string`, `join(...parts: string[]): string`, `split(pointer): string[]`, `escape(token): string`, `unescape(token): string`
    - `toNormalizedPath(pointer: string): string` and `fromNormalizedPath(path: string): string`
  - Validation in [packages/jsonpath/pointer/src/validation.ts](packages/jsonpath/pointer/src/validation.ts):
    - `isValid(pointer: string): boolean`
    - `validate(pointer): { valid: boolean; errors: string[] }`

- Patch:
  - Patch operations + `applyPatch` in [packages/jsonpath/patch/src/patch.ts](packages/jsonpath/patch/src/patch.ts)
    - `applyPatch(target, patch, { clone?: boolean, strict?: boolean } = {})`
    - Default is `clone: true` (deep clone via JSON stringify/parse).
    - Operation validation is implemented (missing `value` / `from` throws `JSONPatchError`).
  - Builder API in [packages/jsonpath/patch/src/builder.ts](packages/jsonpath/patch/src/builder.ts): `PatchBuilder` + `builder()`.
  - Diff generator in [packages/jsonpath/patch/src/diff.ts](packages/jsonpath/patch/src/diff.ts): `diff(source, target, { invertible? })`.

- Merge Patch:
  - [packages/jsonpath/merge-patch/src/merge-patch.ts](packages/jsonpath/merge-patch/src/merge-patch.ts) implements RFC 7386 style merge:
    - Scalars/arrays replace target.
    - Objects recursively merge; `null` deletes key.

#### Compliance suites integration (local + installed)

- RFC 9535 JSONPath CTS
  - Cloned by [scripts/node/download-compliance-tests.mjs](scripts/node/download-compliance-tests.mjs)
  - Consumed by evaluator tests in [packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts](packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts)
    - Looks for `node_modules/jsonpath-compliance-test-suite/cts.json`
    - If missing, tests are skipped.

- RFC 6902 JSON Patch suite
  - `@jsonpath/patch` devDependency includes `json-patch-test-suite` (verified in [packages/jsonpath/patch/package.json](packages/jsonpath/patch/package.json))
  - Loader in [packages/jsonpath/patch/src/**tests**/**fixtures**/load-rfc-tests.ts](packages/jsonpath/patch/src/__tests__/__fixtures__/load-rfc-tests.ts) tries:
    - `json-patch-test-suite/spec_tests.json` + `json-patch-test-suite/tests.json`
    - fallback: `json-patch-tests/spec_tests.json` + `json-patch-tests/tests.json`

### @data-map/core ↔ json-p3 usage + expected APIs

- Dependency: `json-p3` is a runtime dependency of data-map core (verified in [packages/data-map/core/package.json](packages/data-map/core/package.json)).

- JSON Pointer usage expectations
  - `DataMap.resolve()` constructs `new JSONPointer(pointerString)` and calls `.resolve(this._data)` (verified in [packages/data-map/core/src/datamap.ts](packages/data-map/core/src/datamap.ts)).
  - DataMap also uses pointer strings that may be:
    - `''` and `'#'` as root
    - `#/...` shorthand which is normalized by `normalizePointerInput()` to `/...`.
  - Patch builder expects **instance methods**:
    - `new JSONPointer(pointer).resolve(data)` (verified usage in [packages/data-map/core/src/patch/builder.ts](packages/data-map/core/src/patch/builder.ts))
    - `new JSONPointer(pointer).exists(data)` (same file)

- JSONPath query usage expectations
  - `DataMap.resolve()` uses `jsonpath.query(pathOrPointer, data)` from json-p3, then uses:
    - `nodes.pointers().map(p => p.toString())`
    - `nodes.values()`
      (verified in [packages/data-map/core/src/datamap.ts](packages/data-map/core/src/datamap.ts)).
  - This implies DataMap expects the JSONPath query result to expose:
    - `values(): unknown[]`
    - `pointers(): Array<{ toString(): string }>` (or a JSONPointer object)

- JSON Patch usage expectations
  - DataMap applies operations using `jsonpatch.apply(ops, working)` from json-p3 after cloning the document (verified in [packages/data-map/core/src/patch/apply.ts](packages/data-map/core/src/patch/apply.ts)).
  - DataMap strict mode expects `test` to throw on mismatch (see [packages/data-map/core/src/**tests**/spec-compliance.spec.ts](packages/data-map/core/src/__tests__/spec-compliance.spec.ts)).

- data-map internal path compiler (not json-p3)
  - `compilePathPattern()` is an internal JSONPath-like compiler used for subscription expansion/matching.
  - It parses only a supported subset (recursive descent, dot/bracket, wildcard, index/slice, filter) and explicitly throws on unsupported syntax (verified in [packages/data-map/core/src/path/compile.ts](packages/data-map/core/src/path/compile.ts)).
  - It relies on pointer escaping rules `~0` and `~1` (via `escapePointerSegment` in [packages/data-map/core/src/utils/pointer.ts](packages/data-map/core/src/utils/pointer.ts)).

### Configuration Examples

```ts
// Root Vitest multi-project config
// Source: vitest.config.ts
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

```ts
// Evaluator RFC9535 compliance suite binding (local CTS)
// Source: packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts
const ctsPath = path.resolve(
	__dirname,
	'../../../../../node_modules/jsonpath-compliance-test-suite/cts.json',
);
```

### Technical Requirements (integration gaps revealed)

- DataMap currently requires json-p3 `JSONPointer` instance API surface:
  - `.resolve(data)` and `.exists(data)`.
  - jsonpath suite `@jsonpath/pointer` currently exposes:
    - `JSONPointer.evaluate(root)` (instance)
    - `exists(data, pointer)` (function)
    - `resolve(data, pointer)` (function)
  - Bridging needed: add instance `resolve/exists` aliases OR adjust DataMap.

- DataMap expects JSONPath result pointers as objects convertible with `.toString()`.
  - `@jsonpath/evaluator` currently returns pointers as strings (`QueryResult.pointers(): string[]`).
  - Bridging needed: change evaluator `pointers()` to return `@jsonpath/pointer` `JSONPointer[]` (plan step) or adjust DataMap mapping.

- Patch mutation semantics differ from the plan target.
  - `@jsonpath/patch` defaults to cloning (`clone: true`), whereas plan target calls out in-place mutation by default to match json-p3.
  - DataMap itself clones before applying patches, so either behavior can be compatible, but parity tests may require matching json-p3.

## Recommended Approach

Focus implementation to satisfy DataMap’s **current** runtime expectations while keeping the `@jsonpath/*` libraries RFC-compliant:

- Implement json-p3 compatibility shims in `@jsonpath/pointer` (instance `resolve` alias + instance `exists` calling functional variants) so DataMap can swap packages without rewriting callsites.
- Adjust evaluator `QueryResult.pointers()` contract to return pointer objects (likely `@jsonpath/pointer` `JSONPointer`) rather than strings, matching DataMap’s `.toString()` use.
- Keep the compliance suite hooks as-is:
  - RFC 9535 CTS via `node_modules/jsonpath-compliance-test-suite/cts.json`.
  - RFC 6902 suite via `json-patch-test-suite` (and optional fallback `json-patch-tests`).

## Implementation Guidance

- **Objectives**: Achieve json-p3 feature parity for DataMap integration without breaking RFC compliance suites.
- **Key Tasks**:
  - Add pointer instance compatibility methods; ensure canonical pointer parsing/escaping matches RFC 6901.
  - Update evaluator result pointer typing; keep `normalizedPaths()` behavior.
  - Align patch semantics and add optional modes if required by plan.
  - Unify function registry duplication (`@jsonpath/core` vs `@jsonpath/functions`).
- **Dependencies**:
  - RFC 9535 CTS download must succeed (`postinstall` git clone).
  - RFC 6902 test suite must be installed/resolvable (`json-patch-test-suite`).
- **Success Criteria**:
  - DataMap can swap from `json-p3` to `@jsonpath/*` with minimal callsite changes.
  - `packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts` runs and passes with CTS present.
  - `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts` runs and passes with suite present.
