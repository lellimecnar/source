# @data-map/core Performance Optimization Plan

**Branch:** `perf/data-map-core-optimization`
**Description:** Implement all performance optimizations from the audit to achieve 10-100x improvement over current baseline

## Goal

Transform `@data-map/core` from being 30-27,000x slower than competitors to being competitive with or faster than zustand, lodash, and immer for common operations. This plan implements all 7 priority recommendations from the performance audit in a logical, dependency-aware order across 4 phases.

## Implementation Phases

### Phase 1: Quick Wins (Low Risk, High Impact)

**Timeline:** 1-2 weeks
**Expected Improvement:** 5-15x for simple get/set operations

### Phase 2: Core Optimizations (Low-Medium Risk)

**Timeline:** 2-4 weeks
**Expected Improvement:** 10-30x for typical use cases

### Phase 3: Architectural Changes (Medium Risk)

**Timeline:** 4-6 weeks
**Expected Improvement:** Additional 3-10x improvement

### Phase 4: Advanced Optimizations (Optional, Higher Risk)

**Timeline:** 2-4 weeks
**Expected Improvement:** Final 1.5-2x improvement

---

## Implementation Steps

### Step 1: Replace `structuredClone` with `rfdc`

**Phase:** 1 (Quick Wins)
**Priority:** 7 from audit
**Files:**

- `packages/data-map/core/package.json` (add dependency)
- `packages/data-map/core/src/datamap.ts` (replace cloneSnapshot implementation)
- `packages/data-map/core/src/patch/builder.ts` (update clone usage)

**What:** Replace all `structuredClone()` calls with `rfdc` library. This is a drop-in replacement that is 2-7x faster. Add `rfdc` as a dependency, create a centralized `clone.ts` utility, and update all import sites.

**Code Changes:**

```typescript
// NEW: packages/data-map/core/src/utils/clone.ts
import rfdc from 'rfdc';
const clone = rfdc({ circles: false, proto: false });

export function cloneSnapshot<T>(value: T): T {
	return clone(value) as T;
}
```

**Testing:**

- Run existing test suite - all tests should pass unchanged
- Run benchmark suite - expect 2-3x improvement in clone operations
- Verify cloned objects are deeply equal to originals

**Expected Improvement:** 2-3x for cloning operations
**Risk:** Low - Drop-in replacement, no API changes

---

### Step 2: Add Path Detection Cache

**Phase:** 1 (Quick Wins)
**Priority:** 2.2 from audit
**Files:**

- `packages/data-map/core/src/path/detect.ts`

**What:** Add memoization to `detectPathType()` function using a simple Map cache. Paths are immutable strings, so caching is safe. Limit cache size to prevent memory leaks.

**Code Changes:**

```typescript
// packages/data-map/core/src/path/detect.ts
const pathTypeCache = new Map<string, PathType>();
const MAX_CACHE_SIZE = 10000;

export function detectPathType(input: string): PathType {
	const cached = pathTypeCache.get(input);
	if (cached !== undefined) return cached;

	const result = detectPathTypeUncached(input);

	if (pathTypeCache.size >= MAX_CACHE_SIZE) {
		// LRU-style: clear half the cache
		const entries = [...pathTypeCache.entries()];
		pathTypeCache.clear();
		entries
			.slice(entries.length / 2)
			.forEach(([k, v]) => pathTypeCache.set(k, v));
	}

	pathTypeCache.set(input, result);
	return result;
}

function detectPathTypeUncached(input: string): PathType {
	// ... existing implementation
}
```

**Testing:**

- Unit test: cache hit returns same result
- Unit test: cache respects size limit
- Run path detection benchmarks - expect ~1.5x improvement

**Expected Improvement:** 1.5x for path operations
**Risk:** Low - Pure function memoization

---

### Step 3: Add Conditional Notification Scheduling

