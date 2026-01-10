# @data-map Performance Audit 2026 Implementation Plan

**Branch:** `fix/data-map-performance-audit-2026`
**Description:** Implement all performance optimizations from the January 2026 @data-map Performance Audit to achieve 100x+ overall speedup

## Goal

Address catastrophic performance degradation (4-14,000x slower than competitors) in @data-map packages by implementing all P0-P2 priority fixes identified in the January 2026 audit. The primary targets are the wideGet catastrophe (14,157x slower), materialization caching (100x slower), and signal tracking overhead (4x slower).

## Current State Summary

| Metric          | Current    | Target    | Best Competitor  |
| --------------- | ---------- | --------- | ---------------- |
| Signal Read     | 5.4M ops/s | 18M ops/s | 22M (Preact)     |
| Signal Write    | 7.1M ops/s | 16M ops/s | 19M (Preact)     |
| Path Get        | 226K ops/s | 5M ops/s  | 10.9M (dot-prop) |
| Path Wide Get   | 332 ops/s  | 2M ops/s  | 4.7M (dot-prop)  |
| Subscriptions   | 2.2M ops/s | 8M ops/s  | 12.7M (EE3)      |
| toObject (100K) | 5.5 ops/s  | 1K ops/s  | N/A              |

## Implementation Steps

---

### Step 1: Establish Baseline Benchmarks and Bottleneck Tests

**Files:**

- `packages/data-map/benchmarks/src/baselines/bottleneck-baselines.bench.ts` (NEW)
- `packages/data-map/benchmarks/src/adapters/signals.ts`
- `packages/data-map/benchmarks/src/adapters/path-access.ts`
- `packages/data-map/benchmarks/src/adapters/subscriptions.ts`
- `packages/data-map/benchmarks/baseline-pre-optimization.json` (NEW)

**What:** Create targeted bottleneck benchmarks that specifically measure the identified issues:

1. `wideGet` with 10K-item stores (Issue 1.1)
2. Repeated `toObject` calls without caching (Issue 1.2)
3. Signal read hot-path overhead (Issue 1.3)
4. Event object creation frequency (Issue 1.4)
5. Signal memory footprint measurement (Issue 1.5)
6. `hasChildren` linear scan (Issue 1.6)

Capture baseline metrics before any optimization work begins.

**Testing:**

- Run `pnpm --filter @data-map/benchmarks bench > baseline-pre-optimization.json`
- Verify bottleneck benchmarks produce measurable, reproducible results
- Document current ops/sec for each identified bottleneck

---

### Step 2: Fix P0-Critical: wideGet Materialization Catastrophe (14,000x Speedup)

**Files:**

- `packages/data-map/path/src/query.ts`
- `packages/data-map/storage/src/flat-store.ts`
- `packages/data-map/storage/src/prefix-index.ts`

**What:** The current `wideGet` implementation calls `getObject(ptr)` repeatedly in a loop, and each `getObject` call iterates ALL 10K store entries. Fix by:

1. **Batch Materialization Strategy**: Materialize the store ONCE at the start of a wide query, then extract values from the materialized object:

   ```typescript
   // BEFORE (current - catastrophic)
   for (const ptr of matchedPointers) {
   	results.push(store.getObject(ptr)); // Each call scans ALL entries
   }

   // AFTER (optimized)
   const materialized = store.toObject(); // Single materialization
   for (const ptr of matchedPointers) {
   	results.push(extractFromObject(materialized, ptr)); // O(1) lookups
   }
   ```

2. **PrefixIndex Enhancement**: Add `hasChildrenAt(prefix)` method for O(1) subtree existence check instead of linear scan.

3. **Query Path Optimization**: Detect when multiple `getObject` calls target the same store and batch them automatically.

**Testing:**

- Run bottleneck benchmark for wideGet
- Verify >10,000x improvement (target: 332 ops/s → >1M ops/s)
- Ensure all existing path query tests pass
- Memory usage should remain stable

---

### Step 3: Fix P0-Critical: toObject Memoization Cache (100x Speedup)

**Files:**

- `packages/data-map/storage/src/materialize.ts`
- `packages/data-map/storage/src/flat-store.ts`
- `packages/data-map/storage/src/version-tracker.ts` (NEW)

