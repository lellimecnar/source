<!-- markdownlint-disable-file -->

# Task Research Notes: Implementing `plans/data-map-benchmarks/plan.md`

## Research Executed

### File Analysis

- packages/jsonpath/benchmarks/package.json
  - Benchmark invocation is via scripts calling `vitest bench` (plus targeted runs via `--testNamePattern=...`).
- packages/jsonpath/benchmarks/vitest.config.ts
  - Uses shared `@lellimecnar/vitest-config` and sets `resolve.alias` to TypeScript source entrypoints (not built `dist`) for workspace packages.
- packages/jsonpath/benchmarks/tsconfig.json
  - Extends `@lellimecnar/typescript-config/base.json`; `rootDir` is `./src`.
- packages/jsonpath/benchmarks/src/
  - `*.bench.ts` naming convention.
  - `src/adapters/*` provides a normalized adapter layer + per-adapter smoke tests.
  - `src/fixtures/*` provides reusable dataset + query catalogs.

- packages/data-map/core/package.json
  - Confirms an existing `bench` script: `vitest bench`.
  - Build uses Vite (`vite build`) and types via `vite-plugin-dts` (see `vite.config.ts`).

- packages/data-map/core/src/index.ts
  - Public API exports: `DataMap` plus types: `Operation`, `CallOptions`, `DataMapOptions`, `ResolvedMatch`, subscription types, definition types.

- packages/data-map/core/src/datamap.ts
  - Core implementation with: unified pointer/JSONPath resolution, RFC6902 operations, subscriptions, batch+transaction, definitions.

- packages/data-map/core/src/**benchmarks**/main.bench.ts
  - Existing local benchmark file for `@data-map/core` using `vitest bench`.

- packages/data-map/core/src/utils/jsonpath.ts
  - JSONPath integration and error normalization via `DataMapPathError`.
  - Exposes `compileQuery` and `queryWithPointers`, `streamQuery`, `resolvePointer`, `pointerExists`, `applyOperations`.

- packages/data-map/core/src/patch/apply.ts
  - Computes `affectedPointers` and `structuralPointers` for subscription invalidation.

- packages/data-map/core/src/subscription/manager.ts
  - Implements reverse-index + Bloom filter matching; supports dynamic subscription expansion.
  - Precompiles JSONPath queries (when possible) unless `noPrecompile`.

- packages/data-map/core/src/definitions/registry.ts
  - Definitions (computed/derived) implemented as getter/setter hooks with optional dependency-based caching + invalidation.

- packages/data-map/docs/\*\*
  - DataMap docs exist (core concepts, subscriptions, path system, patch system). Some references still mention `json-p3` even though code currently uses `@jsonpath/*`.

- package.json (repo root) and turbo.json
  - Tests are run via Turbo (`pnpm test` → `turbo test`). There is no root turbo task for `bench` today.
  - Root Vitest multi-project config exists at `vitest.config.ts` (used by some workflows/CI tooling).

### Code Search Results

- Benchmark naming pattern
  - `*.bench.ts` found under `packages/jsonpath/benchmarks/src/` and `packages/data-map/core/src/__benchmarks__/`.

- Vitest benchmark invocation
  - `packages/jsonpath/benchmarks/package.json` scripts: `bench`, `bench:full`, `bench:*` subsets using `--testNamePattern`.
  - `packages/data-map/core/package.json` scripts: `bench: "vitest bench"`.

- DataMap core API surface (implemented in `packages/data-map/core/src/datamap.ts`)
  - Read: `resolve()`, `resolveStream()`, `get()`, `getAll()`, `peek()`, `toJSON()`, `getSnapshot()`.
  - Write: `set()` + `set.toPatch()`, `setAll()` + `setAll.toPatch()`, `map()` + `map.toPatch()`, `patch()`.
  - Array ops: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `shuffle` (each with `.toPatch()` where applicable).
  - Batch: callback-style `batch(fn)` and fluent `batch.set/remove/merge/move/copy -> apply()/toPatch()`.
  - Transaction: `transaction(fn)` (snapshot rollback on error).
  - Subscriptions: `subscribe({ path, before/on/after, fn, noPrecompile? })`.
  - Definitions: constructor option `define: Definition | DefinitionFactory`.

