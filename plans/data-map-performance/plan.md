# @data-map/\* Performance Optimization Plan

**Branch:** `feature/data-map-performance-optimization`
**Description:** Resolve all 7 performance bottlenecks identified in the performance audit, achieving O(1)/O(log n) algorithmic complexity for all core operations.

## Goal

Address the performance bottlenecks identified in [data-map-performance-audit.md](../../docs/audit/data-map-performance-audit.md) to achieve the performance targets defined in [specs/data-map.md](../../specs/data-map.md) §8.3. This plan focuses on **algorithmic optimizations** that fundamentally improve scalability, complementing the spec compliance work in the remediation plan.

---

## Executive Summary

| Priority | Issue                            | Current               | Target               | Effort |
| -------- | -------------------------------- | --------------------- | -------------------- | ------ |
| 🔴 P0    | PatternIndex O(p) linear scan    | O(p) per notification | O(k) trie traversal  | Medium |
| 🔴 P0    | queryFlat() O(n) fallback        | O(n) materialization  | O(k+m) prefix lookup | Medium |
| 🟠 P1    | Signal notification array copies | O(n) allocation       | O(1) flag-based      | Low    |
| 🟠 P1    | IndirectionLayer O(n) allocation | O(n) set scan         | O(1) free list       | Low    |
| 🟡 P2    | QueryCache O(n) LRU              | O(n) filter           | O(1) linked list     | Low    |
| 🟡 P2    | FlatStore.keys() O(n log n) sort | Always sorts          | Lazy iterator        | Low    |
| 🟡 P3    | PersistentVector naive O(n)      | O(n) array copy       | O(log₃₂ n) tree      | High   |

**Total Estimated Steps:** 9 implementation steps  
**Estimated Total Effort:** ~25-35 engineering hours

---

## Performance Targets (from Spec §8.3)

| Operation                   | Current    | Target      | Required Improvement |
| --------------------------- | ---------- | ----------- | -------------------- |
| Signal read                 | ~10M ops/s | ~15M ops/s  | 1.5x                 |
| Signal write                | ~8M ops/s  | ~12M ops/s  | 1.5x                 |
| Pattern match (1K patterns) | ~1K ops/s  | ~100K ops/s | 100x                 |
| Query (100K items, complex) | ~100 ops/s | ~1M ops/s   | 10,000x              |
| Array push (persistent)     | O(n)       | O(log₃₂ n)  | Algorithmic          |

---

## Implementation Steps

### Step 1: Establish Performance Baselines

**Files:**

- `packages/data-map/benchmarks/src/baseline/bottleneck-baselines.bench.ts`
- `packages/data-map/benchmarks/baseline.json`

**What:**
Create targeted benchmarks that specifically measure each identified bottleneck to establish quantifiable baselines before optimization. These benchmarks will serve as regression tests throughout the optimization work.

**Implementation Details:**

1. Create `bottleneck-baselines.bench.ts` with test cases:

   ```typescript
   // PatternIndex scaling
   describe('PatternIndex Scaling', () => {
     for (const patternCount of [10, 100, 500, 1000]) {
       bench(`match with ${patternCount} patterns`, ...);
     }
   });

   // queryFlat fallback detection
   describe('queryFlat Complexity', () => {
     bench('simple pointer (fast path)', ...);
     bench('complex JSONPath (slow path)', ...);  // Measure regression
   });

   // Signal notification overhead
   describe('Signal Notification', () => {
     for (const observerCount of [10, 100, 500, 1000]) {
       bench(`notify with ${observerCount} observers`, ...);
     }
   });

   // IndirectionLayer allocation
   describe('IndirectionLayer Allocation', () => {
     bench('allocate fresh indices', ...);
     bench('allocate after many frees', ...);
   });
   ```