**What:** The `toObject()` method has no caching - repeated calls do ALL work from scratch. Implement version-based memoization:

1. **Version Tracking**: Add internal version counter that increments on any store mutation:

   ```typescript
   class FlatStore {
   	private _version = 0;
   	private _cachedObject: object | null = null;
   	private _cachedVersion = -1;

   	set(ptr, value) {
   		this._version++;
   		// ... existing logic
   	}

   	toObject() {
   		if (this._cachedVersion === this._version && this._cachedObject) {
   			return this._cachedObject;
   		}
   		this._cachedObject = this._materialize();
   		this._cachedVersion = this._version;
   		return this._cachedObject;
   	}
   }
   ```

2. **Granular Invalidation**: Track which subtrees changed to enable partial cache updates in future iterations.

3. **WeakMap-based Caching**: Use WeakMap for automatic garbage collection of cached objects.

**Testing:**

- Run benchmark for `toObject` at 100K items
- Verify repeated `toObject` calls are near-instant after first call
- Verify cache invalidates correctly on mutations
- Target: 5.5 ops/s → >500 ops/s (100x improvement)

---

### Step 4: Fix P0-Critical: Inline Signal Dependency Tracking (3x Speedup)

**Files:**

- `packages/data-map/signals/src/signal.ts`
- `packages/data-map/signals/src/tracking.ts`

**What:** The current signal read hot-path has function call overhead from `trackAccess(this)`. Inline the dependency tracking code directly into the getter:

1. **Inline Critical Path**:

   ```typescript
   // BEFORE (current)
   get value() {
     trackAccess(this);
     return this._value;
   }

   // AFTER (optimized)
   get value() {
     // Inlined tracking - avoid function call overhead
     if (currentComputation !== null) {
       currentComputation.dependencies.add(this);
       this.observers.add(currentComputation);
     }
     return this._value;
   }
   ```

2. **Use Direct Property Access**: Avoid getter/setter chains in the hot path.

3. **Conditional Tracking**: Skip tracking entirely when not in a reactive context.

**Testing:**

- Run signal read benchmark
- Verify >2x improvement (target: 5.4M → >10M ops/s)
- Ensure all computed/effect tests still pass
- Verify memory usage doesn't increase

---

### Step 5: Fix P1-High: Event Object Creation Bypass (5x Speedup)

**Files:**

- `packages/data-map/subscriptions/src/notification-event.ts`
- `packages/data-map/subscriptions/src/subscription-manager.ts`
- `packages/data-map/subscriptions/src/notification-batcher.ts`

**What:** Currently creates `NotificationEvent` objects for every emit, including expensive `Date.now()` calls. Implement fast-path for immediate dispatch:

1. **Direct Dispatch Path**: For subscribers that don't need event metadata, bypass event object creation entirely:

   ```typescript
   // Fast path - direct callback invocation
   notify(path: string, value: unknown, opts?: { immediate?: boolean }) {
     if (opts?.immediate || !this.needsEventObject(path)) {
       // Direct dispatch - no event object
       for (const handler of this.getHandlers(path)) {
         handler(value, path);
       }
       return;
     }
     // Slow path - create event object
     const event = new NotificationEvent(path, value);
     // ...
   }
   ```

2. **Lazy Timestamp**: Only compute `Date.now()` when the timestamp is actually accessed.

3. **Object Pooling** (optional): Reuse event objects to avoid GC pressure.

**Testing:**

- Run subscription emit benchmark
- Verify >3x improvement (target: 2.2M → >6M ops/s)
- Ensure notification ordering is preserved
- Verify batcher still works for batched notifications

---

### Step 6: Fix P1-High: Consolidate Signal Pending Queues (4x Memory Reduction)

**Files:**

- `packages/data-map/signals/src/signal.ts`
- `packages/data-map/signals/src/batch.ts`

**What:** Current implementation has 4 separate pending queues (`pendingObserverAdd`, `pendingObserverRemove`, `pendingSubscriberAdd`, `pendingSubscriberRemove`) causing ~160 bytes per signal. Consolidate to reduce memory:

1. **Single Pending Array with Operation Codes**:

   ```typescript
   // BEFORE: 4 separate Sets
   pendingObserverAdd: Set<Observer>;
   pendingObserverRemove: Set<Observer>;
   pendingSubscriberAdd: Set<Subscriber>;
   pendingSubscriberRemove: Set<Subscriber>;

   // AFTER: Single array with tagged entries
   pending: Array<
   	[type: 'obs' | 'sub', op: 'add' | 'rem', target: Observer | Subscriber]
   >;
   ```

2. **Lazy Initialization**: Don't create observers/subscribers Sets until first use:

   ```typescript
   get observers() {
     return this._observers ??= new Set();
   }
   ```

3. **Compact Representation**: Use bit flags instead of separate boolean properties.

**Testing:**

- Create 100K signals and measure memory footprint
- Verify memory per signal drops from ~160 bytes to ~40 bytes
- All signal/computed/effect tests must pass
- No performance regression in signal operations

---

### Step 7: Fix P2-Medium: O(1) Descendant Check with PrefixIndex

**Files:**

- `packages/data-map/storage/src/prefix-index.ts`
- `packages/data-map/storage/src/flat-store.ts`

**What:** The `getObject` method uses linear scan to check for children using `startsWith()`. PrefixIndex already exists but isn't fully utilized for this:

1. **Add hasChildren() Method to PrefixIndex**:

   ```typescript
   class PrefixIndex {
   	hasChildren(prefix: string): boolean {
   		// O(1) check using TrieMap structure
   		const node = this.trie.get(prefix);
   		return node !== undefined && node.hasChildren;
   	}
   }
   ```

2. **Update FlatStore.getObject()**: Use PrefixIndex for O(1) descendant check:

   ```typescript
   getObject(ptr: string): object | undefined {
     // BEFORE: O(n) linear scan
     // for (const key of this.keys()) { if (key.startsWith(ptr)) ... }

     // AFTER: O(1) PrefixIndex lookup
     if (!this.prefixIndex.hasChildren(ptr)) {
       return this.get(ptr);
     }
     // ...build nested object
   }
   ```

**Testing:**

- Run getObject benchmark with deep nested structures
- Verify O(1) complexity for descendant existence check
- All storage tests must pass

---

### Step 8: Create Post-Optimization Validation Suite

**Files:**

- `packages/data-map/benchmarks/src/final-validation.bench.ts` (NEW)
- `packages/data-map/benchmarks/baseline-post-optimization.json` (NEW)
- `docs/audit/data-map-performance-audit-2026-resolution.md` (NEW)

**What:** Create comprehensive validation to verify all optimizations achieved their targets:

1. **Final Validation Benchmark Suite**:
   - Compare all metrics against pre-optimization baseline
   - Compare against competitor benchmarks
   - Memory footprint comparison

2. **Documentation**:
   - Update audit docs with resolution status
   - Document new caching/inlining patterns for maintainers

**Testing:**

- All bottleneck benchmarks meet targets:
  - Signal Read: >10M ops/s (was 5.4M)
  - Path wideGet: >100K ops/s (was 332)
  - toObject (100K): >500 ops/s (was 5.5)
  - Subscriptions: >6M ops/s (was 2.2M)
- Memory per signal: <50 bytes (was ~160)
- No regressions in functional tests

---

### Step 9: JIT Path Compilation

**Files:**

- `packages/data-map/path/src/path-compiler.ts` (NEW)
- `packages/data-map/path/src/compiled-path-cache.ts` (NEW)
- `packages/data-map/path/src/query.ts`

**What:** Implement just-in-time compilation for path expressions to match competitor performance. Paths like `"users.0.name"` are parsed once and compiled to optimized accessor functions:

1. **Path Compiler**:

   ```typescript
   class PathCompiler {
   	private cache = new Map<string, CompiledPath>();

   	compile(path: string): CompiledPath {
   		let compiled = this.cache.get(path);
   		if (!compiled) {
   			const segments = this.parse(path);
   			compiled = this.generateAccessor(segments);
   			this.cache.set(path, compiled);
   		}
   		return compiled;
   	}

   	private generateAccessor(segments: Segment[]): CompiledPath {
   		// Generate optimized function that directly accesses properties
   		// without repeated parsing or string operations
   		return new Function(
   			'obj',
   			`return obj${segments.map((s) => `?.["${s}"]`).join('')}`,
   		) as CompiledPath;
   	}
   }
   ```

