<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Performance Optimization (plan steps 1–10)

## Research Executed

### File Analysis

- plans/jsonpath-performance-optimization/plan.md
  - Steps 1–10 focus on cloning strategy, @jsonpath/patch structuredClone removal + pointer token caching, @jsonpath/merge-patch createMergePatch clone removal, and evaluator fast paths/options.

- packages/jsonpath/core/package.json
  - Confirms exports are package-root only (`"exports": {".": ...}`), tests use Vitest (`vitest run`), and typecheck uses `tsgo --noEmit`.
- packages/jsonpath/core/src/utils.ts
  - Contains current `deepClone` implementation that _prefers_ `structuredClone` when available.
- packages/jsonpath/core/src/index.ts
  - Re-exports `./utils.js` (so `deepClone` is already public).
- packages/jsonpath/core/vitest.config.ts
  - Uses shared base config: `vitestBaseConfig()`.
- packages/jsonpath/core/src/**tests**/utils.spec.ts
  - Unit tests cover `deepClone` including a fallback branch when `structuredClone` is removed from `global`.

- packages/jsonpath/patch/package.json
  - Confirms `@jsonpath/core` dependency and `vitest run` test runner; includes `json-patch-test-suite` as a dev dependency.
- packages/jsonpath/patch/src/index.ts
  - Exports from package are via root index re-exporting `patch`, `diff`, `builder`, `jsonpath-ops` (note: `builder` is exported twice).
- packages/jsonpath/patch/src/patch.ts
  - Contains `applyPatch` implementation and related helpers (`applyWithErrors`, `applyWithInverse`, `patchAdd/Remove/...`).
- packages/jsonpath/patch/vitest.config.ts
  - Uses `vitestBaseConfig()` plus `resolve.alias` to point workspace deps at _source_ entrypoints (core/pointer/parser/evaluator) for tests.
- packages/jsonpath/patch/src/**tests**/patch.spec.ts
  - Confirms default immutability expectation for `applyPatch` (`mutate: false` default).
- packages/jsonpath/patch/src/**tests**/rfc6902-compliance.spec.ts
  - Loads external RFC 6902 test suite files and runs them using Vitest; uses `structuredClone` in test setup.
- packages/jsonpath/patch/src/**tests**/**fixtures**/load-rfc-tests.ts
  - Uses `createRequire` + `fs.readFileSync` to locate `json-patch-test-suite` JSON files.

- packages/jsonpath/merge-patch/package.json
  - Test runner: `vitest run`; deps include `@jsonpath/core`.
- packages/jsonpath/merge-patch/src/index.ts
  - Exports merge-patch + validation/trace/convert.
- packages/jsonpath/merge-patch/src/merge-patch.ts
  - Contains `applyMergePatch` + `createMergePatch`; `createMergePatch` uses `structuredClone`.
- packages/jsonpath/merge-patch/vitest.config.ts
  - Uses `vitestBaseConfig()`.
- packages/jsonpath/merge-patch/src/**tests**/merge-patch.spec.ts
  - Tests cover RFC 7386 examples and `createMergePatch` round-trip.

- packages/jsonpath/evaluator/package.json
  - Test runner: `vitest run`; depends on `@jsonpath/core/functions/parser/pointer`.
- packages/jsonpath/evaluator/src/options.ts
  - Defines `DEFAULT_EVALUATOR_OPTIONS` and `withDefaults` merging behavior with stable empty arrays + a singleton AbortSignal.
- packages/jsonpath/evaluator/src/evaluator.ts
  - Contains fast paths: `evaluateSimpleChain` and `evaluateWildcardChain`.
- packages/jsonpath/evaluator/src/index.ts
  - Exports evaluator and query result.
- packages/jsonpath/evaluator/vitest.config.ts
  - Uses base config + aliases to source packages.
- packages/jsonpath/evaluator/src/**tests**/evaluator.spec.ts
  - Has coverage for wildcard chain fast path plus correctness tests.

- packages/jsonpath/benchmarks/package.json
  - Benchmarks run via `vitest bench`; includes focused scripts like `bench:patch` etc.
- packages/jsonpath/benchmarks/README.md
  - Documents benchmark files, adapter architecture, and warn-only regression spec command.
- packages/jsonpath/benchmarks/vitest.config.ts
  - Uses base config + source aliases for jsonpath packages.
- packages/jsonpath/benchmarks/src/performance-regression.spec.ts
  - Warn-only regression checks using baselines from `baseline.json`.

