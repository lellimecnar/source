<!-- markdownlint-disable-file -->

# Task Research Notes: @data-map/core Exhaustive Performance Audit

## Research Executed

### File Analysis - Core Implementation

#### DataMap Class (datamap.ts - 1012 lines)

- **Line 50**: `_isOwned = false` - Ownership tracking flag for copy-on-write
- **Lines 105-108**: Constructor with `cloneInitial` option (defaults to `true`)
  ```typescript
  const cloneInitial = options.cloneInitial ?? true;
  this._data = cloneInitial ? cloneSnapshot(initialValue) : initialValue;
  this._isOwned = cloneInitial;
  ```
- **Lines 116-120**: `ensureOwned()` method for copy-on-write pattern
  ```typescript
  private ensureOwned(): void {
      if (this._isOwned) return;
      this._data = cloneSnapshot(this._data);
      this._isOwned = true;
  }
  ```
- **Lines 168-170**: `getSnapshot()` - Always deep clones via rfdc
  ```typescript
  getSnapshot(): T {
      return cloneSnapshot(this._data);
  }
  ```
- **Lines 1000-1011**: `clone()` method - **CRITICAL BUG: Double cloning**
  ```typescript
  clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx> {
      return new (this.constructor as any)(this.getSnapshot(), {  // Clone 1
          strict: this._strict,
          context: this._context,
          define: this._defineOptions,
          ...options,  // Missing cloneInitial: false! → Clone 2 in constructor
      });
  }
  ```

#### Patch Building (builder.ts - Critical Hotspot)

- **Lines 31-39**: `ensureParentContainers()` - **CRITICAL: Full O(n) clone per operation**

  ```typescript
  export function ensureParentContainers(
  	currentData: unknown,
  	targetPointer: string,
  ): { ops: Operation[]; nextData: unknown } {
  	const ops: Operation[] = [];
  	const nextData = cloneSnapshot(currentData); // FULL CLONE HERE!
  	// ...walks and mutates nextData...
  }
  ```

  - This makes any path creation cost O(size of entire tree) instead of O(depth)
  - Called for every `set()` operation that creates missing parents

- **Lines 83-93**: `buildSetPatch()` uses `ensureParentContainers`
  ```typescript
  export function buildSetPatch(
  	currentData: unknown,
  	targetPointer: string,
  	value: unknown,
  ): Operation[] {
  	const { ops: containerOps, nextData } = ensureParentContainers(
  		currentData,
  		targetPointer,
  	);
  	// ...
  }
  ```

#### Structural Sharing (Already Exists!)

- **File**: `utils/structural-sharing.ts` (44 lines)
  - `updateAtPointer()` already implements structural sharing for replace operations

  ```typescript
  export function updateAtPointer<T>(
  	data: T,
  	pointer: string,
  	value: unknown,
  ): T {
  	const segments = parsePointerSegments(pointer);
  	return updateRecursive(data, segments, 0, value) as T;
  }

  function updateRecursive(node, segments, depth, value): unknown {
  	if (depth === segments.length) return value;
  	// Clone only this level, recurse
  	const key = segments[depth];
  	const nextChild = updateRecursive(currentChild, segments, depth + 1, value);
  	return isArray
  		? [...node.slice(0, idx), nextChild, ...node.slice(idx + 1)]
  		: { ...node, [key]: nextChild };
  }
  ```

- **File**: `patch/apply.ts` (62 lines)
  - **Lines 31-50**: Fast path for replace operations using structural sharing

  ```typescript
  // Check if all ops are simple replace operations
  for (const op of ops) {
  	if (op.op !== 'replace' || !op.path.startsWith('/')) {
  		allFastPath = false;
  		break;
  	}
  }

  if (allFastPath && ops.length > 0) {
  	// Fast-path: apply replace ops using structural sharing
  	for (const op of ops) {
  		nextData = updateAtPointer(nextData, op.path, op.value);
  	}
  }
  ```

  - **Key insight**: Fast path only triggers for pure `replace` operations
  - `add` operations (new paths) go through slow path with full cloning

#### Clone Utility (clone.ts - 8 lines)

- Already uses rfdc (not structuredClone)
  ```typescript
  import rfdc from 'rfdc';
  const clone = rfdc({ circles: false, proto: false });
  export function cloneSnapshot<T>(value: T): T {
  	return clone(value);
  }
  ```

#### Batch Builder (batch/builder.ts - 93 lines)

- **Lines 11-12**: Constructor clones immediately
  ```typescript
  constructor(private dm: DataMap<T, Ctx>) {
      this.workingData = dm.getSnapshot();  // Deep clone at batch start
  }
  ```

#### JSON Pointer Resolution (utils/jsonpath.ts - 150 lines)

- **Lines 92-103**: `resolvePointer()` - Has fast path for simple pointers
  ```typescript
  export function resolvePointer<T = unknown>(
  	data: unknown,
  	pointer: string,
  ): T | undefined {
  	try {
  		// Ultra-fast path: accessor compilation for simple pointers without escapes
  		if (pointer !== '' && pointer.startsWith('/') && !pointer.includes('~')) {
  			const get = compileAccessor(pointer);
  			return get(data) as T | undefined;
  		}
  		const fast = tryResolvePointerInline<T>(data, pointer);
  		if (fast.ok) return fast.value;
  		return new JSONPointer(pointer).resolve<T>(data);
  	} catch (err) {
  		throw normalizeError(err, pointer);
  	}
  }
  ```