- Subscription mechanics
  - `packages/data-map/core/src/subscription/types.ts` shows stages (`before`, `on`, `after`) and events (`get|set|remove|resolve|patch`).
  - `packages/data-map/core/src/subscription/manager.ts` implements:
    - reverse index pointer -> subscription ids
    - Bloom filter fast rejection
    - structural watchers for wildcard expansion updates
    - filter watchers for JSONPath filter subscriptions

### External Research

- #githubRepo:"lellimecnar/source data-map benchmarks"
  - Not used; workspace already contains the plan + benchmark reference package.
- #fetch:https://vitest.dev/guide/benchmark.html
  - Not fetched; benchmark usage is already verified via existing packages in this workspace.

### Project Conventions

- Standards referenced: root `AGENTS.md`, `packages/data-map/core/AGENTS.md`, and existing `@jsonpath/benchmarks` conventions.
- Instructions followed: workspace dependency protocol (`workspace:*`), Turbo filter usage, Vitest benchmark file naming.

## Key Discoveries

### Project Structure

**Reference benchmark package (`@jsonpath/benchmarks`)**

- `packages/jsonpath/benchmarks/src/adapters/`
  - `types.ts` defines multiple adapter “kinds” (`jsonpath|pointer|patch|merge-patch`) with feature flags and a required `smokeTest()`.
  - Individual adapters live in separate files and are re-exported from `src/adapters/index.ts`.

- `packages/jsonpath/benchmarks/src/fixtures/`
  - `data-generators.ts` provides scale generators (large arrays, deep objects, wide objects, mixed data).
  - `queries.ts` provides query catalogs grouped by category.

- Benchmark files use `*.bench.ts` with Vitest’s `describe()` + `bench()`.

**DataMap has an existing internal benchmark file**

- `packages/data-map/core/src/__benchmarks__/main.bench.ts` already benchmarks:
  - `resolve/get/peek`
  - `set/patch/batch`
  - subscription registration + dispatch
  - pattern matching (wildcards, recursive descent, filters)
  - definition resolution and getter transforms

### Implementation Patterns

**1) DataMap path types and resolution**

- `detectPathType()` distinguishes pointer vs JSONPath (relative pointer exists but is rejected in strict mode in `resolve()`):
  - `resolve('/a/b')` uses JSON Pointer resolution via `@jsonpath/pointer`.
  - `resolve('$.a.b[*]')` uses `@jsonpath/jsonpath` and returns pointer strings + values.

**2) Patching and subscription invalidation**

- `patch(ops)` calls `applyOperations()` (from `packages/data-map/core/src/patch/apply.ts`) which:
  - applies operations immutably (via `@jsonpath/patch` wrapped in `utils/jsonpath.ts`)
  - returns `affectedPointers` and `structuralPointers`
  - triggers `handleStructuralChange()` and `handleFilterCriteriaChange()` on subscriptions

**3) Subscription performance characteristics (important for benchmarking)**

- Notifications are scheduled via `NotificationScheduler` (microtask scheduling). Many event stages are async unless `before`.
- JSONPath subscriptions may be precompiled at registration time if:
  - the path is JSONPath,
  - `noPrecompile` is not set,
  - and the compiled pattern has no filters.

**4) Batching vs fluent batching are separate cost centers**

- Callback-based `batch(fn)` defers notifications until batch end.
- Fluent batching uses `FluentBatchBuilder`, which clones working snapshots and accumulates ops; this can be meaningfully slower and should be benchmarked separately.

**5) Definitions (computed/derived) are implemented via hooks**

- `DefinitionRegistry.applyGetter()` can cache outputs when deps are provided.
- Dependencies trigger automatic invalidation by auto-subscribing to dep paths.