- packages/config-vitest/package.json
  - Confirms `@lellimecnar/vitest-config` is the shared config package; `"exports": { ".": "./base.ts" }`.
- packages/config-vitest/base.ts
  - Defines `vitestBaseConfig()` used across packages: reporters, output file, coverage config, setup files.
- packages/config-vitest/AGENTS.md
  - Provides working constraints/commands for the config package.

### Code Search Results

- structuredClone
  - Matches found in:
    - packages/jsonpath/core/src/utils.ts (deepClone prefers structuredClone)
    - packages/jsonpath/patch/src/patch.ts (applyPatch + applyWithErrors + applyWithInverse + copy op clone)
    - packages/jsonpath/patch/src/**tests**/rfc6902-compliance.spec.ts (test cloning)
    - packages/jsonpath/merge-patch/src/merge-patch.ts (createMergePatch clones)

- deepClone|clone
  - Matches found in:
    - packages/jsonpath/core/src/utils.ts: `export function deepClone<T>(value: T): T`
    - packages/jsonpath/core/src/**tests**/utils.spec.ts: deepClone unit tests

### External Research

- (none)

### Project Conventions

- Standards referenced: AGENTS.md (repo root), packages/config-vitest/AGENTS.md, monorepo pnpm/turbo workflows
- Instructions followed: workspace packages use `workspace:*` deps; tests are per-package; run workspace scripts from repo root with `pnpm --filter ...`.

## Key Discoveries

### Project Structure

Packages covered by this research (all under `packages/jsonpath/`):

- core
  - Source: `packages/jsonpath/core/src/*`
  - Tests: `packages/jsonpath/core/src/__tests__/*.spec.ts`
- patch
  - Source: `packages/jsonpath/patch/src/*`
  - Tests: `packages/jsonpath/patch/src/__tests__/*.spec.ts` (+ fixtures)
- merge-patch
  - Source: `packages/jsonpath/merge-patch/src/*`
  - Tests: `packages/jsonpath/merge-patch/src/__tests__/*.spec.ts`
- evaluator
  - Source: `packages/jsonpath/evaluator/src/*` (large `evaluator.ts`)
  - Tests: `packages/jsonpath/evaluator/src/__tests__/*.spec.ts` plus `packages/jsonpath/evaluator/src/streaming.spec.ts`
- benchmarks
  - Benchmarks: `packages/jsonpath/benchmarks/src/*.bench.ts`
  - Regression/spec tests: `packages/jsonpath/benchmarks/src/*.spec.ts`

No `AGENTS.md` files exist under `packages/jsonpath/{core,patch,merge-patch,evaluator,benchmarks}/` at time of inspection; apply monorepo-level constraints from repo root AGENTS.md.

### Implementation Patterns

#### `@jsonpath/core`: cloning utilities and exports

- Public exports are via package root only (no granular subpath exports): `packages/jsonpath/core/package.json` exports `"."` → `dist/index.*`.
- Current clone utility is `deepClone` in `packages/jsonpath/core/src/utils.ts`.

Current function signature (as implemented today):

- `deepClone<T>(value: T): T`
  - Behavior:
    - Returns primitives unchanged.
    - If `structuredClone` exists, it is tried first; failure falls through to fallback.
    - Fallback recursively clones arrays and plain objects, skipping keys whose values are `undefined`.

Exports:

- `packages/jsonpath/core/src/index.ts` includes `export * from './utils.js'`, so `deepClone` is already part of the public surface.

Test runner:

- `packages/jsonpath/core/package.json` scripts: `test` = `vitest run`.

Key test pattern:

- `packages/jsonpath/core/src/__tests__/utils.spec.ts` uses Vitest `describe/it/expect` and explicitly deletes `global.structuredClone` to test fallback behavior.

#### `@jsonpath/patch`: applyPatch structure, defaults, structuredClone usage, token parsing

Exports:

- `packages/jsonpath/patch/package.json` exports `"."` only.
- `packages/jsonpath/patch/src/index.ts` re-exports:
  - `./patch.js`, `./diff.js`, `./builder.js`, `./jsonpath-ops.js` (note: `./builder.js` is duplicated).

Current core signature and defaults (from `packages/jsonpath/patch/src/patch.ts`):

- `export function applyPatch(target: any, patch: PatchOperation[], options: ApplyOptions = {}): any`
  - Current option defaults:
    - `strictMode = true`
    - `mutate = false`
    - `validate: shouldValidate = false`
    - `continueOnError = false`
    - `atomicApply = true`
    - `before`, `after` hooks default to `undefined`
  - Observed but currently unused in implementation:
    - `ApplyOptions.inverse?: boolean` exists in the type, but is not read in `applyPatch`.

