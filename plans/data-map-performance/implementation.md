# data-map-performance-optimization

## Goal

Implement the algorithmic performance improvements described in `plans/data-map-performance/plan.md`, with benchmarks + tests for each bottleneck, and final validation docs.

## Prerequisites

- Make sure you are on the `feature/data-map-performance-optimization` branch before beginning implementation.
- If the branch does not exist yet, create it from `master`.

### Tech Stack / Conventions

- Monorepo: pnpm + Turborepo
- Runtime: Node `^24`
- Package manager: pnpm `^9` (repo enforces `packageManager`)
- Language: TypeScript `~5.5`
- Tests/benchmarks: Vitest `^4` (benchmarks use `vitest bench`)

---

## Step-by-Step Instructions

### Step 1: Establish Performance Baselines (Targeted Bottlenecks)

**Goal**: Add a focused baseline benchmark file that measures each bottleneck directly, and register corresponding keys in `baseline.json`.

**Files**

- [ ] Create `packages/data-map/benchmarks/src/baselines/bottlenecks.baseline.bench.ts`
- [ ] Update `packages/data-map/benchmarks/baseline.json`

#### Step 1.1 — Add targeted bottleneck baseline benchmarks

- [x] Copy and paste the code below into `packages/data-map/benchmarks/src/baselines/bottlenecks.baseline.bench.ts`:

```ts
import { bench, describe } from 'vitest';

import { IndirectionLayer } from '@data-map/arrays';
import { FlatStore } from '@data-map/storage';
import { signal } from '@data-map/signals';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { queryFlat } from '@data-map/path';

describe('Baselines / Bottlenecks', () => {
	describe('PatternIndex scaling', () => {
		for (const patternCount of [10, 100, 500, 1000]) {
			const engine = new SubscriptionEngine();
			for (let i = 0; i < patternCount; i++) {
				// Patterns in this codebase are JSONPath strings.
				// `$.data.*` exercises wildcard matching.
				engine.subscribePattern('$.data.*', () => {});
			}

			bench(`bottlenecks.patternMatch.${patternCount}`, () => {
				// Measure matching/dispatch only (setup is outside the bench fn).
				engine.notify('/data/x', 1);
			});
		}
	});

	describe('queryFlat complexity', () => {
		const simpleStore = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const complexStore = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});

		bench('bottlenecks.queryFlat.simplePointerLike', () => {
			// pointer-iterator fast path
			void queryFlat(simpleStore, '$.users[0].name');
		});

		bench('bottlenecks.queryFlat.complexJsonPath', () => {
			// This intentionally represents the "fallback" class of queries.
			// `queryFlat` will materialize the root for recursive descent.
			void queryFlat(complexStore, '$..name');
		});
	});

	describe('Signal notification overhead', () => {
		for (const observerCount of [10, 100, 500, 1000]) {
			bench(`bottlenecks.signalNotify.${observerCount}`, () => {
				const s = signal(0);
				const unsubs: (() => void)[] = [];
				for (let i = 0; i < observerCount; i++) {
					unsubs.push(s.subscribe(() => {}));
				}
				s.value++;
				for (const u of unsubs) u();
			});
		}
	});

	describe('IndirectionLayer allocation', () => {
		bench('bottlenecks.indirection.allocateFresh', () => {
			const layer = new IndirectionLayer();
			for (let i = 0; i < 10_000; i++) layer.pushPhysical();
		});

		bench('bottlenecks.indirection.allocateAfterFrees', () => {
			const layer = new IndirectionLayer();
			for (let i = 0; i < 10_000; i++) layer.pushPhysical();
			for (let i = 0; i < 10_000; i++) layer.removeAt(layer.length - 1);
			for (let i = 0; i < 10_000; i++) layer.pushPhysical();
		});
	});
});
```

#### Step 1.2 — Register baseline keys

- [x] Copy and paste the code below into `packages/data-map/benchmarks/baseline.json` (this is the full file with additional entries appended at the end):

```json
{
	"storage.getSmall": {
		"opsPerSec": 0
	},
	"storage.setSmall": {
		"opsPerSec": 0
	},
	"storage.hasSmall": {
		"opsPerSec": 0
	},
	"storage.deleteSmall": {
		"opsPerSec": 0
	},
	"storage.toObjectSmall": {
		"opsPerSec": 0
	},
	"signals.signalRead": {
		"opsPerSec": 0
	},
	"signals.signalWrite": {
		"opsPerSec": 0
	},
	"signals.computedReadCached": {
		"opsPerSec": 0
	},
	"signals.computedReadDirty": {
		"opsPerSec": 0
	},
	"signals.batch100Writes": {
		"opsPerSec": 0
	},
	"signals.effectDispose": {
		"opsPerSec": 0
	},
	"subscriptions.subscribePointer": {
		"opsPerSec": 0
	},
	"subscriptions.subscribePattern": {
		"opsPerSec": 0
	},
	"subscriptions.notifyExact100": {
		"opsPerSec": 0
	},
	"subscriptions.notifyPattern10": {
		"opsPerSec": 0
	},
	"subscriptions.cleanup": {
		"opsPerSec": 0
	},
	"arrays.smartArrayPush": {
		"opsPerSec": 0
	},
	"arrays.smartArraySpliceMiddle": {
		"opsPerSec": 0
	},
	"arrays.gapBufferInsertMiddle": {
		"opsPerSec": 0
	},
	"arrays.gapBufferDeleteMiddle": {
		"opsPerSec": 0
	},
	"arrays.persistentVectorPush": {
		"opsPerSec": 0
	},
	"arrays.persistentVectorSetMiddle": {
		"opsPerSec": 0
	},
	"path.pointerGetSmall": {
		"opsPerSec": 0
	},
	"path.pointerSetSmall": {
		"opsPerSec": 0
	},
	"core.dataMapGetSmall": {
		"opsPerSec": 0
	},
	"core.dataMapSetSmall": {
		"opsPerSec": 0
	},
	"core.dataMapSubscribePointer": {
		"opsPerSec": 0
	},
	"core.dataMapBatch10Sets": {
		"opsPerSec": 0
	},
	"scale.flatStoreGetMedium": {
		"opsPerSec": 0
	},
	"scale.flatStoreSetMedium": {
		"opsPerSec": 0
	},
	"scale.dataMapSetMedium": {
		"opsPerSec": 0
	},
	"scale.dataMapSubscribeMedium": {
		"opsPerSec": 0
	},
	"memory.processMemoryUsage": {
		"opsPerSec": 0
	},

	"bottlenecks.patternMatch.10": {
		"opsPerSec": 0
	},
	"bottlenecks.patternMatch.100": {
		"opsPerSec": 0
	},
	"bottlenecks.patternMatch.500": {
		"opsPerSec": 0
	},
	"bottlenecks.patternMatch.1000": {
		"opsPerSec": 0
	},
	"bottlenecks.queryFlat.simplePointerLike": {
		"opsPerSec": 0
	},
	"bottlenecks.queryFlat.complexJsonPath": {
		"opsPerSec": 0
	},
	"bottlenecks.signalNotify.10": {
		"opsPerSec": 0
	},
	"bottlenecks.signalNotify.100": {
		"opsPerSec": 0
	},
	"bottlenecks.signalNotify.500": {
		"opsPerSec": 0
	},
	"bottlenecks.signalNotify.1000": {
		"opsPerSec": 0
	},
	"bottlenecks.indirection.allocateFresh": {
		"opsPerSec": 0
	},
	"bottlenecks.indirection.allocateAfterFrees": {
		"opsPerSec": 0
	}
}
```

