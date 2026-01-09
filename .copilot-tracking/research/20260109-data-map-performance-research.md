<!-- markdownlint-disable-file -->

# Task Research Notes: Data Map Performance Plan (plans/data-map-performance/plan.md)

## Research Executed

### File Analysis

- plans/data-map-performance/plan.md
  - Performance plan steps 1–9 target baseline benches, signals allocations, subscription pattern matching, queryFlat fast paths, FlatStore.keys sorting, LRU cache, and persistent arrays.
- package.json
  - Monorepo uses pnpm + Turborepo; root scripts run tasks via Turbo.
- turbo.json
  - Defines `bench`, `bench:full`, `report` tasks in addition to `build/test/lint/type-check`.
- vitest.config.ts
  - Root Vitest uses multi-project configuration, including `packages/data-map/*/vitest.config.ts`.

- packages/data-map/benchmarks/package.json
  - Bench entrypoints are `vitest bench` with targeted scripts (e.g. `bench:signals`, `bench:subscriptions`, `bench:path`, `bench:arrays`, plus `bench:full` emitting `results.json`).
- packages/data-map/benchmarks/src/utils/adapter-helpers.ts
  - Common benchmark naming helpers (`benchKey({ category, caseName, adapterName })`) and pointer conversion helpers.
- packages/data-map/benchmarks/src/performance-regression.spec.ts
  - Baseline/regression harness exists but currently does not compute “current results” (placeholder implementation).
- packages/data-map/benchmarks/baseline.json
  - Baseline schema is present but most/all entries are `opsPerSec: 0` (treated as “unset” by reporting).

- packages/data-map/path/src/query.ts
  - `queryFlat(store, path)` has a restricted fast-path via `parseSimpleJsonPath()` + `iteratePointersForSimpleJsonPath()`, else materializes `store.getObject('')` and runs `@jsonpath/jsonpath`.
- packages/data-map/path/src/pointer-iterator.ts
  - Fast-path JSONPath subset supports `$`, `.prop`, `['prop']`, `[0]`, `[*]`; rejects recursive descent (`..`), prop wildcard (`*`), filters/slices/unions.
- packages/data-map/path/src/cache.ts
  - `QueryCache` uses an `accessOrder: string[]` and `.filter(...)` on every get/set → O(n) updates.
- packages/data-map/path/src/compiler.ts
  - Creates a module-scoped `const cache = new QueryCache<CompiledQuery>(500)` and uses it in `compile(path)`.

- packages/data-map/storage/src/flat-store.ts
  - `keys(prefix?)` eagerly sorts keys (`Array.from(this.data.keys()).sort()`) before yielding; `getObject('')` materializes the entire store; `getObject(pointer)` reconstructs subtree by scanning keys with a prefix.

- packages/data-map/subscriptions/src/subscription-engine.ts
  - `notify(pointer, value, previousValue?)` runs stages `before`/`on`/`after`; `on` stage can be microtask-batched; supports debounce.
- packages/data-map/subscriptions/src/pattern-index.ts
  - `PatternIndex.match(pointer)` is a linear scan over all patterns calling `compiled.matchesPointer(pointer)`.
- packages/data-map/subscriptions/src/trie-index.ts
  - Existing Trie-based prefix index wrapper around Mnemonist (`mnemonist/trie-map.js`) is already used for exact subscriptions.

- packages/data-map/signals/src/signal.ts
  - `SignalImpl.notify()` snapshots sets using `Array.from` for safe iteration under re-entrancy.
- packages/data-map/signals/src/computed.ts
  - `ComputedImpl.onDependencyChanged()` snapshots observers and subscribers via `Array.from`, then notifies.

- packages/data-map/arrays/src/indirection-layer.ts
  - `nextPhysicalIndex()` creates `new Set(logicalToPhysical)` and linearly scans from 0 upward → allocation + O(n).
- packages/data-map/arrays/src/persistent-vector.ts
  - Persistent vector is naive (`push` uses `[...this.data, value]`, `set` uses `slice()`), so updates are O(n) copies.

- packages/jsonpath/compiler/src/cache.ts
  - Internal doubly-linked-list `LRUCache` implementation exists (O(1) get/set/touch/evict).
- packages/jsonpath/filter-eval/src/cache.ts
  - Similar internal `FilterCache` implementation exists (same linked-list pattern).
- packages/jsonpath/jsonpath/src/**tests**/compiled-cache.spec.ts
  - Provides a concrete test pattern for LRU eviction semantics.