**Phase:** 1 (Quick Wins)
**Priority:** 3.2 from audit
**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/subscription/manager.ts`

**What:** Skip notification scheduling when there are zero active subscriptions. Add a `hasSubscribers()` method to SubscriptionManager and check it before scheduling any notifications.

**Code Changes:**

```typescript
// packages/data-map/core/src/subscription/manager.ts
hasSubscribers(): boolean {
  return this._subscriptions.size > 0 || this._dynamicSubscriptions.size > 0;
}

// packages/data-map/core/src/datamap.ts
private scheduleNotify(timing: 'before' | 'on' | 'after', ...): void {
  if (!this._subs.hasSubscribers()) return; // Fast exit
  // ... existing implementation
}
```

**Testing:**

- Unit test: no notification scheduling when no subscribers
- Unit test: notifications still work correctly with subscribers
- Run subscription benchmarks - expect 2-5x improvement for zero-subscriber case

**Expected Improvement:** 2-5x when no subscriptions active
**Risk:** Low - Additive fast path, existing logic unchanged

---

### Step 4: Add Optional Clone Parameter to `get()`

**Phase:** 1 (Quick Wins)
**Priority:** 1.2 from audit
**Files:**

- `packages/data-map/core/src/types.ts` (extend GetOptions)
- `packages/data-map/core/src/datamap.ts` (implement option)

**What:** Add `clone?: boolean` option to `get()` method. Default to `true` for backward compatibility, but allow `get(path, { clone: false })` for zero-copy access. Document that users must not mutate the returned value.

**Code Changes:**

```typescript
// packages/data-map/core/src/types.ts
export interface GetOptions extends CallOptions {
  clone?: boolean; // Default: true for backward compatibility
}

// packages/data-map/core/src/datamap.ts
get<V = unknown>(pathOrPointer: string, options: GetOptions = {}): V | undefined {
  const shouldClone = options.clone ?? true;
  const resolved = this.resolve(pathOrPointer, { ...options, _skipClone: true });
  if (resolved.length === 0) return undefined;
  const value = resolved[0]?.value;
  return shouldClone ? cloneSnapshot(value) as V : value as V;
}
```

**Testing:**

- Unit test: `{ clone: true }` returns cloned value (default behavior)
- Unit test: `{ clone: false }` returns direct reference
- Unit test: mutating `{ clone: false }` result affects internal state (documented behavior)
- Run path-access benchmarks - expect 10-50x improvement with `clone: false`

**Expected Improvement:** 10-50x for read-only access with `clone: false`
**Risk:** Low - Opt-in feature, default preserves existing behavior

---

### Step 5: Implement Lazy Subscription Manager

**Phase:** 2 (Core Optimizations)
**Priority:** 3.1 from audit
**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/subscription/manager.ts`

**What:** Delay instantiation of SubscriptionManager until the first `subscribe()` call. Create a lightweight proxy that only creates the real manager when needed.

**Code Changes:**

```typescript
// packages/data-map/core/src/datamap.ts
class DataMap<T, Ctx> {
	private _subs: SubscriptionManagerImpl<T, Ctx> | null = null;

	private get subs(): SubscriptionManagerImpl<T, Ctx> {
		if (!this._subs) {
			this._subs = new SubscriptionManagerImpl(
				this._options.subscriptionOptions,
			);
		}
		return this._subs;
	}

	private hasSubscribers(): boolean {
		return this._subs !== null && this._subs.hasSubscribers();
	}

	subscribe(
		pattern: string,
		callback: SubscriptionCallback<T, Ctx>,
	): () => void {
		return this.subs.subscribe(pattern, callback); // Lazily creates manager
	}
}
```

**Testing:**

- Unit test: no SubscriptionManager created until first subscribe
- Unit test: subscription functionality works after lazy creation
- Run mutation benchmarks without subscriptions - expect 5-10x improvement

**Expected Improvement:** 5-10x when subscriptions not used
**Risk:** Medium - Requires careful null checking throughout

---

### Step 6: Implement Inline Pointer Resolution Fast Path

**Phase:** 2 (Core Optimizations)
**Priority:** 2.1 from audit
**Files:**