Current cloning behavior (structuredClone call sites):

- Root working copy selection:
  - `const workingRoot = atomicApply ? structuredClone(target) : mutate ? target : structuredClone(target)`
- Operation `copy` clones copied value:
  - `structuredClone(value)`
- `applyWithErrors` clones target up-front:
  - `const workingResult = structuredClone(target)`
- `applyWithInverse` clones target up-front:
  - `let working = structuredClone(target)`

Pointer parsing / tokenization:

- `parseTokens` is currently defined _inside_ `applyPatch`:
  - Validates pointer must be `''` or start with `/`.
  - Splits by `/`, removes leading empty segment, and unescapes `~1` → `/` and `~0` → `~`.
  - No caching is present for parsed tokens.

Allocation/perf-relevant structure:

- The per-operation helpers `setAt`, `removeAt`, `replaceAt` are declared inside the `for` loop over patch operations (so allocated each iteration).

Test setup and RFC 6902 compliance:

- Main behavioral tests: `packages/jsonpath/patch/src/__tests__/patch.spec.ts`
  - Includes explicit tests for:
    - Default immutability (`applyPatch` returns new object; original unchanged)
    - Mutation mode (`{ mutate: true }` returns same object)
    - Atomic behavior (all-or-nothing)

- RFC 6902 compliance tests: `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts`
  - Loads external suite JSON (`spec_tests.json`, `tests.json`) via `loadRFC6902TestCases`.
  - Skips suite when missing (warns but does not fail).
  - Uses `structuredClone` inside the test to avoid mutating fixture data.

Vitest configuration / workspace aliasing:

- `packages/jsonpath/patch/vitest.config.ts` extends base config but overrides `resolve.alias` so tests execute against source packages:
  - `@jsonpath/pointer` → `../pointer/src/index.ts`
  - `@jsonpath/core` → `../core/src/index.ts`
  - `@jsonpath/evaluator` → `../evaluator/src/index.ts`
  - `@jsonpath/parser` → `../parser/src/index.ts`

#### `@jsonpath/merge-patch`: apply/create behavior and structuredClone usage

Exports:

- `packages/jsonpath/merge-patch/package.json` exports `"."` only.
- `packages/jsonpath/merge-patch/src/index.ts` exports merge-patch + validation/trace/convert.

Current function signatures and defaults (from `packages/jsonpath/merge-patch/src/merge-patch.ts`):

- `export interface MergePatchOptions`
  - `nullBehavior?: 'delete' | 'set-null'` (default `'delete'`)
  - `arrayMergeStrategy?: 'replace'` (default `'replace'`)
  - `mutate?: boolean` (default `true`)

- `export function applyMergePatch(target: any, patch: any, options: MergePatchOptions = {}): any`
  - Defaults: `nullBehavior='delete'`, `arrayMergeStrategy='replace'`, `mutate=true`.
  - Shallow copy behavior: `const out = mutate ? target : { ...target }`.
  - Recurses into child objects with `{ ...options, mutate: true }`.

- `export function createMergePatch(source: any, target: any): any`
  - Uses `structuredClone` for non-object replacements and for new/changed scalar/array values:
    - Non-objects: `return deepEqual(source, target) ? {} : structuredClone(target)`
    - New key in target: `patch[key] = structuredClone(target[key])`
    - Changed leaf value: `patch[key] = structuredClone(t)`
  - No caching; key iteration uses `new Set([...Object.keys(source), ...Object.keys(target)])`.

Tests:

- `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`
  - Contains direct assertions for RFC 7386 examples.
  - Includes a round-trip test: `applyMergePatch(source, createMergePatch(source, target))` equals `target`.

#### `@jsonpath/evaluator`: option defaults and fast paths

Exports:

- `packages/jsonpath/evaluator/package.json` exports `"."` only.
- `packages/jsonpath/evaluator/src/index.ts` exports `./evaluator.js` and `./query-result.js`.

Option defaults (`packages/jsonpath/evaluator/src/options.ts`):

- `DEFAULT_EVALUATOR_OPTIONS` defines required defaults for:
  - `maxDepth: 256`
  - `maxResults: 10_000`
  - `maxNodes: 100_000`
  - `maxFilterDepth: 16`
  - `timeout: 0`
  - `detectCircular: false`
  - `secure`: `{ allowPaths: [], blockPaths: [], noRecursive: false, noFilters: false, maxQueryLength: 0 }`