2. **Integrate with Query System**: Replace runtime parsing with compiled path lookups.

3. **LRU Eviction**: Limit cache size to prevent memory bloat for dynamic paths.

**Testing:**

- Path get operations approach competitor speeds (target: >5M ops/s)
- Cache hit rate >95% for typical usage patterns
- Memory growth bounded by LRU limit

---

### Step 10: Structural Sharing for Nested Objects

**Files:**

- `packages/data-map/storage/src/persistent-tree.ts` (NEW)
- `packages/data-map/storage/src/structural-sharing.ts` (NEW)
- `packages/data-map/storage/src/flat-store.ts`

**What:** Implement copy-on-write structural sharing for nested object updates. When a deep property changes, only the path to that property is copied—sibling branches are shared:

1. **Persistent Tree Structure**:

   ```typescript
   interface TreeNode<T> {
   	value?: T;
   	children: Map<string, TreeNode<T>>;
   	version: number;
   }

   function updatePath<T>(
   	root: TreeNode<T>,
   	path: string[],
   	value: T,
   ): TreeNode<T> {
   	if (path.length === 0) {
   		return { ...root, value, version: root.version + 1 };
   	}
   	const [head, ...tail] = path;
   	const child = root.children.get(head) ?? {
   		children: new Map(),
   		version: 0,
   	};
   	const newChild = updatePath(child, tail, value);
   	const newChildren = new Map(root.children);
   	newChildren.set(head, newChild);
   	return { ...root, children: newChildren, version: root.version + 1 };
   }
   ```

2. **Efficient Diffing**: Shared structure enables O(1) equality checks for unchanged subtrees.

3. **Integrate with FlatStore**: Option to use persistent tree as backing store for immutable-friendly workloads.

**Testing:**

- Update operations only allocate memory proportional to path depth, not tree size
- Unchanged subtrees share references (verified via `===` checks)
- Materialization leverages structural sharing for incremental updates

---

### Step 11: SIMD-Accelerated Bulk Operations

**Files:**

- `packages/data-map/storage/src/simd-ops.ts` (NEW)
- `packages/data-map/storage/src/typed-array-store.ts` (NEW)
- `packages/data-map/signals/src/batch.ts`

**What:** Use TypedArrays and SIMD-style operations for bulk data processing. This is particularly effective for numeric data and large batch updates:

1. **TypedArray Backing Store** (for numeric signals):

   ```typescript
   class NumericSignalArray {
   	private values: Float64Array;
   	private dirty: Uint8Array;

   	batchUpdate(indices: Uint32Array, newValues: Float64Array): void {
   		// Single loop, cache-friendly memory access
   		for (let i = 0; i < indices.length; i++) {
   			this.values[indices[i]] = newValues[i];
   			this.dirty[indices[i]] = 1;
   		}
   	}

   	getDirtyIndices(): Uint32Array {
   		// Vectorizable scan
   		const dirty: number[] = [];
   		for (let i = 0; i < this.dirty.length; i++) {
   			if (this.dirty[i]) dirty.push(i);
   		}
   		return new Uint32Array(dirty);
   	}
   }
   ```

2. **Batch Notification Optimization**: Process dirty flags in bulk rather than per-signal.

3. **Optional API**: Expose as opt-in for performance-critical numeric workloads.

**Testing:**

- Batch updates of 10K+ numeric values show >10x improvement over individual updates
- Memory layout verified as contiguous (cache-friendly)
- Falls back gracefully when TypedArrays not beneficial

---

### Step 12: Worker-Based Materialization

**Files:**

- `packages/data-map/storage/src/materialization-worker.ts` (NEW)
- `packages/data-map/storage/src/worker-pool.ts` (NEW)
- `packages/data-map/storage/src/flat-store.ts`

**What:** Offload heavy `toObject()` materialization to Web Workers for large stores, preventing main thread blocking:

1. **Materialization Worker**:

   ```typescript
   // materialization-worker.ts
   self.onmessage = (e: MessageEvent<MaterializeRequest>) => {
   	const { entries, options } = e.data;
   	const result = materializeFromEntries(entries, options);
   	self.postMessage({ result });
   };
   ```

2. **Worker Pool Management**:

   ```typescript
   class MaterializationPool {
   	private workers: Worker[] = [];
   	private queue: MaterializeTask[] = [];

   	async materialize(store: FlatStore): Promise<object> {
   		if (store.size < WORKER_THRESHOLD) {
   			return store.toObjectSync(); // Small stores: inline
   		}
   		return this.dispatchToWorker(store.entries());
   	}
   }
   ```

3. **Threshold-Based Dispatch**: Only use workers for stores above size threshold (e.g., 10K entries).

4. **Transferable Objects**: Use `ArrayBuffer` transfer for zero-copy data passing.

**Testing:**

- Main thread remains responsive during large materializations
- Worker overhead is amortized for large stores (>10K entries)
- Graceful fallback when Workers unavailable (SSR, older environments)

---

## Implementation Timeline

| Step | Description               | Effort   | Dependencies |
| ---- | ------------------------- | -------- | ------------ |
| 1    | Baseline Benchmarks       | 0.5 days | None         |
| 2    | wideGet Fix               | 2-3 days | Step 1       |
| 3    | toObject Caching          | 2 days   | Step 1       |
| 4    | Inline Signal Tracking    | 1 day    | Step 1       |
| 5    | Event Object Bypass       | 2-3 days | Step 1       |
| 6    | Consolidate Signal Queues | 2-3 days | Step 4       |
| 7    | O(1) Descendant Check     | 1-2 days | Step 2       |
| 8    | Final Validation          | 1 day    | Steps 2-7    |
| 9    | JIT Path Compilation      | 3-4 days | Step 2       |
| 10   | Structural Sharing        | 4-5 days | Step 3       |
| 11   | SIMD Bulk Operations      | 3-4 days | Step 6       |
| 12   | Worker Materialization    | 2-3 days | Step 3       |

**Total Estimated Effort:** 22-31 days

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                                                |
| -------------------------------- | ---------- | ------ | --------------------------------------------------------- |
| Inlining breaks observer pattern | Low        | Medium | Preserve interface, change implementation only            |
| Cache invalidation bugs          | Medium     | High   | Extensive version-based testing, clear invalidation logic |
| Memory leaks from caching        | Low        | Medium | WeakMap for automatic cleanup, memory profiling           |
| Worker serialization overhead    | Medium     | Medium | Threshold-based dispatch, transferable objects            |
| SIMD browser compatibility       | Medium     | Low    | Feature detection with graceful fallback                  |
| Structural sharing complexity    | Medium     | Medium | Incremental adoption, clear API boundaries                |

---

## Success Criteria

### Quantitative Targets (Phase 1-2: Steps 1-8)

- [ ] Path wideGet: 332 → >100,000 ops/s (300x improvement minimum)
- [ ] Signal read: 5.4M → >10M ops/s (2x improvement)
- [ ] toObject (100K): 5.5 → >500 ops/s (100x improvement)
- [ ] Subscriptions: 2.2M → >6M ops/s (3x improvement)
- [ ] Signal memory: 160 → <50 bytes per signal (3x reduction)

### Quantitative Targets (Phase 3: Steps 9-12)

- [ ] Path get: 226K → >5M ops/s (20x improvement via JIT)
- [ ] Batch updates: 10x improvement for numeric workloads (SIMD)
- [ ] Large materialization: Non-blocking main thread (Workers)
- [ ] Update memory: O(path depth) not O(tree size) (Structural Sharing)

### Quality Gates

- [ ] All existing tests pass
- [ ] Documentation updated with new patterns

---

## Related Documentation

- [Comprehensive Performance Audit 2026](../docs/audit/COMPREHENSIVE_PERFORMANCE_AUDIT_2026.md)
- [Performance Audit Executive Summary](../docs/audit/PERFORMANCE_AUDIT_EXECUTIVE_SUMMARY.md)
- [Earlier Performance Plan](./data-map-performance/plan.md)
- [Data Map Remediation Plan](./data-map-remediation/plan.md)