##### Step 1 Verification Checklist

- [x] `pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts` runs successfully
- [x] The new `bottlenecks.*` bench names appear in the Vitest output

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
test(data-map-performance): add bottleneck baseline benches

Add targeted Vitest bench baselines for PatternIndex scaling, queryFlat fallback pressure, Signal notify overhead, and IndirectionLayer allocation.
Update baseline.json to register the new bottleneck keys.

completes: step 1 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 2: Implement Flag-Based Signal Notification (Reduce Allocation)

**Goal**: Remove per-notify `Array.from(...)` snapshots while preserving safety when subscribers/observers mutate subscriptions during notification.

**Files**

- [ ] Update `packages/data-map/signals/src/signal.ts`
- [ ] Update `packages/data-map/signals/src/__tests__/signals.spec.ts`

#### Step 2.1 — Update `SignalImpl` to defer mutations during notify

- [x] Copy and paste the code below into `packages/data-map/signals/src/signal.ts`:

```ts
import { isBatching, queueObserver } from './batch.js';
import { trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Signal as SignalType, Subscriber, Unsubscribe } from './types.js';

class SignalImpl<T> implements SignalType<T>, DependencySource {
	private _value: T;
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	private isNotifying = false;
	private pendingObserverAdd = new Set<Observer>();
	private pendingObserverRemove = new Set<Observer>();
	private pendingSubscriberAdd = new Set<Subscriber<T>>();
	private pendingSubscriberRemove = new Set<Subscriber<T>>();

	constructor(initial: T) {
		this._value = initial;
	}

	get value(): T {
		trackRead(this);
		return this._value;
	}

	set value(next: T) {
		if (Object.is(this._value, next)) return;
		this._value = next;
		this.notify();
	}

	peek(): T {
		return this._value;
	}

	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		if (this.isNotifying) {
			this.pendingSubscriberRemove.delete(subscriber);
			this.pendingSubscriberAdd.add(subscriber);
		} else {
			this.subscribers.add(subscriber);
		}

		return () => {
			if (this.isNotifying) {
				this.pendingSubscriberAdd.delete(subscriber);
				this.pendingSubscriberRemove.add(subscriber);
				return;
			}
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		if (this.isNotifying) {
			this.pendingObserverRemove.delete(observer);
			this.pendingObserverAdd.add(observer);
			return;
		}
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		if (this.isNotifying) {
			this.pendingObserverAdd.delete(observer);
			this.pendingObserverRemove.add(observer);
			return;
		}
		this.observers.delete(observer);
	}

	triggerObservers(): void {
		this.notify();
	}

	private flushPending(): void {
		if (this.pendingSubscriberAdd.size > 0) {
			for (const s of this.pendingSubscriberAdd) this.subscribers.add(s);
			this.pendingSubscriberAdd.clear();
		}
		if (this.pendingSubscriberRemove.size > 0) {
			for (const s of this.pendingSubscriberRemove) this.subscribers.delete(s);
			this.pendingSubscriberRemove.clear();
		}

		if (this.pendingObserverAdd.size > 0) {
			for (const o of this.pendingObserverAdd) this.observers.add(o);
			this.pendingObserverAdd.clear();
		}
		if (this.pendingObserverRemove.size > 0) {
			for (const o of this.pendingObserverRemove) this.observers.delete(o);
			this.pendingObserverRemove.clear();
		}
	}

	private notify(): void {
		this.isNotifying = true;
		try {
			// Iterate the Sets directly to avoid allocations.
			for (const sub of this.subscribers) sub(this._value);
			for (const obs of this.observers) {
				if (isBatching()) queueObserver(obs);
				else obs.onDependencyChanged();
			}
		} finally {
			this.isNotifying = false;
			this.flushPending();
		}
	}
}

export function signal<T>(initial: T): SignalType<T> {
	return new SignalImpl(initial);
}
```

#### Step 2.2 — Add re-entrancy / concurrent modification safety tests

- [x] Append the following tests to `packages/data-map/signals/src/__tests__/signals.spec.ts` (place them at the end of the existing `describe('signals', ...)` block):

```ts
it('subscribe during notification is deferred until the next notification', () => {
	const s = signal(0);
	const seen1: number[] = [];
	const seen2: number[] = [];
	let unsub2: (() => void) | undefined;

	s.subscribe((v) => {
		seen1.push(v);
		if (!unsub2) {
			unsub2 = s.subscribe((v2) => {
				seen2.push(v2);
			});
		}
	});

	s.value = 1;
	// New subscriber should not be invoked in the same notify cycle.
	expect(seen1).toEqual([1]);
	expect(seen2).toEqual([]);

	s.value = 2;
	expect(seen1).toEqual([1, 2]);
	expect(seen2).toEqual([2]);

	unsub2?.();
});

it('unsubscribe during notification does not break iteration and prevents future notifications', () => {
	const s = signal(0);
	const seen: number[] = [];
	let unsub: (() => void) | undefined;

	unsub = s.subscribe((v) => {
		seen.push(v);
		unsub?.();
	});

	s.value = 1;
	s.value = 2;
	expect(seen).toEqual([1]);
});

it('observer add/remove during notification is deferred safely', () => {
	const s = signal(0) as any;
	const calls: string[] = [];

	const obs1 = {
		onDependencyChanged() {
			calls.push('obs1');
			s.addObserver(obs2);
		},
	};

	const obs2 = {
		onDependencyChanged() {
			calls.push('obs2');
			s.removeObserver(obs1);
		},
	};

	s.addObserver(obs1);
	s.value = 1;
	// Only obs1 is present at start of cycle.
	expect(calls).toEqual(['obs1']);

	s.value = 2;
	// obs2 was added after cycle 1, obs1 removed after obs2 ran.
	expect(calls).toEqual(['obs1', 'obs1', 'obs2']);
});
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @data-map/signals test` passes
- [x] `pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts` shows an improvement for `bottlenecks.signalNotify.*`

#### Step 2 STOP & COMMIT

```txt
perf(data-map-signals): avoid notify snapshots

Replace Array.from() snapshot iteration with flag-based iteration safety.
Defer subscriber/observer mutations during notify and flush after.
Add tests for subscribe/unsubscribe and observer mutation during notify.

completes: step 2 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 3: Implement IndirectionLayer O(1) Allocation (Free list + counter)

**Goal**: Remove the O(n) `Set` scan in `nextPhysicalIndex()`.

**Files**

- [ ] Update `packages/data-map/arrays/src/indirection-layer.ts`
- [ ] Create `packages/data-map/arrays/src/__tests__/indirection-layer.spec.ts`

#### Step 3.1 — Update IndirectionLayer to use a counter

- [x] Copy and paste the code below into `packages/data-map/arrays/src/indirection-layer.ts`:

```ts
import type { IndirectionState } from './types.js';

