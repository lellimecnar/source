# @data-map/core Performance Audit Resolution

**Branch:** `perf/data-map-core-optimization`
**Description:** Resolve all performance issues identified in COMPREHENSIVE_PERFORMANCE_AUDIT.md, achieving competitive performance with Immer/Zustand/Mutative.

## Goal

Transform `@data-map/core` from **30-27,000x slower** than competitors to **competitive or better** performance by implementing copy-on-write with structural sharing, fixing benchmark methodology, optimizing the subscription system, and leveraging existing unused optimizations already present in the codebase.

## Implementation Notes

- **v0 Implementation:** Breaking changes are acceptable. No deprecation periods or migration guides required.
- **Proxy Support:** Included in Phase 5 for fine-grained reactivity.
- **Performance Targets:** Aspirational, not hard requirements.

## Executive Summary

The audit identified that **existing optimization utilities (structural sharing, object pooling) are already implemented but unused**. This dramatically reduces implementation risk and effort. The plan is structured in 6 phases matching the audit's roadmap, with each phase containing multiple commits that can be independently tested and validated.

---

## Phase 1: Quick Wins (Immediate 3-5x Improvement)

**Estimated Time:** 1-2 days
**Risk Level:** Low
**Expected Improvement:** 3-5x across all operations

### Step 1.1: Fix Benchmark Adapter Methodology

**Files:**

- `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

**What:** Fix the critical benchmark flaw where a new DataMap instance is created per operation. Implement instance caching to measure true operation performance, not constructor overhead.

**Implementation:**

```typescript
let cachedMap: DataMap<any> | null = null;
let cachedData: any = null;

export const dataMapAdapter = {
	get: (data, path) => {
		if (cachedData !== data) {
			cachedMap = new DataMap(data);
			cachedData = data;
		}
		return cachedMap!.get(path);
	},
	// Similar for set, patch, etc.
};
```

**Testing:**

- Run `pnpm --filter @data-map/benchmarks run bench` before and after
- Expect 2-3x improvement in measured scores immediately

---

### Step 1.2: Add Subscriber Count Fast Check

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/subscriptions/manager.ts`

**What:** Skip all notification overhead when no subscribers exist. Add `#hasSubscribers` boolean flag that tracks subscription state.

**Implementation:**

```typescript
class DataMap<T> {
	#hasSubscribers: boolean = false;

	subscribe(path, callback) {
		this.#hasSubscribers = true;
		// ... existing logic
		return () => {
			// ... cleanup
			this.#hasSubscribers = this._subs?.count > 0;
		};
	}

	#maybeNotify() {
		if (!this.#hasSubscribers) return;
		this.notify();
	}
}
```

**Testing:**

- Add benchmark for operations without subscribers
- Existing subscription tests must pass unchanged
- Expect 1.5-2x improvement for non-subscribed operations

---

### Step 1.3: Integrate Existing Structural Sharing Utility

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/utils/structural-sharing.ts`

**What:** The `updateAtPointer()` function already exists in `structural-sharing.ts` but is NOT used by DataMap. Integrate it into `set()` operations to replace full deep clones with path-only updates.

**Implementation:**

```typescript
import { updateAtPointer } from './utils/structural-sharing.js';

class DataMap<T> {
	set<P extends string>(path: P, value: V): this {
		// OLD: const operations = [{ op: 'replace', path, value }];
		//      return this.patch(operations);

		// NEW: Direct structural update
		this.#data = updateAtPointer(this.#data, path, value);
		this.#maybeNotify();
		return this;
	}
}
```

**Testing:**

- All existing `set()` tests must pass
- Add benchmark comparison for nested set operations
- Expect 3-5x improvement for `set()` operations

---

### Step 1.4: Implement Accessor Compilation Cache

**Files:**

- `packages/data-map/core/src/utils/pointer.ts`
- `packages/data-map/core/src/utils/accessor-cache.ts` (new file)

**What:** Compile frequently-used paths into direct property accessor functions. Cache compiled accessors for reuse across operations.

**Implementation:**

```typescript
const accessorCache = new Map<string, (obj: any) => any>();

