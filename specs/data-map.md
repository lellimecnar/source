# DataMap: High-Performance Reactive State Library

## RFC: JSON Path/Pointer State Management with Instant Access and Subscriptions

**Version:** 0.1.0-draft  
**Date:** January 2026  
**Author:** Lance Miller

---

## Executive Summary

DataMap is a high-performance reactive state management library designed for instant access and mutation of deeply nested state using JSON Path (RFC 9535) and JSON Pointer (RFC 6901). The library provides O(1) access patterns for most operations through innovative data structure choices, with reactive subscriptions that enable fine-grained updates without full tree traversal.

### Key Features

- **O(1) Access/Mutation**: Flat storage with JSON Pointer keys enables constant-time operations
- **JSON Path Subscriptions**: Subscribe to complex query patterns with automatic dependency tracking
- **Computed/Derived Values**: Signal-based reactive system with lazy evaluation and memoization
- **Near-Instant Array Operations**: Specialized data structures for O(1) array mutations
- **Memory Efficient**: Structural sharing for immutable updates with minimal allocations

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core Data Structures](#2-core-data-structures)
3. [Storage Layer](#3-storage-layer)
4. [Subscription System](#4-subscription-system)
5. [Computed Values & Reactivity](#5-computed-values--reactivity)
6. [Array Optimization Strategies](#6-array-optimization-strategies)
7. [API Design](#7-api-design)
8. [Performance Analysis](#8-performance-analysis)
9. [Implementation Recommendations](#9-implementation-recommendations)
10. [Dependencies & Integration](#10-dependencies--integration)
11. [Package Architecture](#11-package-architecture)

---

## 1. Architecture Overview

### 1.1 Design Philosophy

The fundamental insight driving DataMap's architecture is that **deeply nested access is inherently O(n)** where n is the nesting depth. By transforming the problem—storing data in a flat key-value structure where keys are JSON Pointers—we convert O(n) traversals into O(1) hash lookups.

```
Traditional Nested:    state.users[0].profile.settings.theme  → O(5) traversals
DataMap Flat:          store.get('/users/0/profile/settings/theme')  → O(1) lookup
```

### 1.2 Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Public API Layer                        │
│  get() · set() · subscribe() · computed() · batch()         │
├─────────────────────────────────────────────────────────────┤
│                   Subscription Engine                        │
│  PathTrie · PatternMatcher · DependencyGraph                │
├─────────────────────────────────────────────────────────────┤
│                    Reactivity System                         │
│  Signal · Computed · Effect · Batch                          │
├─────────────────────────────────────────────────────────────┤
│                     Storage Layer                            │
│  FlatStore · ArrayProxy · StructuralSharing                 │
├─────────────────────────────────────────────────────────────┤
│                   Index Structures                           │
│  TrieMap · RadixTrie · InvertedIndex                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Structures

### 2.1 Primary Storage: FlatStore

The core storage is a `Map<string, unknown>` where keys are JSON Pointers:

```typescript
interface FlatStore {
	// Core storage - O(1) operations
	data: Map<string, unknown>;

	// Metadata for arrays (length, order information)
	arrayMeta: Map<string, ArrayMetadata>;

	// Version tracking for structural sharing
	version: number;
	versions: Map<string, number>;
}

interface ArrayMetadata {
	length: number;
	pointer: string;
	// For sparse arrays or optimized order tracking
	indices: Uint32Array | number[];
}
```

**Why Map over Object?**

- Guaranteed O(1) access regardless of key patterns
- No prototype chain lookups
- Better memory characteristics for dynamic keys
- Native iteration support

### 2.2 Subscription Index: TrieMap + RadixTrie Hybrid

For subscription matching, we use a **hybrid trie structure** that combines:

1. **TrieMap** (from mnemonist) for exact pointer matching
2. **RadixTrie** for wildcard and recursive descent patterns
3. **Inverted Index** for filter expression matching

```typescript
import { TrieMap } from 'mnemonist';

interface SubscriptionIndex {
	// Exact pointer subscriptions - O(m) where m = pointer length
	exactSubscriptions: TrieMap<Set<Subscription>>;

	// Wildcard pattern subscriptions ($.users[*].name)
	wildcardPatterns: RadixTrie<PatternSubscription>;

	// Recursive descent patterns ($..*name, $..users)
	recursivePatterns: Map<string, Set<Subscription>>;

	// Filter expression index (for [?(@.active == true)])
	filterIndex: InvertedIndex<FilterSubscription>;
}
```

### 2.3 Dependency Graph: Signal DAG

For computed values and reactive updates:

```typescript
interface DependencyNode {
	id: symbol;
	type: 'signal' | 'computed' | 'effect';

	// Upstream dependencies (what this node reads)
	dependencies: Set<DependencyNode>;

	// Downstream dependents (what reads this node)
	dependents: Set<DependencyNode>;

	// For computed: the computation function
	compute?: () => unknown;

	// Cached value and dirty flag
	value: unknown;
	dirty: boolean;
	version: number;
}
```

---

## 3. Storage Layer

### 3.1 Flat Storage Strategy

**Principle**: Every value in the state tree has a unique JSON Pointer. We store values at leaf nodes directly, maintaining parent references implicitly through pointer prefixes.

```typescript
// Example: Convert nested state to flat storage
const nested = {
	users: [
		{ name: 'Alice', settings: { theme: 'dark' } },
		{ name: 'Bob', settings: { theme: 'light' } },
	],
};

// Becomes flat storage:
const flat = new Map([
	['/users/0/name', 'Alice'],
	['/users/0/settings/theme', 'dark'],
	['/users/1/name', 'Bob'],
	['/users/1/settings/theme', 'light'],
]);

// Array metadata stored separately:
const arrayMeta = new Map([
	['/users', { length: 2, pointer: '/users', indices: [0, 1] }],
]);
```

### 3.2 Access Operations

```typescript
class FlatStore {
	private data: Map<string, unknown>;
	private arrayMeta: Map<string, ArrayMetadata>;

	// O(1) get
	get(pointer: string): unknown {
		return this.data.get(pointer);
	}

	// O(1) set for primitives, O(k) for objects where k = keys
	set(pointer: string, value: unknown): void {
		if (isPrimitive(value)) {
			this.data.set(pointer, value);
			this.notifySubscribers(pointer);
		} else {
			this.setDeep(pointer, value);
		}
	}

	// Reconstruct nested object from flat storage - O(k) where k = descendant keys
	getObject(pointer: string): unknown {
		// Use prefix matching to collect all descendants
		const result = {};
		const prefix = pointer === '' ? '' : pointer + '/';

		for (const [key, value] of this.data) {
			if (key === pointer || key.startsWith(prefix)) {
				setByPointer(result, key.slice(pointer.length), value);
			}
		}
		return result;
	}
}
```

### 3.3 JSON Pointer Utilities

Leverage the `@jsonpath/*` packages for pointer operations:

```typescript
import {
	parse as parsePointer,
	compile as compilePointer,
} from '@jsonpath/pointer';

// Parse: "/users/0/name" → ['users', '0', 'name']
// Compile: ['users', '0', 'name'] → "/users/0/name"

function pointerToSegments(pointer: string): string[] {
	return parsePointer(pointer);
}

function segmentsToPointer(segments: string[]): string {
	return compilePointer(segments);
}

// Parent pointer: "/users/0/name" → "/users/0"
function parentPointer(pointer: string): string {
	const segments = pointerToSegments(pointer);
	segments.pop();
	return segmentsToPointer(segments);
}
```

---

## 4. Subscription System

### 4.1 Subscription Types

DataMap supports three subscription patterns:

1. **Exact Subscriptions**: Subscribe to a specific pointer
2. **Pattern Subscriptions**: Subscribe to JSON Path patterns with wildcards
3. **Query Subscriptions**: Subscribe to complex JSON Path queries with filters

```typescript
type SubscriptionPattern =
	| { type: 'exact'; pointer: string }
	| { type: 'pattern'; path: string; compiled: CompiledPattern }
	| { type: 'query'; path: string; ast: JSONPathAST };

interface Subscription {
	id: symbol;
	pattern: SubscriptionPattern;
	callback: (value: unknown, path: string) => void;
	options: {
		immediate?: boolean; // Fire immediately on subscribe
		deep?: boolean; // Include descendant changes
		debounce?: number; // Debounce notifications
	};
}
```

### 4.2 Pattern Matching with TrieMap

For efficient subscription lookup, we use mnemonist's TrieMap with a twist—we store subscriptions at each segment level:

```typescript
import { TrieMap } from 'mnemonist/trie-map';

class SubscriptionEngine {
	// Each trie node can have subscriptions
	private exactTrie: TrieMap<Set<Subscription>>;

	// Wildcard patterns compiled to matchers
	private wildcardMatchers: Map<
		string,
		{
			pattern: CompiledPattern;
			subscriptions: Set<Subscription>;
		}
	>;

	subscribe(pattern: string, callback: SubscriptionCallback): Unsubscribe {
		const sub = this.createSubscription(pattern, callback);

		if (isExactPointer(pattern)) {
			// O(m) insertion where m = pointer segments
			this.addExactSubscription(pattern, sub);
		} else if (hasWildcards(pattern)) {
			this.addWildcardSubscription(pattern, sub);
		} else {
			this.addQuerySubscription(pattern, sub);
		}

		return () => this.unsubscribe(sub);
	}

	// Find all subscriptions affected by a pointer change
	getAffectedSubscriptions(pointer: string): Set<Subscription> {
		const affected = new Set<Subscription>();

		// 1. Exact match
		const exact = this.exactTrie.get(pointerToSegments(pointer));
		if (exact) exact.forEach((s) => affected.add(s));

		// 2. Parent subscriptions with deep: true
		let current = pointer;
		while (current) {
			const parentSubs = this.exactTrie.get(pointerToSegments(current));
			if (parentSubs) {
				parentSubs.forEach((s) => {
					if (s.options.deep) affected.add(s);
				});
			}
			current = parentPointer(current);
		}

		// 3. Wildcard pattern matches
		for (const [, matcher] of this.wildcardMatchers) {
			if (matcher.pattern.test(pointer)) {
				matcher.subscriptions.forEach((s) => affected.add(s));
			}
		}

		return affected;
	}
}
```

### 4.3 Compiled Pattern Matching

For wildcard patterns like `$.users[*].name`, we compile to efficient matchers:

```typescript
interface CompiledPattern {
	// Regex for fast initial check
	regex: RegExp;

	// Segment matchers for detailed validation
	segments: SegmentMatcher[];

	// Test a pointer against this pattern
	test(pointer: string): boolean;

	// Extract matched values from a store
	extract(store: FlatStore): Array<{ pointer: string; value: unknown }>;
}

type SegmentMatcher =
	| { type: 'literal'; value: string }
	| { type: 'wildcard' } // [*] - any single segment
	| { type: 'recursive' } // .. - any depth
	| { type: 'index'; value: number }
	| { type: 'slice'; start?: number; end?: number; step?: number }
	| { type: 'filter'; predicate: (value: unknown) => boolean };

function compilePattern(jsonPath: string): CompiledPattern {
	// Use @jsonpath/path to parse
	const ast = parseJSONPath(jsonPath);

	// Convert AST to segment matchers
	const segments = astToMatchers(ast);

	// Generate regex for fast-path rejection
	const regex = generateMatchRegex(segments);

	return {
		regex,
		segments,
		test(pointer: string): boolean {
			// Fast-path: regex rejection
			if (!this.regex.test(pointer)) return false;

			// Detailed segment matching
			return matchSegments(pointer, this.segments);
		},
		extract(store: FlatStore): Array<{ pointer: string; value: unknown }> {
			// Use index structure for efficient extraction
			return extractMatches(store, this.segments);
		},
	};
}
```

### 4.4 Notification Batching

To prevent notification storms, mutations are batched:

```typescript
class NotificationBatcher {
	private pending: Map<
		symbol,
		{ sub: Subscription; pointer: string; value: unknown }
	>;
	private scheduled: boolean = false;

	queue(sub: Subscription, pointer: string, value: unknown): void {
		// Deduplicate: same subscription, latest value wins
		this.pending.set(sub.id, { sub, pointer, value });

		if (!this.scheduled) {
			this.scheduled = true;
			queueMicrotask(() => this.flush());
		}
	}

	flush(): void {
		const notifications = Array.from(this.pending.values());
		this.pending.clear();
		this.scheduled = false;

		for (const { sub, pointer, value } of notifications) {
			try {
				sub.callback(value, pointer);
			} catch (e) {
				console.error('Subscription callback error:', e);
			}
		}
	}
}
```

---

## 5. Computed Values & Reactivity

### 5.1 Signal-Based Reactivity

Inspired by Preact Signals and Angular Signals, DataMap implements a pull-based reactive system:

```typescript
interface Signal<T> {
	// Read value (triggers dependency tracking)
	get value(): T;

	// Write value (triggers notifications)
	set value(v: T);

	// Peek without tracking
	peek(): T;

	// Subscribe to changes
	subscribe(callback: (value: T) => void): () => void;
}

interface Computed<T> {
	// Read-only signal derived from other signals
	get value(): T;

	// Force recomputation
	invalidate(): void;
}

interface Effect {
	// Run callback when dependencies change
	run(): void;

	// Stop tracking
	dispose(): void;
}
```

### 5.2 Automatic Dependency Tracking

```typescript
let currentEffect: Effect | Computed | null = null;
const effectStack: (Effect | Computed)[] = [];

function track<T>(signal: Signal<T>): void {
	if (currentEffect) {
		signal.addDependent(currentEffect);
		currentEffect.addDependency(signal);
	}
}

function trigger<T>(signal: Signal<T>): void {
	for (const dependent of signal.dependents) {
		dependent.markDirty();
	}
}

function computed<T>(fn: () => T): Computed<T> {
	let value: T;
	let dirty = true;
	const comp: Computed<T> = {
		dependencies: new Set(),
		dependents: new Set(),

		get value(): T {
			track(this);

			if (dirty) {
				// Push to effect stack for dependency tracking
				effectStack.push(this);
				currentEffect = this;

				try {
					// Clear old dependencies
					this.dependencies.clear();

					// Recompute (this will track new dependencies)
					value = fn();
					dirty = false;
				} finally {
					effectStack.pop();
					currentEffect = effectStack[effectStack.length - 1] ?? null;
				}
			}

			return value;
		},

		markDirty(): void {
			if (!dirty) {
				dirty = true;
				// Propagate to dependents
				for (const dep of this.dependents) {
					dep.markDirty();
				}
			}
		},
	};

	return comp;
}
```

### 5.3 Computed Values from Pointers

DataMap extends the signal system to work with JSON Pointers:

```typescript
class DataMap {
	// Create a computed value derived from one or more pointers
	computed<T>(
		dependencies: string[], // JSON Pointers or Paths
		compute: (...values: unknown[]) => T,
	): Computed<T> {
		// Subscribe to all dependencies
		const signals = dependencies.map((dep) => this.signalFor(dep));

		return computed(() => {
			const values = signals.map((s) => s.value);
			return compute(...values);
		});
	}

	// Example usage:
	// const fullName = store.computed(
	//   ['/user/firstName', '/user/lastName'],
	//   (first, last) => `${first} ${last}`
	// );

	private signalFor(path: string): Signal<unknown> {
		// Cache signals per path
		if (!this.signalCache.has(path)) {
			this.signalCache.set(path, this.createSignal(path));
		}
		return this.signalCache.get(path)!;
	}

	private createSignal(path: string): Signal<unknown> {
		const self = this;

		return {
			get value() {
				track(this);
				return self.get(path);
			},
			set value(v: unknown) {
				self.set(path, v);
			},
			// ... rest of Signal implementation
		};
	}
}
```

### 5.4 Dynamic Dependencies with JSON Path

For computed values that depend on query results:

```typescript
class DataMap {
	// Computed from JSON Path query (dynamic number of results)
	query<T>(
		path: string, // JSON Path like "$.users[?(@.active)].score"
		compute: (matches: Array<{ pointer: string; value: unknown }>) => T,
	): Computed<T> {
		const pattern = compilePattern(path);

		return computed(() => {
			// Extract all matching values
			const matches = pattern.extract(this.store);

			// Track each matched pointer as a dependency
			for (const { pointer } of matches) {
				this.signalFor(pointer).value; // Read to track
			}

			// Also track structural changes (array length, etc.)
			this.trackStructure(pattern.rootPointer);

			return compute(matches);
		});
	}

	// Example:
	// const totalActiveScore = store.query(
	//   '$.users[?(@.active)].score',
	//   matches => matches.reduce((sum, m) => sum + m.value, 0)
	// );
}
```

---

## 6. Array Optimization Strategies

### 6.1 The Array Challenge

Standard array operations have poor complexity:

- `splice(i, 1)`: O(n) - must shift all elements after i
- `unshift(x)`: O(n) - must shift all elements
- `sort()`: O(n log n) + O(n) pointer updates

### 6.2 Strategy 1: Indirection Layer (Recommended)

Instead of renumbering array elements, use an indirection array:

```typescript
interface OptimizedArray {
	// Logical indices → physical indices
	logicalToPhysical: Uint32Array;

	// Physical storage (stable pointers)
	physicalLength: number;

	// Free list for reuse
	freeSlots: number[];
}

// Logical: [A, B, C] at /users
// Physical storage:
//   /users/_p/0 → A
//   /users/_p/1 → B
//   /users/_p/2 → C
// Indirection: logicalToPhysical = [0, 1, 2]

// After splice(1, 1) removing B:
// Physical storage unchanged!
//   /users/_p/0 → A
//   /users/_p/1 → B (marked free)
//   /users/_p/2 → C
// Indirection: logicalToPhysical = [0, 2]
// Free list: [1]

// Insert at beginning (unshift):
// Reuse slot 1 for new element
//   /users/_p/0 → A
//   /users/_p/1 → NEW
//   /users/_p/2 → C
// Indirection: logicalToPhysical = [1, 0, 2]
```

**Complexity improvements:**

- `splice(i, 1)`: O(n) → O(n) array ops, but O(1) pointer updates
- `unshift(x)`: O(n) → O(1) if free slots, O(1) pointer allocation
- Random access: O(1) (two lookups: logical → physical → value)

### 6.3 Strategy 2: Gap Buffer for Sequential Operations

For sequential operations (push/pop dominant workloads):

```typescript
interface GapBuffer<T> {
	// Storage with gap in middle
	buffer: T[];
	gapStart: number;
	gapEnd: number;

	// Move gap to position (amortized O(1) for sequential access)
	moveGap(position: number): void;

	// Insert at position (O(1) if gap is there)
	insert(position: number, value: T): void;

	// Delete at position (O(1) if gap is there)
	delete(position: number): void;
}
```

### 6.4 Strategy 3: Order-Maintenance Data Structure

For sort-stable arrays where relative order matters:

```typescript
interface OrderedArray {
	// Each element has a label for ordering
	elements: Map<string, { value: unknown; label: bigint }>;

	// Labels allow O(1) comparison, O(log n) relabeling (amortized)
	nextLabel(): bigint;

	// Insert between two elements
	insertBetween(before: string, after: string, value: unknown): string;
}
```

### 6.5 Strategy 4: Copy-on-Write with Structural Sharing

For immutable array updates, use structural sharing:

```typescript
// Using a persistent vector (like Clojure/Immutable.js)
// Tree-based structure with 32-wide branching

interface PersistentVector<T> {
	// O(log32 n) ≈ O(1) for practical sizes
	get(index: number): T;
	set(index: number, value: T): PersistentVector<T>;
	push(value: T): PersistentVector<T>;
	pop(): PersistentVector<T>;

	// O(n) but shares structure
	slice(start: number, end?: number): PersistentVector<T>;
}
```

### 6.6 Recommended Hybrid Approach

```typescript
class SmartArray {
	private strategy: 'direct' | 'indirection' | 'persistent';
	private threshold = 1000;

	constructor(initialData: unknown[], options?: ArrayOptions) {
		// Choose strategy based on size and usage hints
		if (initialData.length < 100) {
			this.strategy = 'direct'; // Small arrays: native is fine
		} else if (options?.immutable) {
			this.strategy = 'persistent';
		} else {
			this.strategy = 'indirection'; // Large mutable arrays
		}
	}
}
```

---

## 7. API Design

### 7.1 Core API

```typescript
interface DataMap<T = unknown> {
	// === Core Operations ===

	// Get value at pointer - O(1)
	get<V = unknown>(pointer: string): V | undefined;

	// Set value at pointer - O(1) for primitives, O(k) for objects
	set(pointer: string, value: unknown): void;

	// Delete value at pointer - O(1) + subscription cleanup
	delete(pointer: string): boolean;

	// Check existence - O(1)
	has(pointer: string): boolean;

	// === Batch Operations ===

	// Batch multiple mutations (single notification flush)
	batch(fn: () => void): void;

	// Transaction with rollback capability
	transaction<R>(fn: () => R): R;

	// === Subscriptions ===

	// Subscribe to exact pointer
	subscribe(pointer: string, callback: SubscriptionCallback): Unsubscribe;

	// Subscribe to JSON Path pattern
	subscribe(path: string, callback: SubscriptionCallback): Unsubscribe;

	// === Computed Values ===

	// Create computed signal from pointers
	computed<V>(
		dependencies: string[],
		compute: (...values: unknown[]) => V,
	): Computed<V>;

	// Create computed from JSON Path query
	query<V>(path: string, compute: (matches: QueryMatch[]) => V): Computed<V>;

	// === Effects ===

	// Run side effect when dependencies change
	effect(fn: () => void | (() => void)): () => void;

	// === Array Operations ===

	// Optimized array methods
	push(arrayPointer: string, ...values: unknown[]): number;
	pop(arrayPointer: string): unknown;
	splice(
		arrayPointer: string,
		start: number,
		deleteCount?: number,
		...items: unknown[]
	): unknown[];
	sort(
		arrayPointer: string,
		compareFn?: (a: unknown, b: unknown) => number,
	): void;

	// === Utilities ===

	// Get full nested object (reconstructed from flat)
	toObject(): T;

	// Import nested object to flat storage
	fromObject(obj: T): void;

	// Get all pointers matching a pattern
	keys(pattern?: string): string[];

	// Snapshot for debugging
	snapshot(): Map<string, unknown>;
}
```

### 7.2 Usage Examples

```typescript
import { createDataMap } from '@datamap/core';

// Create store
const store = createDataMap({
	users: [
		{ name: 'Alice', score: 100, active: true },
		{ name: 'Bob', score: 85, active: false },
	],
	settings: {
		theme: 'dark',
	},
});

// === Basic Operations ===

// Get - O(1)
store.get('/users/0/name'); // 'Alice'

// Set - O(1)
store.set('/users/0/score', 150);

// Subscribe to exact pointer
const unsub = store.subscribe('/users/0/score', (value, pointer) => {
	console.log(`Score changed to ${value}`);
});

// === Pattern Subscriptions ===

// Subscribe to all user names
store.subscribe('$.users[*].name', (value, pointer) => {
	console.log(`Name at ${pointer} is now ${value}`);
});

// Subscribe to active users' scores
store.subscribe('$.users[?(@.active)].score', (value, pointer) => {
	console.log(`Active user score: ${value}`);
});

// === Computed Values ===

// Computed from specific pointers
const fullName = store.computed(
	['/users/0/firstName', '/users/0/lastName'],
	(first, last) => `${first} ${last}`,
);

console.log(fullName.value); // Automatically tracks dependencies

// Computed from query
const totalActiveScore = store.query('$.users[?(@.active)].score', (matches) =>
	matches.reduce((sum, m) => sum + (m.value as number), 0),
);

// === Dynamic/Dependent Computed ===

const theme = store.computed(['/settings/theme'], (t) => t);

const buttonColor = store.computed(['/settings/theme'], (theme) =>
	theme === 'dark' ? '#fff' : '#000',
);

// === Batch Operations ===

store.batch(() => {
	store.set('/users/0/score', 200);
	store.set('/users/1/score', 180);
	store.set('/users/0/active', false);
	// Single notification flush at end
});

// === Optimized Array Operations ===

// Push - O(1) amortized
store.push('/users', { name: 'Charlie', score: 90, active: true });

// Splice - O(n) array ops but minimal pointer churn
store.splice('/users', 1, 1); // Remove Bob

// Sort - O(n log n) comparison, O(1) if using indirection
store.sort('/users', (a, b) => b.score - a.score);

// === Effects ===

// Auto-save effect
const disposeAutoSave = store.effect(() => {
	const data = store.toObject();
	localStorage.setItem('appState', JSON.stringify(data));
});

// Cleanup
disposeAutoSave();
```

---

## 8. Performance Analysis

### 8.1 Time Complexity Summary

| Operation           | Traditional Nested | DataMap Flat                      |
| ------------------- | ------------------ | --------------------------------- |
| Get (depth d)       | O(d)               | O(1)                              |
| Set (depth d)       | O(d)               | O(1)                              |
| Delete              | O(d)               | O(1)                              |
| Subscribe (exact)   | O(d) setup         | O(m) where m = pointer length     |
| Subscribe (pattern) | O(n) scan          | O(m) insertion + O(k) matches     |
| Notify (k subs)     | O(k × d)           | O(k)                              |
| Array push          | O(1)               | O(1)                              |
| Array splice        | O(n)               | O(n) array, O(1) with indirection |
| Reconstruct object  | N/A                | O(k) where k = keys               |

### 8.2 Space Complexity

```
Traditional: O(n) where n = total nodes
DataMap:     O(n) data + O(m) metadata + O(s) subscriptions
             where m = arrays count, s = subscription count
```

The flat storage adds overhead for metadata but typically saves space by avoiding object wrappers.

### 8.3 Benchmark Targets

```typescript
// Target performance (operations/second, 1000 keys)
const benchmarks = {
	'get single key': 10_000_000,
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

---

## 9. Implementation Recommendations

### 9.1 Package Structure

```
@datamap/
├── core/           # Core store, signals, subscriptions
├── path/           # JSON Path parsing, compilation (wrapper around @jsonpath/*)
├── pointer/        # JSON Pointer utilities
├── arrays/         # Optimized array implementations
├── devtools/       # Debugging, visualization
└── react/          # React bindings (useDataMap, etc.)
```

### 9.2 Dependencies

**Required:**

- `@jsonpath/path` - JSON Path parsing and evaluation (from lellimecnar/source)
- `@jsonpath/pointer` - JSON Pointer utilities
- `mnemonist` - TrieMap and other data structures

**Optional:**

- `jsep` - For custom filter expression parsing (if not using @jsonpath)
- `immutable` - For persistent data structure option

### 9.3 Implementation Phases

**Phase 1: Core (MVP)**

- FlatStore with get/set/delete
- Exact pointer subscriptions
- Basic batching

**Phase 2: Patterns**

- Wildcard pattern subscriptions
- Pattern compilation and caching
- TrieMap integration

**Phase 3: Reactivity**

- Signal implementation
- Computed values
- Effects
- Dependency tracking

**Phase 4: Arrays**

- Indirection layer
- Optimized mutations
- Structural sharing option

**Phase 5: Advanced**

- Query subscriptions with filters
- Transaction support
- DevTools integration

---

## 10. Dependencies & Integration

### 10.1 Using @jsonpath/\* Packages

```typescript
// From https://github.com/lellimecnar/source/tree/master/packages/jsonpath

import { parse, evaluate } from '@jsonpath/path';
import {
	parse as parsePointer,
	compile as compilePointer,
	get as getByPointer,
	set as setByPointer,
} from '@jsonpath/pointer';

// JSON Path operations
const ast = parse('$.users[*].name');
const results = evaluate(ast, data);

// JSON Pointer operations
const segments = parsePointer('/users/0/name');
const pointer = compilePointer(['users', '0', 'name']);
const value = getByPointer(data, '/users/0/name');
```

### 10.2 Using mnemonist

```typescript
import { TrieMap } from 'mnemonist/trie-map';
import { LRUCache } from 'mnemonist/lru-cache';

// Subscription index
const subscriptionTrie = new TrieMap<Set<Subscription>>();

// Pattern compilation cache
const patternCache = new LRUCache<string, CompiledPattern>(1000);
```

### 10.3 Framework Integration

**React:**

```typescript
import { useDataMap, useComputed, useSubscription } from '@datamap/react';

function UserScore({ userId }) {
  const score = useSubscription(`/users/${userId}/score`);
  const rank = useComputed(
    [`/users/${userId}/score`],
    (s) => calculateRank(s)
  );

  return <div>Score: {score}, Rank: {rank}</div>;
}
```

**Vue:**

```typescript
import { useDataMap } from '@datamap/vue';

const store = useDataMap();
const score = store.ref('/users/0/score'); // Reactive ref
```

---

## 11. Package Architecture

This section defines the complete `@data-map/*` package collection, their responsibilities, interdependencies, and integration points. The design follows the monorepo's conventions for workspace packages, leveraging the existing `@jsonpath/*` ecosystem.

### 11.1 Package Overview

```
@data-map/
├── core/                # Primary store implementation
├── signals/             # Signal-based reactivity primitives
├── storage/             # Flat storage engine and data structures
├── subscriptions/       # Subscription engine and pattern matching
├── arrays/              # Optimized array implementations
├── computed/            # Computed values and dependency tracking
├── devtools/            # Developer tools and debugging
├── react/               # React bindings and hooks
├── vue/                 # Vue 3 composables
├── solid/               # Solid.js integration
└── benchmarks/          # Performance benchmarking suite (exists)
```

### 11.2 Dependency Graph

```
                                ┌─────────────────┐
                                │  @data-map/core │
                                └────────┬────────┘
                                         │ depends on
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
   ┌──────────────────┐     ┌────────────────────┐     ┌────────────────────┐
   │ @data-map/storage│     │@data-map/subscriptions│  │ @data-map/computed │
   └────────┬─────────┘     └──────────┬─────────┘     └─────────┬──────────┘
            │                          │                          │
            │                          │                          │
            │                          ▼                          ▼
            │               ┌────────────────────┐     ┌──────────────────┐
            │               │ @data-map/signals  │◄────│  (uses signals)  │
            │               └────────────────────┘     └──────────────────┘
            │                          ▲
            │                          │
            ▼                          │
   ┌──────────────────┐                │
   │ @data-map/arrays │────────────────┘ (notifies via signals)
   └──────────────────┘

External Dependencies:
   @jsonpath/pointer    - JSON Pointer operations (RFC 6901)
   @jsonpath/jsonpath   - JSONPath queries (RFC 9535)
   @jsonpath/patch      - JSON Patch operations (RFC 6902)
   @jsonpath/core       - Shared types and AST definitions
   mnemonist            - TrieMap, LRUCache, and other data structures
```

### 11.3 Package Specifications

---

#### 11.3.1 `@data-map/core`

**Purpose**: Main entry point and public API facade. Orchestrates all subsystems into a unified `DataMap` class.

**Role**: Integration layer combining storage, subscriptions, reactivity, and array operations.

**Responsibilities**:

- Expose unified `DataMap<T>` class with complete API
- Coordinate between storage, subscription, and reactivity layers
- Batch operation management and transaction support
- JSON Pointer/Path input normalization
- Import/export to nested object form

**Public API**:

```typescript
// Main export
export { DataMap, createDataMap } from './datamap';

// Re-exports from subsystems
export type { Signal, Computed, Effect } from '@data-map/signals';
export type { Subscription, SubscriptionConfig } from '@data-map/subscriptions';
export type { FlatStore, ArrayMetadata } from '@data-map/storage';

// Configuration types
export type { DataMapOptions, Operation, ResolvedMatch } from './types';
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/storage": "workspace:*",
		"@data-map/subscriptions": "workspace:*",
		"@data-map/signals": "workspace:*",
		"@data-map/computed": "workspace:*",
		"@data-map/arrays": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/patch": "workspace:*"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── datamap.ts            # Main DataMap class
├── types.ts              # Core type definitions
├── create.ts             # Factory function
├── batch/                # Batching and transactions
│   ├── manager.ts
│   └── types.ts
├── proxy/                # Proxy-based access (optional)
│   └── handler.ts
└── __tests__/
```

---

#### 11.3.2 `@data-map/storage`

**Purpose**: Flat key-value storage engine with JSON Pointer keys.

**Role**: Foundation layer providing O(1) access/mutation for all primitive operations.

**Responsibilities**:

- `Map<string, unknown>` based flat storage
- Array metadata tracking (length, indices)
- Version tracking for structural sharing
- Prefix-based iteration for object reconstruction
- Pointer existence checks

**Public API**:

```typescript
export interface FlatStore {
	readonly size: number;
	readonly version: number;

	// Core operations - O(1)
	get(pointer: string): unknown;
	set(pointer: string, value: unknown): void;
	delete(pointer: string): boolean;
	has(pointer: string): boolean;

	// Bulk operations
	setDeep(pointer: string, value: object): void;
	getObject(pointer: string): unknown;

	// Iteration
	keys(prefix?: string): IterableIterator<string>;
	entries(prefix?: string): IterableIterator<[string, unknown]>;

	// Versioning
	getVersion(pointer: string): number;

	// Array metadata
	getArrayMeta(pointer: string): ArrayMetadata | undefined;
	setArrayMeta(pointer: string, meta: ArrayMetadata): void;
}

export interface ArrayMetadata {
	length: number;
	pointer: string;
	indices: Uint32Array | number[];
}

export function createFlatStore(initial?: object): FlatStore;
export function flattenObject(obj: object): Map<string, unknown>;
export function unflattenToObject(store: FlatStore, pointer?: string): unknown;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/core": "workspace:*"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── flat-store.ts         # FlatStore implementation
├── array-meta.ts         # Array metadata management
├── flatten.ts            # Object → flat conversion
├── unflatten.ts          # Flat → object reconstruction
├── versioning.ts         # Version tracking
└── __tests__/
```

---

#### 11.3.3 `@data-map/signals`

**Purpose**: Lightweight signal-based reactivity primitives.

**Role**: Core reactivity engine providing automatic dependency tracking and change propagation.

**Responsibilities**:

- `Signal<T>` - mutable reactive value
- `Computed<T>` - derived reactive value with lazy evaluation
- `Effect` - side effects with automatic cleanup
- Automatic dependency graph construction
- Dirty flag propagation
- Batch scheduling for change coalescing

**Public API**:

```typescript
// Core primitives
export interface Signal<T> {
	get value(): T;
	set value(v: T);
	peek(): T;
	subscribe(callback: (value: T) => void): () => void;
}

export interface Computed<T> {
	get value(): T;
	readonly dirty: boolean;
	invalidate(): void;
}

export interface Effect {
	run(): void;
	dispose(): void;
	readonly active: boolean;
}

// Factory functions
export function signal<T>(initial: T): Signal<T>;
export function computed<T>(fn: () => T): Computed<T>;
export function effect(fn: () => void | (() => void)): Effect;

// Batching
export function batch(fn: () => void): void;
export function untracked<T>(fn: () => T): T;

// Internals for integration
export function getCurrentEffect(): Effect | Computed | null;
export function track<T>(signal: Signal<T>): void;
export function trigger<T>(signal: Signal<T>): void;
```

**Dependencies**:

```json
{
	"dependencies": {}
}
```

**Design Notes**:

- Zero external dependencies for maximum portability
- Pull-based evaluation (lazy computed values)
- Glitch-free updates via topological scheduling
- Inspired by Preact Signals, Solid.js, and Angular Signals

**File Structure**:

```
src/
├── index.ts              # Public exports
├── signal.ts             # Signal implementation
├── computed.ts           # Computed implementation
├── effect.ts             # Effect implementation
├── context.ts            # Effect stack and tracking
├── batch.ts              # Batch scheduling
├── types.ts              # Type definitions
└── __tests__/
```

---

#### 11.3.4 `@data-map/subscriptions`

**Purpose**: Subscription engine for JSON Pointer and JSONPath pattern matching.

**Role**: Event distribution layer matching path changes to registered callbacks.

**Responsibilities**:

- Exact pointer subscriptions (TrieMap based)
- Wildcard pattern subscriptions (`$.users[*].name`)
- Recursive descent subscriptions (`$..name`)
- Filter expression subscriptions (`$.users[?(@.active)]`)
- Notification batching and debouncing
- Lifecycle stages (before/on/after)

**Public API**:

```typescript
export interface SubscriptionEngine {
	// Subscribe to path or pattern
	subscribe(
		pattern: string,
		callback: SubscriptionCallback,
		options?: SubscriptionOptions,
	): Unsubscribe;

	// Find affected subscriptions for a pointer
	getAffected(pointer: string): Set<Subscription>;

	// Notify all affected subscriptions
	notify(pointer: string, value: unknown, previousValue?: unknown): void;

	// Batch notifications
	batch(fn: () => void): void;

	// Cleanup
	clear(): void;
	readonly size: number;
}

export interface Subscription {
	readonly id: symbol;
	readonly pattern: SubscriptionPattern;
	readonly options: SubscriptionOptions;
	unsubscribe(): void;
}

export type SubscriptionPattern =
	| { type: 'exact'; pointer: string }
	| { type: 'pattern'; path: string; compiled: CompiledPattern }
	| { type: 'query'; path: string; ast: JSONPathAST };

export interface SubscriptionOptions {
	immediate?: boolean;
	deep?: boolean;
	debounce?: number;
	stages?: ('before' | 'on' | 'after')[];
}

export type SubscriptionCallback = (
	value: unknown,
	event: SubscriptionEvent,
) => unknown | void;

export interface SubscriptionEvent {
	pointer: string;
	originalPath: string;
	previousValue?: unknown;
	stage: 'before' | 'on' | 'after';
	cancel: () => void;
}

export function createSubscriptionEngine(): SubscriptionEngine;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/core": "workspace:*",
		"mnemonist": "^0.39.0"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── engine.ts             # SubscriptionEngine implementation
├── patterns/
│   ├── compile.ts        # Pattern compilation
│   ├── exact.ts          # Exact pointer matching
│   ├── wildcard.ts       # Wildcard pattern matching
│   ├── recursive.ts      # Recursive descent matching
│   └── filter.ts         # Filter expression matching
├── trie.ts               # TrieMap integration
├── batcher.ts            # Notification batching
├── types.ts              # Type definitions
└── __tests__/
```

---

#### 11.3.5 `@data-map/computed`

**Purpose**: Computed values derived from DataMap pointers and JSONPath queries.

**Role**: Bridge layer connecting signal reactivity with DataMap path access.

**Responsibilities**:

- Create signals from JSON Pointers
- Computed values from multiple pointers
- Query-based computed values (dynamic dependencies)
- Signal caching per path
- Structural change tracking for arrays

**Public API**:

```typescript
export interface ComputedFactory {
	// Create signal for a pointer
	signalFor(pointer: string): Signal<unknown>;

	// Computed from specific pointers
	computed<T>(
		dependencies: string[],
		compute: (...values: unknown[]) => T,
	): Computed<T>;

	// Computed from JSONPath query (dynamic deps)
	query<T>(path: string, compute: (matches: QueryMatch[]) => T): Computed<T>;

	// Clear cached signals
	clearCache(): void;
}

export interface QueryMatch {
	pointer: string;
	value: unknown;
}

export function createComputedFactory(
	store: FlatStore,
	subscriptions: SubscriptionEngine,
): ComputedFactory;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/signals": "workspace:*",
		"@data-map/storage": "workspace:*",
		"@data-map/subscriptions": "workspace:*",
		"@jsonpath/jsonpath": "workspace:*"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── factory.ts            # ComputedFactory implementation
├── signal-cache.ts       # Per-path signal caching
├── query-computed.ts     # Query-based computed values
├── structural.ts         # Structural change tracking
└── __tests__/
```

---

#### 11.3.6 `@data-map/arrays`

**Purpose**: Optimized array implementations for O(1) mutations.

**Role**: Specialized data structures minimizing pointer churn during array operations.

**Responsibilities**:

- Indirection layer (logical → physical indices)
- Free slot management for reuse
- Gap buffer for sequential operations
- Persistent vector option for immutable updates
- Smart strategy selection based on array size

**Public API**:

```typescript
export interface OptimizedArray<T = unknown> {
	readonly length: number;
	readonly strategy: ArrayStrategy;

	// Access
	get(index: number): T | undefined;
	set(index: number, value: T): void;

	// Mutations
	push(...values: T[]): number;
	pop(): T | undefined;
	shift(): T | undefined;
	unshift(...values: T[]): number;
	splice(start: number, deleteCount?: number, ...items: T[]): T[];

	// Order
	sort(compareFn?: (a: T, b: T) => number): void;
	reverse(): void;
	shuffle(): void;

	// Conversion
	toArray(): T[];
	toPointerMap(basePointer: string): Map<string, T>;
}

export type ArrayStrategy =
	| 'direct'
	| 'indirection'
	| 'gap-buffer'
	| 'persistent';

export interface ArrayOptions {
	strategy?: ArrayStrategy;
	immutable?: boolean;
	threshold?: number; // Size threshold for strategy upgrade
}

export function createOptimizedArray<T>(
	initial: T[],
	options?: ArrayOptions,
): OptimizedArray<T>;

// Indirection layer utilities
export interface IndirectionLayer {
	logicalToPhysical: Uint32Array;
	physicalLength: number;
	freeSlots: number[];
}

export function createIndirectionLayer(length: number): IndirectionLayer;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/signals": "workspace:*",
		"@jsonpath/pointer": "workspace:*"
	},
	"optionalDependencies": {
		"immutable": "^4.3.0"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── optimized-array.ts    # Main OptimizedArray class
├── strategies/
│   ├── direct.ts         # Native array wrapper
│   ├── indirection.ts    # Indirection layer
│   ├── gap-buffer.ts     # Gap buffer implementation
│   └── persistent.ts     # Persistent vector (optional)
├── smart-array.ts        # Strategy auto-selection
├── indirection-layer.ts  # Indirection utilities
└── __tests__/
```

---

#### 11.3.7 `@data-map/devtools`

**Purpose**: Developer tools, debugging utilities, and visualization.

**Role**: Development-time introspection and debugging support.

**Responsibilities**:

- State inspection and visualization
- Subscription graph visualization
- Mutation history tracking
- Performance profiling integration
- Browser devtools extension support

**Public API**:

```typescript
export interface DevTools {
	// State inspection
	inspect(store: DataMap): StateSnapshot;
	diff(before: StateSnapshot, after: StateSnapshot): StateDiff;

	// Subscription visualization
	visualizeSubscriptions(engine: SubscriptionEngine): SubscriptionGraph;

	// History tracking
	enableHistory(store: DataMap, options?: HistoryOptions): HistoryManager;

	// Profiling
	profile<T>(fn: () => T): ProfileResult<T>;

	// Browser extension
	connectToExtension(store: DataMap): () => void;
}

export interface StateSnapshot {
	timestamp: number;
	data: Map<string, unknown>;
	subscriptionCount: number;
	computedCount: number;
}

export interface HistoryManager {
	undo(): void;
	redo(): void;
	canUndo: boolean;
	canRedo: boolean;
	history: StateSnapshot[];
}

export function createDevTools(): DevTools;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/core": "workspace:*"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── devtools.ts           # Main DevTools class
├── inspector.ts          # State inspection
├── history.ts            # History/undo management
├── profiler.ts           # Performance profiling
├── visualizer.ts         # Subscription graph visualization
├── extension/            # Browser extension support
│   ├── bridge.ts
│   └── panel.ts
└── __tests__/
```

---

#### 11.3.8 `@data-map/react`

**Purpose**: React 18+ bindings with hooks and context providers.

**Role**: Framework integration for React applications.

**Responsibilities**:

- `useDataMap` hook for store access
- `useSubscription` hook for reactive values
- `useComputed` hook for derived values
- `DataMapProvider` context
- Concurrent mode compatibility
- Suspense integration (optional)

**Public API**:

```typescript
// Context
export const DataMapContext: React.Context<DataMap | null>;
export function DataMapProvider<T>(props: {
	store: DataMap<T>;
	children: React.ReactNode;
}): JSX.Element;

// Hooks
export function useDataMap<T = unknown>(): DataMap<T>;

export function useSubscription<V = unknown>(
	pointer: string,
	options?: UseSubscriptionOptions,
): V;

export function useComputed<V>(
	dependencies: string[],
	compute: (...values: unknown[]) => V,
): V;

export function useQuery<V>(
	path: string,
	compute: (matches: QueryMatch[]) => V,
): V;

// Utility hooks
export function useBatch(): (fn: () => void) => void;
export function usePointer(
	pointer: string,
): [unknown, (value: unknown) => void];

export interface UseSubscriptionOptions {
	immediate?: boolean;
	suspense?: boolean;
	fallback?: unknown;
}
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/core": "workspace:*"
	},
	"peerDependencies": {
		"react": "^18.0.0 || ^19.0.0"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── context.tsx           # DataMapContext and Provider
├── hooks/
│   ├── useDataMap.ts
│   ├── useSubscription.ts
│   ├── useComputed.ts
│   ├── useQuery.ts
│   ├── useBatch.ts
│   └── usePointer.ts
├── suspense.ts           # Suspense integration
└── __tests__/
```

---

#### 11.3.9 `@data-map/vue`

**Purpose**: Vue 3 composables and reactive bindings.

**Role**: Framework integration for Vue applications.

**Responsibilities**:

- `useDataMap` composable
- `ref`-like bindings for pointers
- Computed integration
- Plugin for app-wide store
- Devtools integration via Vue devtools

**Public API**:

```typescript
import type { Ref, ComputedRef, Plugin } from 'vue';

// Plugin
export const DataMapPlugin: Plugin<{ store: DataMap }>;

// Composables
export function useDataMap<T = unknown>(): DataMap<T>;

export function usePointerRef<V = unknown>(pointer: string): Ref<V>;

export function useSubscriptionRef<V = unknown>(
	path: string,
	options?: UseSubscriptionOptions,
): Ref<V>;

export function useComputedRef<V>(
	dependencies: string[],
	compute: (...values: unknown[]) => V,
): ComputedRef<V>;

export function useQueryRef<V>(
	path: string,
	compute: (matches: QueryMatch[]) => V,
): ComputedRef<V>;

// Utility
export function useBatch(): (fn: () => void) => void;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/core": "workspace:*"
	},
	"peerDependencies": {
		"vue": "^3.3.0"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── plugin.ts             # Vue plugin
├── composables/
│   ├── useDataMap.ts
│   ├── usePointerRef.ts
│   ├── useSubscriptionRef.ts
│   ├── useComputedRef.ts
│   └── useQueryRef.ts
├── devtools.ts           # Vue devtools integration
└── __tests__/
```

---

#### 11.3.10 `@data-map/solid`

**Purpose**: Solid.js integration with native signal interop.

**Role**: Framework integration for Solid.js applications.

**Responsibilities**:

- Leverage Solid's native signal system
- Bridge DataMap signals to Solid signals
- Store context and primitives
- Optimized fine-grained updates

**Public API**:

```typescript
import type { Accessor, Signal as SolidSignal } from 'solid-js';

// Context
export function DataMapProvider(props: {
	store: DataMap;
	children: JSX.Element;
}): JSX.Element;

// Primitives
export function useDataMap<T = unknown>(): DataMap<T>;

export function createPointerSignal<V = unknown>(
	pointer: string,
): SolidSignal<V>;

export function createSubscriptionAccessor<V = unknown>(
	path: string,
): Accessor<V>;

export function createComputedAccessor<V>(
	dependencies: string[],
	compute: (...values: unknown[]) => V,
): Accessor<V>;
```

**Dependencies**:

```json
{
	"dependencies": {
		"@data-map/core": "workspace:*"
	},
	"peerDependencies": {
		"solid-js": "^1.8.0"
	}
}
```

**File Structure**:

```
src/
├── index.ts              # Public exports
├── context.tsx           # Provider and context
├── primitives/
│   ├── createPointerSignal.ts
│   ├── createSubscriptionAccessor.ts
│   └── createComputedAccessor.ts
└── __tests__/
```

---

#### 11.3.11 `@data-map/benchmarks` (Existing)

**Purpose**: Comprehensive performance benchmarking suite.

**Role**: Performance validation and regression testing.

**Responsibilities**:

- Path access benchmarks
- Mutation benchmarks
- Subscription benchmarks
- Computed value benchmarks
- Array operation benchmarks
- Scale testing with memory profiling
- Comparison with competing libraries

---

### 11.4 Implementation Priority

The packages should be implemented in the following order to respect dependencies:

| Phase | Package                   | Priority | Rationale                                 |
| ----- | ------------------------- | -------- | ----------------------------------------- |
| 1     | `@data-map/signals`       | P0       | Zero-dependency foundation for reactivity |
| 1     | `@data-map/storage`       | P0       | Zero-dependency foundation for storage    |
| 2     | `@data-map/subscriptions` | P0       | Depends on storage, required by core      |
| 2     | `@data-map/arrays`        | P1       | Depends on signals, enhances storage      |
| 3     | `@data-map/computed`      | P1       | Bridges signals and storage               |
| 4     | `@data-map/core`          | P0       | Integration layer, main entry point       |
| 5     | `@data-map/react`         | P1       | Most common framework integration         |
| 5     | `@data-map/vue`           | P2       | Second most common integration            |
| 5     | `@data-map/solid`         | P2       | Growing framework, natural signal fit     |
| 6     | `@data-map/devtools`      | P2       | Development experience enhancement        |

### 11.5 Package Naming Convention

All packages follow the monorepo's naming conventions:

- **Scope**: `@data-map/` (new scope for this library)
- **Naming**: lowercase, hyphen-separated
- **Exports**: ESM-first with TypeScript declarations
- **Versioning**: Synchronized across all packages

### 11.6 Build Configuration

Each package uses the shared monorepo configuration:

```json
{
	"extends": "@lellimecnar/typescript-config/library.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src"
	}
}
```

Vite builds with the shared config:

```typescript
import { defineConfig } from '@lellimecnar/vite-config';
export default defineConfig({ entry: './src/index.ts' });
```

### 11.7 Testing Strategy

Each package maintains:

- **Unit tests**: Co-located `*.spec.ts` files
- **Integration tests**: `src/__tests__/integration.spec.ts`
- **Coverage thresholds**: 90% statements, 85% branches, 95% functions

Cross-package integration tests live in `@data-map/core`.

### 11.8 Migration Path from Existing Implementation

The current `@data-map/core` implementation will be refactored:

1. **Extract `@data-map/signals`**: Pull signal primitives into standalone package
2. **Extract `@data-map/storage`**: Move `FlatStore` and related utilities
3. **Extract `@data-map/subscriptions`**: Move subscription engine
4. **Refactor `@data-map/core`**: Re-integrate as facade importing from subsystems
5. **Add framework packages**: Build React/Vue/Solid bindings

This maintains backward compatibility while enabling tree-shaking and selective imports.

---

## Appendix A: JSON Path Pattern Compilation

### A.1 Pattern Syntax Support

| Pattern   | Example                | Complexity |
| --------- | ---------------------- | ---------- |
| Root      | `$`                    | O(1)       |
| Child     | `$.users`              | O(1)       |
| Index     | `$.users[0]`           | O(1)       |
| Wildcard  | `$.users[*]`           | O(n)       |
| Recursive | `$..name`              | O(n)       |
| Slice     | `$.users[0:5]`         | O(k)       |
| Filter    | `$.users[?(@.active)]` | O(n)       |
| Union     | `$.users[0,2,4]`       | O(k)       |

### A.2 Compilation Strategy

```typescript
function compileToStateMachine(path: string): StateMachine {
	const ast = parseJSONPath(path);

	return {
		states: buildStates(ast),
		transitions: buildTransitions(ast),

		match(pointer: string): boolean {
			let state = this.states.initial;
			const segments = parsePointer(pointer);

			for (const segment of segments) {
				const next = this.transitions.get(state)?.get(segment);
				if (!next) return false;
				state = next;
			}

			return this.states.accepting.has(state);
		},
	};
}
```

---

## Appendix B: Security Considerations

### B.1 Filter Expression Safety

Filter expressions (`[?(@.price < 10)]`) must be evaluated safely without `eval()`:

```typescript
// NEVER do this:
eval(`data.filter(item => ${expression})`); // Unsafe!

// Instead, use a safe expression evaluator:
import { evaluate } from '@jsonpath/filter-eval';

// Or use jsep with a custom interpreter:
import jsep from 'jsep';

function safeEvaluate(expr: string, context: unknown): boolean {
	const ast = jsep(expr);
	return interpretAST(ast, context, ALLOWED_OPERATORS);
}
```

### B.2 Prototype Pollution Prevention

```typescript
// Prevent prototype pollution in pointer parsing
function safeSetByPointer(obj: object, pointer: string, value: unknown): void {
	const segments = parsePointer(pointer);

	// Check for dangerous keys
	for (const segment of segments) {
		if (
			segment === '__proto__' ||
			segment === 'constructor' ||
			segment === 'prototype'
		) {
			throw new Error('Invalid pointer: prototype pollution attempt');
		}
	}

	setByPointer(obj, pointer, value);
}
```

---

## Appendix C: References

1. RFC 9535 - JSONPath: Query Expressions for JSON
2. RFC 6901 - JavaScript Object Notation (JSON) Pointer
3. RFC 6902 - JavaScript Object Notation (JSON) Patch
4. RFC 7396 - JSON Merge Patch
5. Okasaki, C. (1999) - Purely Functional Data Structures
6. Preact Signals - https://preactjs.com/guide/v10/signals/
7. mnemonist - https://yomguithereal.github.io/mnemonist/
8. Immutable.js - https://immutable-js.com/

---

## Revision History

| Version     | Date     | Changes     |
| ----------- | -------- | ----------- |
| 0.1.0-draft | Jan 2026 | Initial RFC |
