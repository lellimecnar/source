# DataMap Full Remediation Plan

**Branch:** `feature/data-map-complete-remediation`
**Description:** Complete implementation of all @data-map/\* packages to 100% spec compliance, starting with comprehensive benchmark infrastructure.

## Goal

Bring the `@data-map/*` package suite from ~60-65% to 100% spec compliance as defined in [specs/data-map.md](../../specs/data-map.md). This remediation addresses all gaps identified in the [implementation audit](../../docs/audit/data-map-implementation-audit.md), prioritizing benchmark infrastructure first to establish performance baselines and enable regression testing throughout the implementation.

---

## Executive Summary

| Package                   | Current | Target | Priority |
| ------------------------- | ------- | ------ | -------- |
| `@data-map/benchmarks`    | 5%      | 100%   | P0       |
| `@data-map/signals`       | 90%     | 100%   | P0       |
| `@data-map/storage`       | 70%     | 100%   | P0       |
| `@data-map/subscriptions` | 65%     | 100%   | P1       |
| `@data-map/path`          | 50%     | 100%   | P1       |
| `@data-map/arrays`        | 55%     | 100%   | P1       |
| `@data-map/computed`      | 60%     | 100%   | P1       |
| `@data-map/core`          | 55%     | 100%   | P2       |

**Total Estimated Steps:** 12 implementation steps  
**Estimated Total Effort:** ~40-60 engineering hours

---

## Implementation Steps

### Step 1: Benchmark Infrastructure Foundation

**Files:**

- `packages/data-map/benchmarks/package.json`
- `packages/data-map/benchmarks/vitest.config.ts`
- `packages/data-map/benchmarks/vitest.config.browser.ts`
- `packages/data-map/benchmarks/src/fixtures/`
- `packages/data-map/benchmarks/src/utils/`
- `packages/data-map/benchmarks/baseline.json`

**What:**
Set up the benchmark infrastructure following the `@jsonpath/benchmarks` pattern. Add vitest bench configuration, create fixture data generators (1K, 10K, 100K key datasets), and establish baseline.json for regression tracking.

**Implementation Details:**

1. Update `package.json`:
   - Add vitest as devDependency
   - Add `@vitest/browser` for browser benchmarks
   - Add scripts: `bench`, `bench:browser`, `bench:compare`, `bench:full`
   - Add all `@data-map/*` workspace dependencies
2. Create `vitest.config.ts` with bench configuration
3. Create `vitest.config.browser.ts` for browser benchmarks
4. Create fixture generators:
   - `fixtures/generate.ts`: Factory functions for test data
   - `fixtures/small.ts`: 1K keys
   - `fixtures/medium.ts`: 10K keys
   - `fixtures/large.ts`: 100K keys
5. Create benchmark utilities:
   - `utils/measure.ts`: Memory measurement helpers
   - `utils/compare.ts`: Baseline comparison utilities
6. Initialize `baseline.json` structure

**Testing:**

- Run `pnpm --filter @data-map/benchmarks bench` successfully
- Verify fixture generation produces expected key counts
- Confirm baseline.json is created and readable

---

### Step 2: Core Operation Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/storage.bench.ts`
- `packages/data-map/benchmarks/src/signals.bench.ts`
- `packages/data-map/benchmarks/src/subscriptions.bench.ts`

**What:**
Create benchmark suites for all core operations per spec §8.3 targets:

- get/set/delete/has (target: 5-10M ops/sec)
- Signal read/write (target: 10M ops/sec)
- Computed read cached/dirty (target: 5M/1M ops/sec)
- Subscribe exact/pattern (target: 1M/500K ops/sec)
- Notify with 100 subscribers (target: 100K ops/sec)
- Batch operations (target: 500K ops/sec)

**Implementation Details:**

1. `storage.bench.ts`:
   ```typescript
   describe('FlatStore Operations', () => {
   	bench('get single key', () => {
   		store.get('/users/0/name');
   	});
   	bench('set single key', () => {
   		store.set('/users/0/name', 'test');
   	});
   	bench('delete single key', () => {
   		store.delete('/temp');
   		store.set('/temp', 1);
   	});
   	bench('has single key', () => {
   		store.has('/users/0/name');
   	});
   	bench('reconstruct 1k keys', () => {
   		store.toObject();
   	});
   });
   ```