- `withDefaults(options?: EvaluatorOptions): Required<EvaluatorOptions>`:
  - Uses stable singleton defaults to reduce allocations:
    - `STABLE_EMPTY_ALLOW_PATHS`, `STABLE_EMPTY_BLOCK_PATHS`, `STABLE_EMPTY_PLUGINS`
    - `NOOP_SIGNAL` from `new AbortController().signal`
  - Merge order (important for default semantics):
    - Spreads `DEFAULT_EVALUATOR_OPTIONS`, then sets `signal`/`plugins` defaults, then spreads `options`, then deep-merges `secure`.

Fast paths (`packages/jsonpath/evaluator/src/evaluator.ts`):

- `evaluate(ast)` tries:
  - `evaluateSimpleChain(ast)` then `evaluateWildcardChain(ast)` before falling back to streaming evaluation.

- `evaluateSimpleChain`:
  - Targets simple chains like `$.a.b[0]`.
  - Explicitly bails out when:
    - `detectCircular` enabled
    - plugins have evaluation hooks
    - `maxDepth` would be violated
    - `maxResults === 0`
    - allow/block path security configured
  - Computes and stores `_cachedPointer` by building an escaped pointer string from the traversed `path`.

- `evaluateWildcardChain`:
  - Handles chains containing only name/index/wildcard selectors.
  - Bails out for: circular detection, plugin hooks, maxDepth violation, security allow/block lists, and restrictive `maxResults` (< 10_000).

Tests:

- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts` includes a section “Wildcard Chain Fast Path” with explicit correctness cases.

#### `@jsonpath/benchmarks`: how benchmarks run + regression tests

Benchmark entrypoints (file naming patterns):

- Benchmarks are `*.bench.ts` under `packages/jsonpath/benchmarks/src/`.
  - Documented in README:
    - `query-fundamentals.bench.ts`
    - `filter-expressions.bench.ts`
    - `scale-testing.bench.ts`
    - `compilation-caching.bench.ts`
    - `output-formats.bench.ts`
    - `pointer-rfc6901.bench.ts`
    - `patch-rfc6902.bench.ts`
    - `merge-patch-rfc7386.bench.ts`
    - `streaming-memory.bench.ts`
    - `advanced-features.bench.ts`
    - `browser/index.bench.ts`

Regression checks:

- `packages/jsonpath/benchmarks/src/performance-regression.spec.ts`
  - Warn-only perf checks for:
    - simple query
    - filter query
    - recursive query
  - Reads baselines from `packages/jsonpath/benchmarks/baseline.json`.
  - Emits `console.warn(...)` when performance drops >10%, but always `expect(true).toBe(true)`.

Vitest configuration:

- `packages/jsonpath/benchmarks/vitest.config.ts` uses base config + aliases to source packages for fair comparison runs.

### Complete Examples

```ts
// @jsonpath/patch current API surface (excerpt)
export interface ApplyOptions {
	readonly strictMode?: boolean;
	readonly mutate?: boolean;
	readonly validate?: boolean;
	readonly continueOnError?: boolean;
	readonly atomicApply?: boolean;
	readonly inverse?: boolean;
	readonly before?: (data: unknown, op: PatchOperation, index: number) => void;
	readonly after?: (
		data: unknown,
		op: PatchOperation,
		index: number,
		result: unknown,
	) => void;
}

