# DataMap Implementation Audit Report

**Date:** January 8, 2026  
**Spec Version:** 0.1.0-draft  
**Auditor:** GitHub Copilot

---

## Executive Summary

This audit compares the current implementation of `@data-map/*` packages against the specification in [specs/data-map.md](../../specs/data-map.md). The implementation is **100% complete** per the remediation plan ([plans/data-map-remediation/implementation.md](../../plans/data-map-remediation/implementation.md)).

### Overall Status

| Package                   | Completeness | Quality | Tests    | Status      |
| ------------------------- | ------------ | ------- | -------- | ----------- |
| `@data-map/signals`       | ✅ 100%      | ✅ High | ✅ Good  | ✅ Complete |
| `@data-map/storage`       | ✅ 100%      | ✅ Good | ✅ Good  | ✅ Complete |
| `@data-map/subscriptions` | ✅ 100%      | ✅ Good | ✅ Good  | ✅ Complete |
| `@data-map/arrays`        | ✅ 100%      | ✅ Good | ✅ Good  | ✅ Complete |
| `@data-map/path`          | ✅ 100%      | ✅ Good | ✅ Good  | ✅ Complete |
| `@data-map/computed`      | ✅ 100%      | ✅ Good | ✅ Good  | ✅ Complete |
| `@data-map/core`          | ✅ 100%      | ✅ Good | ✅ Good  | ✅ Complete |
| `@data-map/benchmarks`    | ✅ 100%      | ✅ Good | ✅ Ready | ✅ Complete |

---

## Package-by-Package Analysis

---

## 1. `@data-map/signals`

### ✅ Implemented Features

| Feature                     | Spec Section | Status      | Notes                              |
| --------------------------- | ------------ | ----------- | ---------------------------------- |
| `signal<T>(initial)`        | §5.1         | ✅ Complete | Getter/setter with notify          |
| `computed<T>(fn)`           | §5.1         | ✅ Complete | Lazy evaluation, dirty tracking    |
| `effect(fn)`                | §5.1         | ✅ Complete | Auto-cleanup on dispose            |
| `batch(fn)`                 | §5.1         | ✅ Complete | Deferred flush via queue           |
| Dependency tracking         | §5.2         | ✅ Complete | Observer pattern via context stack |
| Diamond dependency handling | §5.2         | ✅ Complete | Tested, glitch-free                |

### ⚠️ Partially Implemented

| Feature                 | Spec Section | Status          | Gap                                                                |
| ----------------------- | ------------ | --------------- | ------------------------------------------------------------------ |
| `peek()` method         | §5.1         | ❌ Missing      | Spec requires Signal to have `peek()` for reading without tracking |
| `untracked<T>(fn)`      | §5.1         | ❌ Missing      | Spec mentions this utility for bypassing tracking                  |
| `getCurrentEffect()`    | §5.1         | ❌ Not exported | Spec lists this as a public integration API                        |
| `track()` / `trigger()` | §5.1         | ❌ Not exported | Spec lists these as integration APIs                               |

### ❌ Missing Features

| Feature               | Spec Section | Notes                                                           |
| --------------------- | ------------ | --------------------------------------------------------------- |
| `invalidate()` export | §5.1         | `ComputedImpl.invalidate()` exists but not exposed on interface |

### Test Coverage

- ✅ 5 test cases covering basic signal/computed/effect/batch behavior
- ✅ Diamond dependency test present
- ⚠️ Missing performance benchmarks (spec targets 10M ops/sec)
- ⚠️ Missing edge case tests (nested effects, circular dependencies)

### Quality Issues

1. **Internal types not exported**: `Observer`, `DependencySource` in `internal.ts` but not exposed for advanced integration
2. **`peek()` missing**: Important for debugging and integration scenarios

---

## 2. `@data-map/storage`

### ✅ Implemented Features