- `packages/data-map/core/src/utils/pointer.ts` (new file or extend existing)
- `packages/data-map/core/src/datamap.ts` (use inline resolver)

**What:** Create an inline JSON Pointer resolution function that avoids the `JSONPointer` class instantiation overhead. For simple pointer paths (no JSONPath), use this fast path directly.

**Code Changes:**

```typescript
// packages/data-map/core/src/utils/pointer.ts
export function resolvePointerInline<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	if (pointer === '' || pointer === '/') return data as T;
	if (!pointer.startsWith('/')) return undefined;

	const segments = pointer.slice(1).split('/');
	let current: unknown = data;

	for (let i = 0; i < segments.length - 1; i++) {
		const seg = unescapeSegment(segments[i]!);
		if (current == null || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[seg];
	}

	const lastSeg = unescapeSegment(segments[segments.length - 1]!);
	if (current == null || typeof current !== 'object') return undefined;
	return (current as Record<string, unknown>)[lastSeg] as T;
}

function unescapeSegment(seg: string): string {
	if (!seg.includes('~')) return seg;
	return seg.replace(/~1/g, '/').replace(/~0/g, '~');
}
```

**Testing:**

- Unit test: inline resolution matches `JSONPointer` class results
- Unit test: handles escaped characters correctly
- Unit test: handles edge cases (empty string, root path, missing segments)
- Run path-access benchmarks - expect 20-100x improvement for pointer paths

**Expected Improvement:** 20-100x for JSON Pointer resolution
**Risk:** Low - Pure function with comprehensive tests

---

### Step 7: Implement Tiered Subscription Lookup

**Phase:** 2 (Core Optimizations)
**Priority:** 3.3 from audit
**Files:**

- `packages/data-map/core/src/subscription/manager.ts`
- `packages/data-map/core/src/subscription/bloom.ts`

**What:** Use a simple Set for small subscription counts (<100), only switching to BloomFilter when subscriptions exceed the threshold. This avoids bloom filter overhead for common cases.

**Code Changes:**

```typescript
// packages/data-map/core/src/subscription/manager.ts
private readonly BLOOM_THRESHOLD = 100;
private _pointerSet: Set<string> = new Set();
private _useBloom = false;

registerPointer(pointer: string): void {
  this._pointerSet.add(pointer);

  if (!this._useBloom && this._pointerSet.size > this.BLOOM_THRESHOLD) {
    // Migrate to bloom filter
    this._useBloom = true;
    this._pointerSet.forEach(p => this._pointerBloom.add(p));
  }

  if (this._useBloom) {
    this._pointerBloom.add(pointer);
  }
}

mightHaveSubscriber(pointer: string): boolean {
  if (!this._useBloom) {
    return this._pointerSet.has(pointer);
  }
  return this._pointerBloom.mightContain(pointer);
}
```

**Testing:**

- Unit test: Set lookup used for <100 subscriptions
- Unit test: Bloom filter used for >=100 subscriptions
- Unit test: correct notifications in both modes
- Run subscription benchmarks at various subscriber counts

**Expected Improvement:** 1.5x for small subscription counts
**Risk:** Low - Additive optimization with fallback

---

### Step 8: Implement Single-Clone Batch Operations