export class IndirectionLayer {
	private state: IndirectionState;
	private nextPhysicalCounter: number;

	constructor(initialLength = 0) {
		this.state = {
			logicalToPhysical: Array.from({ length: initialLength }, (_, i) => i),
			freeSlots: [],
		};
		this.nextPhysicalCounter = initialLength;
	}

	get length(): number {
		return this.state.logicalToPhysical.length;
	}

	getPhysical(logicalIndex: number): number {
		const idx = this.state.logicalToPhysical[logicalIndex];
		if (typeof idx === 'undefined') {
			throw new Error(`Invalid logical index: ${logicalIndex}`);
		}
		return idx;
	}

	pushPhysical(): number {
		const reused = this.state.freeSlots.pop();
		const physical =
			typeof reused === 'number' ? reused : this.nextPhysicalCounter++;
		this.state.logicalToPhysical.push(physical);
		return physical;
	}

	insertAt(logicalIndex: number): number {
		const reused = this.state.freeSlots.pop();
		const physical =
			typeof reused === 'number' ? reused : this.nextPhysicalCounter++;
		this.state.logicalToPhysical.splice(logicalIndex, 0, physical);
		return physical;
	}

	removeAt(logicalIndex: number): number {
		const removed = this.state.logicalToPhysical.splice(logicalIndex, 1);
		const physical = removed[0];
		if (physical !== undefined) {
			this.state.freeSlots.push(physical);
		}
		if (physical === undefined) {
			throw new Error(`No physical index at logical index ${logicalIndex}`);
		}
		return physical;
	}
}
```

#### Step 3.2 — Add direct unit tests for reuse behavior

- [x] Create `packages/data-map/arrays/src/__tests__/indirection-layer.spec.ts` with the code below:

```ts
import { describe, expect, it } from 'vitest';

import { IndirectionLayer } from '../indirection-layer.js';

describe('IndirectionLayer', () => {
	it('allocates sequential physical indices initially', () => {
		const layer = new IndirectionLayer();
		expect(layer.pushPhysical()).toBe(0);
		expect(layer.pushPhysical()).toBe(1);
		expect(layer.pushPhysical()).toBe(2);
	});

	it('reuses freed indices from the free list', () => {
		const layer = new IndirectionLayer();
		layer.pushPhysical(); // 0
		layer.pushPhysical(); // 1
		layer.pushPhysical(); // 2

		const removed = layer.removeAt(1);
		expect(removed).toBe(1);

		// Next allocation should reuse the freed slot.
		expect(layer.pushPhysical()).toBe(1);
	});

	it('supports constructor initialLength and continues counter from there', () => {
		const layer = new IndirectionLayer(3);
		// existing mapping uses [0,1,2] so next should be 3
		expect(layer.pushPhysical()).toBe(3);
	});
});
```

##### Step 3 Verification Checklist

- [x] `pnpm --filter @data-map/arrays test` passes
- [x] `pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts` improves `bottlenecks.indirection.*`

#### Step 3 STOP & COMMIT

```txt
perf(data-map-arrays): make IndirectionLayer allocation O(1)

Replace O(n) nextPhysicalIndex() scanning with a counter + freeSlots reuse.
Add direct IndirectionLayer unit tests for reuse and counter behavior.

completes: step 3 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 4: Implement Lazy FlatStore.keys() (Avoid eager sort + array)

**Goal**: Remove eager `Array.from(...).sort()` from `FlatStore.keys()` and provide `sortedKeys()` only for call sites that truly need ordering.

**Files**

- [ ] Update `packages/data-map/storage/src/flat-store.ts`
- [ ] Update `packages/data-map/storage/src/__tests__/flat-store.spec.ts`

#### Step 4.1 — Update keys() to iterate lazily, add sortedKeys()

- [x] In `packages/data-map/storage/src/flat-store.ts`, replace the existing `*keys(...)` method with the following implementation, and add the `sortedKeys(...)` method immediately after it:

```ts
	*keys(prefix?: Pointer): IterableIterator<Pointer> {
		const base = prefix ?? '';
		const basePrefix = base === '' ? '' : `${base}/`;

		for (const key of this.data.keys()) {
			if (base === '') {
				yield key;
				continue;
			}
			if (key === base || key.startsWith(basePrefix)) yield key;
		}
	}

	sortedKeys(prefix?: Pointer): Pointer[] {
		return Array.from(this.keys(prefix)).sort();
	}
```

#### Step 4.2 — Extend FlatStore tests for sortedKeys()

- [x] In `packages/data-map/storage/src/__tests__/flat-store.spec.ts`, append the following assertions inside the existing `it('keys/entries can be iterated with optional prefix', ...)` test:

```ts
expect(s.sortedKeys('/users')).toEqual(['/users/0/name', '/users/1/name']);
```

##### Step 4 Verification Checklist

- [x] `pnpm --filter @data-map/storage test` passes
- [x] `FlatStore.keys()` begins yielding without sorting all keys

#### Step 4 STOP & COMMIT

```txt
perf(data-map-storage): make FlatStore.keys lazy

Replace eager Array.from().sort() in FlatStore.keys() with a lazy iterator.
Introduce sortedKeys() for callers that require ordering.
Update FlatStore tests accordingly.

completes: step 4 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 5: Implement O(1) LRU QueryCache

**Goal**: Replace the O(n) filter-based LRU tracking in `QueryCache` with an O(1) doubly-linked list + map.

**Files**

- [ ] Update `packages/data-map/path/src/cache.ts`
- [ ] Create `packages/data-map/path/src/__tests__/cache.spec.ts`

#### Step 5.1 — Replace QueryCache implementation

- [x] Copy and paste the code below into `packages/data-map/path/src/cache.ts`:

```ts
type Entry<V> = {
	key: string;
	value: V;
	prev: Entry<V> | null;
	next: Entry<V> | null;
};

export class QueryCache<T> {
	private readonly capacity: number;
	private readonly map = new Map<string, Entry<T>>();
	private head: Entry<T> | null = null;
	private tail: Entry<T> | null = null;

	constructor(maxSize = 500) {
		this.capacity = maxSize;
	}