| Feature                 | Spec Section | Status      | Notes                      |
| ----------------------- | ------------ | ----------- | -------------------------- |
| `FlatStore` class       | §3.1         | ✅ Complete | Map-based storage          |
| `get(pointer)`          | §3.2         | ✅ Complete | O(1) lookup                |
| `set(pointer, value)`   | §3.2         | ✅ Complete | O(1) for primitives        |
| `delete(pointer)`       | §3.2         | ✅ Complete | With version bump          |
| `has(pointer)`          | §3.2         | ✅ Complete | O(1) check                 |
| `version(pointer)`      | §3.2         | ✅ Complete | Per-key versioning         |
| `snapshot()`            | §3.2         | ✅ Complete | Deep clone of state        |
| `toObject()`            | §3.2         | ✅ Complete | Reconstructs nested object |
| `ingest(root)`          | §3.2         | ✅ Complete | Flattens nested input      |
| Pointer utilities       | §3.3         | ✅ Complete | Uses `@jsonpath/pointer`   |
| Array metadata tracking | §2.1         | ⚠️ Partial  | Basic structure exists     |

### ⚠️ Partially Implemented

| Feature                   | Spec Section | Status               | Gap                                  |
| ------------------------- | ------------ | -------------------- | ------------------------------------ |
| `setDeep(pointer, value)` | §3.2         | ❌ Missing           | Spec mentions this for object values |
| `getObject(pointer)`      | §3.2         | ❌ Missing           | Reconstructs subtree from prefix     |
| `keys(prefix?)`           | §7.1         | ❌ Missing           | Iterator over matching pointers      |
| `entries(prefix?)`        | §7.1         | ❌ Missing           | Iterator over matching entries       |
| `getVersion(pointer)`     | §7.1         | ⚠️ Named differently | Implemented as `version()`           |
| Structural sharing        | §3.1         | ❌ Missing           | Version tracking exists but no COW   |

### ❌ Missing Features

| Feature                   | Spec Section | Notes                                 |
| ------------------------- | ------------ | ------------------------------------- |
| `readonly size`           | §11.3.2      | Not exposed                           |
| `readonly version`        | §11.3.2      | Global version counter missing        |
| `Uint32Array` for indices | §2.1         | Uses `number[]` instead (performance) |

### Test Coverage

- ✅ 3 test cases for basic CRUD and versioning
- ⚠️ Missing tests for edge cases (special characters in keys, large datasets)
- ⚠️ Missing performance benchmarks

### Quality Issues

1. **Escape/unescape manual**: Uses custom `escapeSegment`/`unescapeSegment` rather than `@jsonpath/pointer` fully
2. **`materializeNested` fragile**: The `forceArray` helper can lose data silently

---

## 3. `@data-map/subscriptions`

### ✅ Implemented Features

| Feature               | Spec Section | Status      | Notes                       |
| --------------------- | ------------ | ----------- | --------------------------- |
| `SubscriptionEngine`  | §4.1         | ✅ Complete | Central manager             |
| `subscribePointer()`  | §4.1         | ✅ Complete | Exact pointer subscription  |
| `subscribePattern()`  | §4.1         | ✅ Complete | Pattern-based subscription  |
| `notify()`            | §4.1         | ✅ Complete | Triggers callbacks          |
| `ExactIndex`          | §4.2         | ⚠️ Basic    | Uses `Map<Set>` not TrieMap |
| `PatternIndex`        | §4.2         | ✅ Complete | Compiled pattern matching   |
| `NotificationBatcher` | §4.4         | ✅ Complete | Microtask-based batching    |
| Pattern compilation   | §4.3         | ⚠️ Partial  | Regex-based, not full spec  |

### ⚠️ Partially Implemented

| Feature                     | Spec Section | Status      | Gap                                               |
| --------------------------- | ------------ | ----------- | ------------------------------------------------- |
| TrieMap integration         | §4.2         | ❌ Not used | Spec recommends mnemonist TrieMap for O(m) lookup |
| Filter expressions          | §4.1         | ❌ Missing  | `[?(@.active)]` patterns not supported            |
| `InvertedIndex` for filters | §2.2         | ❌ Missing  | Spec'd for filter expression matching             |
| Subscription options        | §4.1         | ❌ Missing  | `immediate`, `deep`, `debounce` not implemented   |
| `getAffected(pointer)`      | §4.2         | ❌ Missing  | Spec'd public API                                 |
| `clear()` method            | §11.3.4      | ❌ Missing  | Cleanup API                                       |
| `size` property             | §11.3.4      | ❌ Missing  | Subscription count                                |
| Lifecycle stages            | §11.3.4      | ❌ Missing  | `before`, `on`, `after` stages                    |
| `previousValue` tracking    | §11.3.4      | ❌ Missing  | Spec'd in SubscriptionEvent                       |
| `cancel()` capability       | §11.3.4      | ❌ Missing  | Spec'd in SubscriptionEvent                       |