2. `signals.bench.ts`:
   ```typescript
   describe('Signal Primitives', () => {
   	bench('signal read', () => {
   		sig.value;
   	});
   	bench('signal write', () => {
   		sig.value = i++;
   	});
   	bench('computed read (cached)', () => {
   		comp.value;
   	});
   	bench('computed read (dirty)', () => {
   		sig.value = i++;
   		comp.value;
   	});
   	bench('effect execution', () => {
   		effectTrigger.value++;
   	});
   });
   ```
3. `subscriptions.bench.ts`:
   ```typescript
   describe('Subscription Engine', () => {
     bench('subscribe exact', () => { engine.subscribePointer('/users/0/name', cb); });
     bench('subscribe pattern', () => { engine.subscribePattern('$.users[*].name', cb); });
     bench('notify 100 subs', () => { engine.notify('/users/0/name', 'value'); });
     bench('batch 100 sets', () => { batch(() => { for (let i = 0; i < 100; i++) store.set(...); }); });
   });
   ```

**Testing:**

- All benchmarks run without errors
- Results are recorded and comparable across runs
- Performance numbers are logged for baseline establishment

---

### Step 3: Array and Scale Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/arrays.bench.ts`
- `packages/data-map/benchmarks/src/scale.bench.ts`
- `packages/data-map/benchmarks/src/memory.bench.ts`

**What:**
Add array operation benchmarks and scale testing per spec §8.3:

- Array push/pop/splice (target: 1M/100K ops/sec)
- Sort with indirection
- Scale tests with 10K, 100K, 1M keys
- Memory profiling benchmarks

**Implementation Details:**

1. `arrays.bench.ts`:
   ```typescript
   describe('Array Operations', () => {
   	bench('push', () => {
   		smartArray.push({ name: 'test' });
   	});
   	bench('pop', () => {
   		smartArray.pop();
   		smartArray.push({});
   	});
   	bench('splice middle', () => {
   		smartArray.splice(len / 2, 1);
   		smartArray.push({});
   	});
   	bench('sort', () => {
   		smartArray.sort((a, b) => a.score - b.score);
   	});
   });
   ```
2. `scale.bench.ts`:
   - Tests with 10K, 100K keys
   - Subscription matching at scale
   - Pattern compilation caching
3. `memory.bench.ts`:
   - Memory usage per 1K keys
   - Structural sharing efficiency
   - Subscription memory overhead

**Testing:**

- Benchmarks run successfully with large datasets
- Memory measurements are captured
- No OOM errors with 100K+ keys

---

### Step 4: Signals Package Completion

**Files:**

- `packages/data-map/signals/src/signal.ts`
- `packages/data-map/signals/src/computed.ts`
- `packages/data-map/signals/src/index.ts`
- `packages/data-map/signals/src/internal.ts`
- `packages/data-map/signals/src/__tests__/signals.spec.ts`

**What:**
Complete the signals package to 100% spec compliance (currently 90%):

- Add `peek()` method to Signal (§5.1)
- Add `untracked<T>(fn)` utility (§5.1)
- Export `getCurrentEffect()` (§5.1)
- Export `track()` and `trigger()` integration APIs (§5.1)
- Export `invalidate()` on Computed interface (§5.1)
- Add comprehensive edge case tests

**Implementation Details:**

1. Add `peek()` to SignalImpl:
   ```typescript
   peek(): T {
     return this._value; // Read without tracking
   }
   ```
2. Add `untracked()`:
   ```typescript
   export function untracked<T>(fn: () => T): T {
   	const prev = currentEffect;
   	currentEffect = null;
   	try {
   		return fn();
   	} finally {
   		currentEffect = prev;
   	}
   }
   ```
3. Export from index.ts:
   ```typescript
   export { getCurrentEffect, track, trigger } from './internal.js';
   ```
4. Add tests for:
   - `peek()` doesn't create dependencies
   - `untracked()` prevents tracking
   - Nested effects behavior
   - Circular dependency detection

**Testing:**