	get(key: string): T | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;
		this.moveToFront(entry);
		return entry.value;
	}

	set(key: string, value: T): void {
		const existing = this.map.get(key);
		if (existing) {
			existing.value = value;
			this.moveToFront(existing);
			return;
		}

		const entry: Entry<T> = { key, value, prev: null, next: null };
		this.map.set(key, entry);
		this.addToFront(entry);

		if (this.map.size > this.capacity) {
			this.evictTail();
		}
	}

	private addToFront(entry: Entry<T>): void {
		entry.prev = null;
		entry.next = this.head;
		if (this.head) this.head.prev = entry;
		this.head = entry;
		if (!this.tail) this.tail = entry;
	}

	private remove(entry: Entry<T>): void {
		const { prev, next } = entry;
		if (prev) prev.next = next;
		if (next) next.prev = prev;
		if (this.head === entry) this.head = next;
		if (this.tail === entry) this.tail = prev;
		entry.prev = null;
		entry.next = null;
	}

	private moveToFront(entry: Entry<T>): void {
		if (this.head === entry) return;
		this.remove(entry);
		this.addToFront(entry);
	}

	private evictTail(): void {
		const tail = this.tail;
		if (!tail) return;
		this.remove(tail);
		this.map.delete(tail.key);
	}
}
```

#### Step 5.2 — Add LRU behavior tests

- [x] Create `packages/data-map/path/src/__tests__/cache.spec.ts` with the code below:

```ts
import { describe, expect, it } from 'vitest';

import { QueryCache } from '../cache.js';

describe('QueryCache (LRU)', () => {
	it('returns undefined on miss', () => {
		const c = new QueryCache<number>(2);
		expect(c.get('x')).toBeUndefined();
	});

	it('returns value on hit and updates recency', () => {
		const c = new QueryCache<number>(2);
		c.set('a', 1);
		c.set('b', 2);
		expect(c.get('a')).toBe(1);

		// Accessing a makes b least-recently used.
		c.set('c', 3);
		expect(c.get('b')).toBeUndefined();
		expect(c.get('a')).toBe(1);
		expect(c.get('c')).toBe(3);
	});

	it('updates existing keys without growing size', () => {
		const c = new QueryCache<number>(2);
		c.set('a', 1);
		c.set('a', 2);
		expect(c.get('a')).toBe(2);
	});
});
```

##### Step 5 Verification Checklist

- [x] `pnpm --filter @data-map/path test` passes
- [x] A stress loop of `get/set` is O(n) total, not O(n²)

#### Step 5 STOP & COMMIT

```txt
perf(data-map-path): make QueryCache LRU O(1)

Replace filter-based accessOrder LRU tracking with a linked-list + map.
Add unit tests validating eviction and recency updates.

completes: step 5 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 6: Implement PatternTrie for O(k) Pattern Matching

**Goal**: Replace PatternIndex’s linear scan over all compiled patterns with a segment trie that supports `*` and `**` semantics.

**Files**

- [ ] Create `packages/data-map/subscriptions/src/pattern-trie.ts`
- [ ] Update `packages/data-map/subscriptions/src/pattern-index.ts`
- [ ] Create `packages/data-map/subscriptions/src/__tests__/pattern-trie.spec.ts`

#### Step 6.1 — Add PatternTrie implementation

- [x] Create `packages/data-map/subscriptions/src/pattern-trie.ts` with the code below:

```ts
import { validateQuery } from '@jsonpath/jsonpath';

import type { Pointer } from './types.js';

type Node<T> = {
	id: number;
	children: Map<string, Node<T>>;
	wildcardChild: Node<T> | null;
	recursiveChild: Node<T> | null;
	values: Set<T>;
};

function createNode<T>(id: number): Node<T> {
	return {
		id,
		children: new Map(),
		wildcardChild: null,
		recursiveChild: null,
		values: new Set(),
	};
}

function patternToSegments(pattern: string): string[] {
	const v = validateQuery(pattern);
	if (!v.valid) throw new Error(v.error ?? 'Invalid JSONPath');

	// Special-case `$..name` style patterns (recursive descent).
	if (pattern.startsWith('$..')) {
		const tail = pattern.slice(3);
		const seg = tail.startsWith('.') ? tail.slice(1) : tail;
		if (!seg) return ['**'];
		return ['**', seg];
	}

	// Minimal JSONPath pattern support:
	// - $.a.b
	// - $.a[*].b
	// - $.a.*.b
	let ptrish = pattern;
	ptrish = ptrish.replace(/^\$\.?/, '/');
	ptrish = ptrish.replaceAll('..', '/**/');
	ptrish = ptrish.replaceAll('[*]', '/*');
	ptrish = ptrish.replaceAll('.', '/');

	return ptrish.split('/').filter(Boolean);
}

function isTrieEligible(pattern: string): boolean {
	// Keep trie semantics aligned with the existing minimal compiler:
	// Anything outside the minimal subset is better handled by regex fallback.
	if (pattern.includes('?') || pattern.includes('(') || pattern.includes(')')) {
		return false;
	}
	// Only allow [*] bracket form; reject other bracket constructs.
	const bracket = pattern.match(/\[[^\]]*\]/g) ?? [];
	for (const b of bracket) {
		if (b !== '[*]') return false;
	}
	return true;
}

export class PatternTrie<T> {
	private nextId = 1;
	private root: Node<T> = createNode(0);

	add(pattern: string, value: T): { segments: string[]; eligible: boolean } {
		const eligible = isTrieEligible(pattern);
		if (!eligible) return { segments: [], eligible: false };
		const segments = patternToSegments(pattern);
		let node = this.root;
		for (const seg of segments) {
			if (seg === '*') {
				node.wildcardChild ??= createNode(this.nextId++);
				node = node.wildcardChild;
				continue;
			}

			if (seg === '**') {
				node.recursiveChild ??= createNode(this.nextId++);
				node = node.recursiveChild;
				continue;
			}

			let child = node.children.get(seg);
			if (!child) {
				child = createNode(this.nextId++);
				node.children.set(seg, child);
			}
			node = child;
		}
		node.values.add(value);
		return { segments, eligible: true };
	}

	remove(segments: string[], value: T): void {
		if (segments.length === 0) return;
		const path: Node<T>[] = [this.root];
		let node = this.root;

		for (const seg of segments) {
			let next: Node<T> | null = null;
			if (seg === '*') next = node.wildcardChild;
			else if (seg === '**') next = node.recursiveChild;
			else next = node.children.get(seg) ?? null;
			if (!next) return;
			node = next;
			path.push(node);
		}

		node.values.delete(value);

		// Best-effort prune: walk backwards and remove empty leaf edges.
		for (let i = segments.length - 1; i >= 0; i--) {
			const parent = path[i]!;
			const child = path[i + 1]!;
			const seg = segments[i]!;

			const childEmpty =
				child.values.size === 0 &&
				child.children.size === 0 &&
				!child.wildcardChild &&
				!child.recursiveChild;

			if (!childEmpty) break;

			if (seg === '*') parent.wildcardChild = null;
			else if (seg === '**') parent.recursiveChild = null;
			else parent.children.delete(seg);
		}
	}

	match(pointer: Pointer): Set<T> {
		const segments = pointer.split('/').filter(Boolean);
		const results = new Set<T>();

		type State = { node: Node<T>; index: number };
		const stack: State[] = [{ node: this.root, index: 0 }];
		const visited = new Set<string>();

		while (stack.length > 0) {
			const state = stack.pop();
			if (!state) break;
			const { node, index } = state;
			const key = `${node.id}:${index}`;
			if (visited.has(key)) continue;
			visited.add(key);

			if (index === segments.length) {
				for (const v of node.values) results.add(v);

				// `**` can also match empty suffix.
				if (node.recursiveChild) {
					stack.push({ node: node.recursiveChild, index });
				}
				continue;
			}

			const seg = segments[index]!;

			const exact = node.children.get(seg);
			if (exact) stack.push({ node: exact, index: index + 1 });

			if (node.wildcardChild) {
				stack.push({ node: node.wildcardChild, index: index + 1 });
			}

			if (node.recursiveChild) {
				// `**` matches zero segments: advance to the recursive child
				stack.push({ node: node.recursiveChild, index });
				// `**` matches one segment: stay in recursive child, advance pointer
				stack.push({ node: node.recursiveChild, index: index + 1 });
			}
		}

		return results;
	}
}
```