### File Analysis - Benchmark Infrastructure

#### DataMap Adapter (data-map.adapter.ts - 198 lines)

- **Lines 5-14**: **CRITICAL BUG: Cache invalidation defeats caching**

  ```typescript
  let cachedMap: DataMap<any> | null = null;
  let cachedData: unknown | null = null;

  function getCachedDataMap(data: unknown): DataMap<any> {
  	if (cachedData !== data) {
  		// Identity check: ALWAYS TRUE after structuredClone!
  		cachedMap = new DataMap(data as any); // Constructor clones by default
  		cachedData = data;
  	}
  	return cachedMap!;
  }
  ```

  - Benchmarks do `structuredClone()` per iteration → new object identity → cache miss every time
  - Result: DataMap construction + constructor clone on every benchmark iteration

- **Lines 45-52**: Every mutation returns `getSnapshot()` = additional deep clone

  ```typescript
  set: (data: unknown, path: string, value: unknown) => {
      const dm = getCachedDataMap(data);  // Cache miss → new DataMap → clone
      dm.set(path, value);
      return dm.getSnapshot();  // Another deep clone
  },
  ```

- **Lines 170-174**: Clone method triple-clones
  ```typescript
  clone: (data: unknown) => {
      const dm = getCachedDataMap(data);  // Clone 1 (cache miss)
      return dm.clone().getSnapshot();     // Clone 2 (clone()) + Clone 3 (getSnapshot())
  },
  ```

#### Scale Benchmarks (compare/scale.bench.ts - 433 lines)

- **Lines 143-150**: Mutation benchmarks clone inside timed loop

  ```typescript
  describe('10,000 keys', () => {
  	for (const adapter of mutationAdapters) {
  		bench(adapter.name, () => {
  			const data = structuredClone(obj10000); // Clone 1 (benchmark)
  			adapter.set!(data, '/key5000', 'updated'); // DataMap: +2 clones
  		});
  	}
  });
  ```

  - DataMap pays 3 clones per iteration; lodash pays 2; immer pays ~0 (structural sharing)

#### Competitor Adapters (Comparison Patterns)

- **lodash.adapter.ts (Lines 38-42)**: Single clone per set

  ```typescript
  set: (data: unknown, path: string, value: unknown) => {
      const cloned = cloneDeep(data) as object;
      set(cloned, toDotPath(path), value);
      return cloned;  // 1 clone total
  },
  ```

- **immer.adapter.ts (Lines 33-36)**: Copy-on-write, O(depth) not O(size)

  ```typescript
  set: (data: unknown, path: string, value: unknown) => {
      return produce(data, (draft) => {
          dlvDsetAdapter.mutate!(draft, path, value);
      });
  },
  ```

- **mutative.adapter.ts**: Same pattern as immer but faster internals

### Code Search Results

- **Structural sharing utility**: Already exists in `utils/structural-sharing.ts`
- **Accessor cache**: Exists in `utils/accessor-cache.ts` for compiled pointer accessors
- **Pattern cache**: Exists in `path/compile.ts` for compiled JSONPath patterns
- **Ownership tracking**: `_isOwned` flag exists but `ensureOwned()` not used in set path
- **snapshotMode option**: Does NOT exist yet in DataMapOptions

### External Research

- **rfdc**: Already integrated (13.5M weekly downloads, 2-7x faster than structuredClone)
- **immer**: Proxy-based copy-on-write, structural sharing, O(depth) updates
- **mutative**: Same pattern as immer, 2-10x faster in benchmarks

## Key Discoveries

### Root Causes Summary

| Issue                               | Location                         | Impact    | Priority |
| ----------------------------------- | -------------------------------- | --------- | -------- |
| Adapter cache miss per iteration    | `adapters/data-map.adapter.ts:8` | Very High | Tier 0   |
| Double clone in benchmarks          | `compare/*.bench.ts`             | High      | Tier 0   |
| `clone()` double-clones             | `datamap.ts:1004`                | High      | Tier 1.1 |
| `ensureParentContainers` full clone | `patch/builder.ts:35`            | Very High | Tier 1.2 |
| `getSnapshot()` always deep-clones  | `datamap.ts:170`                 | High      | Tier 3   |
| FluentBatchBuilder clones on init   | `batch/builder.ts:12`            | Medium    | Tier 2   |
| No pointer-first mutation path      | N/A (architecture gap)           | Very High | Tier 2   |

### Performance Snapshot (10,000-key objects)

| Operation | Current ops/sec | Target (Tier 0+1) | Target (Tier 2+3) |
| --------- | --------------- | ----------------- | ----------------- |
| Read      | 8.22M           | 8.22M (maintain)  | 8.22M             |
| Mutation  | 103.9           | 400-500           | 800-1000          |
| Clone     | 203             | 600-800           | 800+              |

