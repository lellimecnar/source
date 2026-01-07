<!-- markdownlint-disable-file -->

# Task Research Notes: plans/data-map-performance-audit-resolution/plan.md

## Research Executed

### File Analysis

- plans/data-map-performance-audit-resolution/plan.md
  - Contains steps 1.1–6.2 and references both `@data-map/core` and `@data-map/benchmarks`.
  - Several “planned” optimizations already exist in current code (subscriber fast-path checks, `clone` option, microtask batching, dynamic Bloom filter toggle).

- packages/data-map/core/package.json
  - `type: module` (ESM).
  - Build: `vite build`.
  - Tests/bench: `vitest run` and `vitest bench`.
  - Key scripts:
    - `pnpm --filter @data-map/core test`
    - `pnpm --filter @data-map/core test:watch`
    - `pnpm --filter @data-map/core test:coverage`
    - `pnpm --filter @data-map/core bench`

- packages/data-map/benchmarks/package.json
  - `type: module` (ESM).
  - Benches: `vitest bench` with many targeted scripts (e.g. `bench:path`, `bench:subs`, etc.).
  - Reporting: `bench:full` produces JSON output; `report` and `run-all` compile TS scripts then run Node.
  - Primary bench commands:
    - `pnpm --filter @data-map/benchmarks run bench`
    - `pnpm --filter @data-map/benchmarks run bench:full`

- packages/data-map/core/src/datamap.ts
  - Core `DataMap<T, Ctx>` implementation.
  - Current semantics that matter for the plan:
    - Construction cloning: `cloneInitial ?? true` (deep clones initial value via `cloneSnapshot()` when true).
    - Read cloning: `resolve(..., options)` uses `options.clone ?? true` (deep clones values by default).
    - Subscriptions are lazy (`_subs: SubscriptionManagerImpl | null`), and notifications are skipped if there are no subscribers.
    - Mutations are implemented as JSON Patch building (`buildSetPatch`) + `patch()`.
    - `patch()` calls `ensureOwned()` which deep clones the entire root if `_isOwned` is false.
    - `patch()` always applies ops immutably via `patch/apply.ts` → `utils/jsonpath.applyOperations(..., { mutate: false })`.
    - Batch: stack-based collection via `BatchManager` + `_flushBatch()`.
    - Transaction: snapshot rollback using `getSnapshot()` (deep clone) and `batch()`.

- packages/data-map/core/src/subscription/manager.ts
  - `SubscriptionManagerImpl<T, Ctx>` is the concrete implementation backing `DataMap.subscribe()`.
  - Key APIs for the plan:
    - `register(config)` returns a `Subscription` with `unsubscribe()` (calls `unregister(id)`)
    - `hasSubscribers()` returns `subscriptions.size > 0`
    - `scheduleNotify(...)` uses `NotificationScheduler` to microtask-batch non-`before` stages
    - `notify(...)`:
      - if stage !== `before` → schedules execution on microtask queue
      - if stage === `before` → executes synchronously and can cancel/transform
    - Dynamic Bloom filter toggle already exists:
      - `pointerSet` is used for small sizes; switches to Bloom when `pointerSet.size > BLOOM_THRESHOLD` (100)
    - `handleStructuralChange()` and `handleFilterCriteriaChange()` re-expand dynamic subscriptions using `dataMap.toJSON()`

- packages/data-map/core/src/subscription/scheduler.ts
  - `NotificationScheduler` microtask-batches scheduled functions via `queueMicrotask()`.

- packages/data-map/core/src/utils/clone.ts
  - Deep clone uses `rfdc` with `{ circles: false, proto: false }`.

- packages/data-map/core/src/utils/pointer.ts
  - JSON Pointer helpers (escape/unescape/parse/build).
  - Inline fast paths:
    - `tryResolvePointerInline(data, pointer)`
    - `tryPointerExistsInline(data, pointer)`

- packages/data-map/core/src/utils/jsonpath.ts
  - Integration point for JSONPath/Pointer/Patch:
    - `queryWithPointers()` / `streamQuery()` using `@jsonpath/jsonpath`
    - `resolvePointer()` and `pointerExists()` using inline fast paths first, then `@jsonpath/pointer`
    - `applyOperations()` delegates to `@jsonpath/patch.applyPatch` with `mutate` defaulting to `false`
  - Error normalization: wraps JSONPath/Pointer/Patch errors into `DataMapPathError` (includes `code` and `path`).