export function compileAccessor(path: string): (obj: any) => any {
	if (accessorCache.has(path)) return accessorCache.get(path)!;

	const segments = path.split('/').filter(Boolean);
	const accessor = (obj: any) => {
		let current = obj;
		for (const seg of segments) {
			if (current == null) return undefined;
			current = current[seg];
		}
		return current;
	};

	accessorCache.set(path, accessor);
	return accessor;
}
```

**Testing:**

- Benchmark repeated access to same paths
- Expect 10-20x improvement for repeated path access

---

### Step 1.5: Add `clone: false` Option to `get()`

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/types.ts`

**What:** Add an option to `get()` that skips defensive cloning for performance-critical reads. Document that returned values should not be mutated.

**Implementation:**

```typescript
interface GetOptions {
  clone?: boolean; // default: true (backward compatible)
}

get<P extends string>(path: P, options?: GetOptions): ResolvePath<T, P> {
  const match = this.resolve(path);
  if (!match) return undefined as any;

  if (options?.clone === false) {
    return match.value; // Direct reference
  }
  return cloneSnapshot(match.value); // Existing behavior
}
```

**Testing:**

- Existing tests pass (default behavior unchanged)
- Add tests for `clone: false` option
- Expect 2x improvement when using `clone: false`

---

### Step 1.6: Enable Microtask Batching by Default

**Files:**

- `packages/data-map/core/src/subscriptions/scheduler.ts`
- `packages/data-map/core/src/datamap.ts`

**What:** Batch multiple synchronous operations into a single notification using microtask scheduling. This is already partially implemented in `scheduler.ts`.

**Implementation:**

```typescript
class DataMap<T> {
	#pendingNotify = false;

	#scheduleNotify() {
		if (this.#pendingNotify) return;
		this.#pendingNotify = true;
		queueMicrotask(() => {
			this.#pendingNotify = false;
			this.notify();
		});
	}
}
```

**Testing:**

- Verify multiple rapid `set()` calls result in single notification
- Existing subscription timing tests may need adjustment
- Expect 2-5x improvement for batched operations

---

## Phase 2: Structural Sharing Deep Integration (10-20x Improvement)

**Estimated Time:** 3-5 days
**Risk Level:** Medium
**Expected Improvement:** 10-20x for writes, 30x for reads

### Step 2.1: Remove Defensive Cloning from `get()`

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/utils/clone.ts`

**What:** Change default behavior to return direct references instead of clones. Remove defensive cloning entirely.

**Implementation:**

```typescript
// BEFORE (default clones)
get<P extends string>(path: P): ResolvePath<T, P> {
  const match = this.resolve(path);
  return cloneSnapshot(match?.value);
}

// AFTER (direct reference)
get<P extends string>(path: P): ResolvePath<T, P> {
  const match = this.resolve(path);
  return match?.value;
}
```

**Testing:**

- Update tests that relied on mutation isolation
- Add tests verifying reference identity
- Expect 30x improvement for read operations

---

### Step 2.2: Implement Copy-on-Write for `patch()`

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/patch/apply.ts`
- `packages/data-map/core/src/utils/structural-sharing.ts`

**What:** Apply patch operations using copy-on-write semantics. Only clone the nodes along the path being modified, preserving references to unchanged subtrees.

**Implementation:**

```typescript
import { updateAtPointer } from './utils/structural-sharing.js';

patch(operations: PatchOperation[]): this {
  let state = this.#data;

  for (const op of operations) {
    switch (op.op) {
      case 'add':
      case 'replace':
        state = updateAtPointer(state, op.path, op.value);
        break;
      case 'remove':
        state = removeAtPointer(state, op.path);
        break;
      // ... other operations
    }
  }

  this.#data = state;
  this.#scheduleNotify();
  return this;
}
```

**Testing:**