**Phase:** 2 (Core Optimizations)
**Priority:** 5.1 from audit
**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/batch/manager.ts`
- `packages/data-map/core/src/patch/apply.ts`

**What:** Clone data only once at the start of a batch/patch operation, then mutate in place until batch completes. This eliminates per-operation cloning overhead.

**Code Changes:**

```typescript
// packages/data-map/core/src/datamap.ts
patch(ops: Operation[], options: PatchOptions = {}): void {
  if (ops.length === 0) return;

  // Clone ONCE at batch start
  const working = this._isOwned ? this._data : cloneSnapshot(this._data);
  this._isOwned = true;

  // Mutate in place
  const affectedPointers = new Set<string>();
  for (const op of ops) {
    applyOperationMutating(working, op, affectedPointers);
  }

  this._data = working;

  // Notify once after all operations
  this.scheduleNotify('after', [...affectedPointers]);
}
```

**Testing:**

- Unit test: batch with 100 operations only clones once
- Unit test: rollback still works correctly
- Unit test: notifications fire with all affected pointers
- Run batch benchmarks - expect 2-5x improvement

**Expected Improvement:** 2-5x for batch operations
**Risk:** Medium - Requires careful state management

---

### Step 9: Implement Lazy Ownership Tracking

**Phase:** 3 (Architectural Changes)
**Priority:** 1.1 from audit
**Files:**

- `packages/data-map/core/src/datamap.ts`

**What:** Track whether DataMap "owns" its data (has cloned it). Only clone when about to mutate unowned data. This eliminates defensive cloning in the constructor and for read-only operations.

**Code Changes:**

```typescript
// packages/data-map/core/src/datamap.ts
class DataMap<T, Ctx> {
	private _data: T;
	private _isOwned: boolean = false;

	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {}) {
		// Store reference without cloning
		this._data = initialValue;
		this._isOwned = false;
		// ... rest of initialization
	}

	private ensureOwned(): T {
		if (!this._isOwned) {
			this._data = cloneSnapshot(this._data);
			this._isOwned = true;
		}
		return this._data;
	}

	set(pathOrPointer: string, value: unknown, options: SetOptions = {}): void {
		this.ensureOwned(); // Clone only when mutating
		// ... rest of implementation
	}

	getSnapshot(): T {
		// For external consumption, clone if not owned (could be mutated externally)
		return this._isOwned ? cloneSnapshot(this._data) : this._data;
	}
}
```

**Testing:**

- Unit test: constructor does not clone
- Unit test: first mutation triggers clone
- Unit test: subsequent mutations don't clone again
- Unit test: external mutations to original don't affect DataMap
- Run full benchmark suite - expect 10-50x improvement for mixed workloads

**Expected Improvement:** 10-50x for mixed read/write workloads
**Risk:** Medium - Changes ownership semantics, requires documentation

---

### Step 10: Implement Deferred Subscription Notifications

**Phase:** 3 (Architectural Changes)
**Priority:** 5.2 from audit
**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/batch/manager.ts`
- `packages/data-map/core/src/subscription/manager.ts`

**What:** Collect all affected pointers during a batch operation and fire notifications only once at the end. Deduplicate notifications for the same subscription.

**Code Changes:**

```typescript
// packages/data-map/core/src/datamap.ts
batch<R>(fn: (dm: this) => R): R {
  this._batch.start();
  const affectedPointers: Set<string> = new Set();

  try {
    const result = fn(this);
    // Collect all affected pointers from batch
    this._batch.getAffectedPointers().forEach(p => affectedPointers.add(p));
    return result;
  } finally {
    this._batch.end();
    // Single notification after batch completes
    if (this.hasSubscribers()) {
      this._subs.notifyBatch([...affectedPointers]);
    }
  }
}

// packages/data-map/core/src/subscription/manager.ts
notifyBatch(pointers: string[]): void {
  const notified = new Set<SubscriptionCallback>();
  for (const pointer of pointers) {
    for (const sub of this.findMatchingSubscriptions(pointer)) {
      if (!notified.has(sub.callback)) {
        notified.add(sub.callback);
        sub.callback({ pointer, /* ... */ });
      }
    }
  }
}
```

**Testing:**

- Unit test: batch with 100 changes fires 1 notification per subscriber
- Unit test: duplicate pointer changes don't duplicate notifications
- Unit test: all affected pointers included in notification info
- Run subscription benchmarks with batch operations

**Expected Improvement:** 2-5x for subscription-heavy workloads
**Risk:** Medium - Changes notification semantics (subscribers see batch, not individual)

---

### Step 11: Implement Object Pooling for Hot Paths

**Phase:** 4 (Advanced Optimizations)
**Priority:** 6 from audit
**Files:**