- packages/data-map/core/src/path/detect.ts
  - `detectPathType(input)` is cached in a bounded Map (max 10,000 entries; clears when full).
  - Path types: `'pointer' | 'relative-pointer' | 'jsonpath'`.

- packages/data-map/core/src/utils/structural-sharing.ts
  - Structural sharing utility exists:
    - `updateAtPointer(data, pointer, value)` clones only along the path.
  - Not currently used by `DataMap.set()`/`patch()` (those go through patch building + patch application).

- packages/data-map/core/src/utils/pool.ts
  - `ObjectPool<T>` utility exists but is currently unused in `@data-map/core`.

- packages/data-map/core/src/patch/apply.ts
  - `applyOperations(currentData, ops)` returns:
    - `nextData`
    - `affectedPointers: Set<string>`
    - `structuralPointers: Set<string>`
  - Delegates application to `utils/jsonpath.applyOperations(..., { mutate: false })`.

- packages/data-map/core/src/batch/\*
  - Batch is already implemented:
    - `batch/manager.ts`: collects operations + affected/structural pointers with nesting support
    - `batch/builder.ts`: `FluentBatchBuilder` accumulates ops and applies via `dm.batch(() => dm.patch(ops))`

- packages/data-map/benchmarks/src/adapters/data-map.adapter.ts
  - Current adapter creates a new `DataMap(data)` for almost every single operation (get/set/patch/batch/etc.).
  - This directly matches Step 1.1’s “benchmark flaw” claim.

- packages/data-map/docs/\*\*
  - Docs exist for:
    - API: `docs/api/datamap.md`, `docs/api/subscriptions.md`, `docs/api/types.md`
    - Architecture: `docs/architecture/subscription-system.md`, `docs/architecture/patch-system.md`, `docs/architecture/path-system.md`
    - Guides: `docs/guides/batching.md`, `docs/guides/subscriptions.md`, etc.
  - These are the obvious targets for plan steps 6.1–6.2.

### Code Search Results

- Plan step headings
  - `Step 1.1` through `Step 6.2` exist in the plan file.

- Object pool usage
  - `ObjectPool<T>` exists (packages/data-map/core/src/utils/pool.ts) but there were no in-repo usages under `packages/data-map/core/src/**`.

- Proxy/selector/shallow utilities
  - No existing symbols matching `proxy`, `selector`, `toImmutable`, or `shallow` under `packages/data-map/core/src/**`.

### External Research

- (None executed) — Workspace code and existing internal docs were sufficient to verify concrete implementations and APIs.

### Project Conventions

- Standards referenced: repo root `AGENTS.md` and workspace scripts in package.json.
- Conventions verified from current code:
  - ESM packages (`"type": "module"`) in both core and benchmarks.
  - TS module settings: `module: ESNext`, `moduleResolution: Bundler` (per-package tsconfig).
  - Benchmarks TS sources use `.js` extensions in relative imports (e.g. `./types.js`) to be Node ESM-friendly after emit.

## Key Discoveries

### Project Structure

- packages/data-map/core/src/
  - datamap.ts (main class)
  - batch/\* (batch builder/manager/types)
  - patch/\* (patch building and apply wrapper)
  - path/\* (detect/compile/match/expand)
  - subscription/\* (manager/scheduler/bloom)
  - utils/\* (clone/pointer/jsonpath/structural-sharing/pool)
  - tests live alongside source (`*.spec.ts`) plus `__tests__/` and `__benchmarks__/`.

- packages/data-map/benchmarks/src/
  - `*.bench.ts` benchmark files
  - `*.spec.ts` smoke tests and adapter tests
  - adapters/\* includes `data-map.adapter.ts` (currently constructs new DataMap per operation)
  - fixtures/\* provides datasets and generators

### Implementation Patterns

**Subscription lifecycle and unsubscribe**