### Complete Examples

```ts
// Source: packages/data-map/core/README.md
import { DataMap } from '@data-map/core';

const store = new DataMap({ user: { name: 'Alice' } });
store.set('$.user.name', 'Bob');
console.log(store.get('/user/name')); // "Bob"
```

```ts
// Source: packages/data-map/core/src/__benchmarks__/main.bench.ts
import { bench, describe } from 'vitest';
import { DataMap } from '../datamap';

describe('write operations', () => {
	bench('patch multiple operations', () => {
		const dm = new DataMap({ a: 1, b: 2, c: 3 });
		dm.patch([
			{ op: 'replace', path: '/a', value: 10 },
			{ op: 'replace', path: '/b', value: 20 },
			{ op: 'replace', path: '/c', value: 30 },
		]);
	});
});
```

### API and Schema Documentation

- Implementation entrypoint: `packages/data-map/core/src/index.ts` exporting `DataMap`.
- DataMap docs:
  - `packages/data-map/docs/getting-started/core-concepts.md`
  - `packages/data-map/docs/guides/subscriptions.md`
  - `packages/data-map/docs/architecture/path-system.md`
  - `packages/data-map/docs/architecture/patch-system.md`
- Specs:
  - `specs/data-map.md` (older, still references `json-p3` as core engine)
  - `spec/spec-data-datamap.md` (very detailed, also references `json-p3` in places)

### Configuration Examples

```json
// Source: packages/jsonpath/benchmarks/package.json
{
	"scripts": {
		"bench": "vitest bench",
		"bench:patch": "vitest bench --testNamePattern='Patch'",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json"
	}
}
```

```ts
// Source: packages/jsonpath/benchmarks/vitest.config.ts
export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/jsonpath': path.resolve(__dirname, '../jsonpath/src/index.ts'),
			// ... other workspace source aliases
		},
	},
});
```

### Technical Requirements

- Benchmarks should follow `@jsonpath/benchmarks` conventions:
  - normalized adapters with explicit feature flags
  - deterministic fixtures
  - `*.bench.ts` naming
  - smoke tests per adapter
- Repo-wide tests are driven by Turbo tasks (`turbo test`) and per-package scripts (`vitest run`).
- There is currently no Turbo pipeline task named `bench`; benchmark packages run via `pnpm --filter <pkg> bench`.

### Preferred Commands (Targeted)

- Whole-repo tests (Turbo):
  - `pnpm test` (runs `turbo test`, which depends on `^build`)
  - `pnpm test:watch` (runs `turbo test:watch`, persistent)
  - `pnpm test:coverage` (runs `turbo test:coverage`)

- Target a single workspace (preferred pattern in this monorepo):
  - `pnpm --filter @data-map/core test`
  - `pnpm --filter @data-map/core test -- src/__tests__/integration.spec.ts`
  - `pnpm --filter @data-map/core test -- -t "supports fluent batch"`

- Run benchmarks:
  - `pnpm --filter @data-map/core bench`
  - `pnpm --filter @data-map/core bench -- src/__benchmarks__/main.bench.ts`
  - `pnpm --filter @jsonpath/benchmarks bench:query` (uses `--testNamePattern='JSONPath'`)

### Pitfalls / Gotchas

- **Docs vs implementation drift**: several DataMap docs/specs still mention `json-p3` as the underlying engine, while `@data-map/core` currently imports `@jsonpath/*` (e.g., `packages/data-map/core/src/utils/jsonpath.ts`). Benchmarks should treat code as source of truth.
- **Notification scheduling**: subscription `on/after` handlers are scheduled (microtasks). Benchmarks that aim to measure “dispatch cost” should explicitly flush microtasks or isolate the measurement to synchronous stages.
- **Path translation overhead**: comparing pointer-based APIs (DataMap) to dot-path libs (dot-prop/lodash/dlv/dset) can accidentally benchmark _conversion_ rather than access. Precompute alternative path representations per fixture.
- **Fluent batch overhead**: `FluentBatchBuilder` clones snapshots and simulates ops on a working copy; it’s a different performance profile than callback-based `batch(fn)` and should be benchmarked separately.