2. Record baseline values in `baseline.json` for:
   - `pattern_match_10`, `pattern_match_100`, `pattern_match_1000`
   - `query_simple`, `query_complex`
   - `signal_notify_10`, `signal_notify_100`, `signal_notify_1000`
   - `indirection_alloc`, `indirection_alloc_after_free`

**Testing:**

- Run `pnpm --filter @data-map/benchmarks bench bottleneck` successfully
- Verify baseline.json is populated with initial measurements
- Confirm linear scaling is visible in pattern matching benchmarks

---

### Step 2: Implement Flag-Based Signal Notification (P1 Quick Win)

**Files:**

- `packages/data-map/signals/src/signal.ts`
- `packages/data-map/signals/src/signal.spec.ts`

**What:**
Replace `Array.from()` snapshot pattern with flag-based iteration safety to eliminate allocation during notify cycles. This is a low-risk, high-impact optimization.

**Implementation Details:**

1. Add state tracking fields to `SignalImpl`:

   ```typescript
   private isNotifying = false;
   private pendingAdd: Observer[] = [];
   private pendingRemove: Observer[] = [];
   ```

2. Modify `notify()` method:

   ```typescript
   private notify(): void {
     this.isNotifying = true;
     try {
       for (const sub of this.subscribers) {
         sub(this._value);
       }
       for (const obs of this.observers) {
         if (isBatching()) {
           queueObserver(obs);
         } else {
           obs.onDependencyChanged();
         }
       }
     } finally {
       this.isNotifying = false;
       // Apply deferred modifications
       for (const obs of this.pendingAdd) this.observers.add(obs);
       for (const obs of this.pendingRemove) this.observers.delete(obs);
       this.pendingAdd.length = 0;
       this.pendingRemove.length = 0;
     }
   }
   ```

3. Guard subscription changes:

   ```typescript
   registerObserver(obs: Observer): void {
     if (this.isNotifying) {
       this.pendingAdd.push(obs);
     } else {
       this.observers.add(obs);
     }
   }

   unregisterObserver(obs: Observer): void {
     if (this.isNotifying) {
       this.pendingRemove.push(obs);
     } else {
       this.observers.delete(obs);
     }
   }
   ```

4. Add tests for concurrent modification safety:
   - Observer subscribes during notification
   - Observer unsubscribes during notification
   - Verify all observers receive notification exactly once

**Testing:**

- Run existing signal tests to verify no regression
- Run `bottleneck-baselines.bench.ts` and verify `signal_notify_*` improves
- Verify no memory leaks with heap snapshot before/after 10K notifications

---

### Step 3: Implement IndirectionLayer Free List (P1 Quick Win)

**Files:**

- `packages/data-map/arrays/src/indirection-layer.ts`
- `packages/data-map/arrays/src/indirection-layer.spec.ts`

**What:**
Replace O(n) set-based index scanning with O(1) free list and counter-based allocation.

**Implementation Details:**

1. Add free list state to class:

   ```typescript
   export class IndirectionLayer {
   	private freeList: number[] = [];
   	private nextPhysicalCounter = 0;
   	// ... existing state
   }
   ```

2. Replace `nextPhysicalIndex()`:

   ```typescript
   private nextPhysicalIndex(): number {
     if (this.freeList.length > 0) {
       return this.freeList.pop()!;  // O(1) from free list
     }
     return this.nextPhysicalCounter++;  // O(1) increment
   }
   ```

3. Update `deallocate()` to push to free list:

   ```typescript
   deallocate(logicalIndex: number): void {
     const physicalIndex = this.state.logicalToPhysical[logicalIndex];
     if (physicalIndex !== undefined) {
       this.freeList.push(physicalIndex);
       // ... existing cleanup
     }
   }
   ```

4. Add tests:
   - Allocation returns sequential indices initially
   - After deallocation, freed indices are reused
   - Performance test: 10K allocations in < 10ms

**Testing:**

- Run existing IndirectionLayer tests
- Run `bottleneck-baselines.bench.ts` and verify `indirection_alloc_*` improves
- Verify memory efficiency with 100K alloc/dealloc cycles