#### Step 6.2 — Integrate PatternTrie into PatternIndex

- [x] Copy and paste the code below into `packages/data-map/subscriptions/src/pattern-index.ts`:

```ts
import type { CompiledPattern, Pointer, Subscription } from './types.js';
import { compilePattern } from './pattern-compiler.js';
import { PatternTrie } from './pattern-trie.js';

export class PatternIndex {
	private trie = new PatternTrie<Subscription>();
	private trieEntries = new Map<
		symbol,
		{ sub: Subscription; trieSegments: string[] }
	>();
	private fallbackEntries = new Map<
		symbol,
		{ compiled: CompiledPattern; sub: Subscription }
	>();

	add(sub: Subscription): void {
		const trieRes = this.trie.add(sub.pattern, sub);
		if (trieRes.eligible) {
			this.trieEntries.set(sub.id, {
				sub,
				trieSegments: trieRes.segments,
			});
			return;
		}
		const compiled = compilePattern(sub.pattern);
		this.fallbackEntries.set(sub.id, { compiled, sub });
	}

	delete(sub: Subscription): void {
		const trieEntry = this.trieEntries.get(sub.id);
		if (trieEntry) {
			this.trie.remove(trieEntry.trieSegments, sub);
			this.trieEntries.delete(sub.id);
			return;
		}
		this.fallbackEntries.delete(sub.id);
	}

	match(pointer: Pointer): Subscription[] {
		const out = new Set<Subscription>();

		// Fast path: trie-eligible patterns.
		for (const sub of this.trie.match(pointer)) out.add(sub);

		// Compatibility fallback: patterns that are not trie-eligible.
		for (const entry of this.fallbackEntries.values()) {
			if (entry.compiled.matchesPointer(pointer)) out.add(entry.sub);
		}

		return Array.from(out);
	}
}
```

#### Step 6.3 — Add PatternTrie unit tests

- [x] Create `packages/data-map/subscriptions/src/__tests__/pattern-trie.spec.ts` with the code below:

```ts
import { describe, expect, it } from 'vitest';

import { PatternTrie } from '../pattern-trie.js';

describe('PatternTrie', () => {
	it('matches exact segments', () => {
		const trie = new PatternTrie<string>();
		trie.add('$.users[*].name', 'v');
		expect(Array.from(trie.match('/users/0/name'))).toEqual(['v']);
		expect(Array.from(trie.match('/users/0/age'))).toEqual([]);
	});

	it('matches single wildcard (*) segments', () => {
		const trie = new PatternTrie<string>();
		trie.add('$.users[*].name', 'v');
		expect(Array.from(trie.match('/users/123/name'))).toEqual(['v']);
	});

	it('matches recursive descent via ** conversion', () => {
		const trie = new PatternTrie<string>();
		trie.add('$..name', 'v');
		expect(Array.from(trie.match('/users/0/name'))).toEqual(['v']);
		expect(Array.from(trie.match('/org/name'))).toEqual(['v']);
		expect(Array.from(trie.match('/org/title'))).toEqual([]);
	});

	it('supports removing patterns', () => {
		const trie = new PatternTrie<string>();
		const a = trie.add('$.users[*].name', 'a');
		expect(a.eligible).toBe(true);
		expect(Array.from(trie.match('/users/0/name'))).toEqual(['a']);
		trie.remove(a.segments, 'a');
		expect(Array.from(trie.match('/users/0/name'))).toEqual([]);
	});
});
```

##### Step 6 Verification Checklist

- [x] `pnpm --filter @data-map/subscriptions test` passes
- [x] `pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts` shows a major improvement for `bottlenecks.patternMatch.*`

#### Step 6 STOP & COMMIT

```txt
perf(data-map-subscriptions): add PatternTrie to avoid O(p) scans

Add a segment-based PatternTrie supporting * and ** patterns.
Integrate PatternTrie into PatternIndex with a regex fallback for non-eligible patterns.
Add PatternTrie unit tests.

completes: step 6 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 7: Reduce queryFlat() Fallbacks + Add Prefix Index for Efficient Keys/Expansion

**Goal**: Avoid full materialization for common wildcard queries and reduce the cost of wildcard expansion by making `keys(prefix)` efficient.

This step has two parts:

1. Extend the "simple" JSONPath parser to support property wildcards (`.*` and `['*']`)
2. Add a prefix index to `FlatStore` so `keys(prefix)` no longer scans the whole keyset

**Files**

- [x] Create `packages/data-map/storage/src/prefix-index.ts`
- [x] Update `packages/data-map/storage/src/flat-store.ts`
- [x] Update `packages/data-map/path/src/pointer-iterator.ts`
- [x] Update `packages/data-map/path/src/__tests__/query-flat.spec.ts`

#### Step 7.1 — Add PrefixIndex implementation (storage)

- [x] Create `packages/data-map/storage/src/prefix-index.ts` with the code below:

```ts
import { pointerToSegments, segmentsToPointer } from './pointer-utils.js';
import type { Pointer } from './types.js';

export class PrefixIndex {
	private byPrefix = new Map<Pointer, Set<Pointer>>();

	clear(): void {
		this.byPrefix.clear();
	}

	rebuild(keys: Iterable<Pointer>): void {
		this.clear();
		for (const key of keys) this.add(key);
	}

	add(pointer: Pointer): void {
		const segs = pointerToSegments(pointer);
		for (let i = 0; i <= segs.length; i++) {
			const prefix = segmentsToPointer(segs.slice(0, i));
			let set = this.byPrefix.get(prefix);
			if (!set) {
				set = new Set();
				this.byPrefix.set(prefix, set);
			}
			set.add(pointer);
		}
	}

	remove(pointer: Pointer): void {
		const segs = pointerToSegments(pointer);
		for (let i = 0; i <= segs.length; i++) {
			const prefix = segmentsToPointer(segs.slice(0, i));
			const set = this.byPrefix.get(prefix);
			if (!set) continue;
			set.delete(pointer);
			if (set.size === 0) this.byPrefix.delete(prefix);
		}
	}