- Run `pnpm --filter @data-map/signals test`
- All new tests pass
- Re-run benchmarks to ensure no regression

---

### Step 5: Storage Package Completion

**Files:**

- `packages/data-map/storage/src/flat-store.ts`
- `packages/data-map/storage/src/types.ts`
- `packages/data-map/storage/src/index.ts`
- `packages/data-map/storage/src/__tests__/flat-store.spec.ts`

**What:**
Complete the storage package to 100% spec compliance (currently 70%):

- Add `readonly size` property (§11.3.2)
- Add `readonly version` global counter (§11.3.2)
- Add `setDeep(pointer, value)` for object values (§3.2)
- Add `getObject(pointer)` to reconstruct subtree (§3.2)
- Add `keys(prefix?)` iterator (§7.1)
- Add `entries(prefix?)` iterator (§7.1)
- Rename `version()` to `getVersion()` for consistency (§7.1)
- Add Uint32Array option for array indices (§2.1)

**Implementation Details:**

1. Add properties:
   ```typescript
   get size(): number { return this.data.size; }
   get version(): number { return this._globalVersion; }
   ```
2. Add `setDeep()`:
   ```typescript
   setDeep(pointer: Pointer, value: object): void {
     const flat = flattenObject(value, pointer);
     for (const [k, v] of flat) {
       this.data.set(k, v);
       bumpVersion(this.versions, k);
     }
   }
   ```
3. Add `getObject()`:
   ```typescript
   getObject(pointer: Pointer): unknown {
     const prefix = pointer === '' ? '' : pointer + '/';
     const result: Record<string, unknown> = {};
     for (const [key, value] of this.data) {
       if (key === pointer || key.startsWith(prefix)) {
         setByPointer(result, key.slice(pointer.length || 0), value);
       }
     }
     return result;
   }
   ```
4. Add iterators:
   ```typescript
   *keys(prefix?: string): IterableIterator<string> {
     for (const key of this.data.keys()) {
       if (!prefix || key.startsWith(prefix)) yield key;
     }
   }
   ```

**Testing:**

- All new methods have unit tests
- Edge cases: empty prefix, root pointer, special characters
- Re-run benchmarks to verify O(1) characteristics maintained

---

### Step 6: Path Package Critical Fix

**Files:**

- `packages/data-map/path/src/query-flat.ts`
- `packages/data-map/path/src/pointer-iterator.ts`
- `packages/data-map/path/src/__tests__/query-flat.spec.ts`

**What:**
**CRITICAL FIX**: The `queryFlat()` function currently defeats flat storage O(1) by calling `store.toObject()` which is O(n). Must query flat store directly using pointer iteration.

**Implementation Details:**

1. Replace current `queryFlat` implementation:

   ```typescript
   // BEFORE (broken - O(n))
   export function queryFlat(store: FlatStore, path: string) {
   	const obj = store.toObject(); // O(n) - defeats purpose!
   	return query(obj, path);
   }

   // AFTER (correct - O(k) where k = matching keys)
   export function queryFlat(store: FlatStore, path: string) {
   	const compiled = compile(path);
   	const results: unknown[] = [];
   	const pointers: string[] = [];

   	// For simple paths, extract pointer pattern and iterate keys
   	if (isPointerPath(path)) {
   		const pattern = pathToPointerPattern(path);
   		for (const key of store.keys()) {
   			if (matchesPattern(key, pattern)) {
   				results.push(store.get(key));
   				pointers.push(key);
   			}
   		}
   	} else {
   		// Complex paths with filters still need object reconstruction
   		// but only for the relevant subtree
   		const rootPointer = extractRootPointer(path);
   		const subtree = store.getObject(rootPointer);
   		const matches = evaluate(compiled, subtree);
   		// ... convert matches back to pointers
   	}

   	return { values: results, pointers };
   }
   ```

2. Add `pointer-iterator.ts` for pattern-based key matching
3. Add LRU cache for compiled patterns (already exists, verify usage)

**Testing:**

- Performance test showing O(k) instead of O(n)
- Benchmark comparison before/after
- All existing query tests still pass

---

### Step 7: Subscriptions Package Enhancement

**Files:**