---

### Step 4: Implement Lazy FlatStore.keys() Iterator (P2 Quick Win)

**Files:**

- `packages/data-map/storage/src/flat-store.ts`
- `packages/data-map/storage/src/flat-store.spec.ts`

**What:**
Replace eager array creation and sorting with lazy iterator, providing `sortedKeys()` only when caller needs ordering.

**Implementation Details:**

1. Update `keys()` to return iterator:

   ```typescript
   *keys(prefix?: Pointer): IterableIterator<Pointer> {
     const base = prefix ?? '';
     const basePrefix = base === '' ? '' : `${base}/`;
     for (const key of this.data.keys()) {
       if (base === '') {
         yield key;
       } else if (key === base || key.startsWith(basePrefix)) {
         yield key;
       }
     }
   }
   ```

2. Add `sortedKeys()` for ordered access:

   ```typescript
   sortedKeys(prefix?: Pointer): Pointer[] {
     return Array.from(this.keys(prefix)).sort();
   }
   ```

3. Update callers that depend on sorted order:
   - Search for usages of `.keys()` in path and subscriptions packages
   - Replace with `sortedKeys()` only where order matters (likely none)

4. Add tests:
   - `keys()` returns all keys without specific order
   - `sortedKeys()` returns keys in sorted order
   - `keys()` with prefix filters correctly

**Testing:**

- Run existing FlatStore tests
- Verify `keys()` iteration starts immediately (no eager array creation)
- Benchmark: `keys()` on 100K-key store should have O(1) startup

---

### Step 5: Implement O(1) LRU QueryCache (P2 Quick Win)

**Files:**

- `packages/data-map/path/src/cache.ts`
- `packages/data-map/path/src/cache.spec.ts`

**What:**
Replace O(n) filter-based LRU with proper doubly-linked list implementation for O(1) get/set/evict operations. Reuse pattern from `@jsonpath/filter-eval`.

**Implementation Details:**

1. Define linked list entry type:

   ```typescript
   interface LRUEntry<V> {
   	key: string;
   	value: V;
   	prev: LRUEntry<V> | null;
   	next: LRUEntry<V> | null;
   }
   ```

2. Implement `LRUCache` class:

   ```typescript
   export class LRUCache<V> {
   	private readonly capacity: number;
   	private readonly map = new Map<string, LRUEntry<V>>();
   	private head: LRUEntry<V> | null = null;
   	private tail: LRUEntry<V> | null = null;

   	get(key: string): V | undefined {
   		const entry = this.map.get(key);
   		if (!entry) return undefined;
   		this.moveToFront(entry);
   		return entry.value;
   	}

   	set(key: string, value: V): void {
   		let entry = this.map.get(key);
   		if (entry) {
   			entry.value = value;
   			this.moveToFront(entry);
   			return;
   		}
   		entry = { key, value, prev: null, next: null };
   		this.map.set(key, entry);
   		this.addToFront(entry);
   		if (this.map.size > this.capacity) {
   			this.evictTail();
   		}
   	}

   	private moveToFront(entry: LRUEntry<V>): void {
   		/* O(1) unlink + link */
   	}
   	private addToFront(entry: LRUEntry<V>): void {
   		/* O(1) insert */
   	}
   	private evictTail(): void {
   		/* O(1) remove + delete */
   	}
   }
   ```

3. Replace existing `QueryCache` implementation with `LRUCache`

4. Add tests:
   - Cache hit moves entry to front
   - Cache miss returns undefined
   - Eviction removes least recently used
   - Capacity enforcement

**Testing:**

- Run existing cache tests
- Benchmark: 100K get/set operations should be O(n) total, not O(n²)
- Verify cache ordering with trace logging

---

### Step 6: Implement PatternTrie for O(k) Pattern Matching (P0 Critical)

**Files:**

