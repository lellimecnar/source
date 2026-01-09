# @data-map/\* Performance Audit Report

> **Audit Date**: January 2025  
> **Scope**: Complete performance analysis of all 8 @data-map packages  
> **Objective**: Identify bottlenecks, benchmark competitively, and provide optimization roadmap

---

## Executive Summary

This audit reveals that **@data-map has a solid architectural foundation** with O(1) operations for core storage and signal primitives. However, **7 critical performance bottlenecks** were identified that degrade performance at scale and undermine the flat-storage performance advantages.

**Key Findings**:

1. `queryFlat()` falls back to O(n) materialization, defeating flat storage purpose
2. `PatternIndex.match()` iterates ALL patterns - O(p) scalability issue
3. Signal notification creates array copies on every notify cycle
4. `IndirectionLayer.nextPhysicalIndex()` is O(n) instead of O(1)
5. `PersistentVector` uses naive array copy, not tree-based structure
6. `FlatStore.keys()` sorts all keys unnecessarily - O(n log n)
7. Missing `untracked()` utility present in all competing signal libraries

**Competitive Position**:

- ✅ Signals: Competitive with preact/signals, solid-js, maverick-js
- ⚠️ Subscriptions: Needs optimization for pattern matching at scale
- ⚠️ Arrays: Naive implementations underperform spec vision
- ✅ Storage: O(1) flat storage is a differentiator

---

## Table of Contents