- `packages/data-map/subscriptions/src/subscription-engine.ts`
- `packages/data-map/subscriptions/src/exact-index.ts`
- `packages/data-map/subscriptions/src/types.ts`
- `packages/data-map/subscriptions/src/__tests__/subscriptions.spec.ts`

**What:**
Enhance subscriptions package (currently 65%) with missing spec features:

- Add subscription options: `immediate`, `deep`, `debounce` (§4.1)
- Add `getAffected(pointer)` public API (§4.2)
- Add `clear()` cleanup method (§11.3.4)
- Add `size` property (§11.3.4)
- Add lifecycle stages: `before`, `on`, `after` (§11.3.4)
- Add `previousValue` tracking (§11.3.4)
- Add `cancel()` capability (§11.3.4)

**Implementation Details:**

1. Update `SubscriptionOptions` type:
   ```typescript
   export interface SubscriptionOptions {
   	immediate?: boolean;
   	deep?: boolean;
   	debounce?: number;
   	stages?: ('before' | 'on' | 'after')[];
   }
   ```
2. Update `SubscriptionEvent`:
   ```typescript
   export interface SubscriptionEvent {
   	pointer: string;
   	value: unknown;
   	previousValue?: unknown;
   	stage: 'before' | 'on' | 'after';
   	cancel: () => void;
   }
   ```
3. Add to SubscriptionEngine:
   ```typescript
   getAffected(pointer: string): Set<Subscription> { ... }
   clear(): void { this.exactSubs.clear(); this.patternSubs.clear(); }
   get size(): number { return this.exactSubs.size + this.patternSubs.size; }
   ```
4. Implement debounce using `setTimeout` with per-subscription timers
5. Implement `deep` by subscribing to prefix patterns
6. Implement `immediate` by calling callback on subscribe

**Testing:**

- Test each option in isolation
- Test option combinations
- Test lifecycle stage ordering
- Test cancel functionality

---

### Step 8: Install mnemonist and TrieMap Integration

**Files:**

- `packages/data-map/subscriptions/package.json`
- `packages/data-map/subscriptions/src/exact-index.ts`
- `packages/data-map/subscriptions/src/trie-index.ts`

**What:**
Replace plain `Map<Set>` with mnemonist's TrieMap for O(m) subscription matching as recommended in spec §4.2.

**Implementation Details:**

1. Add mnemonist dependency:
   ```json
   "dependencies": {
     "mnemonist": "^0.39.0"
   }
   ```
2. Create `trie-index.ts`:

   ```typescript
   import { TrieMap } from 'mnemonist/trie-map';

   export class TrieSubscriptionIndex {
   	private trie = new TrieMap<Set<Subscription>>();

   	add(pointer: string, sub: Subscription): void {
   		const segments = parsePointer(pointer);
   		let subs = this.trie.get(segments);
   		if (!subs) {
   			subs = new Set();
   			this.trie.set(segments, subs);
   		}
   		subs.add(sub);
   	}

   	get(pointer: string): Set<Subscription> | undefined {
   		return this.trie.get(parsePointer(pointer));
   	}

   	// Efficient prefix matching for deep subscriptions
   	*prefixMatches(pointer: string): IterableIterator<Set<Subscription>> {
   		// Use TrieMap prefix iteration
   	}
   }
   ```

3. Update `exact-index.ts` to use TrieSubscriptionIndex

**Testing:**

- Benchmark comparison Map vs TrieMap
- Verify O(m) lookup where m = pointer segments
- Test with 1M subscriptions scale

---

### Step 9: Arrays Package Completion

**Files:**

- `packages/data-map/arrays/src/smart-array.ts`
- `packages/data-map/arrays/src/strategies/direct.ts`
- `packages/data-map/arrays/src/strategies/gap-buffer.ts`
- `packages/data-map/arrays/src/strategies/persistent.ts`
- `packages/data-map/arrays/src/__tests__/arrays.spec.ts`

**What:**
Complete arrays package (currently 55%) with all spec'd operations:

- Implement strategy auto-selection based on size thresholds (§6.6)
- Add `pop()`, `shift()`, `unshift()` methods (§11.3.6)
- Add `sort()`, `reverse()`, `shuffle()` methods (§11.3.6)
- Add `toArray()` and `toPointerMap()` conversions (§11.3.6)
- Implement proper GapBuffer strategy (§6.3)
- Implement PersistentVector with tree structure (§6.4, optional immutable dep)
- Use Uint32Array for indices (§6.2)

**Implementation Details:**

1. Update SmartArray strategy selection:
   ```typescript
   constructor(initial: T[], options?: ArrayOptions) {
     const len = initial.length;
     if (options?.strategy) {
       this.strategy = options.strategy;
     } else if (len < 100) {
       this.strategy = 'direct';
     } else if (options?.immutable) {
       this.strategy = 'persistent';
     } else {
       this.strategy = 'indirection';
     }
   }
   ```
2. Add missing methods to OptimizedArray interface
3. Implement GapBuffer properly with gap management
4. Add Uint32Array support for IndirectionLayer

**Testing:**

- Test strategy auto-selection at thresholds
- Test all array operations
- Benchmark array operations with each strategy

---

### Step 10: Computed Package Completion

**Files:**

- `packages/data-map/computed/src/factory.ts`
- `packages/data-map/computed/src/multi-pointer.ts`
- `packages/data-map/computed/src/signal-cache.ts`
- `packages/data-map/computed/src/__tests__/computed.spec.ts`

**What:**
Complete computed package (currently 60%) with missing features:

- Add multi-pointer computed: `computed(['/a', '/b'], (a, b) => ...)` (§5.3)
- Implement `signalFor(path)` caching pattern (§5.3)
- Add `ComputedFactory` interface (§11.3.5)
- Add `clearCache()` for signal cache cleanup (§11.3.5)
- Add structural change tracking for arrays (§5.4)

**Implementation Details:**

1. Add multi-pointer computed:
   ```typescript
   export function multiPointerComputed<T>(
   	host: DataMapComputeHost,
   	pointers: string[],
   	compute: (...values: unknown[]) => T,
   ): Computed<T> {
   	const signals = pointers.map((p) => host.signalFor(p));
   	return computed(() => {
   		const values = signals.map((s) => s.value);
   		return compute(...values);
   	});
   }
   ```
2. Implement signal cache with WeakMap or LRU:

   ```typescript
   class SignalCache {
   	private cache = new Map<string, Signal<unknown>>();

   	signalFor(
   		pointer: string,
   		factory: () => Signal<unknown>,
   	): Signal<unknown> {
   		if (!this.cache.has(pointer)) {
   			this.cache.set(pointer, factory());
   		}
   		return this.cache.get(pointer)!;
   	}

   	clearCache(): void {
   		this.cache.clear();
   	}
   }
   ```

3. Add structural tracking for array length changes

**Testing:**

- Test multi-pointer computed reactivity
- Test cache hit/miss behavior
- Test structural change detection

---

### Step 11: Core Package API Completion

**Files:**

- `packages/data-map/core/src/data-map.ts`
- `packages/data-map/core/src/types.ts`
- `packages/data-map/core/src/transaction.ts`
- `packages/data-map/core/src/__tests__/data-map.spec.ts`

**What:**
Complete core package (currently 55%) with all spec'd facade APIs:

- Add `has(pointer)` method (§7.1)
- Add `batch(fn)` with proper coordination (§7.1)
- Add `transaction<R>(fn): R` with rollback (§7.1)
- Add array methods: `push()`, `pop()`, `splice()`, `sort()` (§7.1)
- Add `keys(pattern?)` method (§7.1)
- Add `fromObject(obj)` method (§7.1)
- Add `computed()` for multi-pointer (§7.1)
- Add unified `subscribe()` that auto-detects exact vs pattern (§7.1)

**Implementation Details:**

1. Add missing methods to DataMap class:

   ```typescript
   has(pointer: Pointer): boolean {
     return this.store.has(pointer);
   }

   batch(fn: () => void): void {
     this.subs.batch(() => {
       signalBatch(fn);
     });
   }

   transaction<R>(fn: () => R): R {
     const snapshot = this.store.snapshot();
     try {
       return fn();
     } catch (e) {
       this.restore(snapshot);
       throw e;
     }
   }

   push(arrayPointer: Pointer, ...values: unknown[]): number {
     const arr = this.store.getArrayMeta(arrayPointer);
     // ... delegate to SmartArray
   }
   ```