- Public `DataMap.subscribe(config)` delegates to `SubscriptionManagerImpl.register(config)`.
- `register()` returns a `Subscription` object with `unsubscribe(): void`.
- Unsubscribe calls `SubscriptionManagerImpl.unregister(id)` which removes the subscription from:
  - `subscriptions`
  - `dynamicSubscriptions` (if dynamic)
  - `reverseIndex` pointer → ids map
  - `structuralWatchers` / `filterWatchers` tracking sets

**Stage timing + batching**

- `before` stage: synchronous and can cancel/transform.
- `on` / `after` stage: scheduled via `NotificationScheduler` and batched in a microtask.
- `DataMap` already has a fast path:
  - `notify()` returns early when there are no subscribers.
  - `scheduleNotify()` only runs when `_subs` has been created.

**Read cloning**

- `CallOptions.clone?: boolean` exists and is already honored by `resolve()`.
- Default behavior today is defensive clone (`options.clone ?? true`).
- `get()` itself does not clone; it consumes the (possibly cloned) value returned by `resolve()`.

**Write behavior today**

- `set()` / `setAll()` / `map()` build JSON Patch ops using `buildSetPatch()` and then call `patch()`.
- `patch()`:
  - deep clones the entire root if `_isOwned` is false (`ensureOwned()`)
  - applies operations immutably via `patch/apply.ts` (which calls `@jsonpath/patch.applyPatch(..., { mutate: false })`)
  - invokes subscription hooks and invalidation (`handleStructuralChange`, `handleFilterCriteriaChange`)

### Complete Examples

```ts
// Verified from packages/data-map/core/src/subscription/scheduler.ts
export class NotificationScheduler {
	private queue: (() => void)[] = [];
	private scheduled = false;

	schedule(fn: () => void): void {
		this.queue.push(fn);
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => {
			this.flush();
		});
	}

	private flush(): void {
		const currentQueue = this.queue;
		this.queue = [];
		this.scheduled = false;

		for (const fn of currentQueue) {
			try {
				fn();
			} catch (e) {
				console.error('Error in scheduled notification:', e);
			}
		}
	}
}
```

### API and Schema Documentation

- packages/data-map/docs/api/datamap.md
  - Documents `DataMapOptions` (but currently does not mention `cloneInitial` even though it exists in `types.ts`).
  - Documents `get(pathOrPointer, options?: CallOptions)`.

- packages/data-map/docs/architecture/subscription-system.md
  - Explains the microtask batching and bloom filter model, matching current code shape.

### Configuration Examples

```jsonc
// packages/data-map/core/package.json (verified)
{
	"name": "@data-map/core",
	"type": "module",
	"scripts": {
		"test": "vitest run",
		"bench": "vitest bench",
		"build": "vite build",
	},
}
```

### Technical Requirements

- Any changes that affect cloning semantics (plan steps 1.5, 2.1) will require coordinated updates across:
  - `packages/data-map/core/src/types.ts` (`CallOptions.clone` already exists)
  - `packages/data-map/core/src/datamap.ts` default clone behavior
  - tests under `packages/data-map/core/src/**/*.spec.ts` and `packages/data-map/core/src/__tests__/*.spec.ts`
  - docs under `packages/data-map/docs/api/datamap.md` and guides

## Recommended Approach

Focus implementation work on the deltas that are truly missing vs the plan:

1. Fix benchmark methodology (Step 1.1): adapter caching in `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts` is clearly needed.
2. Structural sharing integration (Step 1.3 / Phase 2): `updateAtPointer()` exists but is unused; current writes route through patch building + immutable patch apply, plus potential redundant deep root clone (`ensureOwned()`).
3. Subscription optimizations (Phase 3): several plan items already exist (microtask batching, bloom toggle, specificity ordering), but trie/prefix matching and structural-change overhead remain targets.
4. Proxy/selector/shallow utilities (Phase 5): no existing code present; this is a net-new subsystem.

## Implementation Guidance

- **Objectives**: Ground each plan step in existing `@data-map/core` and `@data-map/benchmarks` code, identifying what is already done and what must change.
- **Key Tasks**:
  - Map plan steps (1.1–6.2) to exact files/symbols (see below).
  - Verify test coverage impact for cloning semantics and subscription timing.