- `packages/data-map/subscriptions/src/pattern-trie.ts` (new)
- `packages/data-map/subscriptions/src/pattern-index.ts`
- `packages/data-map/subscriptions/src/pattern-trie.spec.ts` (new)
- `packages/data-map/subscriptions/src/pattern-index.spec.ts`

**What:**
Replace linear pattern scanning with a trie-based pattern matcher that supports wildcards (`*`) and recursive descent (`**`). This is the most critical optimization for subscription scalability.

**Implementation Details:**

1. Define trie node structure:

   ```typescript
   interface TrieNode<T> {
   	children: Map<string, TrieNode<T>>;
   	wildcardChild: TrieNode<T> | null; // Matches single segment (*)
   	recursiveChild: TrieNode<T> | null; // Matches zero+ segments (**)
   	values: Set<T>;
   }
   ```

2. Implement `PatternTrie` class:

   ```typescript
   export class PatternTrie<T> {
   	private root: TrieNode<T>;

   	add(pattern: string, value: T): void {
   		const segments = parsePatternSegments(pattern);
   		let node = this.root;
   		for (const seg of segments) {
   			if (seg === '*') {
   				node.wildcardChild ??= createNode();
   				node = node.wildcardChild;
   			} else if (seg === '**') {
   				node.recursiveChild ??= createNode();
   				node = node.recursiveChild;
   			} else {
   				if (!node.children.has(seg)) {
   					node.children.set(seg, createNode());
   				}
   				node = node.children.get(seg)!;
   			}
   		}
   		node.values.add(value);
   	}

   	match(pointer: string): Set<T> {
   		const segments = pointer.split('/').filter(Boolean);
   		return this.matchRecursive(this.root, segments, 0, new Set());
   	}

   	private matchRecursive(
   		node: TrieNode<T>,
   		segments: string[],
   		index: number,
   		results: Set<T>,
   	): Set<T> {
   		// Base case: consumed all segments
   		if (index === segments.length) {
   			for (const v of node.values) results.add(v);
   			// Also check recursive wildcard at end
   			if (node.recursiveChild) {
   				for (const v of node.recursiveChild.values) results.add(v);
   			}
   			return results;
   		}

   		const seg = segments[index];

   		// Exact match
   		const exact = node.children.get(seg);
   		if (exact) {
   			this.matchRecursive(exact, segments, index + 1, results);
   		}

   		// Single wildcard (*)
   		if (node.wildcardChild) {
   			this.matchRecursive(node.wildcardChild, segments, index + 1, results);
   		}

   		// Recursive wildcard (**) - try matching 0, 1, 2, ... segments
   		if (node.recursiveChild) {
   			for (let i = index; i <= segments.length; i++) {
   				this.matchRecursive(node.recursiveChild, segments, i, results);
   			}
   		}

   		return results;
   	}

   	remove(pattern: string, value: T): boolean {
   		/* ... */
   	}
   }
   ```

3. Integrate into `PatternIndex`:

   ```typescript
   export class PatternIndex {
   	private trie = new PatternTrie<Subscription>();

   	add(pattern: string, sub: Subscription): symbol {
   		const id = Symbol();
   		this.trie.add(pattern, sub);
   		this.idToPattern.set(id, pattern);
   		return id;
   	}

   	match(pointer: Pointer): Subscription[] {
   		return Array.from(this.trie.match(pointer));
   	}
   }
   ```

4. Add comprehensive tests:
   - Exact pattern match: `/users/0/name`
   - Single wildcard: `/users/*/name` matches `/users/0/name`, `/users/1/name`
   - Recursive wildcard: `/users/**/email` matches `/users/0/email`, `/users/0/profile/email`
   - Multiple patterns registered, only matching ones returned
   - Pattern removal

**Testing:**

- Run existing subscription tests
- Run `bottleneck-baselines.bench.ts` and verify `pattern_match_*` improves 100x
- Benchmark: 1000 patterns, notify 10K times should complete in < 1 second