	*keys(prefix?: Pointer): IterableIterator<Pointer> {
		const base = prefix ?? '';
		const set = this.byPrefix.get(base);
		if (!set) return;
		for (const key of set) yield key;
	}
}
```

#### Step 7.2 — Integrate PrefixIndex into FlatStore

- [x] In `packages/data-map/storage/src/flat-store.ts`, apply all of the following edits:

1. Add this import near the top:

```ts
import { PrefixIndex } from './prefix-index.js';
```

2. Add a new field on the class:

```ts
	private prefixIndex = new PrefixIndex();
```

3. In the constructor, after `ingestNested(...)`, rebuild the index:

```ts
this.prefixIndex.rebuild(this.data.keys());
```

4. In `set(...)`, after `this.data.set(pointer, value);`, add:

```ts
this.prefixIndex.add(pointer);
```

5. In `delete(...)`, after a successful delete, add:

```ts
this.prefixIndex.remove(pointer);
```

6. In `setDeep(...)`, after `ingestNested(...)` and before incrementing `_version`, rebuild the index:

```ts
this.prefixIndex.rebuild(this.data.keys());
```

7. In `ingest(...)`, after `ingestNested(...)` and before incrementing `_version`, rebuild the index:

```ts
this.prefixIndex.rebuild(this.data.keys());
```

8. Replace the `*keys(...)` method implementation with:

```ts
	*keys(prefix?: Pointer): IterableIterator<Pointer> {
		// Use the prefix index for efficient subtree iteration.
		yield* this.prefixIndex.keys(prefix);
	}
```

9. Keep `sortedKeys(...)` from Step 4 (it should continue to work unchanged).

#### Step 7.3 — Extend simple JSONPath parsing to support property wildcards

- [x] Copy and paste the code below into `packages/data-map/path/src/pointer-iterator.ts`:

```ts
import type { Pointer } from './types.js';

export type SimpleJsonPathToken =
	| { type: 'prop'; key: string }
	| { type: 'index'; index: number }
	| { type: 'wildcardIndex' }
	| { type: 'wildcardProp' };

export interface PointerIterableStore {
	keys: (prefix?: Pointer) => IterableIterator<Pointer>;
}

function isDigit(c: string): boolean {
	return c >= '0' && c <= '9';
}

function isIdentStart(c: string): boolean {
	return /[A-Za-z_$]/.test(c);
}

function isIdentContinue(c: string): boolean {
	return /[A-Za-z0-9_$]/.test(c);
}

function escapePointerSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

function parseQuotedString(
	input: string,
	start: number,
): {
	value: string;
	end: number;
} | null {
	const quote = input[start];
	if (quote !== '"' && quote !== "'") return null;
	let i = start + 1;
	let out = '';
	while (i < input.length) {
		const ch = input[i] ?? '';
		if (ch === quote) return { value: out, end: i + 1 };
		if (ch === '\\') {
			const next = input[i + 1] ?? '';
			out += next;
			i += 2;
			continue;
		}
		out += ch;
		i++;
	}
	return null;
}

/**
 * Parses a restricted JSONPath subset that can be executed directly against a
 * flat pointer store without materializing the full object.
 *
 * Supported:
 * - $ (root)
 * - .prop
 * - .*
 * - ['prop'] / ["prop"]
 * - ['*'] / ["*"]
 * - [0]
 * - [*]
 *
 * Everything else (filters, unions, slices, recursive descent, functions, etc)
 * returns null.
 */
export function parseSimpleJsonPath(
	path: string,
): SimpleJsonPathToken[] | null {
	if (!path.startsWith('$')) return null;
	let i = 1;
	const tokens: SimpleJsonPathToken[] = [];

	while (i < path.length) {
		const ch = path[i] ?? '';
		if (ch === '.') {
			if ((path[i + 1] ?? '') === '.') return null; // recursive descent
			i++;
			const start = i;
			if ((path[i] ?? '') === '*') {
				i++;
				tokens.push({ type: 'wildcardProp' });
				continue;
			}
			if (!isIdentStart(path[i] ?? '')) return null;
			i++;
			while (i < path.length && isIdentContinue(path[i] ?? '')) i++;
			const key = path.slice(start, i);
			tokens.push({ type: 'prop', key });
			continue;
		}

		if (ch === '[') {
			i++;
			const next = path[i] ?? '';
			if (next === '*') {
				i++;
				if ((path[i] ?? '') !== ']') return null;
				i++;
				tokens.push({ type: 'wildcardIndex' });
				continue;
			}

			if (next === '"' || next === "'") {
				const parsed = parseQuotedString(path, i);
				if (!parsed) return null;
				i = parsed.end;
				if ((path[i] ?? '') !== ']') return null;
				i++;
				if (parsed.value === '*') {
					tokens.push({ type: 'wildcardProp' });
				} else {
					tokens.push({ type: 'prop', key: parsed.value });
				}
				continue;
			}

			if (isDigit(next)) {
				const start = i;
				while (i < path.length && isDigit(path[i] ?? '')) i++;
				const num = Number(path.slice(start, i));
				if (!Number.isFinite(num)) return null;
				if ((path[i] ?? '') !== ']') return null;
				i++;
				tokens.push({ type: 'index', index: num });
				continue;
			}

			return null;
		}

		return null;
	}

	return tokens;
}

function collectImmediateChildSegments(
	store: PointerIterableStore,
	basePointer: Pointer,
): string[] {
	const out = new Set<string>();
	const prefix = basePointer === '' ? '/' : `${basePointer}/`;

	for (const key of store.keys(basePointer)) {
		if (!key.startsWith(prefix)) continue;
		const rest = key.slice(prefix.length);
		const seg = rest.split('/')[0];
		if (seg && seg.length > 0) out.add(seg);
	}

	return Array.from(out.values());
}

export function* iteratePointersForSimpleJsonPath(
	store: PointerIterableStore,
	tokens: SimpleJsonPathToken[],
): IterableIterator<Pointer> {
	let pointers: Pointer[] = [''];

	// NOTE: The wildcard behavior below assumes DataMap/FlatStore pointers follow the
	// convention that numeric path segments represent array indices. If you store
	// objects with numeric-looking keys (e.g. { "2024": ... }), wildcardProp will
	// not enumerate those keys in the fast-path.

	for (const token of tokens) {
		if (token.type === 'prop') {
			const esc = escapePointerSegment(token.key);
			pointers = pointers.map((p) => `${p}/${esc}`);
			continue;
		}

		if (token.type === 'index') {
			pointers = pointers.map((p) => `${p}/${token.index}`);
			continue;
		}

		if (token.type === 'wildcardIndex') {
			const next: Pointer[] = [];
			for (const base of pointers) {
				const children = collectImmediateChildSegments(store, base)
					.filter((s) => /^\d+$/.test(s))
					.sort((a, b) => Number(a) - Number(b));
				for (const seg of children) {
					next.push(`${base}/${seg}`);
				}
			}
			pointers = next;
			continue;
		}

		// wildcardProp
		const next: Pointer[] = [];
		for (const base of pointers) {
			const children = collectImmediateChildSegments(store, base)
				.filter((s) => !/^\d+$/.test(s))
				.sort();
			for (const seg of children) {
				next.push(`${base}/${seg}`);
			}
		}
		pointers = next;
	}

	for (const p of pointers) yield p;
}
```

#### Step 7.4 — Add tests ensuring wildcard props avoid full materialization

- [x] Append this test to `packages/data-map/path/src/__tests__/query-flat.spec.ts`:

```ts
it('fast-path: supports property wildcards without full materialization', () => {
	const inner = new FlatStore({
		users: [
			{ name: 'Alice', age: 1 },
			{ name: 'Bob', age: 2 },
		],
	});

	const store = {
		get: (p: string) => inner.get(p),
		has: (p: string) => inner.has(p),
		keys: (prefix?: string) => inner.keys(prefix),
		getObject: (_p: string) => {
			throw new Error('getObject("") should not be used for this query');
		},
	};

	const res = queryFlat(store, '$.users[*].*');
	// Values can be in any order, but should include both properties for both users.
	expect(new Set(res.pointers)).toEqual(
		new Set(['/users/0/name', '/users/0/age', '/users/1/name', '/users/1/age']),
	);
	expect(new Set(res.values as any[])).toEqual(new Set(['Alice', 1, 'Bob', 2]));
});
```

##### Step 7 Verification Checklist

- [x] `pnpm --filter @data-map/storage test` passes
- [x] `pnpm --filter @data-map/path test` passes
- [x] `pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts` improves `bottlenecks.queryFlat.*` indirectly (lower materialization pressure)

#### Step 7 STOP & COMMIT

```txt
perf(data-map-path,storage): reduce queryFlat fallbacks with prefix indexing