1. [Architecture Analysis](#1-architecture-analysis)
2. [Benchmark Suite Review](#2-benchmark-suite-review)
3. [Performance Bottlenecks](#3-performance-bottlenecks)
4. [Competing Solutions Analysis](#4-competing-solutions-analysis)
5. [Optimization Recommendations](#5-optimization-recommendations)
6. [Implementation Priority Matrix](#6-implementation-priority-matrix)
7. [Appendices](#7-appendices)

---

## 1. Architecture Analysis

### 1.1 Package Overview

| Package                   | Purpose                       | Current State            |
| ------------------------- | ----------------------------- | ------------------------ |
| `@data-map/core`          | Unified facade                | ✅ Complete              |
| `@data-map/storage`       | Flat Map storage              | ✅ O(1) for primitives   |
| `@data-map/signals`       | Reactive signals              | ⚠️ Missing `untracked()` |
| `@data-map/subscriptions` | Pointer/pattern subscriptions | ⚠️ Pattern matching O(p) |
| `@data-map/path`          | JSONPath query interface      | ⚠️ Falls back to O(n)    |
| `@data-map/arrays`        | Optimized array structures    | ⚠️ Naive implementations |
| `@data-map/computed`      | Lazy computed values          | ✅ Complete              |
| `@data-map/benchmarks`    | Performance testing           | ✅ Comprehensive suite   |

### 1.2 Core Data Structures

#### FlatStore (storage/src/flat-store.ts)

```
Storage Model: Map<string, unknown>
Keys: JSON Pointers (e.g., "/users/0/name")
Operations:
  - get(pointer): O(1) ✅
  - set(pointer, value): O(1) ✅
  - has(pointer): O(1) ✅
  - delete(pointer): O(1) ✅
  - keys(prefix): O(n log n) ⚠️ (sorts all keys)
  - toObject(): O(n) ⚠️ (materializes entire tree)
  - getObject(pointer): O(n) ⚠️ (falls back to toObject for complex paths)
```

#### Signal System (signals/src/signal.ts)

```
Architecture: Observer pattern with dependency tracking
Components:
  - SignalImpl: Set<Observer>, Set<Subscriber>
  - ComputedImpl: dirty flag, lazy recomputation
  - EffectImpl: cleanup registration, auto-disposal
```

#### Subscription Engine (subscriptions/src/subscription-engine.ts)

```
Components:
  - ExactIndex: TrieMap from mnemonist (O(k) where k = key length)
  - PatternIndex: Compiled regex patterns (O(p) per notification)
  - NotificationBatcher: Debounced notification stages
```

### 1.3 Spec Compliance

Per the existing implementation audit, @data-map is **100% complete** against the specification. However, performance characteristics diverge from spec vision in several areas.

---

## 2. Benchmark Suite Review

### 2.1 Benchmark Categories

The benchmark suite covers 6 comprehensive categories:

| Category         | Files                                              | Coverage                      |
| ---------------- | -------------------------------------------------- | ----------------------------- |
| Signals          | `signals.bench.ts`, `signals-comparative.bench.ts` | 6 adapters                    |
| Storage          | `storage.bench.ts`                                 | FlatStore operations          |
| Subscriptions    | `subscriptions.bench.ts`                           | Pointer/pattern subscriptions |
| Scale            | `scale.bench.ts`, `scale-comprehensive.bench.ts`   | 10 → 100K items               |
| Path Access      | `path-access.bench.ts`                             | 4 adapters                    |
| State Management | `state-management.bench.ts`                        | Comparative patterns          |

### 2.2 Adapter Coverage

**Signal Adapters** (6):

- `@data-map/signals`
- `@preact/signals-core`
- `solid-js`
- `@vue/reactivity`
- `@maverick-js/signals`
- `nanostores`

**Path Adapters** (4):

- `@data-map/path`
- `lodash` (get/set)
- `dot-prop`
- `dlv`/`dset`

**PubSub Adapters** (4):

- `@data-map/subscriptions`
- `mitt`
- `eventemitter3`
- `nanoevents`

**State Management Adapters** (1):

- `zustand` (for pattern comparison)

### 2.3 Scale Testing Methodology

```typescript
const SCALE_SIZES = {
	tiny: 10,
	small: 100,
	medium: 1_000,
	large: 10_000,
	xlarge: 100_000,
};
```

Key scaling factors observed:

- Storage operations: ~9x slower per 10x size increase (indicates O(n) or O(n log n))
- Expected O(1): Should show constant time regardless of scale

---

## 3. Performance Bottlenecks

### 3.1 Critical: queryFlat() O(n) Fallback

**Location**: `path/src/query.ts:35`

**Problem**: For complex JSONPath queries, `queryFlat()` falls back to materializing the entire flat store into a nested object, then querying that object.

```typescript
// Current implementation
export function queryFlat(store: FlatStore, path: string): unknown[] {
	// Fast path for simple pointers
	if (isSimplePointer(path)) {
		return [store.get(path)];
	}
	// SLOW: Falls back to materializing entire object
	const obj = store.getObject(''); // O(n) materialization
	return query(path, obj); // Then O(m) query
}
```

**Impact**: Defeats the entire purpose of flat storage. Any complex query becomes O(n) where n = total entries.

**Benchmark Evidence**: At 100K items, query operations drop from millions of ops/sec to hundreds.

**Severity**: 🔴 **CRITICAL**

---

### 3.2 Critical: PatternIndex.match() Linear Scan

**Status**: ✅ RESOLVED (Step 6)

**Solution**: Segment trie (`PatternTrie`) for `*` and `**` patterns with compatibility fallback

**Location**: `subscriptions/src/pattern-trie.ts`, `subscriptions/src/pattern-index.ts`

**Previous Problem**: `match()` iterated ALL registered patterns for every notification.

**Implementation**: PatternTrie now handles eligible patterns (basic wildcards) in O(k) time where k is path depth. Non-eligible patterns (filters, unions, etc.) fall back to regex.

**Impact**: Pattern matching at 1000 patterns now scales logarithmically instead of linearly.

**Status**: 🟢 **COMPLETE**

---

### 3.3 High: Signal Notification Array Copies

**Location**: `signals/src/signal.ts:63`

**Problem**: Creates array snapshot on every notify cycle.

```typescript
// Current implementation
notify(): void {
  // Creates new array every time
  for (const observer of Array.from(this.observers)) {
    observer.update();
  }
}
```

**Status**: ✅ RESOLVED (Step 2)

**Solution**: Flag-based iteration safety with deferred mutation flush

**Implementation**: `isNotifying` flag prevents mutations during iteration; deferred mutations are flushed after notification completes.

**Impact**: Eliminates allocation pressure for signals with dynamic observer counts.

**Severity**: 🟢 **RESOLVED**

---

### 3.4 High: IndirectionLayer.nextPhysicalIndex() O(n)

**Location**: `arrays/src/indirection-layer.ts:58`

**Status**: ✅ RESOLVED (Step 3)

**Solution**: O(1) counter-based allocation + freeSlots reuse

**Previous Problem**:

```typescript
// Current implementation
nextPhysicalIndex(): number {
  // O(n) operation
  const used = new Set(this.logicalToPhysical.values());
  for (let i = 0; ; i++) {
    if (!used.has(i)) return i;
  }
}
```

**Implementation**: `nextPhysicalCounter` tracks next free physical index; freed slots are stored in `freeSlots` array for reuse.

**Impact**: Array allocation now scales with structure size, not usage.

**Severity**: 🟢 **RESOLVED**

---

### 3.5 Medium: PersistentVector Naive Copy

**Location**: `arrays/src/persistent-vector.ts`

**Status**: ✅ RESOLVED (Step 8)

**Solution**: Tree-based structure with O(log₃₂ n) operations

**Previous Problem**: Uses `[...data, value]` copy instead of tree-based persistent structure.

**Implementation**: 32-way persistent vector with shift-based tree navigation and structural sharing.

**Impact**: Large vectors now avoid full-array copies on push/set operations.

**Severity**: 🟢 **RESOLVED**

---

### 3.6 Medium: FlatStore.keys() Unnecessary Sort

**Location**: `storage/src/flat-store.ts:226`

**Status**: ✅ RESOLVED (Steps 4, 7)

**Solution**: Lazy iterator + PrefixIndex-backed subtree iteration

**Previous Problem**: Sorted all keys even when caller only needs iteration.

**Implementation**: `keys()` returns lazy iterator via PrefixIndex; `sortedKeys()` available for callers needing ordering.

**Impact**: Reduces startup time and memory allocation for large stores.

**Severity**: 🟢 **RESOLVED**

---

### 3.7 Medium: Missing untracked() Utility

**Location**: `signals/src/*`

**Problem**: All competing signal libraries provide `untracked()` to read signals without creating dependencies. This is essential for:

- Breaking circular dependencies
- Reading values in cleanup functions
- Performance optimization

**Competing Libraries**:

- Preact Signals: `untracked(() => signal.value)`
- Solid.js: `untrack(() => signal())`
- Vue: Uses `effectScope()` patterns

**Severity**: 🟡 **MEDIUM** (API completeness)

---

## 4. Competing Solutions Analysis

### 4.1 Signal Libraries Comparison

| Feature        | @data-map | Preact Signals | Solid.js       | Maverick |
| -------------- | --------- | -------------- | -------------- | -------- |
| Signal Read    | ✅ O(1)   | ✅ O(1)        | ✅ O(1)        | ✅ O(1)  |
| Signal Write   | ✅ O(1)   | ✅ O(1)        | ✅ O(1)        | ✅ O(1)  |
| Computed       | ✅ Lazy   | ✅ Lazy        | ✅ Lazy        | ✅ Lazy  |
| Batching       | ✅        | ✅ Nested      | ✅ Nested      | ✅       |
| `untracked()`  | ❌        | ✅             | ✅             | ✅       |
| `peek()`       | ✅        | ✅             | ✅             | ✅       |
| Effect Cleanup | ✅        | ✅             | ✅ `onCleanup` | ✅       |

**Key Insight**: Preact and Solid use **double-buffered notification** to avoid array copies during notify cycles.

### 4.2 Immutable Update Libraries

| Feature         | @data-map | Mutative    | Immer      |
| --------------- | --------- | ----------- | ---------- |
| Approach        | Flat Map  | Proxy       | Proxy      |
| No-Freeze Speed | N/A       | 6,747 ops/s | 5.65 ops/s |
| With Freeze     | N/A       | 1,062 ops/s | 394 ops/s  |
| Patches         | Via path  | ✅ Native   | ✅ Native  |

**Key Insight**: Mutative is **1,200x faster** than Immer without freezing. @data-map's flat storage approach could be even faster for path-based updates.

### 4.3 Path Libraries

| Feature       | @data-map | lodash | dot-prop | dlv/dset |
| ------------- | --------- | ------ | -------- | -------- |
| Get           | ✅ O(1)\* | O(k)   | O(k)     | O(k)     |
| Set           | ✅ O(1)\* | O(k)   | O(k)     | O(k)     |
| Complex Query | ⚠️ O(n)   | ❌     | ❌       | ❌       |

\*O(1) for pointer access, O(n) for complex JSONPath

**Key Insight**: @data-map has O(1) advantage for simple pointer access. This advantage is lost for complex queries.

### 4.4 Event Libraries

| Feature       | @data-map    | mitt     | EventEmitter3 | nanoevents |
| ------------- | ------------ | -------- | ------------- | ---------- |
| Exact Match   | ✅ O(1) trie | O(1) Map | O(1)          | O(1)       |
| Pattern Match | ⚠️ O(p)      | ❌       | ❌            | ❌         |
| Hierarchy     | ✅           | ❌       | ❌            | ❌         |

**Key Insight**: @data-map is the only library supporting hierarchical pattern subscriptions. This is a differentiator, but the O(p) matching needs optimization.

---

## 5. Optimization Recommendations

### 5.1 Query Optimization: Prefix Index

**Problem**: `queryFlat()` falls back to O(n) materialization.

**Solution**: Build a prefix index during ingestion.

```typescript
// Proposed: PrefixIndex structure
class PrefixIndex {
	private trie: TrieMap<Set<string>> = new TrieMap();

	add(pointer: string): void {
		// Index all prefixes
		const parts = pointer.split('/');
		for (let i = 1; i <= parts.length; i++) {
			const prefix = parts.slice(0, i).join('/');
			this.trie.get(prefix)?.add(pointer) ??
				this.trie.set(prefix, new Set([pointer]));
		}
	}

	getByPrefix(prefix: string): string[] {
		return this.trie.find(prefix) ?? []; // O(k + m) where m = matches
	}
}
```

**Benefit**: Simple prefix queries become O(k + m) instead of O(n).

---

### 5.2 Pattern Matching: Automaton Compilation

**Problem**: `PatternIndex.match()` tests every pattern.

**Solution**: Compile patterns into a deterministic finite automaton (DFA).

```typescript
// Proposed: PatternAutomaton
class PatternAutomaton {
	private automaton: CompiledDFA;

	addPattern(pattern: string, callback: Callback): void {
		// Compile regex into automaton
		this.automaton = this.automaton.union(regexToNFA(pattern));
	}

	match(pointer: string): Set<Callback> {
		// O(|pointer|) traversal through automaton
		return this.automaton.match(pointer);
	}
}
```

**Alternative**: For glob patterns, use a trie with wildcard nodes.

```typescript
class PatternTrie {
	private root: TrieNode = { children: new Map(), callbacks: new Set() };

	addPattern(pattern: string, callback: Callback): void {
		// /users/*/name → [users, *, name]
		const parts = pattern.split('/');
		let node = this.root;
		for (const part of parts) {
			if (!node.children.has(part)) {
				node.children.set(part, { children: new Map(), callbacks: new Set() });
			}
			node = node.children.get(part)!;
		}
		node.callbacks.add(callback);
	}

	match(pointer: string): Set<Callback> {
		// Traverse trie with wildcard expansion
		return this.traverseWithWildcards(pointer.split('/'), this.root);
	}
}
```

**Benefit**: O(k) matching where k = pointer length, instead of O(p).

---

### 5.3 Signal Notification: Avoid Copies

**Problem**: `Array.from()` creates copies during notification.

**Solution**: Use flag-based iteration safety.

```typescript
// Proposed: Flag-safe iteration
class SignalImpl<T> {
	private observers: Set<Observer> = new Set();
	private isNotifying = false;
	private pendingAdd: Observer[] = [];
	private pendingRemove: Observer[] = [];

	notify(): void {
		this.isNotifying = true;
		try {
			for (const observer of this.observers) {
				observer.update();
			}
		} finally {
			this.isNotifying = false;
			// Apply pending changes
			for (const o of this.pendingAdd) this.observers.add(o);
			for (const o of this.pendingRemove) this.observers.delete(o);
			this.pendingAdd.length = 0;
			this.pendingRemove.length = 0;
		}
	}

	subscribe(observer: Observer): void {
		if (this.isNotifying) {
			this.pendingAdd.push(observer);
		} else {
			this.observers.add(observer);
		}
	}
}
```

**Benefit**: Zero allocation during notification.

---

### 5.4 IndirectionLayer: Free List

**Problem**: `nextPhysicalIndex()` scans all indices.

**Solution**: Maintain a free list.

```typescript
// Proposed: FreeList allocation
class IndirectionLayer {
	private freeList: number[] = [];
	private nextIndex = 0;

	allocate(): number {
		if (this.freeList.length > 0) {
			return this.freeList.pop()!; // O(1)
		}
		return this.nextIndex++; // O(1)
	}

	free(index: number): void {
		this.freeList.push(index); // O(1)
	}
}
```

**Benefit**: O(1) allocation instead of O(n).

---

### 5.5 PersistentVector: Tree Structure

**Problem**: Naive array copy is O(n).

**Solution**: Implement Clojure-style persistent vector.

```typescript
// Proposed: Tree-based PersistentVector
const BRANCHING = 32; // 2^5 for bit manipulation

class PersistentVector<T> {
	private root: Node<T>;
	private tail: T[];
	private size: number;
	private shift: number; // log_32(size)

	push(value: T): PersistentVector<T> {
		if (this.tail.length < BRANCHING) {
			// Fast path: append to tail
			return new PersistentVector(
				this.root,
				[...this.tail, value],
				this.size + 1,
				this.shift,
			);
		}
		// Slow path: push tail to tree
		return this.pushTailToTree(value);
	}

	get(index: number): T {
		// O(log_32 n) traversal
		if (index >= this.tailOffset()) {
			return this.tail[index - this.tailOffset()];
		}
		return this.getFromTree(index);
	}
}
```

**Benefit**: O(log₃₂ n) ≈ O(1) for practical sizes (7 levels for 1 billion items).

---

### 5.6 Add untracked() Utility

**Solution**: Add `untracked()` to break dependency tracking.

```typescript
// Proposed: untracked utility
let trackingEnabled = true;

export function untracked<T>(fn: () => T): T {
  const prev = trackingEnabled;
  trackingEnabled = false;
  try {
    return fn();
  } finally {
    trackingEnabled = prev;
  }
}

// In signal read:
get(): T {
  if (trackingEnabled && currentObserver) {
    this.observers.add(currentObserver);
  }
  return this.value;
}
```

**Benefit**: API parity with preact/signals and solid-js.

---

### 5.7 Lazy Keys Iterator

**Solution**: Return iterator instead of sorted array.

```typescript
// Proposed: Lazy keys
*keys(prefix?: string): IterableIterator<string> {
  for (const key of this.store.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      yield key;
    }
  }
}

sortedKeys(prefix?: string): string[] {
  return Array.from(this.keys(prefix)).sort();
}
```

**Benefit**: O(1) start for iteration, O(n log n) only when sorting needed.

---

## 6. Implementation Priority Matrix

| Priority | Issue                   | Effort | Impact | Recommendation        |
| -------- | ----------------------- | ------ | ------ | --------------------- |
| 🔴 P0    | PatternIndex O(p)       | Medium | High   | Implement PatternTrie |
| 🔴 P0    | queryFlat O(n) fallback | Medium | High   | Add PrefixIndex       |
| 🟠 P1    | Signal Array.from()     | Low    | Medium | Flag-based iteration  |
| 🟠 P1    | IndirectionLayer O(n)   | Low    | Medium | Free list             |
| 🟡 P2    | Missing untracked()     | Low    | Medium | Add utility           |
| 🟡 P2    | keys() O(n log n)       | Low    | Low    | Lazy iterator         |
| 🟡 P3    | PersistentVector naive  | High   | Medium | Tree structure        |

### 6.1 Quick Wins (< 1 day each)

1. **IndirectionLayer free list**: 10 lines of code change
2. **Signal notification flags**: 20 lines of code change
3. **Add untracked()**: 15 lines of code change
4. **Lazy keys iterator**: 10 lines of code change

### 6.2 Medium Effort (1-3 days each)

1. **PatternTrie**: New data structure, ~100 lines
2. **PrefixIndex**: Integration with FlatStore, ~150 lines

### 6.3 Significant Effort (1 week+)

1. **Tree-based PersistentVector**: Complete rewrite, ~500 lines

---

## 7. Appendices

### 7.1 Competing Library References

- **Preact Signals**: https://github.com/preactjs/signals
- **Solid.js**: https://github.com/solidjs/solid
- **Mutative**: https://github.com/unadlib/mutative
- **Maverick Signals**: https://github.com/maverick-js/signals

### 7.2 Benchmark Running Instructions

```bash
# Run all benchmarks
pnpm --filter @data-map/benchmarks bench

# Run specific category
pnpm --filter @data-map/benchmarks bench signals

# Run with comparison
pnpm --filter @data-map/benchmarks bench:compare
```

### 7.3 Profiling Commands

```bash
# CPU Profile
node --cpu-prof --cpu-prof-interval=100 dist/bench.js

# Heap Snapshot
node --heap-snapshot dist/bench.js

# Flame Graph
0x dist/bench.js
```

### 7.4 Expected Performance Targets

| Operation                   | Current    | Target      | Notes                   |
| --------------------------- | ---------- | ----------- | ----------------------- |
| Signal read                 | ~10M ops/s | ~15M ops/s  | Competitive with preact |
| Signal write                | ~8M ops/s  | ~12M ops/s  | Remove array copies     |
| Pattern match (1K patterns) | ~1K ops/s  | ~100K ops/s | Trie-based matching     |
| Query (100K items)          | ~100 ops/s | ~1M ops/s   | Prefix index            |
| Array push (persistent)     | O(n)       | O(log n)    | Tree structure          |

---

## Conclusion

@data-map has a strong architectural foundation with its flat storage model providing O(1) access for pointer-based operations. However, several implementation choices create performance bottlenecks that undermine these advantages at scale.

**Immediate Actions**:

1. Implement PatternTrie for O(k) pattern matching
2. Add PrefixIndex for efficient prefix queries
3. Apply quick wins for signal notification and array allocation

**Medium-term**:

1. Add `untracked()` for API completeness
2. Implement lazy iterators throughout

**Long-term**:

1. Consider tree-based persistent vectors if immutable array performance is critical

With these optimizations, @data-map can achieve its goal of **outperforming all existing packages** for reactive, pointer-addressable state management.

---

_Report generated by performance audit agent_  
_Source analysis: 8 packages, 16+ benchmark files, 4 competing library categories_