- All existing patch tests must pass
- Add structural sharing verification tests
- Expect 3-5x improvement for patch operations

---

### Step 2.3: Add `toImmutable()` Snapshot Method

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/types.ts`

**What:** Provide explicit method for getting an immutable snapshot. Use `Object.freeze()` in development, direct reference in production.

**Implementation:**

```typescript
toImmutable(): Readonly<T> {
  if (process.env.NODE_ENV === 'development') {
    return deepFreeze(this.#data);
  }
  return this.#data as Readonly<T>;
}

// Alias for backward compatibility
toJSON(): T {
  return this.toImmutable() as T;
}
```

**Testing:**

- Add tests for `toImmutable()` method
- Verify frozen objects in development mode
- Expect instant return (no clone) in production

---

### Step 2.4: Optimize Batch Operations with Deferred Application

**Files:**

- `packages/data-map/core/src/batch/builder.ts`
- `packages/data-map/core/src/batch/collector.ts`

**What:** Collect all batch operations before applying them in a single structural update pass.

**Implementation:**

```typescript
class BatchBuilder<T> {
	#operations: PatchOperation[] = [];

	set(path: string, value: unknown): this {
		this.#operations.push({ op: 'replace', path, value });
		return this;
	}

	apply(map: DataMap<T>): void {
		// Single combined application
		map.patch(this.#operations);
	}
}
```

**Testing:**

- Verify batch of 100 operations is faster than 100 individual sets
- Expect 5-10x improvement for batch operations

---

### Step 2.5: Update All Tests for New Semantics

**Files:**

- `packages/data-map/core/src/__tests__/**/*.spec.ts` (all 27 test files)

**What:** Update tests to work with new reference-returning `get()` behavior. Add tests for new structural sharing guarantees.

**Implementation:**

- Tests that mutated returned values need `{ clone: true }` option
- Add tests verifying unchanged subtrees keep same reference
- Add tests for `toImmutable()` behavior

**Testing:**

- All 27 test files must pass
- Coverage must remain at current level or improve

---

## Phase 3: Subscription System Optimization (5-10x Improvement)

**Estimated Time:** 3-5 days
**Risk Level:** Medium
**Expected Improvement:** 5-10x for reactive use cases

### Step 3.1: Implement Tiered Subscription Matching

**Files:**

- `packages/data-map/core/src/subscriptions/manager.ts`
- `packages/data-map/core/src/subscriptions/tiers.ts` (new file)

**What:** Use different matching strategies based on subscription pattern complexity:

- Tier 1: Exact path match (O(1) Map lookup)
- Tier 2: Prefix match (O(depth) Trie lookup)
- Tier 3: Complex patterns (Bloom filter + linear scan)

**Implementation:**

```typescript
class TieredSubscriptionManager<T> {
	#exactMatch = new Map<string, Set<Subscription>>();
	#prefixTrie = new PathTrie<Set<Subscription>>();
	#complexPatterns = new Set<Subscription>();

	add(pattern: string, callback: Callback): Unsubscribe {
		if (isExactPath(pattern)) {
			// Tier 1: O(1) exact lookup
		} else if (isPrefixPattern(pattern)) {
			// Tier 2: O(depth) trie lookup
		} else {
			// Tier 3: complex JSONPath pattern
		}
	}

	notify(changedPaths: string[]) {
		const matched = new Set<Subscription>();
		for (const path of changedPaths) {
			// Check Tier 1 first (fastest)
			this.#exactMatch.get(path)?.forEach((s) => matched.add(s));
			// Then Tier 2
			this.#prefixTrie.matchPrefix(path).forEach((s) => matched.add(s));
		}
		// Only check Tier 3 if complex subscriptions exist
		if (this.#complexPatterns.size > 0) {
			// Bloom filter check
		}
	}
}
```

**Testing:**

- All existing subscription tests must pass
- Add benchmark for tiered vs flat matching
- Expect 5x improvement for exact/prefix subscriptions

---

### Step 3.2: Add Path Trie for Prefix Matching

**Files:**

- `packages/data-map/core/src/subscriptions/trie.ts` (new file)
- `packages/data-map/core/src/subscriptions/manager.ts`

**What:** Implement a Trie data structure for efficient prefix-based subscription matching.

**Implementation:**

```typescript
class PathTrie<V> {
	#root = new Map<string, PathTrie<V>>();
	#values = new Set<V>();

	insert(path: string, value: V): void {
		const segments = path.split('/').filter(Boolean);
		let node: PathTrie<V> = this;
		for (const seg of segments) {
			if (!node.#root.has(seg)) {
				node.#root.set(seg, new PathTrie());
			}
			node = node.#root.get(seg)!;
		}
		node.#values.add(value);
	}

	matchPrefix(path: string): Set<V> {
		const matched = new Set<V>();
		const segments = path.split('/').filter(Boolean);
		let node: PathTrie<V> = this;

		for (const seg of segments) {
			matched.addAll(node.#values); // Collect prefix matches
			if (!node.#root.has(seg)) break;
			node = node.#root.get(seg)!;
		}
		matched.addAll(node.#values);
		return matched;
	}
}
```

**Testing:**

- Unit tests for Trie operations
- Integration with subscription manager
- Expect 3x improvement for prefix subscriptions

---

### Step 3.3: Dynamic Bloom Filter Toggle

**Files:**

- `packages/data-map/core/src/subscriptions/manager.ts`
- `packages/data-map/core/src/subscriptions/bloom.ts`

**What:** The Bloom filter toggle (`USE_BLOOM`) already exists but is static. Make it dynamic based on subscription count.

**Implementation:**

```typescript
class SubscriptionManager<T> {
	#useBloom = false;
	#bloom?: BloomFilter;

	add(pattern: string, callback: Callback) {
		// ... add subscription

		// Enable Bloom filter when subscription count exceeds threshold
		if (!this.#useBloom && this.count > 100) {
			this.#useBloom = true;
			this.#bloom = new BloomFilter();
			this.#rebuildBloom();
		}
	}

	remove(id: SubscriptionId) {
		// ... remove subscription

		// Disable Bloom filter when count drops
		if (this.#useBloom && this.count < 50) {
			this.#useBloom = false;
			this.#bloom = undefined;
		}
	}
}
```

**Testing:**

- Verify Bloom is disabled for small subscription sets
- Verify Bloom enables automatically at threshold
- Expect 2x improvement for small subscription sets

---

### Step 3.4: Optimize `handleStructuralChange()`

**Files:**

- `packages/data-map/core/src/subscriptions/manager.ts`

**What:** The `handleStructuralChange()` method currently re-expands ALL dynamic subscriptions. Optimize to only re-expand affected paths.

**Implementation:**

```typescript
handleStructuralChange(newState: T, changedPaths: string[]): void {
  // Only re-expand subscriptions that overlap with changed paths
  for (const [id, sub] of this.#dynamicSubscriptions) {
    const expandedPaths = sub.expandedPaths;
    const needsReExpand = changedPaths.some(cp =>
      expandedPaths.some(ep => pathOverlaps(cp, ep))
    );

    if (needsReExpand) {
      this.#reExpandSubscription(id, sub, newState);
    }
  }
}
```

**Testing:**

- Add benchmark for structural changes with many subscriptions
- Verify selective re-expansion works correctly
- Expect 3-5x improvement for structural changes

---

## Phase 4: Path Resolution Optimization (10-20x Improvement)

**Estimated Time:** 2-3 days
**Risk Level:** Low
**Expected Improvement:** 10-20x for path access

### Step 4.1: Implement LRU Cache for Path Detection

**Files:**

- `packages/data-map/core/src/paths/detect.ts`

**What:** Replace simple Map-with-clear with proper LRU cache for path type detection.

**Implementation:**

```typescript
class LRUCache<K, V> {
	#cache = new Map<K, V>();
	#maxSize: number;

	get(key: K): V | undefined {
		const value = this.#cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.#cache.delete(key);
			this.#cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		if (this.#cache.size >= this.#maxSize) {
			// Delete oldest (first key)
			const oldest = this.#cache.keys().next().value;
			this.#cache.delete(oldest);
		}
		this.#cache.set(key, value);
	}
}
```

**Testing:**

- Verify LRU eviction behavior
- Benchmark cache hit rates
- Expect improved cache utilization

---

### Step 4.2: Expand Inline Pointer Fast Path

**Files:**

- `packages/data-map/core/src/utils/pointer.ts`

**What:** Extend the inline fast path to handle more pointer patterns without falling back to JSONPointer class.

**Implementation:**

```typescript
export function tryResolvePointerInline<T>(
	data: unknown,
	pointer: string,
): { ok: true; value: T | undefined } | { ok: false } {
	// Currently only handles simple paths without escapes
	// Extend to handle:
	// - Escaped slashes (~1)
	// - Escaped tildes (~0)
	// - Array indices
	// - Negative indices (from end)

	if (!pointer.startsWith('/')) return { ok: false };

	const segments = pointer.slice(1).split('/');
	let current: any = data;

	for (let seg of segments) {
		if (current == null) return { ok: true, value: undefined };

		// Handle escapes inline
		if (seg.includes('~')) {
			seg = seg.replace(/~1/g, '/').replace(/~0/g, '~');
		}

		// Handle negative array indices
		if (Array.isArray(current) && seg.startsWith('-')) {
			const idx = current.length + parseInt(seg, 10);
			current = current[idx];
		} else {
			current = current[seg];
		}
	}

	return { ok: true, value: current as T };
}
```

**Testing:**

- Add tests for escaped paths
- Add tests for negative indices
- Expect 10-20x improvement for simple pointer access

---

### Step 4.3: Use Object Pool for Hot Path Allocations

**Files:**

- `packages/data-map/core/src/utils/pool.ts`
- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/paths/detect.ts`

**What:** The ObjectPool class already exists but is unused. Integrate it for frequently-allocated objects like ResolvedMatch.

**Implementation:**

```typescript
const resolvedMatchPool = new ObjectPool<ResolvedMatch<any>>({
	create: () => ({ path: '', value: undefined, type: 'pointer' }),
	reset: (obj) => {
		obj.path = '';
		obj.value = undefined;
		obj.type = 'pointer';
	},
});

function buildResolvedMatch<T>(match: JSONPathResult<T>): ResolvedMatch<T> {
	const result = resolvedMatchPool.acquire();
	result.path = match.path;
	result.value = match.value;
	result.type = match.type;
	return result;
}

// Caller must release when done
function releaseResolvedMatch(match: ResolvedMatch<any>): void {
	resolvedMatchPool.release(match);
}
```

**Testing:**

- Verify pool acquire/release cycle
- Measure GC pressure reduction
- Expect 3-5x improvement in allocation-heavy operations

---

## Phase 5: Advanced Optimizations (Competitive Performance)

**Estimated Time:** 3-5 days
**Risk Level:** Medium-High
**Expected Improvement:** Competitive with Zustand/Immer

### Step 5.1: Implement Proxy-Based Change Detection

**Files:**

- `packages/data-map/core/src/proxy/tracker.ts` (new file)
- `packages/data-map/core/src/datamap.ts`

**What:** Use Proxy to track which properties are accessed and modified, enabling fine-grained subscription notifications.

**Implementation:**

```typescript
class AccessTracker<T extends object> {
	#accessed = new Set<string>();
	#modified = new Set<string>();

	track(obj: T, path = ''): T {
		return new Proxy(obj, {
			get: (target, prop) => {
				const fullPath = `${path}/${String(prop)}`;
				this.#accessed.add(fullPath);
				const value = Reflect.get(target, prop);
				if (typeof value === 'object' && value !== null) {
					return this.track(value, fullPath);
				}
				return value;
			},
			set: (target, prop, value) => {
				const fullPath = `${path}/${String(prop)}`;
				this.#modified.add(fullPath);
				return Reflect.set(target, prop, value);
			},
		});
	}
}
```

**Testing:**

- Add tests for Proxy-based tracking
- Benchmark Proxy overhead vs current approach
- Evaluate if Proxy overhead is justified

---

### Step 5.2: Implement Selector-Based Subscriptions

**Files:**

- `packages/data-map/core/src/subscriptions/selector.ts` (new file)
- `packages/data-map/core/src/datamap.ts`

**What:** Add Zustand-style selector subscriptions that only notify when selected value changes.

**Implementation:**

```typescript
subscribeWithSelector<S>(
  selector: (state: T) => S,
  callback: (selected: S, prev: S) => void,
  equalityFn: (a: S, b: S) => boolean = Object.is
): Unsubscribe {
  let currentSelected = selector(this.#data);

  return this.subscribe('$', () => {
    const nextSelected = selector(this.#data);
    if (!equalityFn(currentSelected, nextSelected)) {
      const prev = currentSelected;
      currentSelected = nextSelected;
      callback(nextSelected, prev);
    }
  });
}
```

**Testing:**

- Add tests for selector subscriptions
- Verify equality comparison works
- Benchmark selector overhead

---

### Step 5.3: Add Shallow Comparison Utilities

**Files:**

- `packages/data-map/core/src/utils/compare.ts` (new file)
- `packages/data-map/core/src/subscriptions/manager.ts`

**What:** Implement fast shallow comparison for detecting meaningful changes.

**Implementation:**

```typescript
export function shallowEqual<T>(a: T, b: T): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== 'object' || typeof b !== 'object') return false;
	if (a === null || b === null) return false;

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!Object.hasOwn(b, key) || !Object.is(a[key], b[key])) {
			return false;
		}
	}

	return true;
}
```

**Testing:**

- Unit tests for shallow comparison
- Integration with subscription system
- Expect reduced unnecessary notifications

---

## Phase 6: Documentation and Benchmarks

**Estimated Time:** 1 day
**Risk Level:** Low

### Step 6.1: Update API Documentation

**Files:**

- `packages/data-map/core/README.md`
- `docs/api/data-map.md`
- `packages/data-map/core/COMPREHENSIVE_PERFORMANCE_AUDIT.md` (mark resolved)

**What:** Document new APIs and performance characteristics.

**Topics:**

- `toImmutable()` method
- Selector subscriptions
- Proxy-based change detection
- Performance tips and best practices

---

### Step 6.2: Update CHANGELOG

**Files:**

- `packages/data-map/core/CHANGELOG.md`

**What:** Document all changes for the release.

---

## Summary: Expected Performance After All Phases

| Operation           | Before     | After (Expected) | Improvement |
| ------------------- | ---------- | ---------------- | ----------- |
| Simple get          | 2.1M ops/s | 50-70M ops/s     | **25-35x**  |
| Nested get          | 1.5M ops/s | 40-60M ops/s     | **27-40x**  |
| Simple set          | 89K ops/s  | 1-2M ops/s       | **11-22x**  |
| Nested update       | 12K ops/s  | 500K-1M ops/s    | **42-83x**  |
| Subscription notify | 45K ops/s  | 500K-1M ops/s    | **11-22x**  |
| Batch operations    | N/A        | 2-5M ops/s       | N/A         |

## Risk Mitigation

1. **Regression Risk:** All phases include:
   - Running existing 27 test files
   - Adding new tests for new behavior

2. **Complexity Risk:** Phases are ordered by risk:
   - Phase 1: Low risk, high reward quick wins
   - Later phases: Higher risk, but built on validated foundation

## Dependencies

- All existing `@jsonpath/*` workspace packages
- `rfdc` (may be removed/reduced after Phase 2)
- No new external dependencies required

## Success Criteria

1. All existing tests pass
2. Benchmark scores improve significantly
3. No memory leaks introduced
4. Documentation updated
5. CHANGELOG includes all changes