Add PrefixIndex to FlatStore for efficient keys(prefix) iteration.
Extend simple JSONPath parsing to support property wildcards (.* and ['*']).
Add queryFlat tests ensuring wildcard props avoid full materialization.

completes: step 7 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 8: Implement Tree-Based PersistentVector (Optional)

**Goal**: Replace naive O(n) array copies in `PersistentVector.push()` and `PersistentVector.set()` with a 32-way persistent vector.

**Files**

- [ ] Update `packages/data-map/arrays/src/persistent-vector.ts`
- [ ] Create `packages/data-map/arrays/src/__tests__/persistent-vector.spec.ts`

#### Step 8.1 — Replace PersistentVector with a 32-way persistent implementation (API-compatible)

- [ ] Copy and paste the code below into `packages/data-map/arrays/src/persistent-vector.ts`:

```ts
const BITS = 5;
const WIDTH = 1 << BITS; // 32
const MASK = WIDTH - 1;

type Leaf<T> = T[];
type Node<T> = Array<Node<T> | Leaf<T>>;

type Internal<T> = {
	root: Node<T>;
	tail: Leaf<T>;
	size: number;
	shift: number;
};

function cloneNode<T>(node: Node<T>): Node<T> {
	return node.slice();
}

function cloneLeaf<T>(leaf: Leaf<T>): Leaf<T> {
	return leaf.slice();
}

function newPath<T>(level: number, leaf: Leaf<T>): Node<T> {
	if (level === 0) return [leaf];
	return [newPath(level - BITS, leaf)];
}

function pushTail<T>(
	level: number,
	parent: Node<T>,
	tailNode: Leaf<T>,
	index: number,
): Node<T> {
	const ret = cloneNode(parent);
	const subIdx = (index >>> level) & MASK;

	if (level === BITS) {
		ret[subIdx] = tailNode;
		return ret;
	}

	const child = parent[subIdx];
	if (child) {
		ret[subIdx] = pushTail(level - BITS, child as Node<T>, tailNode, index);
		return ret;
	}

	ret[subIdx] = newPath(level - BITS, tailNode);
	return ret;
}

function arrayFor<T>(root: Node<T>, shift: number, index: number): Leaf<T> {
	let node: any = root;
	for (let level = shift; level > BITS; level -= BITS) {
		node = node[(index >>> level) & MASK];
	}
	return node[(index >>> BITS) & MASK] as Leaf<T>;
}

function doAssoc<T>(
	level: number,
	node: Node<T>,
	index: number,
	value: T,
): Node<T> {
	const ret = cloneNode(node);
	const subIdx = (index >>> level) & MASK;
	if (level === BITS) {
		const leaf = node[subIdx] as Leaf<T>;
		const nextLeaf = cloneLeaf(leaf);
		nextLeaf[index & MASK] = value;
		ret[subIdx] = nextLeaf;
		return ret;
	}

	ret[subIdx] = doAssoc(level - BITS, node[subIdx] as Node<T>, index, value);
	return ret;
}

export class PersistentVector<T> {
	private readonly root: Node<T>;
	private readonly tail: Leaf<T>;
	private readonly size: number;
	private readonly shift: number;

	constructor(data: readonly T[] = [], internal?: Internal<T>) {
		if (internal) {
			this.root = internal.root;
			this.tail = internal.tail;
			this.size = internal.size;
			this.shift = internal.shift;
			return;
		}

		let v = PersistentVector.empty<T>();
		for (const x of data) v = v.push(x);
		this.root = v.root;
		this.tail = v.tail;
		this.size = v.size;
		this.shift = v.shift;
	}

	private static empty<T>(): PersistentVector<T> {
		return new PersistentVector<T>([], {
			root: [],
			tail: [],
			size: 0,
			shift: BITS,
		});
	}

	private static fromInternal<T>(internal: Internal<T>): PersistentVector<T> {
		return new PersistentVector<T>([], internal);
	}

	get length(): number {
		return this.size;
	}

	get(index: number): T | undefined {
		if (index < 0 || index >= this.size) return undefined;
		if (index >= this.tailOffset()) {
			return this.tail[index & MASK];
		}
		const leaf = arrayFor(this.root, this.shift, index);
		return leaf[index & MASK];
	}

	push(value: T): PersistentVector<T> {
		if (this.tail.length < WIDTH) {
			const nextTail = this.tail.concat([value]);
			return PersistentVector.fromInternal({
				root: this.root,
				tail: nextTail,
				size: this.size + 1,
				shift: this.shift,
			});
		}

		const tailNode = this.tail;
		const newTail: Leaf<T> = [value];

		let newRoot: Node<T>;
		let newShift = this.shift;
		const idx = this.size - 1;

		const fullLeafCount = Math.floor(this.size / WIDTH);
		const maxLeafCountAtShift = 2 ** this.shift;
		if (fullLeafCount > maxLeafCountAtShift) {
			newRoot = [this.root, newPath(this.shift, tailNode)];
			newShift += BITS;
		} else {
			newRoot = pushTail(this.shift, this.root, tailNode, idx);
		}

		return PersistentVector.fromInternal({
			root: newRoot,
			tail: newTail,
			size: this.size + 1,
			shift: newShift,
		});
	}

	set(index: number, value: T): PersistentVector<T> {
		if (index < 0 || index >= this.size) {
			throw new RangeError(`Index ${index} out of bounds`);
		}
		if (index >= this.tailOffset()) {
			const nextTail = cloneLeaf(this.tail);
			nextTail[index & MASK] = value;
			return PersistentVector.fromInternal({
				root: this.root,
				tail: nextTail,
				size: this.size,
				shift: this.shift,
			});
		}

		const nextRoot = doAssoc(this.shift, this.root, index, value);
		return PersistentVector.fromInternal({
			root: nextRoot,
			tail: this.tail,
			size: this.size,
			shift: this.shift,
		});
	}

	slice(start: number, end?: number): PersistentVector<T> {
		return new PersistentVector(this.toArray().slice(start, end));
	}

	toArray(): T[] {
		const out: T[] = [];
		for (let i = 0; i < this.size; i++) out.push(this.get(i)!);
		return out;
	}

	private tailOffset(): number {
		if (this.size < WIDTH) return 0;
		return Math.floor((this.size - 1) / WIDTH) * WIDTH;
	}
}
```

