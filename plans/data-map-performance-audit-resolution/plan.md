# @data-map/core Performance Audit Resolution

**Branch:** `perf/data-map-core-optimization`
**Description:** Resolve all performance issues identified in PERFORMANCE_AUDIT_EXHAUSTIVE.md, achieving competitive performance with lodash/Immer/Mutative.

## Goal

Close the mutation performance gap for `@data-map/core` while maintaining read leadership. Current state (10,000-key objects):

- **Read**: 8.22M ops/sec (rank #3, competitive ✅)
- **Mutation**: 103.9 ops/sec (rank #8, target: 200+ ops/sec)
- **Clone**: 203 ops/sec (rank last, target: 400+ ops/sec)

Primary causes: benchmark methodology artifacts (double-cloning) + intrinsic write-path costs (patch-building clones).

## Implementation Notes

- **v0 Implementation:** Breaking changes are acceptable. No deprecation periods or migration guides required.
- **Benchmark Fixes First:** Tier 0 must be completed before measuring true impact of core fixes.
- **Performance Targets:** 2× improvement on mutations, maintain read performance.
- **Benchmark Environment:** Local development machine (no CI required).
- **Default Settings:** Use fastest options by default (`snapshotMode: 'reference'`, `useStructuralUpdate: true`).

## Executive Summary

The exhaustive audit (2026-01-07) identified that benchmarks **inflate DataMap's measured slowness** by 40-60% due to double-cloning artifacts. After fixing benchmarks, the remaining gap can be closed through:

1. Fixing `clone()` redundant cloning (2× improvement)
2. Structural sharing in patch building (3-10× for path creation)
3. Pointer-first mutation path (5-10× for simple sets)
4. Ownership/snapshot modes (2-3× with reference mode)

---

## Tier 0: Fix Benchmark Methodology (Do This First)

**Estimated Time:** 0.5-1 day
**Risk Level:** Minimal
**Expected Improvement:** 40-60% in measured mutation performance (artifact removal)

> **Critical**: This tier must be completed before measuring the true impact of core fixes.

### Step 0.1: Fix DataMap Adapter Double-Cloning

**Files:**

- `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

**What:** The adapter cache uses object identity (`cachedData !== data`), but mutation benchmarks call `structuredClone()` per iteration, causing cache misses. Combined with `cloneInitial: true` default, this produces **double cloning before any mutation work begins**.

**Implementation:**

```typescript
// For mutation benchmarks where data is already cloned by harness:
export const dataMapAdapter = {
	set: (data, path, value) => {
		// Use cloneInitial: false since benchmark harness already cloned
		const dm = new DataMap(data, { cloneInitial: false });
		dm.set(path, value);
		return dm.getSnapshot();
	},
	// ...
};
```

**Testing:**

- Run `pnpm --filter @data-map/benchmarks run bench` before and after
- DataMap mutation should be within 2× of lodash after this fix

---

### Step 0.2: Fix Clone Benchmark Triple-Clone

**Files:**

- `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

**What:** Current clone benchmark does `dm.clone().getSnapshot()` which is:

1. `clone()` → `getSnapshot()` (deep clone)
2. Constructor with `cloneInitial: true` (deep clone again)
3. `.getSnapshot()` at end (third deep clone)

**Implementation:**

```typescript
// Measure single operation, not triple:
clone: (data) => {
	const dm = getCachedDataMap(data);
	return dm.clone(); // Single clone operation
	// OR: return dm.getSnapshot(); // Alternative: single snapshot
};
```

**Testing:**

- Clone benchmark should show DataMap within ~1× of rfdc baseline

---

### Step 0.3: Move structuredClone Outside Timed Loops

**Files:**

- `packages/data-map/benchmarks/src/compare/scale.bench.ts`
- `packages/data-map/benchmarks/src/compare/immutable-updates.bench.ts`
- `packages/data-map/benchmarks/src/compare/subscriptions.bench.ts`
- `packages/data-map/benchmarks/src/compare/array-operations.bench.ts`

**What:** Mutation benchmarks call `structuredClone()` inside the timed loop, measuring clone cost for all adapters. Move cloning outside or restructure to measure only mutation cost.

**Implementation:**

```typescript
// BEFORE (clone inside loop):
bench('DataMap set', () => {
	const data = structuredClone(largeObject);
	adapter.set(data, '/key', 'value');
});

// AFTER (clone outside, use fresh instances per iteration):
const dataPool = Array.from({ length: 100 }, () =>
	structuredClone(largeObject),
);
let poolIndex = 0;
bench('DataMap set', () => {
	const data = dataPool[poolIndex++ % dataPool.length];
	adapter.set(data, '/key', 'value');
});
```

**Testing:**

- Benchmark results should show clearer separation between adapters
- All adapters should benefit from this fix (apples-to-apples comparison)

---

### Step 0.4: Add Benchmark Documentation Comments

**Files:**

- All benchmark files in `packages/data-map/benchmarks/src/`

**What:** Document what each benchmark measures to prevent future confusion.

**Implementation:**

```typescript
/**
 * Object Size Scaling - Mutation
 *
 * Measures: Cost of a single set operation on pre-cloned data
 * Excludes: Initial clone cost, DataMap construction overhead
 * Adapters: All use pre-cloned data with cloneInitial: false
 */
describe('Object Size Scaling - Mutation', () => {
	// ...
});
```

---

## Tier 1: Low-Risk Core Fixes (High Win Per LOC)

**Estimated Time:** 1-2 days
**Risk Level:** Low
**Expected Improvement:** 2-5× for clone and path creation operations

### Step 1.1: Fix `DataMap.clone()` Redundant Cloning

**Files:**

- `packages/data-map/core/src/datamap.ts`

**What:** The current `clone()` implementation does **two deep clones**:

1. `getSnapshot()` = deep clone via rfdc
2. Constructor with default `cloneInitial: true` = deep clone again

Fix by passing `cloneInitial: false` since we already have a snapshot.

**Implementation:**

```typescript
clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx> {
    const snapshot = this.getSnapshot();
    return new (this.constructor as any)(snapshot, {
        ...this._options,
        ...options,
        cloneInitial: false,  // Already cloned via getSnapshot()
    });
}
```

**Testing:**

- Clone benchmark should show ~50% improvement (2× faster)
- Ensure `clone()` produces fully independent copy (mutation isolation test)
- Run full test suite to verify no regressions

---

### Step 1.2: Reduce Cloning in Patch Building

**Files:**

- `packages/data-map/core/src/patch/builder.ts`
- `packages/data-map/core/src/utils/structural-sharing.ts`

**What:** The `ensureParentContainers()` function does `cloneSnapshot(currentData)` - a full O(n) clone even when creating a single deep path. Use structural sharing instead:

1. Clone only the path segments being created
2. Share everything else via reference
3. Keep current behavior as fallback for complex multi-op patches

**Implementation:**

```typescript
// Instead of:
const nextData = cloneSnapshot(currentData); // O(n) full clone

// Use structural sharing:
import { setAtPath } from './utils/structural-sharing.js';
const nextData = setAtPath(currentData, pointer, value); // O(depth) work
```

**Testing:**

- Path creation benchmarks for deep paths (10+ levels): expect 3-10× improvement
- Property-based testing for edge cases (missing parents, array indices)
- Wide object updates should approach lodash performance

---

### Step 1.3: Verify Zero-Subscriber Overhead

**Files:**

- `packages/data-map/core/src/subscription/manager.ts`
- `packages/data-map/core/src/datamap.ts`

**What:** Audit and ensure subscription machinery has near-zero overhead when no subscribers exist:

- [ ] `set()` doesn't construct notification payloads unless `hasSubscribers()`
- [ ] `get()` skips bloom filter checks when subscriber count is 0
- [ ] `scheduleNotify()` returns immediately if no subscribers

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

- Create benchmark: mutation with 0 subscribers vs mutation with 1+ subscribers
- Zero-subscriber overhead should be <5% vs baseline
- Document findings in audit resolution summary

---

## Tier 2: Pointer-First Mutation Path (Core Throughput)

**Estimated Time:** 2-3 days
**Risk Level:** Medium
**Expected Improvement:** 5-10× for simple pointer mutations

### Step 2.1: Create Structural Update Utility

**Files:**

- `packages/data-map/core/src/utils/structural-update.ts` (new file)

**What:** Create a first-class structural sharing operation for pointer-based updates that bypasses the JSON Patch machinery entirely.

**Implementation:**

```typescript
export function setAtPointer(
	data: unknown,
	pointer: string,
	value: unknown,
	options: { createPath?: boolean } = {},
): unknown {
	// 1. Parse pointer once
	const segments = parsePointer(pointer);

	// 2. Walk down, cloning only the path being modified
	let root = shallowClone(data);
	let current = root;

	for (let i = 0; i < segments.length - 1; i++) {
		const seg = segments[i];
		const child = current[seg];

		if (child === undefined && options.createPath) {
			// Create missing container
			const nextSeg = segments[i + 1];
			current[seg] = isArrayIndex(nextSeg) ? [] : {};
		} else {
			current[seg] = shallowClone(child);
		}
		current = current[seg];
	}

	// 3. Set the value
	current[segments[segments.length - 1]] = value;

	// 4. Return new root (structural sharing)
	return root;
}
```

**Testing:**

- Unit tests for various path depths and types
- Property-based testing for edge cases
- Benchmark: single pointer set vs current patch-based approach

---

### Step 2.2: Integrate Pointer-First Path into DataMap.set()

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/utils/path-type.ts`

**What:** Route simple JSON Pointer mutations through the fast path, keeping JSON Patch for complex scenarios.

**Implementation:**

```typescript
import { setAtPointer } from './utils/structural-update.js';
import { detectPathType } from './utils/path-type.js';

set(pathOrPointer: string, value: unknown, options: CallOptions = {}): void {
    const pathType = detectPathType(pathOrPointer);

    if (pathType === 'pointer' && !this.hasComplexInterceptors()) {
        // Fast path: direct structural update
        this._data = setAtPointer(this._data, pathOrPointer, value, {
            createPath: options.createPath ?? true
        });
        this._maybeNotify(pathOrPointer);
        return;
    }

    // Slow path: JSON Patch (for JSONPath, complex patterns, interceptors)
    const operations = [{ op: 'replace', path: pathOrPointer, value }];
    this.patch(operations);
}
```

**Testing:**

- Single-pointer set: expect 5-10× faster on large objects
- Deep path creation (10 levels): expect 3-5× faster
- Wide object updates (10k keys): should approach lodash performance (within 20%)
- All existing set tests must pass

---

### Step 2.3: Add Feature Flag for Gradual Rollout

**Files:**

- `packages/data-map/core/src/types.ts`
- `packages/data-map/core/src/datamap.ts`

**What:** Add opt-in flag for pointer-first mutations to allow gradual rollout and easy rollback.

**Implementation:**

```typescript
interface DataMapOptions<T, Ctx> {
	// Existing options...

	/** Use structural update for simple pointer operations (default: true) */
	useStructuralUpdate?: boolean;
}

// In DataMap.set():
if (this._options.useStructuralUpdate !== false && pathType === 'pointer') {
	// Fast path
}
```

**Testing:**

- Verify flag defaults to `true`
- Verify `false` falls back to patch-based path
- Add benchmark comparing both modes

---

## Tier 3: Ownership & Snapshot Modes (Unlock Fast Immutable)

**Estimated Time:** 1-2 days
**Risk Level:** Medium-High
**Expected Improvement:** 2-3× with reference mode

### Step 3.1: Add snapshotMode Option

**Files:**

- `packages/data-map/core/src/types.ts`
- `packages/data-map/core/src/datamap.ts`

**What:** Add explicit API option for users to choose snapshot performance tradeoffs.

**Implementation:**

```typescript
interface DataMapOptions<T, Ctx> {
    // Existing options...

    /**
     * Control snapshot behavior:
     * - 'reference': Return this._data directly (default, fastest)
     * - 'clone': Deep clone (safest, use for mutation isolation)
     * - 'frozen': Return Object.freeze(this._data) (safe reads, dev-mode throws on mutation)
     */
    snapshotMode?: 'reference' | 'clone' | 'frozen';
}

getSnapshot(): T {
    switch (this._options.snapshotMode) {
        case 'clone':
            return cloneSnapshot(this._data);
        case 'frozen':
            return Object.freeze(this._data) as T;
        case 'reference':
        default:
            return this._data;  // Fastest: direct reference
    }
}
```

**Testing:**

- Benchmark each mode separately
- 'reference' mode (new default) should be 2-3× faster than 'clone' mode
- Verify 'frozen' mode throws on attempted mutation in development
- Breaking change: default changed from 'clone' to 'reference' (v0, acceptable)

---

### Step 3.2: Add toImmutable() Convenience Method

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
- Verify frozen objects throw in development mode
- Verify direct return in production mode

---

## Phase 4: Documentation & Cleanup

**Estimated Time:** 0.5 day
**Risk Level:** Low

### Step 4.1: Update Performance Audit Document

**Files:**

- `packages/data-map/core/PERFORMANCE_AUDIT_EXHAUSTIVE.md`

**What:** Mark resolved items, add resolution notes, document final benchmark results.

**Implementation:**

Add "Resolution Status" section at the top with:

- Tier 0: ✅ Resolved - benchmark methodology fixed
- Tier 1.1: ✅ Resolved - clone() redundant cloning fixed
- Tier 1.2: ✅ Resolved - patch building uses structural sharing
- Tier 1.3: ✅ Resolved - zero-subscriber overhead verified
- Tier 2: ✅ Resolved - pointer-first mutation path added
- Tier 3: ✅ Resolved - snapshotMode option added

---

### Step 4.2: Update API Documentation

**Files:**

- `packages/data-map/core/README.md`
- `docs/api/data-map.md`

**What:** Document new options and performance characteristics:

- `snapshotMode` option and tradeoffs
- `useStructuralUpdate` option
- Performance tuning guidelines
- Benchmark results summary

---

### Step 4.3: Update CHANGELOG

**Files:**

- `packages/data-map/core/CHANGELOG.md`

**What:** Document all performance improvements for the release.

---

## Summary: Expected Performance After All Tiers

Based on the exhaustive audit's realistic targets for 10,000-key objects:

| Metric                   | Before  | Target         | Improvement               |
| ------------------------ | ------- | -------------- | ------------------------- |
| Read (ops/sec)           | 8.22M   | 8M+ (maintain) | ≈0% (already competitive) |
| Mutation (ops/sec)       | 103.9   | 200+           | **2× improvement**        |
| Clone (ops/sec)          | 203     | 400+           | **2× improvement**        |
| Deep path creation       | O(n)    | O(depth)       | Structural sharing        |
| Zero-subscriber overhead | Unknown | <5%            | Verified minimal          |

**Note:** The previous audit's 25-35× improvement claims were based on different baseline measurements. The exhaustive audit establishes more realistic targets based on current competitive benchmarks.

## Risk Mitigation

1. **Regression Risk:** All tiers include:
   - Running existing test suite
   - Adding new tests for new behavior
   - Feature flags for gradual rollout

2. **Complexity Risk:** Tiers are ordered by risk:
   - Tier 0: Minimal risk (benchmark-only changes)
   - Tier 1: Low risk, high reward
   - Tier 2-3: Higher risk, gated behind feature flags

3. **Benchmark Variability:**
   - Run benchmarks on consistent environment
   - Document machine specs and run conditions
   - Take median of multiple runs

## Dependencies

- Existing `@jsonpath/*` workspace packages
- `rfdc` for deep cloning (existing)
- No new external dependencies required

## Success Criteria

1. All existing tests pass (27 test files)
2. Benchmark methodology fixes verified (Tier 0 complete)
3. Clone operations 2× faster
4. Mutation operations 2× faster (within 20% of lodash)
5. Read performance maintained (8M+ ops/sec)
6. Zero-subscriber overhead <5%
7. Documentation updated
8. CHANGELOG includes all changes

---

## Resolved Decisions

1. **Benchmark environment:** Local development machine (no CI)
2. **Snapshot mode default:** `'reference'` (fastest)
3. **Feature flag default:** `useStructuralUpdate: true` (fastest)
4. **Breaking changes:** Acceptable (v0 implementation)
5. **Priority ordering:** Tier 0 (benchmarks) first, then core optimizations