### Code Search Results

- queryFlat
  - packages/data-map/path/src/query.ts
- parseSimpleJsonPath|iteratePointersForSimpleJsonPath
  - packages/data-map/path/src/pointer-iterator.ts
- QueryCache
  - packages/data-map/path/src/cache.ts
  - packages/data-map/path/src/compiler.ts
- PatternIndex
  - packages/data-map/subscriptions/src/pattern-index.ts
  - packages/data-map/subscriptions/src/subscription-engine.ts
- mnemonist/trie-map
  - packages/data-map/subscriptions/src/trie-index.ts
  - packages/data-map/subscriptions/package.json (mnemonist dependency)
  - packages/data-map/path/package.json (mnemonist dependency)
- LRUCache (linked list)
  - packages/jsonpath/compiler/src/cache.ts
  - packages/jsonpath/filter-eval/src/cache.ts

### External Research

- #githubRepo:"Yomguithereal/mnemonist TrieMap trie-map"
  - Confirms Mnemonist ships `TrieMap` and exposes `find(prefix)` + iterators; repository contains `trie-map.js` and related tests.
- #fetch:https://yomguithereal.github.io/mnemonist/trie-map
  - Confirms `TrieMap` API (`set`, `get`, `has`, `find`, iterators); iteration order is arbitrary; `find(prefix)` returns prefix/value pairs.
- #fetch:https://vitest.dev/guide/workspace.html
  - Confirms Vitest “projects” (formerly workspace) support; root config influences global options (e.g., reporters/coverage) while projects are separate configs.
- #fetch:https://turborepo.com/repo/docs/core-concepts/monorepos/running-tasks
  - Confirms Turbo filters and task scoping patterns (e.g., `turbo run build --filter=@scope/pkg`).

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo tasks; per-package `vitest run`; benchmarks via `vitest bench`; type-check via `tsgo --noEmit`.
- Instructions followed: do not invent APIs; only cite verified repo code + external docs; write research notes only under `.copilot-tracking/research/`.

## Key Discoveries

### Project Structure

- DataMap is implemented as multiple workspace packages under `packages/data-map/*`.
- Benchmarks live in `@data-map/benchmarks` and are run via `vitest bench` scripts.
- Root Vitest config runs per-workspace projects.

### Implementation Patterns

#### 1) queryFlat split between pointer-fast-path and full materialization

- Fast-path triggers only when `parseSimpleJsonPath(path)` succeeds.
- Fast-path pointer expansion for `[*]` uses `store.keys(basePointer)` and collects immediate children.
- Fallback always does `store.getObject('')` then runs `@jsonpath/jsonpath` query.

#### 2) QueryCache in @data-map/path is currently O(n)

- `QueryCache.get()` and `.set()` mutate `accessOrder` using `.filter(...)`.

#### 3) PatternIndex is linear scan; exact subscriptions already use a trie wrapper

- `PatternIndex.match(pointer)` loops all compiled patterns.
- Exact pointer subscriptions use `ExactIndex` which is built on `TrieIndex` (Mnemonist `TrieMap`).

#### 4) Signals allocations are intentional snapshots (re-entrancy safety)

- `Array.from(set)` is used in hot paths (`SignalImpl.notify`, `ComputedImpl.onDependencyChanged`) to isolate iteration from mutation.

#### 5) There is already an internal O(1) linked-list LRU implementation in packages/jsonpath

- `packages/jsonpath/compiler/src/cache.ts` and `packages/jsonpath/filter-eval/src/cache.ts` implement linked-list + map caches.
- `packages/jsonpath/jsonpath/src/__tests__/compiled-cache.spec.ts` documents eviction semantics expected of an LRU.

### Complete Examples

```ts
// Current DataMap query compilation cache is O(n) due to Array.filter on each access:
// packages/data-map/path/src/cache.ts
export class QueryCache<T> {
	private cache: Map<string, T>;
	private maxSize: number;
	private accessOrder: string[] = [];

	get(key: string): T | undefined {
		const val = this.cache.get(key);
		if (val !== undefined) {
			this.accessOrder = this.accessOrder.filter((k) => k !== key);
			this.accessOrder.push(key);
		}
		return val;
	}
}

// An existing O(1) linked-list LRU implementation exists in this repo:
// packages/jsonpath/compiler/src/cache.ts
export class LRUCache {
	private readonly map = new Map<string, Entry>();
	private head: Entry | null = null;
	private tail: Entry | null = null;
	get(key: string): CompiledQuery | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;
		this.touch(entry);
		return entry.value;
	}
}
```