#### Step 8.2 — Add PersistentVector unit tests

- [ ] Create `packages/data-map/arrays/src/__tests__/persistent-vector.spec.ts` with the code below:

```ts
import { describe, expect, it } from 'vitest';

import { PersistentVector } from '../persistent-vector.js';

describe('PersistentVector', () => {
	it('push/get/length works', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 2000; i++) v = v.push(i);
		expect(v.length).toBe(2000);
		expect(v.get(0)).toBe(0);
		// Crosses the first tree growth boundary (root overflow).
		expect(v.get(1023)).toBe(1023);
		expect(v.get(1024)).toBe(1024);
		expect(v.get(1999)).toBe(1999);
		expect(v.get(2000)).toBeUndefined();
	});

	it('set returns a new vector and preserves original', () => {
		const v1 = new PersistentVector<number>([0, 1, 2]);
		const v2 = v1.set(1, 9);
		expect(v1.toArray()).toEqual([0, 1, 2]);
		expect(v2.toArray()).toEqual([0, 9, 2]);
	});

	it('slice returns a correct subvector', () => {
		const v = new PersistentVector<number>([0, 1, 2, 3, 4]);
		expect(v.slice(1, 4).toArray()).toEqual([1, 2, 3]);
	});
});
```

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @data-map/arrays test` passes
- [ ] `pnpm --filter @data-map/benchmarks bench src/arrays.bench.ts` shows improved `arrays.persistentVectorPush` and `arrays.persistentVectorSetMiddle`

#### Step 8 STOP & COMMIT

```txt
perf(data-map-arrays): implement 32-way PersistentVector

Replace naive PersistentVector array copies with a 32-way persistent vector.
Add unit tests for push/get/set/slice correctness and immutability.

completes: step 8 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 9: Final Validation and Documentation

**Goal**: Add a final validation benchmark file, document results, and update the audit report status.

**Files**

- [ ] Create `packages/data-map/benchmarks/src/final-validation.bench.ts`
- [ ] Create `packages/data-map/benchmarks/PERFORMANCE.md`
- [ ] Update `docs/audit/data-map-performance-audit.md`

#### Step 9.1 — Add final validation benchmarks

- [ ] Create `packages/data-map/benchmarks/src/final-validation.bench.ts` with the code below:

```ts
import { bench, describe } from 'vitest';

import { signal } from '@data-map/signals';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { FlatStore } from '@data-map/storage';
import { queryFlat } from '@data-map/path';
import { PersistentVector } from '@data-map/arrays';

describe('Performance Target Validation', () => {
	bench('targets.signalRead', () => {
		const s = signal(1);
		void s.value;
	});

	bench('targets.signalWrite', () => {
		const s = signal(0);
		s.value = 1;
	});

	bench('targets.patternMatch1k', () => {
		const engine = new SubscriptionEngine();
		const unsubs: (() => void)[] = [];
		for (let i = 0; i < 1000; i++) {
			unsubs.push(engine.subscribePattern('$.data.*', () => {}));
		}
		engine.notify('/data/x', 1);
		for (const u of unsubs) u();
	});

	bench('targets.queryWildcard100k', () => {
		const store = new FlatStore();
		for (let i = 0; i < 100_000; i++) {
			store.set(`/users/${i}/name`, `u${i}`);
			store.set(`/users/${i}/age`, i);
		}
		void queryFlat(store, '$.users[*].name');
	});

	bench('targets.persistentVectorPush', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 10_000; i++) v = v.push(i);
	});
});
```

#### Step 9.2 — Add PERFORMANCE.md documentation

- [ ] Create `packages/data-map/benchmarks/PERFORMANCE.md` with the content below:

````md
# @data-map/\* Performance

This document summarizes the benchmark methodology and current performance characteristics for the `@data-map/*` packages.

## How to run benchmarks

- Full suite (JSON output):

```bash
pnpm --filter @data-map/benchmarks bench:full
```
````

- Focused suites:

```bash
pnpm --filter @data-map/benchmarks bench:signals
pnpm --filter @data-map/benchmarks bench:subscriptions
pnpm --filter @data-map/benchmarks bench:path
pnpm --filter @data-map/benchmarks bench:arrays
pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts
pnpm --filter @data-map/benchmarks bench src/final-validation.bench.ts
```

## Baselines

The file `baseline.json` tracks benchmark keys we care about over time. Populate it by running benches and recording the reported ops/sec.

## Notes

- Benchmarks are executed via `vitest bench`.
- Most microbench numbers are sensitive to CPU scaling, background load, and Node versions.

````

#### Step 9.3 — Update the performance audit status sections
- [ ] In `docs/audit/data-map-performance-audit.md`, update the “Performance Bottlenecks” section statuses to mark items resolved after completing Steps 2–8.

Minimum required updates (copy/paste these snippets into the relevant sections):

```md
### 3.2 Critical: PatternIndex.match() Linear Scan

**Status**: ✅ RESOLVED (Step 6)
**Solution**: Segment trie (`PatternTrie`) for `*` and `**` patterns with compatibility fallback
````

```md
### 3.3 High: Signal Notification Array Copies

**Status**: ✅ RESOLVED (Step 2)
**Solution**: Flag-based iteration safety with deferred mutation flush
```

```md
### 3.4 High: IndirectionLayer.nextPhysicalIndex() O(n)

**Status**: ✅ RESOLVED (Step 3)
**Solution**: O(1) counter-based allocation + freeSlots reuse
```

```md
### 3.6 Medium: FlatStore.keys() sorts all keys unnecessarily

**Status**: ✅ RESOLVED (Steps 4, 7)
**Solution**: Lazy iterator + PrefixIndex-backed subtree iteration
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @data-map/benchmarks bench src/final-validation.bench.ts` runs successfully
- [ ] `pnpm --filter @data-map/signals test` passes
- [ ] `pnpm --filter @data-map/arrays test` passes
- [ ] `pnpm --filter @data-map/path test` passes
- [ ] `pnpm --filter @data-map/subscriptions test` passes

#### Step 9 STOP & COMMIT

```txt
docs(data-map-performance): add final validation and performance guide

Add final validation benchmarks and a PERFORMANCE.md describing how to run benches.
Update the performance audit report statuses to reflect resolved bottlenecks.

completes: step 9 of 9 for data-map-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