export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const {
		strictMode = true,
		mutate = false,
		validate: shouldValidate = false,
		continueOnError = false,
		atomicApply = true,
		before,
		after,
	} = options;

	const workingRoot = atomicApply
		? structuredClone(target)
		: mutate
			? target
			: structuredClone(target);

	const unescapePointer = (s: string) =>
		s.replace(/~1/g, '/').replace(/~0/g, '~');
	const parseTokens = (ptr: string): string[] => {
		if (ptr === '') return [];
		if (!ptr.startsWith('/'))
			throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
		return ptr.split('/').slice(1).map(unescapePointer);
	};

	// setAt/removeAt/replaceAt currently defined inside the loop.
}
```

### API and Schema Documentation

- RFC coverage in code/tests:
  - Patch validation enforces required fields per RFC 6902 sections §4.1/§4.3/§4.6 (value) and §4.4/§4.5 (from).
  - Merge Patch behavior is tested against RFC 7386 examples in `merge-patch.spec.ts`.

### Configuration Examples

```ts
// Shared base Vitest config used across packages
export function vitestBaseConfig(): ViteUserConfig {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			watch: false,
			passWithNoTests: true,
			reporters: ['json', 'default'],
			outputFile: 'test-output.json',
			coverage: {
				provider: 'v8',
				reportsDirectory: 'coverage',
				reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
			},
			setupFiles: ['./setup/reflect-metadata.ts'],
		},
	};
}
```

### Technical Requirements

From plan steps 1–10 and current implementation, the changes under consideration will most directly affect:

- `@jsonpath/core`
  - Add a clone utility that skips `structuredClone` (current `deepClone` tries it first).
  - Update exports from `packages/jsonpath/core/src/index.ts` accordingly.

- `@jsonpath/patch`
  - Change the default `mutate` behavior (currently `mutate = false`).
  - Replace `structuredClone` usage sites with a faster clone.
  - Introduce caching for pointer token parsing (currently none).
  - Reduce per-iteration allocations (helpers currently defined inside operation loop).

- `@jsonpath/merge-patch`
  - Reduce/avoid `structuredClone` within `createMergePatch`.

- `@jsonpath/evaluator`
  - Evaluate whether additional lazy computation is possible; current fast paths already precompute cached pointer strings and avoid full streaming evaluation for simple/wildcard chains.

## Recommended Approach

Proceed with the plan’s intended direction, constrained by the current observed APIs:

- Treat `applyPatch` default `mutate = false` and its test assertion (“applyPatch is immutable by default”) as a breaking change point that will require updating tests in `packages/jsonpath/patch/src/__tests__/patch.spec.ts` and likely documentation in `packages/jsonpath/patch/README.md`.
- Any new clone utility added to `@jsonpath/core` should be exported from `packages/jsonpath/core/src/index.ts` to remain compatible with the current package export model (package-root only).
- Pointer token caching can be implemented at module scope (per process) or per-call; current code has no caching and parses pointers via `parseTokens` per operation.
- For merge-patch, focus changes in `createMergePatch` where `structuredClone` is used; `applyMergePatch` already defaults to mutation and does not clone.
- For evaluator, note fast paths already exist and contain explicit “bail out” conditions tied to options defaults; plan changes should respect these defaults/semantics.

## Implementation Guidance

- **Objectives**: Establish exact baseline of current cloning, defaults, and test expectations so the plan’s steps 1–10 can be executed without breaking public exports and without unintended semantic drift.
- **Key Tasks**:
  - Confirm/update clone utility exports in core and locate all `structuredClone` call sites across patch/merge-patch.
  - Update patch option defaults and align unit tests + RFC compliance harness.
  - Use existing benchmark package (`@jsonpath/benchmarks`) to validate performance changes and keep regression warnings visible.
- **Dependencies**:
  - Shared Vitest config is provided by `@lellimecnar/vitest-config` (export `vitestBaseConfig()` from `base.ts`).
  - Patch RFC tests depend on `json-patch-test-suite` being installed/available.
- **Success Criteria**:
  - All package unit tests pass under Vitest.
  - RFC 6902 / RFC 7386 suites still pass (or skip-with-warning only when upstream suite files absent).
  - Benchmarks and warn-only regression checks run successfully from repo root.

### Commands (per package)

Run from repo root:

- **@jsonpath/core**
  - Tests: `pnpm --filter @jsonpath/core test`
  - Typecheck: `pnpm --filter @jsonpath/core type-check`

- **@jsonpath/patch**
  - Tests: `pnpm --filter @jsonpath/patch test`
  - RFC suite (single file): `pnpm --filter @jsonpath/patch exec vitest run src/__tests__/rfc6902-compliance.spec.ts`
  - Typecheck: `pnpm --filter @jsonpath/patch type-check`

- **@jsonpath/merge-patch**
  - Tests: `pnpm --filter @jsonpath/merge-patch test`
  - Typecheck: `pnpm --filter @jsonpath/merge-patch type-check`

- **@jsonpath/evaluator**
  - Tests: `pnpm --filter @jsonpath/evaluator test`
  - Typecheck: `pnpm --filter @jsonpath/evaluator type-check`

- **@jsonpath/benchmarks**
  - Run all benchmarks: `pnpm --filter @jsonpath/benchmarks bench`
  - Query only: `pnpm --filter @jsonpath/benchmarks bench:query`
  - Patch only: `pnpm --filter @jsonpath/benchmarks bench:patch`
  - Pointer only: `pnpm --filter @jsonpath/benchmarks bench:pointer`
  - Warn-only regression spec: `pnpm --filter @jsonpath/benchmarks exec vitest run src/performance-regression.spec.ts`
  - Typecheck: `pnpm --filter @jsonpath/benchmarks type-check`