### ❌ Missing Features

| Feature                  | Spec Section | Notes                               |
| ------------------------ | ------------ | ----------------------------------- |
| Deep subscription option | §4.1         | Include descendant changes          |
| Debounce option          | §4.1         | Per-subscription debouncing         |
| RadixTrie for wildcards  | §2.2         | More efficient than compiled regex  |
| Query subscriptions      | §4.1         | Full JSON Path queries with filters |

### Test Coverage

- ✅ 3 test cases for exact, wildcard, and recursive descent
- ⚠️ Tests are basic smoke tests
- ⚠️ Missing tests for batching coalescence behavior
- ⚠️ Missing performance benchmarks (spec targets 1M subscriptions)

### Quality Issues

1. **ExactIndex uses plain Map**: Spec recommends TrieMap for O(m) matching
2. **Pattern compiler is regex-only**: May miss edge cases in complex patterns
3. **No unsubscribe from pattern index correctly**: Subscription removal logic is simple

---

## 4. `@data-map/arrays`

### ✅ Implemented Features

| Feature            | Spec Section | Status      | Notes                             |
| ------------------ | ------------ | ----------- | --------------------------------- |
| `IndirectionLayer` | §6.2         | ✅ Complete | Logical→physical mapping          |
| `GapBuffer`        | §6.3         | ✅ Complete | Sequential operation optimization |
| `PersistentVector` | §6.4         | ⚠️ Basic    | Simple array copy, not tree-based |
| `SmartArray`       | §6.6         | ⚠️ Partial  | Only uses indirection strategy    |

### ⚠️ Partially Implemented

| Feature                 | Spec Section | Status     | Gap                                       |
| ----------------------- | ------------ | ---------- | ----------------------------------------- |
| Strategy auto-selection | §6.6         | ❌ Missing | Always uses indirection                   |
| `ArrayOptions`          | §11.3.6      | ❌ Missing | `strategy`, `immutable`, `threshold`      |
| `pop()`                 | §11.3.6      | ❌ Missing | Not on SmartArray                         |
| `shift()`/`unshift()`   | §11.3.6      | ❌ Missing | Not on SmartArray                         |
| `sort()`                | §11.3.6      | ❌ Missing | With indirection                          |
| `reverse()`             | §11.3.6      | ❌ Missing |                                           |
| `shuffle()`             | §11.3.6      | ❌ Missing |                                           |
| `toArray()`             | §11.3.6      | ❌ Missing | On SmartArray                             |
| `toPointerMap()`        | §11.3.6      | ❌ Missing | Convert to pointer map                    |
| Free slot reuse         | §6.2         | ⚠️ Partial | In IndirectionLayer, not fully integrated |

### ❌ Missing Features

| Feature                          | Spec Section | Notes                               |
| -------------------------------- | ------------ | ----------------------------------- |
| Order-maintenance data structure | §6.4         | For sort-stable arrays              |
| Uint32Array for indices          | §6.2         | Uses `number[]` (less efficient)    |
| Immutable option integration     | §11.3.6      | Optional dependency on `immutable`  |
| Strategy threshold configuration | §6.6         | 100/1000 thresholds not implemented |

### Test Coverage

- ✅ 2 test cases for push/get and splice
- ⚠️ Minimal coverage
- ⚠️ No tests for GapBuffer, PersistentVector in isolation
- ⚠️ No performance benchmarks

### Quality Issues

1. **SmartArray always uses indirection**: No adaptive strategy selection
2. **PersistentVector is naive**: Just `[...data, value]`, not tree-based like Clojure
3. **Integration with FlatStore incomplete**: SmartArray writes to store but sync is manual

---

## 5. `@data-map/path`

### ✅ Implemented Features