### Existing Optimizations Already in Place

1. **rfdc for cloning** - Already faster than structuredClone
2. **Accessor cache** - Compiled pointer accessors for simple pointers
3. **Pattern cache** - Compiled JSONPath patterns
4. **Lazy subscription manager** - Only instantiated on first `subscribe()`
5. **Notification early-exit** - Skips notification work when no subscribers
6. **Structural sharing for replace** - Fast path in patch/apply.ts

### Missing Optimizations

1. **Benchmark adapter doesn't use `cloneInitial: false`**
2. **`clone()` doesn't pass `cloneInitial: false`**
3. **`ensureParentContainers` doesn't use structural sharing**
4. **No `snapshotMode` option for reference/frozen snapshots**
5. **No pointer-first mutation path** (bypasses patch building)

## Recommended Approach

### Tier 0: Benchmark Fixes (1-2 days)

**Goal**: Remove measurement artifacts to see true performance baseline

1. **Fix adapter cache** - Use deep equality or content hash for cache key
2. **Use `cloneInitial: false`** in adapter when data is already cloned
3. **Split benchmarks** into init/op/snapshot categories
4. **Move `structuredClone`** outside timed loop in compare benchmarks

**Expected impact**: 40-60% improvement in measured mutation performance

### Tier 1: Quick Core Fixes (3-5 days)

**Goal**: Remove redundant cloning in core

1. **Fix `clone()` method** - Pass `cloneInitial: false` to constructor

   ```typescript
   clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx> {
       const snapshot = this.getSnapshot();
       return new (this.constructor as any)(snapshot, {
           cloneInitial: false,  // snapshot is already a deep clone
           strict: this._strict,
           context: this._context,
           define: this._defineOptions,
           ...options,
       });
   }
   ```

2. **Use structural sharing in `ensureParentContainers`**
   - Extend `updateAtPointer` to support path creation
   - Only clone nodes along the modified path

**Expected impact**: 2-5x improvement for clone, 3-10x for path creation

### Tier 2: Pointer-First Architecture (2-4 weeks)

**Goal**: Bypass patch building for pointer operations

1. **Create `setAtPointer()` with path creation**

   ```typescript
   export function setAtPointer(data, pointer, value, { createPath }): unknown {
   	// Parse pointer once
   	// Walk tree, cloning along path
   	// Create missing containers if needed
   	// Return new root (structural sharing)
   }
   ```

2. **Integrate into `DataMap.set()`**
   - Detect pointer paths → use fast path
   - JSONPath → use patch-based approach

**Expected impact**: 5-10x faster pointer mutations on large objects

### Tier 3: Snapshot Modes (3-6 weeks)

**Goal**: Allow users to trade safety for performance

1. **Add `snapshotMode` option**
   - `'clone'`: Current behavior (default)
   - `'reference'`: Return `_data` directly (O(1))
   - `'frozen'`: Return `Object.freeze(_data)` (shallow freeze)

**Expected impact**: 2-3x improvement with `'reference'` mode

## Implementation Guidance

### Files to Modify

| File                           | Changes Required                                   |
| ------------------------------ | -------------------------------------------------- |
| `datamap.ts`                   | Fix `clone()`, add `snapshotMode` option           |
| `patch/builder.ts`             | Use structural sharing in `ensureParentContainers` |
| `utils/structural-sharing.ts`  | Add path creation support                          |
| `types.ts`                     | Add `snapshotMode` to `DataMapOptions`             |
| `adapters/data-map.adapter.ts` | Fix cache, use `cloneInitial: false`               |
| `compare/scale.bench.ts`       | Move clone outside timed loop                      |

### Test Files to Validate

- `datamap.spec.ts` - Clone behavior
- `patch/builder.spec.ts` - Path creation
- `adapters/adapter.spec.ts` - Adapter functionality
- All benchmark smoke tests

### Success Criteria

| Metric                    | Current   | After Tier 0+1 | After All Tiers |
| ------------------------- | --------- | -------------- | --------------- |
| Mutation (10k keys)       | 103 ops/s | 400-500 ops/s  | 800-1000 ops/s  |
| Clone (10k keys)          | 203 ops/s | 600-800 ops/s  | 800+ ops/s      |
| Path creation (10 levels) | Slow      | 5-10x faster   | 10-20x faster   |

## Appendix: Key Code Locations

- Constructor ownership: `packages/data-map/core/src/datamap.ts` (lines 105-108)
- Snapshots: `packages/data-map/core/src/datamap.ts` (`getSnapshot`, line 168-170)
- Clone behavior: `packages/data-map/core/src/datamap.ts` (`clone`, lines 1000-1011)
- Patch building: `packages/data-map/core/src/patch/builder.ts` (`ensureParentContainers`, lines 31-39)
- Structural sharing: `packages/data-map/core/src/utils/structural-sharing.ts`
- Patch apply fast path: `packages/data-map/core/src/patch/apply.ts` (lines 31-50)
- Adapter cache: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts` (lines 5-14)
- Scale benchmarks: `packages/data-map/benchmarks/src/compare/scale.bench.ts`