---

### Step 7: Implement PrefixIndex for Efficient Subtree Queries (P0 Critical)

**Files:**

- `packages/data-map/path/src/prefix-index.ts` (new)
- `packages/data-map/path/src/query.ts`
- `packages/data-map/path/src/prefix-index.spec.ts` (new)
- `packages/data-map/path/src/query.spec.ts`

**What:**
Add a prefix index to enable O(k + m) subtree queries without O(n) full materialization. This makes simple pattern queries (wildcard on arrays, property wildcards) efficient.

**Implementation Details:**

1. Create `PrefixIndex` using mnemonist TrieMap:

   ```typescript
   import TrieMap from 'mnemonist/trie-map.js';

   export class PrefixIndex {
   	private trie = new TrieMap<string, Set<string>>();

   	add(pointer: string): void {
   		const segments = pointer.split('/');
   		for (let i = 1; i <= segments.length; i++) {
   			const prefix = segments.slice(0, i).join('/');
   			let set = this.trie.get(prefix);
   			if (!set) {
   				set = new Set();
   				this.trie.set(prefix, set);
   			}
   			set.add(pointer);
   		}
   	}

   	remove(pointer: string): void {
   		const segments = pointer.split('/');
   		for (let i = 1; i <= segments.length; i++) {
   			const prefix = segments.slice(0, i).join('/');
   			const set = this.trie.get(prefix);
   			if (set) {
   				set.delete(pointer);
   				if (set.size === 0) {
   					this.trie.delete(prefix);
   				}
   			}
   		}
   	}

   	getByPrefix(prefix: string): string[] {
   		const set = this.trie.get(prefix);
   		return set ? Array.from(set) : [];
   	}

   	getByPrefixPattern(pattern: string): string[] {
   		// Support wildcard matching: /users/*/name
   		// Returns all pointers matching the pattern
   	}
   }
   ```

2. Integrate into `FlatStore`:

   ```typescript
   export class FlatStore {
   	private prefixIndex = new PrefixIndex();

   	set(pointer: Pointer, value: unknown): void {
   		this.data.set(pointer, value);
   		this.prefixIndex.add(pointer);
   	}

   	delete(pointer: Pointer): boolean {
   		const existed = this.data.delete(pointer);
   		if (existed) {
   			this.prefixIndex.remove(pointer);
   		}
   		return existed;
   	}
   }
   ```

3. Optimize `queryFlat()` to use prefix index:

   ```typescript
   export function queryFlat(
   	store: FlatStoreQueryable,
   	path: string,
   ): QueryResult {
   	const tokens = parseSimpleJsonPath(path);
   	if (tokens) {
   		// Use existing fast path for simple pointers
   		// ...
   	}

   	// NEW: Handle simple wildcards via prefix index
   	const wildcardMatch = parseWildcardPath(path);
   	if (wildcardMatch && store.hasPrefixIndex()) {
   		const pointers = store.getPointersMatchingPattern(wildcardMatch.pattern);
   		const values = pointers.map((p) => store.get(p));
   		return { values, pointers };
   	}

   	// Fallback to full materialization (for truly complex queries)
   	const root = store.getObject('') as Record<string, unknown>;
   	const res = runQuery(root, path);
   	return {
   		values: res.values(),
   		pointers: res.pointers().map((p) => p.toString()),
   	};
   }
   ```

4. Add tests:
   - PrefixIndex correctly indexes all prefixes
   - `getByPrefix` returns correct subset
   - Integration with FlatStore maintains index consistency
   - Wildcard queries use index instead of materialization

**Testing:**

- Run existing path tests
- Run `bottleneck-baselines.bench.ts` and verify `query_complex` improves
- Benchmark: Wildcard query on 100K-key store should be O(m), not O(n)

---

### Step 8: Implement Tree-Based PersistentVector (P3 Optional)

**Files:**