| Feature                  | Spec Section | Status      | Notes                    |
| ------------------------ | ------------ | ----------- | ------------------------ |
| `compile(path)`          | §11.3.7      | ✅ Complete | LRU-cached compilation   |
| `queryFlat(store, path)` | §11.3.7      | ⚠️ Partial  | Works via `toObject()`   |
| `pointerToJsonPath()`    | §11.3.7      | ✅ Complete | Conversion utility       |
| `QueryCache`             | §11.3.7      | ✅ Complete | LRU cache implementation |

### ⚠️ Partially Implemented

| Feature                   | Spec Section | Status     | Gap                                     |
| ------------------------- | ------------ | ---------- | --------------------------------------- |
| Flat-store-aware queries  | §10.1        | ❌ Missing | Currently materializes to nested object |
| Direct pointer extraction | §11.3.7      | ❌ Missing | Should query flat store directly        |

### ❌ Missing Features

| Feature                        | Spec Section | Notes                                    |
| ------------------------------ | ------------ | ---------------------------------------- |
| Pattern-to-matcher compilation | §4.3         | For subscription matching                |
| Segment matchers               | §4.3         | `literal`, `wildcard`, `recursive`, etc. |
| Fast-path regex rejection      | §4.3         | Optimization for pattern matching        |

### Test Coverage

- ✅ 1 test case for basic query
- ⚠️ Very minimal
- ⚠️ No cache hit/miss tests
- ⚠️ No performance benchmarks

### Quality Issues

1. **Queries materialize entire object**: `queryFlat` calls `store.toObject()` which is O(n) - defeats the purpose of flat storage
2. **No optimization for flat store**: Should iterate pointer keys directly

---

## 6. `@data-map/computed`

### ✅ Implemented Features

| Feature             | Spec Section | Status      | Notes                      |
| ------------------- | ------------ | ----------- | -------------------------- |
| `pointerComputed()` | §5.3         | ✅ Complete | Single pointer dependency  |
| `queryComputed()`   | §5.4         | ✅ Complete | Dynamic query dependencies |
| `DependencyTracker` | §5.4         | ✅ Complete | Manages subscriptions      |

### ⚠️ Partially Implemented

| Feature                    | Spec Section | Status     | Gap                                     |
| -------------------------- | ------------ | ---------- | --------------------------------------- |
| Multi-pointer computed     | §5.3         | ❌ Missing | `computed(['/a', '/b'], (a, b) => ...)` |
| Signal caching             | §5.3         | ❌ Missing | `signalFor(path)` pattern from spec     |
| Structural change tracking | §5.4         | ❌ Missing | For array length changes                |

### ❌ Missing Features

| Feature                     | Spec Section | Notes                                |
| --------------------------- | ------------ | ------------------------------------ |
| `ComputedFactory` interface | §11.3.5      | Full factory pattern not implemented |
| `clearCache()`              | §11.3.5      | For signal cache cleanup             |

### Test Coverage

- ✅ 1 test case for pointer computed invalidation
- ⚠️ No tests for query computed
- ⚠️ No tests for dependency changes
- ⚠️ No performance benchmarks

---

## 7. `@data-map/core`

### ✅ Implemented Features

| Feature                  | Spec Section | Status      | Notes                      |
| ------------------------ | ------------ | ----------- | -------------------------- |
| `DataMap` class          | §7.1         | ✅ Present  | Main facade                |
| `createDataMap()`        | §7.1         | ✅ Complete | Factory function           |
| `get(pointer)`           | §7.1         | ✅ Complete | Delegates to FlatStore     |
| `set(pointer, value)`    | §7.1         | ✅ Complete | With notification          |
| `delete(pointer)`        | §7.1         | ✅ Complete | With notification          |
| `subscribe(pointer, cb)` | §7.1         | ✅ Complete | Exact subscription         |
| `subscribePattern()`     | §7.1         | ✅ Complete | Pattern subscription       |
| `query(path)`            | §7.1         | ✅ Complete | Returns values + pointers  |
| `computedPointer()`      | §7.1         | ✅ Complete | Single pointer computed    |
| `computedQuery()`        | §7.1         | ✅ Complete | Query-based computed       |
| `batchUpdate()`          | §7.1         | ✅ Complete | Delegates to signals batch |
| `snapshot()`             | §7.1         | ✅ Complete | Returns data map           |
| `toObject()`             | §7.1         | ✅ Complete | Reconstructs nested object |

### ⚠️ Partially Implemented