2. Implement unified subscribe:
   ```typescript
   subscribe(pathOrPointer: string, cb: SubscribeCallback, options?: SubscribeOptions): Unsubscribe {
     if (isExactPointer(pathOrPointer)) {
       return this.subs.subscribePointer(pathOrPointer, cb, options);
     } else {
       return this.subs.subscribePattern(pathOrPointer, cb, options);
     }
   }
   ```

**Testing:**

- Integration tests for all new methods
- Transaction rollback test
- Array operation tests via core facade

---

### Step 12: Final Validation and Documentation

**Files:**

- `packages/data-map/benchmarks/baseline.json` (updated)
- `docs/audit/data-map-implementation-audit.md` (updated)
- `docs/api/data-map.md` (new)
- `packages/data-map/*/README.md` (updated)

**What:**
Final validation pass and documentation updates:

1. Run full benchmark suite and capture baseline
2. Run all tests across all packages
3. Update audit report to show 100% completion
4. Generate API documentation
5. Update package READMEs with usage examples

**Implementation Details:**

1. Run benchmarks and save baseline:
   ```bash
   pnpm --filter @data-map/benchmarks bench:full
   ```
2. Run all tests:
   ```bash
   pnpm --filter "@data-map/*" test
   ```
3. Update audit report with final status table
4. Create `docs/api/data-map.md` with full API reference
5. Verify all performance targets from spec §8.3 are met

**Testing:**

- All tests pass
- All benchmarks meet spec targets
- No TypeScript errors
- Lint passes
- Documentation builds

---

## Performance Targets (Spec §8.3)

| Operation              | Target (ops/sec) | Validation Method        |
| ---------------------- | ---------------- | ------------------------ |
| get single key         | 10,000,000       | `storage.bench.ts`       |
| set single key         | 5,000,000        | `storage.bench.ts`       |
| subscribe exact        | 1,000,000        | `subscriptions.bench.ts` |
| subscribe pattern      | 500,000          | `subscriptions.bench.ts` |
| notify 100 subs        | 100,000          | `subscriptions.bench.ts` |
| batch 100 sets         | 500,000          | `subscriptions.bench.ts` |
| computed read (cached) | 5,000,000        | `signals.bench.ts`       |
| computed read (dirty)  | 1,000,000        | `signals.bench.ts`       |
| array push             | 1,000,000        | `arrays.bench.ts`        |
| array splice middle    | 100,000          | `arrays.bench.ts`        |
| reconstruct 1k keys    | 10,000           | `storage.bench.ts`       |

---

## Dependencies to Add

| Package           | Version   | Target Package            | Purpose                  |
| ----------------- | --------- | ------------------------- | ------------------------ |
| `mnemonist`       | `^0.39.0` | `@data-map/subscriptions` | TrieMap for O(m) lookups |
| `vitest`          | `^4.0.16` | `@data-map/benchmarks`    | Benchmark runner         |
| `@vitest/browser` | `^4.0.16` | `@data-map/benchmarks`    | Browser benchmarks       |
| `playwright`      | `^1.48.2` | `@data-map/benchmarks`    | Browser automation       |

---

## Risk Assessment

| Risk                          | Likelihood | Impact | Mitigation                                         |
| ----------------------------- | ---------- | ------ | -------------------------------------------------- |
| Breaking existing API         | Medium     | High   | Keep all existing methods, add new ones            |
| Performance regression        | Low        | High   | Benchmark-first approach catches regressions early |
| TrieMap integration issues    | Low        | Medium | mnemonist is battle-tested, has good types         |
| Path query optimization scope | Medium     | Medium | Start with simple patterns, complex paths fallback |

---

## Success Criteria

1. ✅ All 8 packages at 100% spec compliance
2. ✅ All performance targets from spec §8.3 met or exceeded
3. ✅ Comprehensive benchmark suite with baseline.json
4. ✅ All existing tests pass
5. ✅ No TypeScript errors
6. ✅ Updated documentation and audit report
7. ✅ Zero breaking changes to existing public API
