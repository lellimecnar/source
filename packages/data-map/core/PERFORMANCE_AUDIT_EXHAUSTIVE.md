# @data-map/core — Exhaustive Performance Audit (2026-01-07)

## Executive summary

`@data-map/core` is **already very fast for JSON Pointer reads** (7-8M ops/sec, competitive with best-in-class), but it is **meaningfully slower for large-scale mutations** (~104 ops/sec for 10k-key objects vs ~228 ops/sec for lodash).

**Performance snapshot (10,000-key objects):**

- **Read**: @data-map/core @ 8.22M ops/sec (rank #3, period ~0.122µs)
- **Mutation**: @data-map/core @ 103.9 ops/sec (rank #8, mean ~9.63ms)
- **Clone**: @data-map/core @ 203 ops/sec (rank last, mean ~4.91ms)

The primary reasons are a mix of:

1. **Benchmark methodology artifacts** that disproportionately tax DataMap’s cost model (notably repeated deep cloning + DataMap construction inside mutation loops), and
2. **Intrinsic write-path costs** in core (patch-building and snapshot cloning patterns) that add extra full-structure work per update.

The biggest opportunities to move the needle are:

- **Fix the benchmark harness to compare like-for-like** (separate “init cost” from “per-op cost”; avoid repeated double-cloning).
- **Remove full-data cloning from patch building** and make the pointer set-path a first-class structural-sharing operation.
- **Offer explicit ownership/snapshot modes** so apps can opt into “fast immutable” without deep clone per write.
- **Reduce avoidable allocations** in subscription/index logic and avoid full `toJSON()` work in subscription maintenance.

With these changes, DataMap should be able to:

- **Maintain leadership on reads** (already competitive at 8M+ ops/sec).
- **Close most of the mutation gap** (targeting 3-5× improvement on large mutations).
- **In the long run, surpass competitors** by combining high-performance pointer operations with reactive subscriptions + JSONPath.

## Scope & constraints

- Scope: `packages/data-map/core` and all benchmarks in `packages/data-map/benchmarks`.
- Target: Explain why DataMap is slower than comparable libraries and propose a roadmap to **outperform**.
- Constraints: The current design aims to support:
  - JSON Pointer and JSONPath operations.
  - Reactive subscriptions.
  - Patch/batch/transaction semantics.
  - Definition registry (computed/derived fields).

These features materially affect what gets measured versus “pure path get/set” utilities.

## Methodology

This audit used a “code + benchmark forensics” approach:

- Review benchmark source to identify what is measured inside the timed loop.
- Cross-reference benchmark results with the exact core code paths invoked.
- Identify where DataMap is penalized for behavior competitors do not perform in the same tests.

No new performance instrumentation was added during this audit; results reference the existing benchmark harness and the current implementation.

## Benchmark review (what is measured vs what you think you’re measuring)

### 1) Scale mutation benchmarks clone the input per iteration

File: `packages/data-map/benchmarks/src/compare/scale.bench.ts`

In `Object Size Scaling - Mutation`, each iteration does:

- `const data = structuredClone(objXXXX);`
- `adapter.set!(data, '/keyNNN', 'updated');`

This is important because **some adapters clone again** inside `set`, and some do not.

### 2) DataMap adapter performs an extra clone at DataMap construction

File: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

The adapter does:

```typescript
let cachedMap: DataMap<any> | null = null;
let cachedData: unknown | null = null;

function getCachedDataMap(data: unknown): DataMap<any> {
	if (cachedData !== data) {
		cachedMap = new DataMap(data as any);
		cachedData = data;
	}
	return cachedMap!;
}
```

**Critical issue**: The cache is keyed by **object identity** (`cachedData !== data`). Since mutation benchmarks call `structuredClone(data)` each iteration, every clone is a **new object** with a different identity. This means:

1. **Cache miss every iteration**: A new `DataMap` is constructed per iteration.
2. **Constructor clones again**: With default `cloneInitial: true`, this is a second deep clone.
3. **No amortization**: The cache provides zero benefit for mutation benchmarks.

Combined with the mutation benchmark’s `structuredClone(data)` per iteration, this produces **double cloning before any mutation work even begins**.

Competitor comparisons:

- `lodash-es` adapter clones inside `set` (`cloneDeep(data)`) but does **not** have an extra “construction-time deep clone”.
- `immer` / `mutative` typically do copy-on-write finalization; they don’t deep-clone the full input before producing output.

Net effect: the scale mutation benchmarks are currently **measuring DataMap’s safety-by-default behavior** (owning the input) _plus_ its immutable snapshot behavior, while many competitors are not paying both costs.

### 3) DataMap clone benchmarks measure multiple clones (adapter + core)

File: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

`clone: (data) => dm.clone().getSnapshot()`

Core behavior:

- `DataMap.clone()` currently calls `this.getSnapshot()` and passes that into the constructor.
- The constructor then (by default) deep-clones again.

So `clone()` is (at least) **two deep clones**, and the adapter adds a third deep clone via `getSnapshot()`.

This makes DataMap look artificially slow on clone benchmarks relative to libraries that do a single deep clone.

### 4) Some non-compare benches include setup work inside the timed loop

Files:

- `packages/data-map/benchmarks/src/path-access.bench.ts`
- `packages/data-map/benchmarks/src/mutations.bench.ts`

These benches often do `structuredClone(...)` and `new DataMap(...)` inside `bench(...)`, which makes them measure “(clone + constructor + op)” rather than the op itself.

This is fine as a “realistic end-to-end” benchmark, but it should not be conflated with “per-get” or “per-set” throughput.

### 5) Immutable updates, subscriptions, and array operations also clone per iteration

Files:

- `packages/data-map/benchmarks/src/compare/immutable-updates.bench.ts`
- `packages/data-map/benchmarks/src/compare/subscriptions.bench.ts`
- `packages/data-map/benchmarks/src/compare/array-operations.bench.ts`

All of these benchmark suites call `structuredClone()` inside the timed loop, creating the same double-cloning issue for DataMap. This means the mutation performance gap visible in benchmarks is amplified across multiple test categories, not just scale tests.

### 6) FluentBatchBuilder clones the entire dataset at construction

File: `packages/data-map/core/src/batch/builder.ts`

The fluent batch builder does:

```typescript
constructor(private dm: DataMap<T, Ctx>) {
    this.workingData = dm.getSnapshot();
}
```

This means every batch operation starts with a full deep clone of the dataset. While this provides isolation, it's another source of O(n) overhead that affects batch benchmarks.

### Benchmark action items (high priority)

To make results both fair and useful, split benchmarks into:

- **Init cost**: cost to create an instance / initialize state.
- **Op cost**: repeated get/set against a pre-initialized state.
- **Immutable-return cost**: cost to produce an immutable output (snapshot/clone) after mutation.

For DataMap specifically:

- In mutation benches that already `structuredClone` input per iteration, initialize DataMap with `cloneInitial: false`.
- In clone benches, measure _either_ `dm.clone()` _or_ `dm.getSnapshot()`, not both (unless explicitly testing “clone+snapshot”).

## Core performance hotspots (intrinsic)

### A) Patch builder clones the entire data when ensuring parent containers

File: `packages/data-map/core/src/patch/builder.ts`

`ensureParentContainers(...)` does:

- `const nextData = cloneSnapshot(currentData);`

This is a major scaling bottleneck for:

- “create missing path” updates (needs parent creation)
- deep sets in large trees
- wide-object updates when the root is cloned early and often

Even if only one leaf changes, this full clone makes the cost closer to $O(n)$ in the size of the whole tree.

### B) Snapshot semantics are deep-clone based

File: `packages/data-map/core/src/datamap.ts`

- `getSnapshot(): T { return cloneSnapshot(this._data); }`

This is correct for “immutable snapshot” semantics, but it becomes a **large constant tax** when the API or adapter pattern always returns a snapshot after every mutation.

In the benchmark suite, the DataMap adapter returns `getSnapshot()` for:

- `set`, `setAll`, `immutableUpdate`, `map`, `patch`, `batch`, `transaction`, array ops, etc.

So a large chunk of DataMap’s measured “mutation” cost is **explicit full cloning**, not the mutation itself.

### C) `DataMap.clone()` currently implies redundant cloning

File: `packages/data-map/core/src/datamap.ts`

`clone()` uses `this.getSnapshot()` and then constructs a new DataMap which clones again by default.

Even outside benchmarks, this is a real perf issue for users who call `clone()`.

### D) Subscription machinery has non-trivial potential overhead

Files:

- `packages/data-map/core/src/subscription/manager.ts`
- `packages/data-map/core/src/subscription/bloom.ts`
- `packages/data-map/core/src/subscription/scheduler.ts`

Positive: core skips notification work when there are no subscribers.

Risk areas:

- Bloom filter uses multiple hashes per membership check.
- **`toJSON()` is called in multiple subscription flows:**
  - `register()` at line 115: Called when registering a JSONPath subscription to expand paths
  - `handleStructuralChange()` at line 277: Called when structure changes to re-expand dynamic paths
  - `handleFilterCriteriaChange()` at line 318: Called when filter criteria may have changed

  In development mode, `toJSON()` returns `Object.freeze(this._data)`, which mutates the internal data. While this is cheap, it accumulates. In production, it returns `this._data` directly (no overhead).

- Any operation that forces full-tree inspection for filter criteria updates can dominate at scale.

**Note**: These flows only trigger when subscribers exist and match specific criteria (structural watchers, filter watchers). With 0 subscribers or pointer-only subscriptions, this overhead is avoided.

### E) JSON Pointer read path is optimized (and it shows in benchmarks)

File: `packages/data-map/core/src/utils/jsonpath.ts`

Pointer reads have multiple fast paths:

- Compiled accessor for simple pointers without escapes.
- Inline pointer resolution/existence checks.
- Fallback to RFC pointer implementation.

This explains why compare path-access benches show DataMap as competitive (millions of ops/sec).

## Why DataMap is slower in “wide object mutation” scale tests

In `Scale Testing -> Object Size Scaling - Mutation -> 10,000 keys`, DataMap’s adapter pattern effectively stacks multiple full-tree operations:

- `structuredClone(obj10000)` (benchmark harness)
- `new DataMap(data)` with default `cloneInitial: true` (deep clone again)
- `dm.set(...)` which builds patch ops and may clone/inspect parents
- `dm.getSnapshot()` (deep clone again)

Even if each individual clone is “fast”, stacking 2–3 full clones around every set makes the measured mean time balloon.

By contrast:

- `lodash-es` does `cloneDeep(data)` once per set, then mutates the clone in-place.
- `immer` uses `produce(data, draft => ...)` which:
  1. Creates a Proxy over `data` (cheap)
  2. Only copies nodes that are actually modified (structural sharing)
  3. Returns a new immutable root with shared subtrees
- `mutative` uses the same pattern as immer but with faster internals.

**Key insight**: Immer/mutative do O(depth) work for a single path update, while DataMap currently does O(size) work due to full cloning in multiple places.

## Recommendations (ranked by impact)

### Tier 0 — Make benchmarks fair and diagnostic (do this first)

**Complexity**: Low | **Risk**: Minimal | **Impact**: High (enables accurate measurement)

1. **Split benchmarks into init/op/snapshot categories.**
   - Create separate test suites: `init.bench.ts`, `operations.bench.ts`, `snapshots.bench.ts`
   - Init: measure `new DataMap(data, options)` with various option combinations
   - Operations: measure get/set/patch against a pre-initialized instance
   - Snapshots: measure `getSnapshot()`, `clone()`, and `toJSON()` separately

2. **In compare mutation scale tests, avoid `structuredClone` inside the loop.**
   - Move `structuredClone()` outside the bench callback
   - Each adapter gets a fresh clone before the timed loop starts
   - This isolates mutation cost from clone cost

3. **For DataMap adapter, use `new DataMap(data, { cloneInitial: false })` when appropriate.**
   - In compare benches where data is already cloned: `{ cloneInitial: false }`
   - In standalone DataMap benches: keep default but measure separately
   - Document which mode each benchmark uses

4. **Fix the DataMap clone benchmark to measure a single clone operation.**
   - Current: `dm.clone().getSnapshot()` = 3× deep clone
   - Option A: Measure only `dm.clone()` (returns new DataMap, internally does 2× clone)
   - Option B: Measure only `dm.getSnapshot()` (1× deep clone)
   - Option C: Add dedicated test for each operation

**Success metrics:**

- Benchmark results show DataMap mutation within 2× of lodash (after fixing measurement)
- Clone benchmark shows ~1× rfdc baseline (single deep clone)
- Documentation clearly states what each benchmark measures

**Estimated impact**: 40-60% improvement in measured mutation performance (artifact removal)

### Tier 1 — Low-risk core fixes (high win per LOC)

**Complexity**: Low-Medium | **Risk**: Low | **Impact**: High

#### 1.1) Fix `DataMap.clone()` redundant cloning

**Current implementation:**

```typescript
clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx> {
    return new (this.constructor as any)(this.getSnapshot(), {
        strict: this._strict,
        context: this._context,
        define: this._defineOptions,
        ...options,
    });
}
```

This does:

1. `getSnapshot()` = deep clone via rfdc
2. Constructor with default `cloneInitial: true` = deep clone again

**Proposed fix:**

```typescript
clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx> {
    const snapshot = this.getSnapshot();
    return new (this.constructor as any)(snapshot, {
        strict: this._strict,
        context: this._context,
        define: this._defineOptions,
        cloneInitial: false,  // snapshot is already a deep clone
        ...options,
    });
}
```

**Risk**: None (semantically identical, just removes redundant work)
**Expected improvement**: 2× faster clone operations

#### 1.2) Reduce avoidable deep clones in patch building

**Current hotspot in `ensureParentContainers`:**

```typescript
const nextData = cloneSnapshot(currentData); // Full O(n) clone
```

This full clone happens even when creating a single deep path like `/a/b/c/d/e/f/g`.

**Proposed approach:**

- Use structural sharing: clone only the path being created
- Implement a `createPath(data, pointer, value)` function that:
  1. Walks down the pointer path
  2. Clones only the containers along the path
  3. Shares everything else
- Fallback to current behavior only for complex multi-op patches

**Risk**: Medium (requires careful testing of parent creation edge cases)
**Expected improvement**: 3-10× faster path creation for deep/wide objects

#### 1.3) Ensure "no subscribers" truly means near-zero overhead

**Audit checklist:**

- [ ] `set()` doesn't construct notification payloads unless `hasSubscribers()`
- [ ] `get()` skips bloom filter checks when subscriber count is 0
- [ ] `scheduleNotify()` returns immediately if no subscribers
- [ ] Subscription manager lazy-initializes (already done)

**Target**: Mutation overhead with 0 subscribers should be <5% vs baseline (currently unknown)

**Success metrics:**

- `clone()` benchmark shows ~50% improvement
- Patch building benchmarks show 2-5× improvement for deep paths
- Zero-subscriber overhead measured at <5%

### Tier 2 — Make pointer updates first-class (core throughput)

**Complexity**: Medium | **Risk**: Medium | **Impact**: Very High

#### Implementation strategy:

**Phase 1: Build the engine**

Create `packages/data-map/core/src/utils/structural-update.ts`:

```typescript
export function setAtPointer(
	data: unknown,
	pointer: string,
	value: unknown,
	options: { createPath?: boolean } = {},
): unknown {
	// 1. Parse pointer once
	// 2. Walk tree, cloning along path
	// 3. Set value at target
	// 4. Return new root (structural sharing)
}
```

**Phase 2: Integrate into DataMap.set()**

```typescript
set(pathOrPointer: string, value: unknown, options: CallOptions = {}): void {
    const pathType = detectPathType(pathOrPointer);

    if (pathType === 'pointer') {
        // Fast path: use structural update directly
        const nextData = setAtPointer(this._data, pathOrPointer, value, {
            createPath: !this._strict
        });
        this._data = nextData;
        this.scheduleNotifications(...);
        return;
    }

    // JSONPath: fall back to current patch-based approach
    // ...
}
```

**Phase 3: Benchmark and validate**

- Compare new pointer-set path vs current patch-based approach
- Ensure all edge cases are covered (missing parents, array indices, etc.)
- Run full test suite

**Benefits:**

- `set('/a/b/c', v)` bypasses JSON Patch building and application entirely
- Structural sharing means only O(depth) work, not O(size)
- JSON Patch remains for external patches / multi-op / complex semantics

**Success metrics:**

- Single-pointer set operations: 5-10× faster on large objects
- Deep path creation (e.g., 10 levels): 3-5× faster
- Wide object updates (10k keys): approach lodash performance (within 20%)

**Risk mitigation:**

- Keep existing patch-based path as fallback
- Add feature flag for testing: `useStructuralUpdate: boolean`
- Extensive property-based testing

This is the **single clearest path** to making DataMap's mutation performance competitive with the best immutable update libraries.

### Tier 3 — Ownership & snapshot modes (unlock “fast immutable”)

**Complexity**: Medium | **Risk**: Medium-High | **Impact**: Very High

Add explicit APIs/options so users can choose performance tradeoffs:

#### Proposed API:

```typescript
interface DataMapOptions<T, Ctx> {
	// Existing:
	cloneInitial?: boolean; // default: true
	strict?: boolean;
	context?: Ctx;

	// New snapshot modes:
	snapshotMode?: 'clone' | 'reference' | 'frozen';
	// - 'clone': Current behavior - deep clone via rfdc (safest)
	// - 'reference': Return internal _data directly (fastest, user must not mutate)
	// - 'frozen': Return Object.freeze(this._data) (safe reads, dev-mode freezes)
}
```

#### Implementation:

```typescript
getSnapshot(): T {
    switch (this._snapshotMode) {
        case 'reference':
            return this._data as T;  // Zero-cost, user promises not to mutate
        case 'frozen':
            return Object.freeze({ ...this._data }) as T;  // Shallow freeze
        case 'clone':
        default:
            return cloneSnapshot(this._data);  // Current behavior
    }
}
```

#### Use cases:

| Mode          | Use Case                           | Cost   | Safety              |
| ------------- | ---------------------------------- | ------ | ------------------- |
| `'clone'`     | Default, safe for all use cases    | O(n)   | Full                |
| `'reference'` | Read-only consumers, React renders | O(1)   | Requires discipline |
| `'frozen'`    | Development/debugging              | O(1)\* | Dev-mode protection |

\*Shallow freeze is O(keys) at root level, not O(n) deep.

#### Migration path:

1. Add `snapshotMode` option with default `'clone'` (backward compatible)
2. Document performance implications
3. Update benchmark adapter to use `'reference'` mode for fair comparison
4. Consider making `'reference'` the default in v2.0

**Success metrics:**

- With `snapshotMode: 'reference'`: mutation benchmarks improve 2-3×
- Benchmark adapter using `'reference'`: approaches immer/mutative performance

### Tier 4 — Long-term architecture for "beat everyone"

**Complexity**: Very High | **Risk**: High | **Impact**: Transformative

If the goal is literally "outperform all existing packages/solutions" across _wide-object immutable updates_, plain-object structural sharing has a hard ceiling because updating a very wide root object tends to require copying many keys.

To surpass that ceiling, consider a **dual-representation strategy**:

#### Approach: Adaptive persistent structures

```typescript
// Threshold-based promotion
const WIDE_OBJECT_THRESHOLD = 1000; // keys
const UPDATE_FREQUENCY_THRESHOLD = 10; // updates before promotion

class DataMap<T> {
	private _data: T;
	private _persistent: PersistentHashMap<string, unknown> | null = null;
	private _updateCount = 0;

	private shouldPromote(): boolean {
		if (this._persistent) return false;
		const keyCount = Object.keys(this._data as object).length;
		return (
			keyCount > WIDE_OBJECT_THRESHOLD ||
			this._updateCount > UPDATE_FREQUENCY_THRESHOLD
		);
	}

	set(pointer: string, value: unknown): void {
		this._updateCount++;
		if (this.shouldPromote()) {
			this._persistent = PersistentHashMap.from(this._data);
		}

		if (this._persistent) {
			// O(log n) update
			this._persistent = this._persistent.set(pointer, value);
		} else {
			// Current O(depth) structural sharing
			this._data = setAtPointer(this._data, pointer, value);
		}
	}
}
```

#### Options for persistent structures:

| Structure                         | Update     | Lookup     | Memory | Complexity |
| --------------------------------- | ---------- | ---------- | ------ | ---------- |
| HAMT (Hash Array Mapped Trie)     | O(log32 n) | O(log32 n) | Good   | Medium     |
| RRB-Tree (Relaxed Radix Balanced) | O(log n)   | O(log n)   | Good   | High       |
| Plain object + structural sharing | O(width)   | O(1)       | Best   | Low        |

#### Compatibility considerations:

- **JSON Pointer addressing**: Persistent structures must support pointer-based navigation
- **JSON serialization**: `toJSON()` must produce plain objects for interop
- **Subscription indexing**: Bloom filter and reverse index must work with persistent keys

#### Timeline estimate:

| Phase         | Description                                                      | Duration  |
| ------------- | ---------------------------------------------------------------- | --------- |
| Research      | Evaluate HAMT libraries (e.g., `hamt_plus`, `immer`'s internals) | 2-3 weeks |
| Prototype     | Build proof-of-concept with automatic promotion                  | 4-6 weeks |
| Integration   | Integrate with DataMap, pointer resolution, subscriptions        | 4-6 weeks |
| Testing       | Property-based testing, benchmark validation                     | 2-4 weeks |
| Stabilization | Edge cases, documentation, migration guide                       | 2-4 weeks |

**Total**: 14-23 weeks (3.5-6 months)

This is a major undertaking and may require a compatibility layer for JSON serialization, pointer addressing, and subscription indexing. However, it would make DataMap the **only library** that combines:

- Reactive subscriptions
- JSONPath querying
- JSON Patch semantics
- AND sub-linear wide-object updates

## Concrete benchmark targets (directional)

These targets are intentionally directional rather than promises:

### After Tier 0 (benchmark fixes):

- **Scale mutation 10,000 keys**: ~250-300 ops/sec (vs current 103.9)
  - Removing benchmark artifact overhead
  - Still measures real core costs
- **Clone 10,000 keys**: ~600-800 ops/sec (vs current 203)
  - Single rfdc clone instead of 3×
- **Pointer get**: maintain 8M+ ops/sec (already competitive)

### After Tier 1 (core fixes):

- **Scale mutation 10,000 keys**: ~400-500 ops/sec
  - Improved patch building (structural sharing for parent creation)
  - Fixed clone() method
- **Deep path creation (10 levels)**: 5-10× improvement
  - Remove full-data cloning from ensureParentContainers

### After Tier 2 (pointer-first architecture):

- **Scale mutation 10,000 keys**: ~800-1000 ops/sec
  - Approaching lodash-es (228 ops/sec baseline, but we have more features)
  - Structural sharing throughout
- **Single pointer set**: competitive with immer/mutative

### After Tier 3 (ownership modes):

- **With `snapshotMode: 'structural-sharing'`**: match or exceed immer/mutative
- **Scale mutation**: 1000+ ops/sec (within 20% of best-in-class)

## Implementation priority matrix

| Tier | Effort    | Risk     | Impact    | Priority     | Timeline    |
| ---- | --------- | -------- | --------- | ------------ | ----------- |
| 0    | Low       | Minimal  | High      | 🔴 Immediate | 1-2 days    |
| 1.1  | Low       | Low      | Medium    | 🔴 Immediate | 1 day       |
| 1.2  | Medium    | Medium   | High      | 🟡 Near-term | 1-2 weeks   |
| 1.3  | Low       | Low      | Medium    | 🟢 Important | 2-3 days    |
| 2    | Medium    | Medium   | Very High | 🟡 Near-term | 2-4 weeks   |
| 3    | Medium    | Med-High | Very High | 🟡 Mid-term  | 3-6 weeks   |
| 4    | Very High | High     | Transform | 🟢 Long-term | 6-12 months |

**Recommended sequence:**

1. Tier 0 (benchmark fixes) - validate true performance baseline
2. Tier 1.1 (clone fix) - quick win, low risk
3. Tier 1.3 (subscriber overhead) - profile and optimize
4. Tier 1.2 (patch building) - highest core impact
5. Tier 2 (pointer-first) - major architectural improvement
6. Tier 3 (ownership modes) - unlock final performance tier
7. Tier 4 (persistent structures) - future competitive advantage

## Appendix: Key code locations

- Constructor ownership clone: `packages/data-map/core/src/datamap.ts` (constructor `cloneInitial`)
- Snapshots: `packages/data-map/core/src/datamap.ts` (`getSnapshot`)
- Clone behavior: `packages/data-map/core/src/datamap.ts` (`clone`)
- Patch building: `packages/data-map/core/src/patch/builder.ts` (`ensureParentContainers`)
- Patch apply fast path: `packages/data-map/core/src/patch/apply.ts`
- Pointer fast paths: `packages/data-map/core/src/utils/jsonpath.ts`
- Subscription system: `packages/data-map/core/src/subscription/*`
- FluentBatchBuilder: `packages/data-map/core/src/batch/builder.ts`
- Scale benchmarks: `packages/data-map/benchmarks/src/compare/scale.bench.ts`
- Immutable updates benchmarks: `packages/data-map/benchmarks/src/compare/immutable-updates.bench.ts`
- Subscription benchmarks: `packages/data-map/benchmarks/src/compare/subscriptions.bench.ts`
- DataMap adapter: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

## Appendix: Quick reference - Root causes summary

| Issue                              | Location                         | Type         | Impact    | Fix Priority |
| ---------------------------------- | -------------------------------- | ------------ | --------- | ------------ |
| Double clone in benchmarks         | `compare/*.bench.ts`             | Measurement  | High      | 🔴 Tier 0    |
| Adapter cache miss per iteration   | `adapters/data-map.adapter.ts:8` | Design       | Very High | 🔴 Tier 0    |
| Constructor clones by default      | `datamap.ts:119`                 | Design       | Medium    | 🟡 Tier 1.1  |
| clone() double-clones              | `datamap.ts:1004`                | Bug          | High      | 🔴 Tier 1.1  |
| Adapter triple-clones on clone()   | `adapters/data-map.adapter.ts`   | Design       | High      | 🔴 Tier 0    |
| ensureParentContainers full clone  | `patch/builder.ts:35`            | Algorithm    | Very High | 🔴 Tier 1.2  |
| getSnapshot() always deep-clones   | `datamap.ts:196`                 | Design       | High      | 🟡 Tier 3    |
| FluentBatchBuilder clones on init  | `batch/builder.ts:12`            | Design       | Medium    | 🟡 Tier 2    |
| No pointer-first mutation path     | N/A                              | Architecture | Very High | 🟡 Tier 2    |
| All immutable ops clone snapshot   | Adapter pattern                  | Design       | High      | 🟡 Tier 3    |
| toJSON() calls in subscription mgr | `subscription/manager.ts`        | Design       | Medium    | 🟢 Tier 1.3  |

## Appendix: Benchmark measurement artifacts

These artifacts inflate measured costs without reflecting core library performance:

1. **Adapter cache invalidation**: `getCachedDataMap()` uses identity check (`cachedData !== data`), so every `structuredClone()` in the benchmark creates a new object → cache miss → new DataMap construction every iteration.
2. **Constructor + structuredClone stack**: Benchmarks do `structuredClone()` → `new DataMap()` → `cloneInitial: true` = 2× full clone before any operation.
3. **Snapshot return pattern**: Adapter always returns `getSnapshot()` = additional full clone after every mutation.
4. **Clone adapter path**: `dm.clone().getSnapshot()` = 3× deep clone instead of 1×.
5. **Batch builder initialization**: Every batch starts with `getSnapshot()` = full clone upfront.
6. **Missing amortization**: Benchmarks measure "cold start" per iteration instead of steady-state throughput.

**Net effect**: Measured mutation cost is ~3-5× higher than intrinsic core overhead.

## Appendix: Related documentation

- Existing audits in this directory:
  - `PERFORMANCE_AUDIT.md` - Initial performance analysis
  - `COMPREHENSIVE_PERFORMANCE_AUDIT.md` - Detailed profiling results
  - `AUDIT_REPORT.md` - Spec compliance audit
- Benchmark documentation: `packages/data-map/benchmarks/README.md`
- Core API documentation: `packages/data-map/core/README.md`
- JSONPath suite: `packages/jsonpath/*/README.md`