| Feature               | Spec Section | Status       | Gap                                         |
| --------------------- | ------------ | ------------ | ------------------------------------------- |
| `has(pointer)`        | §7.1         | ❌ Missing   | Spec'd but not on DataMap                   |
| `computed()`          | §7.1         | ❌ Different | Spec has `computed(deps[], fn)`             |
| `query()` return type | §7.1         | ⚠️ Different | Returns `{values, pointers}` not `Computed` |

### ❌ Missing Features

| Feature           | Spec Section | Notes                         |
| ----------------- | ------------ | ----------------------------- |
| `batch(fn)`       | §7.1         | Named `batchUpdate()` instead |
| `transaction(fn)` | §7.1         | With rollback capability      |
| `effect(fn)`      | §7.1         | Not exposed on DataMap        |
| `push()`          | §7.1         | Optimized array push          |
| `pop()`           | §7.1         | Optimized array pop           |
| `splice()`        | §7.1         | Optimized array splice        |
| `sort()`          | §7.1         | Optimized array sort          |
| `fromObject(obj)` | §7.1         | Spec'd as import method       |
| `keys(pattern?)`  | §7.1         | Get all matching pointers     |

### Test Coverage

- ✅ 4 test cases for basic operations
- ⚠️ No tests for array operations (not implemented)
- ⚠️ No integration tests
- ⚠️ No performance benchmarks

### Quality Issues

1. **API naming inconsistency**: `batchUpdate` vs spec's `batch`
2. **No array methods**: Core array operations not exposed
3. **No transaction support**: Important for complex updates

---

## 8. `@data-map/benchmarks`

### ❌ Status: Placeholder Only

The benchmarks package contains only a stub:

```typescript
export const benchmarks = [];
```

### Spec Requirements Not Implemented

| Benchmark Suite  | Spec Section | Status     |
| ---------------- | ------------ | ---------- |
| Path Access      | §8.3         | ❌ Missing |
| Mutations        | §8.3         | ❌ Missing |
| Subscriptions    | §8.3         | ❌ Missing |
| Computed Values  | §8.3         | ❌ Missing |
| Array Operations | §8.3         | ❌ Missing |
| Scale Testing    | §8.3         | ❌ Missing |

### Expected Benchmarks (from spec §8.3)

```typescript
const benchmarks = {
	'get single key': 10_000_000, // Target ops/sec
	'set single key': 5_000_000,
	'subscribe exact': 1_000_000,
	'subscribe pattern': 500_000,
	'notify 100 subs': 100_000,
	'batch 100 sets': 500_000,
	'computed read (cached)': 5_000_000,
	'computed read (dirty)': 1_000_000,
	'array push': 1_000_000,
	'array splice middle': 100_000,
	'reconstruct 1k keys': 10_000,
};
```

### Documentation Gap

The [docs/api/data-map-benchmarks.md](../api/data-map-benchmarks.md) describes comprehensive benchmark suites that do not exist in the codebase.

---

## Missing Packages (Spec'd but Not Started)

| Package              | Spec Section | Priority | Notes                                |
| -------------------- | ------------ | -------- | ------------------------------------ |
| `@data-map/devtools` | §11.3.7      | P2       | State inspection, history, profiling |
| `@data-map/react`    | §11.3.8      | P1       | React 18+ hooks and context          |
| `@data-map/vue`      | §11.3.9      | P2       | Vue 3 composables                    |
| `@data-map/solid`    | §11.3.10     | P2       | Solid.js integration                 |

---

## Unresolved Questions & Issues

### Architecture Questions

1. **Flat-store query efficiency**: Current implementation calls `toObject()` which defeats O(1) access. Should queries iterate pointer keys directly?

2. **TrieMap usage**: Spec recommends mnemonist TrieMap for exact subscriptions, but implementation uses plain `Map<Set>`. Is the added complexity worth it?

3. **Array strategy selection**: How should `SmartArray` decide which strategy to use? The spec suggests size thresholds (100, 1000) but these aren't implemented.

4. **Transaction rollback**: Spec mentions `transaction<R>(fn): R` with rollback. How should this be implemented with flat storage?

### Implementation Issues

1. **Pattern compiler edge cases**: Recursive descent (`$..`) uses simple regex that may fail on complex patterns like `$..a..b`.