## Recommended Approach

Mirror the `@jsonpath/benchmarks` structure for a new `@data-map/benchmarks` workspace package, but split adapters by benchmark category (multiple adapter kinds) instead of a single “everything” adapter.

Rationale (based on existing patterns):

- `@jsonpath/benchmarks` avoids a giant interface by using separate adapter kinds (`jsonpath|pointer|patch|merge-patch`).
- DataMap spans multiple domains (path access, patching, subscriptions, computed definitions, batch/tx). A single adapter interface would devolve into feature soup and complicate benchmark authoring.

Concrete adapter interface recommendations (aligned to the plan and existing patterns):

1. **PathAccessAdapter** (dot-prop, dlv/dset, lodash, DataMap-as-path-access)
   - `get(data, path): unknown`
   - `set?(data, path, value): unknown` (return new doc for immutable libs; mutate + return for mutable)
   - `has?(data, path): boolean`
   - `smokeTest(): boolean`
   - Recommendation: precompute _canonical path representations per fixture_ (JSON Pointer + dot path + token array) to avoid measuring adapter translation overhead.

2. **JsonPatchAdapter** (fast-json-patch, rfc6902, immutable-json-patch, @jsonpath/patch baseline)
   - `applyPatch(document, patch): document`
   - `features.mutatesInput` (match `@jsonpath/benchmarks` pattern)
   - `smokeTest()`

3. **ReactiveAdapter** (DataMap, valtio, zustand)
   - `createStore(initial): Store`
   - `subscribe(store, selectorOrPath, fn): unsubscribe`
   - `update(store, ...): void` (or `set` semantics)
   - `getSnapshot(store): unknown` (if available)
   - `smokeTest()`
   - Recommendation: keep “subscription registration cost” and “dispatch cost” separate; DataMap dispatch uses microtasks, so add explicit microtask flushing in bench harness when measuring after-handlers.

4. **DataMapAdapter** (special case)
   - Wraps `DataMap` to expose:
     - `get(pointerOrJsonPath)`, `resolve(pointerOrJsonPath)`
     - `set(pointerOrJsonPath, value)`, `patch(ops)`
     - `batch(fn)` and fluent batch
     - `transaction(fn)`
     - `subscribe(config)`

5. **JsonPathRawAdapter**
   - Calls `@jsonpath/jsonpath` directly (using `queryWithPointers()` shape) to measure DataMap integration overhead vs raw JSONPath.

## Implementation Guidance

- **Objectives**: Implement `@data-map/benchmarks` following `@jsonpath/benchmarks` conventions; benchmark the plan’s categories; keep results comparable and reduce measurement bias.
- **Key Tasks**:
  - Use `packages/jsonpath/benchmarks` as the structural template (scripts, aliases, adapter+fixtures layout, `*.bench.ts`).
  - Reuse the same adapter patterns (`smokeTest()`, `features` flags, separate adapter kinds).
  - Build deterministic fixtures (and precomputed path variants) as in `src/fixtures/`.
  - Add a “raw @jsonpath/\*” adapter to isolate DataMap overhead.
  - Keep `@data-map/core` local benchmarks (`src/__benchmarks__/main.bench.ts`) as a quick baseline during development.
- **Dependencies**:
  - Workspace conventions: `workspace:*` deps, shared configs (`@lellimecnar/vitest-config`, `@lellimecnar/typescript-config`).
  - Benchmark libs to compare are defined by `plans/data-map-benchmarks/plan.md`.
- **Success Criteria**:
  - Benchmarks run via `pnpm --filter @data-map/benchmarks bench`.
  - Adapters have smoke tests similar to `@jsonpath/benchmarks/src/adapters/*.spec.ts`.
  - Results can be subset-run (via `--testNamePattern` and/or file targeting), matching the repo’s existing benchmark ergonomics.