- `packages/data-map/core/src/utils/pool.ts` (new file)
- `packages/data-map/core/src/datamap.ts`

**What:** Pool frequently allocated objects like ResolvedMatch to reduce GC pressure. Objects are reset and reused instead of being created and garbage collected.

**Code Changes:**

```typescript
// packages/data-map/core/src/utils/pool.ts
export class ObjectPool<T> {
	private readonly pool: T[] = [];
	private readonly create: () => T;
	private readonly reset: (obj: T) => void;
	private readonly maxSize: number;

	constructor(options: {
		create: () => T;
		reset: (obj: T) => void;
		maxSize?: number;
	}) {
		this.create = options.create;
		this.reset = options.reset;
		this.maxSize = options.maxSize ?? 1000;
	}

	acquire(): T {
		return this.pool.pop() ?? this.create();
	}

	release(obj: T): void {
		if (this.pool.length < this.maxSize) {
			this.reset(obj);
			this.pool.push(obj);
		}
	}
}

// Usage in datamap.ts
const matchPool = new ObjectPool({
	create: () => ({ pointer: '', value: undefined as unknown }),
	reset: (m) => {
		m.pointer = '';
		m.value = undefined;
	},
});
```

**Testing:**

- Unit test: pool reuses objects
- Unit test: pool respects max size
- Unit test: reset function properly clears state
- Memory profiling: reduced GC pauses during high-throughput operations

**Expected Improvement:** 1.5-2x for high-throughput scenarios
**Risk:** Medium - Must ensure objects are properly reset, potential memory leaks if not released

---

### Step 12: Implement Structural Sharing (Immer-style Copy-on-Write)

**Phase:** 4 (Advanced Optimizations)
**Priority:** 4 from audit
**Files:**

- `packages/data-map/core/src/utils/structural-sharing.ts` (new file)
- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/patch/apply.ts`

**What:** Instead of cloning the entire data structure, only clone objects along the path being modified. Unmodified branches share references with the original.

**Code Changes:**

```typescript
// packages/data-map/core/src/utils/structural-sharing.ts
export function updateAtPath<T>(data: T, path: string, value: unknown): T {
	const segments = parsePointer(path);
	return updateRecursive(data, segments, 0, value) as T;
}

function updateRecursive(
	node: unknown,
	segments: string[],
	depth: number,
	value: unknown,
): unknown {
	if (depth === segments.length) return value;

	if (node == null || typeof node !== 'object') {
		throw new Error(`Cannot set path: intermediate value is not an object`);
	}

	const key = segments[depth]!;
	const isArray = Array.isArray(node);
	const newChild = updateRecursive(
		(node as Record<string, unknown>)[key],
		segments,
		depth + 1,
		value,
	);

	if (isArray) {
		const newArray = [...(node as unknown[])];
		newArray[Number(key)] = newChild;
		return newArray;
	}

	return { ...node, [key]: newChild };
}
```

**Testing:**

- Unit test: only modified path is cloned
- Unit test: unmodified branches share references
- Unit test: works with nested arrays and objects
- Unit test: handles edge cases (empty path, root modification)
- Memory profiling: reduced memory allocation for large objects

**Expected Improvement:** 3-10x for updates to large data structures
**Risk:** High - Significant architectural change, must maintain immutability guarantees

---

## Validation & Rollout

### Benchmark Gates

Each step must pass these gates before merging:

1. **No Regression**: Existing benchmarks must not get slower
2. **Improvement Target**: Step must achieve its expected improvement
3. **Test Coverage**: All new code must have unit tests
4. **API Compatibility**: Public API must remain backward compatible

### Benchmark Commands

```bash
# Run full benchmark suite
pnpm --filter @data-map/benchmarks bench

# Run specific benchmark
pnpm --filter @data-map/benchmarks bench:path-access
pnpm --filter @data-map/benchmarks bench:mutations
pnpm --filter @data-map/benchmarks bench:subscriptions

# Run comparison benchmarks
pnpm --filter @data-map/benchmarks bench:compare
```

### Test Commands

```bash
# Run all tests
pnpm --filter @data-map/core test