- `packages/data-map/arrays/src/persistent-vector.ts`
- `packages/data-map/arrays/src/persistent-vector.spec.ts`

**What:**
Replace naive O(n) array copy with Clojure-style persistent vector using 32-way branching for O(log₃₂ n) ≈ O(1) operations.

**Implementation Details:**

1. Define tree node structure:

   ```typescript
   const BITS = 5;
   const WIDTH = 1 << BITS; // 32
   const MASK = WIDTH - 1;

   type Node<T> = T[] | Node<T>[];
   ```

2. Implement tree-based `PersistentVector`:

   ```typescript
   export class PersistentVector<T> {
   	private constructor(
   		private readonly root: Node<T>,
   		private readonly tail: T[],
   		private readonly size: number,
   		private readonly shift: number, // Height * BITS
   	) {}

   	static empty<T>(): PersistentVector<T> {
   		return new PersistentVector([], [], 0, BITS);
   	}

   	get(index: number): T | undefined {
   		if (index < 0 || index >= this.size) return undefined;
   		if (index >= this.tailOffset()) {
   			return this.tail[index & MASK];
   		}
   		return this.getFromTree(this.root, this.shift, index);
   	}

   	private getFromTree(node: Node<T>, shift: number, index: number): T {
   		while (shift > 0) {
   			node = (node as Node<T>[])[(index >>> shift) & MASK];
   			shift -= BITS;
   		}
   		return (node as T[])[index & MASK];
   	}

   	push(value: T): PersistentVector<T> {
   		if (this.tail.length < WIDTH) {
   			// Fast path: room in tail
   			return new PersistentVector(
   				this.root,
   				[...this.tail, value],
   				this.size + 1,
   				this.shift,
   			);
   		}
   		// Push tail to tree, create new tail
   		return this.pushTailToTree(value);
   	}

   	set(index: number, value: T): PersistentVector<T> {
   		if (index < 0 || index >= this.size) {
   			throw new RangeError(`Index ${index} out of bounds`);
   		}
   		if (index >= this.tailOffset()) {
   			// Fast path: modify tail
   			const newTail = [...this.tail];
   			newTail[index & MASK] = value;
   			return new PersistentVector(this.root, newTail, this.size, this.shift);
   		}
   		// Path copy through tree
   		return new PersistentVector(
   			this.setInTree(this.root, this.shift, index, value),
   			this.tail,
   			this.size,
   			this.shift,
   		);
   	}

   	private setInTree(
   		node: Node<T>,
   		shift: number,
   		index: number,
   		value: T,
   	): Node<T> {
   		const newNode = [...node] as Node<T>;
   		if (shift === 0) {
   			(newNode as T[])[index & MASK] = value;
   		} else {
   			const subIdx = (index >>> shift) & MASK;
   			(newNode as Node<T>[])[subIdx] = this.setInTree(
   				(node as Node<T>[])[subIdx],
   				shift - BITS,
   				index,
   				value,
   			);
   		}
   		return newNode;
   	}

   	private tailOffset(): number {
   		return this.size < WIDTH ? 0 : ((this.size - 1) >>> BITS) << BITS;
   	}
   }
   ```

3. Implement remaining methods:
   - `pop()`: Remove last element
   - `slice()`: Create subvector (structural sharing)
   - `concat()`: Merge vectors
   - `toArray()`: Materialize to array
   - Implement `Iterable<T>` interface

4. Add comprehensive tests:
   - Push 100K items, verify O(log n) complexity via timing
   - Random access at various indices
   - Set at various indices
   - Structural sharing: modifying copy doesn't affect original
   - Memory efficiency: 100K pushes shouldn't cause GC pauses

**Testing:**

- Run existing PersistentVector tests
- Benchmark: Compare naive vs tree-based for 10K, 100K operations
- Memory profile: Verify structural sharing reduces allocation

---

### Step 9: Final Validation and Documentation

**Files:**