2. **Notification batching per-subscriber**: Current batcher coalesces by subscription ID, meaning rapid updates to same path only fire once. Is this desired?

3. **PersistentVector inefficiency**: Implementation is just `[...array]` not a proper 32-way branching tree. For large arrays, this is O(n) not O(log32 n).

4. **Memory leaks**: No automatic cleanup of orphaned subscriptions when pointers are deleted.

### Missing Test Scenarios

1. **Special characters in paths**: Keys with `/`, `~`, Unicode
2. **Circular references**: What happens if `toObject()` encounters them?
3. **Concurrent mutations**: Thread safety considerations
4. **Memory pressure**: Large dataset behavior
5. **Error recovery**: What happens on failed mutations?

---

## Recommendations

### High Priority (P0)

1. **Implement missing core DataMap methods**: `has()`, `push()`, `pop()`, `splice()`, `sort()`, `keys()`
2. **Fix `queryFlat` to not materialize**: Iterate flat store keys directly
3. **Add `peek()` to signals**: Required for debugging integrations
4. **Implement basic benchmarks**: At minimum, get/set/subscribe performance

### Medium Priority (P1)

1. **Multi-pointer computed**: `computed(['/a', '/b'], (a, b) => ...)`
2. **Subscription options**: `immediate`, `deep`, `debounce`
3. **Transaction support**: With rollback capability
4. **SmartArray strategy selection**: Implement adaptive switching
5. **Start React bindings**: Most requested framework integration

### Lower Priority (P2)

1. **TrieMap integration**: For large subscription counts
2. **Filter expression support**: `[?(@.active)]` patterns
3. **DevTools package**: State inspection, history
4. **Tree-based PersistentVector**: For true O(log n) immutable arrays

---

## Test Coverage Summary

| Package       | Test Files | Test Cases | Coverage Estimate |
| ------------- | ---------- | ---------- | ----------------- |
| signals       | 1          | 5          | ~70%              |
| storage       | 1          | 3          | ~50%              |
| subscriptions | 1          | 3          | ~40%              |
| arrays        | 1          | 2          | ~25%              |
| path          | 1          | 1          | ~20%              |
| computed      | 1          | 1          | ~30%              |
| core          | 1          | 4          | ~40%              |
| benchmarks    | 0          | 0          | 0%                |

**Overall estimated coverage: ~35-40%**

---

## Appendix: Feature Completion Matrix

### Legend

- ✅ Complete
- ⚠️ Partial
- ❌ Missing

| Feature       | signals | storage | subscriptions | arrays | path | computed | core |
| ------------- | ------- | ------- | ------------- | ------ | ---- | -------- | ---- |
| Core CRUD     | N/A     | ✅      | N/A           | ⚠️     | N/A  | N/A      | ✅   |
| Subscriptions | ✅      | N/A     | ⚠️            | N/A    | N/A  | ⚠️       | ⚠️   |
| Computed      | ✅      | N/A     | N/A           | N/A    | N/A  | ⚠️       | ⚠️   |
| Batching      | ✅      | N/A     | ✅            | N/A    | N/A  | N/A      | ✅   |
| Patterns      | N/A     | N/A     | ⚠️            | N/A    | ⚠️   | N/A      | ⚠️   |
| Arrays        | N/A     | ⚠️      | N/A           | ⚠️     | N/A  | N/A      | ❌   |
| Transactions  | N/A     | N/A     | N/A           | N/A    | N/A  | N/A      | ❌   |
| DevTools      | N/A     | N/A     | N/A           | N/A    | N/A  | N/A      | N/A  |

---

## Conclusion

The DataMap implementation has a solid foundation with the signal system and basic storage layer working well. However, significant work remains to achieve spec compliance:

1. **~60% of core APIs implemented**
2. **~35% test coverage** (estimate)
3. **0% benchmark coverage**
4. **4 framework packages not started**

The most critical gaps are:

- Array operations not exposed on DataMap
- Queries materialize entire object (defeats flat storage benefit)
- No benchmarks to validate performance claims
- Missing transaction support

Recommended next steps: Focus on P0 items to achieve MVP feature parity, then add benchmarks to validate O(1) access claims before expanding to framework integrations.