- **Dependencies**: `@jsonpath/*` packages are used via source aliases in Vitest configs; patch semantics depend on `@jsonpath/patch`.
- **Success Criteria**:
  - Benches measure operation cost rather than construction cost.
  - Tests pass under updated semantics (when semantics-changing steps are implemented).

## Plan Step → Current Files/Symbols → Required Modifications

### Step 1.1: Fix Benchmark Adapter Methodology

- Current file: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`
  - Current behavior: creates `new DataMap(data)` inside nearly every adapter method.
- Required change (per plan intent): add per-input caching of `DataMap` instance and reuse across adapter calls for the same `data` reference.

### Step 1.2: Add Subscriber Count Fast Check

- Current files:
  - `packages/data-map/core/src/datamap.ts`
  - `packages/data-map/core/src/subscription/manager.ts`
- Already implemented today:
  - `DataMap.hasSubscribers()` checks `_subs !== null && _subs.hasSubscribers()`.
  - `DataMap.notify()` returns early when no subscribers.
  - `DataMap.scheduleNotify()` only does work when `_subs` exists.
  - `SubscriptionManagerImpl.hasSubscribers()` returns `subscriptions.size > 0`.
- Likely modification scope: none (unless the plan wants a different API/flag shape).

### Step 1.3: Integrate Existing Structural Sharing Utility

- Current files:
  - `packages/data-map/core/src/utils/structural-sharing.ts` (`updateAtPointer()` exists)
  - `packages/data-map/core/src/datamap.ts` (`set()` routes through `buildSetPatch()` + `patch()`)
- Required change: integrate `updateAtPointer()` into write paths (likely `set()` first), reducing reliance on patch-building and full root cloning.

### Step 1.4: Implement Accessor Compilation Cache

- Current files:
  - `packages/data-map/core/src/utils/pointer.ts` (inline pointer resolution exists)
  - `packages/data-map/core/src/utils/jsonpath.ts` uses inline fast path, then `@jsonpath/pointer`.
- Missing today: no accessor compilation cache.
- Required change: introduce caching layer for repeated pointer reads (likely for `/a/b/c` hot paths), without breaking pointer semantics.

### Step 1.5: Add `clone: false` Option to `get()`

- Current files:
  - `packages/data-map/core/src/types.ts` (`CallOptions.clone?: boolean` already exists)
  - `packages/data-map/core/src/datamap.ts` (`resolve()` uses `options.clone ?? true`)
- Already implemented today:
  - Passing `{ clone: false }` into `get()` works because `get()` passes options through to `resolve()`.
- Likely modification scope: docs + tests (if not already covered).

### Step 1.6: Enable Microtask Batching by Default

- Current files:
  - `packages/data-map/core/src/subscription/scheduler.ts` (microtask batching exists)
  - `packages/data-map/core/src/subscription/manager.ts` (`stage !== 'before'` schedules via scheduler)
- Already implemented today:
  - `on` and `after` stages are microtask-batched.
- Likely modification scope: none (unless DataMap is expected to add an extra scheduling layer).

### Step 2.1: Remove Defensive Cloning from `get()`

- Current files:
  - `packages/data-map/core/src/datamap.ts` (`resolve()` defaults `options.clone ?? true`)
  - `packages/data-map/core/src/types.ts` (`CallOptions.clone`)
- Required change: flip default clone behavior (and update tests/docs accordingly).

### Step 2.2: Implement Copy-on-Write for `patch()`

- Current files:
  - `packages/data-map/core/src/datamap.ts` (`ensureOwned()` deep clones root; `patch()` uses immutable patch application)
  - `packages/data-map/core/src/patch/apply.ts` (always uses immutable patch apply)
  - `packages/data-map/core/src/utils/jsonpath.ts` (`applyOperations(..., { mutate?: boolean })`)
- Required change: avoid redundant deep cloning and switch to true copy-on-write semantics (likely conditional `mutate: true` when owned, or structural-sharing integration).

### Step 2.3: Add `toImmutable()` Snapshot Method

- Current files:
  - `packages/data-map/core/src/datamap.ts` currently has `toJSON()` and `getSnapshot()` (both deep clone).
- Missing today: `toImmutable()` method.
- Required change: define semantics and add to class + docs.

### Step 2.4: Optimize Batch Operations with Deferred Application

- Current files:
  - `packages/data-map/core/src/batch/manager.ts` (collects ops + pointer sets)
  - `packages/data-map/core/src/datamap.ts` (`batch()`, `_flushBatch()`)
- Required change: reduce repeated `get()`/clone costs during batch flush and/or defer `applyOperations` usage further.

### Step 2.5: Update All Tests for New Semantics

- Current tests (non-exhaustive but verified present):
  - `packages/data-map/core/src/datamap.spec.ts`
  - `packages/data-map/core/src/patch/*.spec.ts`
  - `packages/data-map/core/src/subscription/*.spec.ts`
  - `packages/data-map/core/src/__tests__/*.spec.ts`
  - `packages/data-map/core/src/path/*.spec.ts`
- Required change: adjust tests that rely on read cloning and/or timing of notifications.

### Step 3.1: Implement Tiered Subscription Matching

- Current files:
  - `packages/data-map/core/src/subscription/manager.ts`
- Already partially implemented today:
  - Specificity ordering exists in `invokeHandlers()`.
  - Static-vs-dynamic split exists via `reverseIndex` and `dynamicSubscriptions`.
- Missing vs plan (likely): explicit tiers (exact / prefix / wildcard / recursive / filter) with distinct indices.

### Step 3.2: Add Path Trie for Prefix Matching

- Current files:
  - `packages/data-map/core/src/subscription/manager.ts` uses `reverseIndex: Map<pointer, Set<id>>`.
- Missing today: trie for prefix/ancestor matching.
- Required change: add a prefix matching structure; adjust match lookup.

### Step 3.3: Dynamic Bloom Filter Toggle

- Current files:
  - `packages/data-map/core/src/subscription/manager.ts`
- Already implemented today:
  - `pointerSet` for small counts, switches to bloom at threshold (100).
- Likely modification scope: none (unless thresholding strategy changes).

### Step 3.4: Optimize `handleStructuralChange()`

- Current files:
  - `packages/data-map/core/src/subscription/manager.ts`
- Current behavior:
  - Calls `dataMap.toJSON()` (deep clone) and re-expands patterns.
- Required change: reduce cloning and/or avoid full re-expansion when possible.

### Step 4.1: Implement LRU Cache for Path Detection

- Current files:
  - `packages/data-map/core/src/path/detect.ts`
- Already has caching:
  - bounded Map with clear-all behavior.
- Missing vs plan: LRU eviction (instead of clear-all).

### Step 4.2: Expand Inline Pointer Fast Path

- Current files:
  - `packages/data-map/core/src/utils/pointer.ts` (tryResolvePointerInline / tryPointerExistsInline)
  - `packages/data-map/core/src/utils/jsonpath.ts` uses these fast paths first.
- Likely modification scope: broaden fast-path applicability (e.g. accept `#/` fragment pointers) and reduce per-call allocations.

### Step 4.3: Use Object Pool for Hot Path Allocations

- Current files:
  - `packages/data-map/core/src/utils/pool.ts` (`ObjectPool<T>` exists)
- Missing today: no usage.
- Required change: integrate pooling into high-frequency alloc sites (pointer parsing arrays, temporary sets/arrays in subscription matching, etc.).

### Step 5.1: Implement Proxy-Based Change Detection

- Current status:
  - No proxy-based implementation exists in `packages/data-map/core/src/**`.
- Required change: net-new subsystem.

### Step 5.2: Implement Selector-Based Subscriptions

- Current status:
  - No selector API exists in `packages/data-map/core/src/**`.
- Required change: net-new API + integration with subscription manager.

### Step 5.3: Add Shallow Comparison Utilities

- Current status:
  - No shallow-equality utilities found.
- Required change: add utilities and use them in selector subscriptions.

### Step 6.1: Update API Documentation

- Current docs:
  - `packages/data-map/docs/api/datamap.md`
  - `packages/data-map/docs/api/subscriptions.md`
  - `packages/data-map/docs/api/types.md`
- Required change: align docs with any semantics changes (clone defaults, new APIs like `toImmutable`, selectors, proxy behavior).

### Step 6.2: Update CHANGELOG

- Current file: `packages/data-map/docs/CHANGELOG.md`
- Required change: document breaking changes (plan explicitly allows breaking changes).