- `packages/data-map/benchmarks/src/final-validation.bench.ts`
- `packages/data-map/benchmarks/PERFORMANCE.md`
- `docs/audit/data-map-performance-audit.md` (update status)

**What:**
Run comprehensive benchmark suite against established baselines to verify all performance targets are met. Document results and close audit findings.

**Implementation Details:**

1. Create final validation benchmark:

   ```typescript
   describe('Performance Target Validation', () => {
     bench('signal read (target: 15M ops/s)', ...);
     bench('signal write (target: 12M ops/s)', ...);
     bench('pattern match 1K (target: 100K ops/s)', ...);
     bench('query complex (target: 1M ops/s)', ...);
     bench('persistent push (target: O(log n))', ...);
   });
   ```

2. Create `PERFORMANCE.md` documentation:
   - Benchmark methodology
   - Current performance numbers
   - Comparison with competing libraries
   - Performance tuning guidance

3. Update audit document with resolution status:

   ```markdown
   ### 3.1 Critical: queryFlat() O(n) Fallback

   **Status**: ✅ RESOLVED (Step 7)
   **Solution**: PrefixIndex with wildcard pattern support
   **Result**: 10,000x improvement for wildcard queries
   ```

**Testing:**

- All benchmarks meet or exceed targets
- No regression from baseline
- Documentation is complete and accurate

---

## Dependency Graph

```
Step 1 (Baselines) ─────────────────────────────────────────────────────┐
       │                                                                 │
       ├──> Step 2 (Signal Flags) ──────────────────────────────────────┤
       │                                                                 │
       ├──> Step 3 (IndirectionLayer Free List) ────────────────────────┤
       │                                                                 │
       ├──> Step 4 (Lazy keys()) ───────────────────────────────────────┤
       │                                                                 │
       ├──> Step 5 (LRU Cache) ─────────────────────────────────────────┤
       │                                                                 │
       ├──> Step 6 (PatternTrie) ───────────────────────────────────────┤
       │                                                                 │
       └──> Step 7 (PrefixIndex) ───────────────────────────────────────┤
                                                                         │
                              Step 8 (PersistentVector) ────────────────┤
                                                                         │
                                          Step 9 (Validation) ◀─────────┘
```

**Notes:**

- Steps 2-7 can be parallelized after Step 1
- Step 8 is optional and can be deferred if time-constrained
- Step 9 depends on all other steps

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                                                 |
| -------------------------------- | ---------- | ------ | ---------------------------------------------------------- |
| PatternTrie complexity with `**` | Medium     | High   | Limit recursion depth; add tests for pathological patterns |
| PrefixIndex memory overhead      | Low        | Medium | Lazy indexing; make index optional                         |
| Breaking changes to public API   | Low        | High   | Maintain backward compatibility; deprecate, don't remove   |
| Tree-based vector complexity     | Medium     | Low    | Step 8 is optional; naive version works correctly          |

---

## Success Criteria

1. **PatternIndex**: 1000 patterns, notify 10K times in < 100ms (was ~10 seconds)
2. **queryFlat**: Wildcard query on 100K keys in < 10ms (was ~1 second)
3. **Signal notification**: 1000 observers notified in < 1ms (was ~5ms)
4. **IndirectionLayer**: 100K allocations in < 100ms (was ~1 second)
5. **All benchmarks**: Meet or exceed spec §8.3 targets
6. **Zero regressions**: All existing tests pass
7. **Documentation**: Performance guide and audit resolution complete

---

## References

- [Performance Audit](../../docs/audit/data-map-performance-audit.md)
- [Implementation Audit](../../docs/audit/data-map-implementation-audit.md)
- [Data Map Specification](../../specs/data-map.md)
- [Remediation Plan](../data-map-remediation/plan.md)
- [Clojure Persistent Vector](https://hypirion.com/musings/understanding-persistent-vector-pt-1)
- [Preact Signals Source](https://github.com/preactjs/signals)