### API and Schema Documentation

- Bench baselines:
  - `packages/data-map/benchmarks/baseline.json` is a `Record<string, { opsPerSec: number }>`.
- queryFlat output:
  - `QueryResult` returned by `queryFlat` includes `{ values: unknown[]; pointers: string[] }`.

### Configuration Examples

```json
// packages/data-map/benchmarks/package.json (scripts excerpt)
{
	"scripts": {
		"bench": "vitest bench",
		"bench:signals": "vitest bench src/signals-comparative.bench.ts",
		"bench:subscriptions": "vitest bench src/subscriptions-comparative.bench.ts",
		"bench:path": "vitest bench src/path-access.bench.ts",
		"bench:arrays": "vitest bench src/arrays-comparative.bench.ts",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json"
	}
}
```

### Technical Requirements

- Any “replace QueryCache with LRU” work can reuse the existing linked-list cache pattern in `packages/jsonpath/*` rather than introducing a new dependency.
- Any Trie-based pattern matching can reuse the repo’s established Mnemonist import style (`mnemonist/trie-map.js` default import) already in `packages/data-map/subscriptions/src/trie-index.ts`.

## Recommended Approach

Follow `plans/data-map-performance/plan.md`, with two concrete, repo-verified implementation anchors:

1. For Step 5 (QueryCache), reuse the existing linked-list LRU pattern from `packages/jsonpath/compiler/src/cache.ts` / `packages/jsonpath/filter-eval/src/cache.ts`.
2. For Step 6/7 (pattern/prefix indexing), build on the existing `TrieIndex` + `ExactIndex` approach in DataMap subscriptions (already wraps Mnemonist `TrieMap`).

## Implementation Guidance

- **Objectives**: Produce an implementation-ready map from performance-plan steps → concrete code locations, existing primitives to reuse, and exact commands to validate via tests/benches.
- **Key Tasks**:
  - Step 1 (Baselines/regression harness): inspect `@data-map/benchmarks` baseline + compare scripts; decide how baselines will be generated/updated (current baseline values are zero/unset).
  - Step 2/9 (Signals allocations): measure `Array.from` snapshots in `signals` (signal + computed) against benchmarks; identify safe reduction points (must preserve re-entrancy safety).
  - Step 3/8 (Arrays): optimize `IndirectionLayer.nextPhysicalIndex()` and/or `PersistentVector` while keeping existing `SmartArray` semantics.
  - Step 4 (FlatStore.keys): eliminate eager global sort; ensure iteration correctness with existing tests.
  - Step 5 (QueryCache): replace O(n) LRU update with linked-list LRU; add tests mirroring `packages/jsonpath/jsonpath/src/__tests__/compiled-cache.spec.ts` (DataMap currently has no dedicated cache test file).
  - Step 6 (PatternIndex): replace linear scan with an index structure; reuse Mnemonist trie wrapper patterns; validate with existing subscription tests.
  - Step 7 (queryFlat): expand fast-path coverage and avoid full materialization where possible, respecting `parseSimpleJsonPath` constraints.
- **Dependencies**: `@data-map/*` packages, `@jsonpath/*` packages, `mnemonist`.
- **Success Criteria**:
  - Unit tests: `@data-map/{path,storage,signals,subscriptions,arrays}` test suites pass.
  - Benchmarks: targeted `@data-map/benchmarks` suites show improved ops/sec (once baselines are populated).
  - No behavior regressions in `queryFlat`, subscriptions notification semantics, or signals dependency tracking.

### Copy/paste validation commands (per package)

- Unit tests:
  - `pnpm --filter @data-map/path test`
  - `pnpm --filter @data-map/storage test`
  - `pnpm --filter @data-map/subscriptions test`
  - `pnpm --filter @data-map/signals test`
  - `pnpm --filter @data-map/arrays test`

- Benchmarks:
  - `pnpm --filter @data-map/benchmarks bench:signals`
  - `pnpm --filter @data-map/benchmarks bench:subscriptions`
  - `pnpm --filter @data-map/benchmarks bench:path`
  - `pnpm --filter @data-map/benchmarks bench:arrays`
  - `pnpm --filter @data-map/benchmarks bench:full` (emits `packages/data-map/benchmarks/results.json`)

- Turbo equivalents (optional):
  - `pnpm turbo run test --filter=@data-map/path`
  - `pnpm turbo run bench --filter=@data-map/benchmarks`