# Run tests in watch mode
pnpm --filter @data-map/core test:watch

# Run tests with coverage
pnpm --filter @data-map/core test:coverage
```

---

## Performance Targets

### Short-term (After Phase 2)

| Operation          | Current | Target | Competitor Reference |
| ------------------ | ------- | ------ | -------------------- |
| Shallow get        | 0.2µs   | 0.01µs | lodash: 0.003µs      |
| Deep get           | 2.5µs   | 0.05µs | lodash: 0.01µs       |
| Set (no subs)      | 0.18µs  | 0.05µs | mutative: 0.03µs     |
| Subscribe (single) | 6.4µs   | 1µs    | zustand: 0.9µs       |

### Long-term (After Phase 4)

| Operation                    | Target  | Notes                         |
| ---------------------------- | ------- | ----------------------------- |
| Shallow get (`clone: false`) | 0.005µs | Near-native performance       |
| Deep get (`clone: false`)    | 0.02µs  | 2x native due to path parsing |
| Set with structural sharing  | 0.03µs  | Competitive with mutative     |
| Batch (100 ops)              | 5µs     | 0.05µs per operation          |

---

## Risk Mitigation

### Phase 1 (Low Risk)

- All changes are additive or drop-in replacements
- Defaults preserve existing behavior
- Comprehensive test coverage required before merge

### Phase 2 (Medium Risk)

- Feature flags for new optimizations during testing
- Gradual rollout with A/B benchmarking
- Documentation updates for new options

### Phase 3-4 (Higher Risk)

- Extensive integration testing required
- Performance regression testing in CI
- Beta release for community feedback before stable

---

## Dependencies Between Steps

```
Step 1 (rfdc) ─────────────────────────────────────────────────────────┐
                                                                        │
Step 2 (path cache) ───────────────────────────────────────────────────┤
                                                                        │
Step 3 (conditional notify) ───┬───────────────────────────────────────┤
                               │                                        │
Step 4 (clone option) ─────────┤                                        │
                               │                                        │
Step 5 (lazy subs) ────────────┴─── requires Step 3 ───────────────────┤
                                                                        │
Step 6 (inline pointer) ───────────────────────────────────────────────┤
                                                                        │
Step 7 (tiered lookup) ─────────── requires Step 5 ────────────────────┤
                                                                        │
Step 8 (single batch clone) ───┬─── requires Step 1 ───────────────────┤
                               │                                        │
Step 9 (ownership) ────────────┴─── requires Step 8 ───────────────────┤
                                                                        │
Step 10 (deferred notify) ─────── requires Step 5, 8 ──────────────────┤
                                                                        │
Step 11 (object pooling) ──────────────────────────────────────────────┤
                                                                        │
Step 12 (structural sharing) ───── requires Step 9 ────────────────────┘
```

---

## Appendix: File Change Summary

| File                              | Steps Affected           | Change Type           |
| --------------------------------- | ------------------------ | --------------------- |
| `package.json`                    | 1                        | Add rfdc dependency   |
| `src/datamap.ts`                  | 1, 3, 4, 5, 8, 9, 10, 11 | Major refactor        |
| `src/types.ts`                    | 4                        | Add GetOptions.clone  |
| `src/utils/clone.ts`              | 1                        | New file              |
| `src/utils/pointer.ts`            | 6                        | New/extend            |
| `src/utils/pool.ts`               | 11                       | New file              |
| `src/utils/structural-sharing.ts` | 12                       | New file              |
| `src/path/detect.ts`              | 2                        | Add cache             |
| `src/subscription/manager.ts`     | 3, 5, 7, 10              | Major refactor        |
| `src/subscription/bloom.ts`       | 7                        | Minor changes         |
| `src/patch/apply.ts`              | 8, 12                    | Refactor for mutation |
| `src/patch/builder.ts`            | 1                        | Update clone import   |
| `src/batch/manager.ts`            | 8, 10                    | Add pointer tracking  |
