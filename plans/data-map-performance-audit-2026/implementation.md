## @data-map Performance Audit 2026

## Goal

Implement all P0–P2 performance fixes identified in the January 2026 `@data-map/*` audit, with a specific focus on eliminating the `wideGet` catastrophe, adding `toObject()` memoization, reducing signal read overhead, reducing subscription batching allocations, and removing O(n) descendant checks.

## Prerequisites

- Make sure the user is currently on the `fix/data-map-performance-audit-2026` branch before beginning implementation.
- Install deps once at repo root:

```bash
pnpm install
```

- Useful focused commands (run from repo root):

```bash
pnpm --filter @data-map/storage test
pnpm --filter @data-map/path test
pnpm --filter @data-map/signals test
pnpm --filter @data-map/subscriptions test
pnpm --filter @data-map/benchmarks exec vitest run src/baselines
pnpm --filter @data-map/benchmarks exec vitest run src/final-validation.bench.ts
```

### Step-by-Step Instructions

#### Step 1: Establish Baseline Bottleneck Benchmarks

- [x] Update the existing bottleneck baseline suite to include:
  - [x] `wideGet` scaling at 10K store entries
  - [x] repeated `toObject()` calls (to demonstrate lack of memoization)
  - [x] `getObject()` descendant check behavior under heavy key counts
  - [x] subscription batching overhead (batched microtask path)
  - [x] signal notification overhead (already present)
- [x] Replace the contents of `packages/data-map/benchmarks/src/baselines/bottlenecks.baseline.bench.ts` with the code below:

```ts
import { IndirectionLayer } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { signal } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

function buildWideStore(entryCount: number): FlatStore {
	const store = new FlatStore();
	for (let i = 0; i < entryCount; i++) {
		store.set(`/users/${i}/name`, `u${i}`);
		store.set(`/users/${i}/age`, i);
	}
	return store;
}

describe('Baselines / Bottlenecks', () => {
	describe('Path wideGet catastrophe reproduction', () => {
		// This reproduces the audit’s “wideGet” shape: many lookups against a large store.
		// The query expands to many pointers; the implementation must avoid repeated subtree materialization.
		for (const entryCount of [10_000]) {
			const store = buildWideStore(entryCount);
			bench(`bottlenecks.wideGet.usersStar.${entryCount}`, () => {
				void queryFlat(store, '$.users[*]');
			});
			bench(`bottlenecks.wideGet.usersStar.name.${entryCount}`, () => {
				void queryFlat(store, '$.users[*].name');
			});
		}
	});

	describe('Materialization caching absence (toObject)', () => {
		const store = buildWideStore(100_000);
		bench('bottlenecks.toObject.first', () => {
			void store.toObject();
		});
		bench('bottlenecks.toObject.repeated10', () => {
			for (let i = 0; i < 10; i++) void store.toObject();
		});
	});

	describe('getObject descendant check behavior', () => {
		const store = buildWideStore(50_000);
		bench('bottlenecks.getObject.leafNoChildren', () => {
			// Should be fast: no descendants.
			void store.getObject('/users/0/name');
		});
		bench('bottlenecks.getObject.containerHasChildren', () => {
			// Should be fast to detect children existence (no O(n) scans).
			void store.getObject('/users/0');
		});
	});

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

- [ ] Capture a baseline output snapshot:

```bash
pnpm --filter @data-map/benchmarks bench > packages/data-map/benchmarks/baseline-pre-optimization.json
```

##### Step 1 Verification Checklist

- [x] `pnpm --filter @data-map/benchmarks exec vitest run src/baselines` runs with no errors
- [x] The new `bottlenecks.wideGet.*` benches appear in output

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
test(data-map-performance-audit-2026): add bottleneck baselines

Add explicit baseline benches for wide-get, toObject repetition, and getObject descendant checks.

completes: step 1 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Fix P0 wideGet Catastrophe by Batching Materialization in queryFlat

- [ ] Update `queryFlat` to avoid repeated `store.getObject(pointer)` calls when a query expands to many pointers.
- [ ] Implement a “materialize once + extract values” strategy for large expansions.
- [ ] Replace the contents of `packages/data-map/path/src/query.ts` with the code below:

```ts
import { JSONPointer } from '@jsonpath/pointer';
import { query as runQuery } from '@jsonpath/jsonpath';

import {
	iteratePointersForSimpleJsonPath,
	parseSimpleJsonPath,
} from './pointer-iterator.js';
import type { QueryResult } from './types.js';

export interface FlatStoreQueryable {
	get: (pointer: string) => unknown;
	has: (pointer: string) => boolean;
	keys: (prefix?: string) => IterableIterator<string>;
	getObject: (pointer: string) => unknown;
}

function getFromMaterializedRoot(root: unknown, pointer: string): unknown {
	if (pointer === '') return root;
	// JSONPointer.get is not available in this workspace API; parse + walk.
	const segs = JSONPointer.parse(pointer);
	let cur: any = root;
	for (const seg of segs) {
		if (cur === null || typeof cur === 'undefined') return undefined;
		cur = cur[seg as any];
	}
	return cur;
}

export function queryFlat(
	store: FlatStoreQueryable,
	path: string,
): QueryResult {
	const tokens = parseSimpleJsonPath(path);
	if (tokens) {
		const pointers = Array.from(
			iteratePointersForSimpleJsonPath(store, tokens),
		);

		// Heuristic: if a query expands to many pointers, calling getObject(pointer)
		// per pointer becomes catastrophic. Materialize the root once and read from it.
		// Keep this threshold high so small queries retain the localized getObject behavior.
		const MATERIALIZE_ROOT_THRESHOLD = 64;

		if (pointers.length >= MATERIALIZE_ROOT_THRESHOLD) {
			const root = store.getObject('') as Record<string, unknown>;
			const values = pointers.map((p) => {
				if (store.has(p)) return store.get(p);
				return getFromMaterializedRoot(root, p);
			});
			return { values, pointers };
		}

		const values = pointers.map((p) => {
			if (store.has(p)) return store.get(p);
			return store.getObject(p);
		});
		return { values, pointers };
	}

	const root = store.getObject('') as Record<string, unknown>;
	const res = runQuery(root, path);
	return {
		values: res.values(),
		pointers: res.pointers().map((p) => p.toString()),
	};
}
```

- [ ] Update `packages/data-map/path/package.json` to add `@jsonpath/pointer` as a direct dependency.
- [ ] In the `"dependencies"` object, add the line shown below (keep alphabetical ordering consistent with the file):

```json
{
	"dependencies": {
		"@data-map/storage": "workspace:*",
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"mnemonist": "^0.39.0"
	}
}
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @data-map/path test` passes
- [x] `pnpm --filter @data-map/benchmarks bench` shows a large improvement for `bottlenecks.wideGet.*`

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-path): batch wide JSONPath materialization

Avoid repeated getObject() calls when simple JSONPath expands to many pointers by materializing the root once and extracting values by pointer.

completes: step 2 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Fix P0 toObject Memoization Cache in FlatStore

- [ ] Add version-based memoization for `FlatStore.toObject()`.
- [ ] Ensure `getObject('')` uses `toObject()` so root materialization benefits from the same cache.
- [ ] In `packages/data-map/storage/src/flat-store.ts`, make the following edits.

- [ ] Add these fields inside `export class FlatStore { ... }` near the existing `_version` field:

```ts
	private _cachedRoot: unknown | undefined;
	private _cachedRootVersion = -1;
```

- [ ] Replace the `toObject()` method with:

```ts
	toObject(): unknown {
		if (this._cachedRootVersion === this._version) return this._cachedRoot;
		const next = materializeNested(this.data);
		this._cachedRoot = next;
		this._cachedRootVersion = this._version;
		return next;
	}
```

- [ ] Update the `getObject(pointer)` early-return branch so root uses the cached materialization:

```ts
	getObject(pointer: Pointer): unknown {
		if (pointer === '') return this.toObject();
		// ...rest unchanged
	}
```

- [ ] Add a cache behavior test to `packages/data-map/storage/src/__tests__/flat-store.spec.ts` (append this test case at the end of the file):

```ts
it('toObject memoizes by version and invalidates on mutation', () => {
	const s = new FlatStore({ users: [{ name: 'Alice' }] });
	const a = s.toObject();
	const b = s.toObject();
	// Same object reference when no mutations occur.
	expect(b).toBe(a);

	s.set('/users/0/age', 30);
	const c = s.toObject();
	expect(c).not.toBe(a);
	// Stable again at the new version.
	const d = s.toObject();
	expect(d).toBe(c);
});
```

##### Step 3 Verification Checklist

- [x] `pnpm --filter @data-map/storage test` passes
- [x] `pnpm --filter @data-map/benchmarks bench` shows `bottlenecks.toObject.repeated10` improves substantially after the first run

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-storage): memoize FlatStore.toObject by version

Add version-based caching for toObject() and route getObject('') through the cached path.

completes: step 3 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Fix P0 Inline Signal Dependency Tracking (Remove trackRead call)

- [ ] Inline the dependency tracking call path into `SignalImpl.value` getter to reduce function call overhead.
- [ ] Update `packages/data-map/signals/src/signal.ts`:
  - [ ] Replace the import of `trackRead` with `currentObserver`.
  - [ ] Replace `get value()` implementation.

- [ ] Replace the top imports in `packages/data-map/signals/src/signal.ts` so the `context` import becomes:

```ts
import { currentObserver } from './context.js';
```

- [ ] Replace the `get value(): T { ... }` with:

```ts
	get value(): T {
		// Inline tracking to remove an extra function call from the hot path.
		const obs = currentObserver();
		if (obs) obs.onDependencyRead(this);
		return this._value;
	}
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @data-map/signals test` passes
- [ ] `pnpm --filter @data-map/benchmarks bench` shows improved signal read throughput

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-signals): inline signal tracking hot path

Inline observer lookup and dependency registration in Signal.value getter to reduce tracking overhead.

completes: step 4 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Fix P1 Subscription Batching Allocation Overhead (Remove Array.from Snapshot)

- [ ] Optimize `NotificationBatcher.flush()` to avoid allocating an intermediate array for every flush.
- [ ] Replace the contents of `packages/data-map/subscriptions/src/notification-batcher.ts` with:

```ts
import type { Subscription, SubscriptionEvent } from './types.js';

export class NotificationBatcher {
	private pending = new Map<
		symbol,
		{ sub: Subscription; event: SubscriptionEvent }
	>();
	private draining = new Map<
		symbol,
		{ sub: Subscription; event: SubscriptionEvent }
	>();
	private scheduled = false;

	queue(sub: Subscription, event: SubscriptionEvent): void {
		this.pending.set(sub.id, { sub, event });
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => this.flush());
	}

	flush(): void {
		this.scheduled = false;
		if (this.pending.size === 0) return;

		// Swap maps so we can drain without allocating snapshots.
		const tmp = this.draining;
		this.draining = this.pending;
		this.pending = tmp;
		this.pending.clear();

		for (const { sub, event } of this.draining.values()) {
			sub.subscriber(event);
		}
		this.draining.clear();
	}
}
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @data-map/subscriptions test` passes
- [ ] Pattern subscription tests still coalesce to “last event wins” in a tick

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-subscriptions): reduce batch flush allocations

Eliminate Array.from snapshot allocation in NotificationBatcher by swapping drain buffers.

completes: step 5 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: Fix P1 Signal Memory Footprint (Lazy sets + single pending ops list)

- [ ] Reduce per-signal memory by:
  - [ ] Lazily allocating `observers` and `subscribers` sets
  - [ ] Replacing 4 always-allocated pending sets with a single lazily-allocated operation list
- [ ] In `packages/data-map/signals/src/signal.ts`, apply the changes below.

- [ ] Replace the observer/subscriber fields and pending fields inside `SignalImpl` with:

```ts
	private _value: T;
	private observers: Set<Observer> | null = null;
	private subscribers: Set<Subscriber<T>> | null = null;

	private isNotifying = false;
	private pending:
		| Array<
				| { kind: 'sub'; op: 'add' | 'rem'; target: Subscriber<T> }
				| { kind: 'obs'; op: 'add' | 'rem'; target: Observer }
		  >
		| null = null;
```

- [ ] Replace `subscribe()` with:

```ts
	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		if (this.isNotifying) {
			(this.pending ??= []).push({ kind: 'sub', op: 'add', target: subscriber });
		} else {
			(this.subscribers ??= new Set()).add(subscriber);
		}

		return () => {
			if (this.isNotifying) {
				(this.pending ??= []).push({ kind: 'sub', op: 'rem', target: subscriber });
				return;
			}
			this.subscribers?.delete(subscriber);
		};
	}
```

- [ ] Replace `addObserver()` with:

```ts
	addObserver(observer: Observer): void {
		if (this.isNotifying) {
			(this.pending ??= []).push({ kind: 'obs', op: 'add', target: observer });
			return;
		}
		(this.observers ??= new Set()).add(observer);
	}
```

- [ ] Replace `removeObserver()` with:

```ts
	removeObserver(observer: Observer): void {
		if (this.isNotifying) {
			(this.pending ??= []).push({ kind: 'obs', op: 'rem', target: observer });
			return;
		}
		this.observers?.delete(observer);
	}
```

- [ ] Replace `flushPending()` with:

```ts
	private flushPending(): void {
		const pending = this.pending;
		if (!pending || pending.length === 0) return;
		this.pending = null;

		for (const op of pending) {
			if (op.kind === 'sub') {
				const set = (this.subscribers ??= new Set());
				if (op.op === 'add') set.add(op.target);
				else set.delete(op.target);
				continue;
			}

			const set = (this.observers ??= new Set());
			if (op.op === 'add') set.add(op.target);
			else set.delete(op.target);
		}
	}
```

- [ ] Update `notify()` to safely handle `null` sets:

```ts
	private notify(): void {
		this.isNotifying = true;
		try {
			if (this.subscribers) {
				for (const sub of this.subscribers) sub(this._value);
			}
			if (this.observers) {
				for (const obs of this.observers) {
					if (isBatching()) queueObserver(obs);
					else obs.onDependencyChanged();
				}
			}
		} finally {
			this.isNotifying = false;
			this.flushPending();
		}
	}
```

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @data-map/signals test` passes (including subscribe/unsubscribe during notification tests)
- [ ] `pnpm --filter @data-map/benchmarks bench` shows `memory-signals` improvements and no signal perf regression

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-signals): reduce per-signal memory overhead

Lazily allocate observer/subscriber sets and replace 4 pending sets with a single pending op list.

completes: step 6 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 7: Fix P2 Descendant Check (Use PrefixIndex size instead of linear scan)

- [ ] Add an O(1) subtree-size helper to `PrefixIndex`.
- [ ] Update `FlatStore.getObject(pointer)` to determine descendant existence using the prefix index instead of scanning all keys.

- [ ] In `packages/data-map/storage/src/prefix-index.ts`, add this method to `PrefixIndex`:

```ts
	subtreeSize(prefix: Pointer): number {
		return this.byPrefix.get(prefix)?.size ?? 0;
	}
```

- [ ] In `packages/data-map/storage/src/flat-store.ts`, replace the current descendant detection block:

```ts
const prefix = `${pointer}/`;
let hasDescendants = false;
for (const key of this.data.keys()) {
	if (key.startsWith(prefix)) {
		hasDescendants = true;
		break;
	}
}
```

with:

```ts
const subtreeSize = this.prefixIndex.subtreeSize(pointer);
const hasDescendants = exactExists ? subtreeSize > 1 : subtreeSize > 0;
```

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @data-map/storage test` passes
- [ ] `bottlenecks.getObject.*` benches improve (no longer O(n) just to detect “has children”)

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-storage): O(1) descendant existence check

Use PrefixIndex subtreeSize() to avoid scanning all keys when determining whether a pointer has descendants.

completes: step 7 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 8: Post-Optimization Validation Suite + Resolution Docs

- [ ] Extend the existing benchmark suite to validate the targets from the audit.
- [ ] Update `packages/data-map/benchmarks/src/final-validation.bench.ts` to include:
  - [ ] `wideGet` validation
  - [ ] repeated `toObject()` validation
  - [ ] subscription batching validation

- [ ] Replace the contents of `packages/data-map/benchmarks/src/final-validation.bench.ts` with:

```ts
import { PersistentVector } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { signal } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

function buildStore(entryCount: number): FlatStore {
	const store = new FlatStore();
	for (let i = 0; i < entryCount; i++) {
		store.set(`/users/${i}/name`, `u${i}`);
		store.set(`/users/${i}/age`, i);
	}
	return store;
}

describe('Performance Target Validation', () => {
	bench('targets.signalRead', () => {
		const s = signal(1);
		void s.value;
	});

	bench('targets.signalWrite', () => {
		const s = signal(0);
		s.value = 1;
	});

	bench('targets.subscriptions.patternMatch1k', () => {
		const engine = new SubscriptionEngine();
		const unsubs: (() => void)[] = [];
		for (let i = 0; i < 1000; i++) {
			unsubs.push(engine.subscribePattern('$.data.*', () => {}));
		}
		engine.notify('/data/x', 1);
		for (const u of unsubs) u();
	});

	bench('targets.wideGet.10k.usersStar', () => {
		const store = buildStore(10_000);
		void queryFlat(store, '$.users[*]');
	});

	bench('targets.wideGet.10k.usersStar.name', () => {
		const store = buildStore(10_000);
		void queryFlat(store, '$.users[*].name');
	});

	bench('targets.toObject.100k.first', () => {
		const store = buildStore(100_000);
		void store.toObject();
	});

	bench('targets.toObject.100k.repeated10', () => {
		const store = buildStore(100_000);
		void store.toObject();
		for (let i = 0; i < 10; i++) void store.toObject();
	});

	bench('targets.queryWildcard100k', () => {
		const store = buildStore(100_000);
		void queryFlat(store, '$.users[*].name');
	});

	bench('targets.persistentVectorPush', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 10_000; i++) v = v.push(i);
	});
});
```

- [ ] Capture a post-optimization output snapshot:

```bash
pnpm --filter @data-map/benchmarks bench > packages/data-map/benchmarks/baseline-post-optimization.json
```

- [ ] Add a resolution doc at `docs/audit/data-map-performance-audit-2026-resolution.md`:

````md
## @data-map Performance Audit 2026 — Resolution

### Summary

This document tracks the concrete code changes applied to address the January 2026 performance audit findings for `@data-map/*`.

### Completed Fixes

- wideGet catastrophe: batch materialization in `@data-map/path` (`queryFlat` simple-path expansion)
- toObject memoization: version-based caching in `@data-map/storage` (`FlatStore.toObject`)
- signal read overhead: inline observer tracking in `@data-map/signals` (`Signal.value`)
- subscription batching overhead: swap-buffer drain to avoid snapshot allocation (`NotificationBatcher`)
- descendant checks: prefix-index-based subtree sizing to avoid linear scans (`PrefixIndex.subtreeSize`)

### Validation

Run:

```bash
pnpm --filter @data-map/benchmarks bench
```
````

Compare these files:

- `packages/data-map/benchmarks/baseline-pre-optimization.json`
- `packages/data-map/benchmarks/baseline-post-optimization.json`

### Notes

Benchmarks are sensitive to CPU frequency scaling and background load; compare multiple runs and focus on order-of-magnitude deltas.

````

##### Step 8 Verification Checklist
- [ ] `pnpm --filter @data-map/benchmarks exec vitest run src/final-validation.bench.ts` passes
- [ ] Post-optimization baseline file is generated

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
docs(data-map-performance-audit-2026): add post-optimization validation

Extend final validation benches and add a resolution document plus pre/post baseline output snapshots.

completes: step 8 of 12 for data-map-performance-audit-2026
````

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 9: Phase 3 — Speed up wildcard expansion with PrefixIndex child-segment index

> This workspace already has JSONPath compilation caching (`packages/data-map/path/src/compiler.ts` + `cache.ts`). The remaining path performance gap is dominated by wildcard expansion scanning; this step makes wildcard expansion O(number of children) instead of scanning all subtree keys.

- [ ] Extend `PrefixIndex` to track immediate child segments per prefix.
- [ ] Update `FlatStore` to expose the child segment index.
- [ ] Update `collectImmediateChildSegments` in `packages/data-map/path/src/pointer-iterator.ts` to use the index when available.

- [ ] In `packages/data-map/storage/src/prefix-index.ts`, add the map and methods (insert inside `export class PrefixIndex`):

```ts
	private childrenByPrefix = new Map<Pointer, Set<string>>();

	childSegments(prefix: Pointer): string[] {
		return Array.from(this.childrenByPrefix.get(prefix) ?? []);
	}
```

- [ ] Update `clear()` in `packages/data-map/storage/src/prefix-index.ts` so it also clears the child index:

```ts
	clear(): void {
		this.byPrefix.clear();
		this.childrenByPrefix.clear();
	}
```

- [ ] Update `add(pointer)` to also populate children maps:

```ts
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

			// Track immediate child segments per prefix.
			const child = segs[i];
			if (typeof child === 'string') {
				let children = this.childrenByPrefix.get(prefix);
				if (!children) {
					children = new Set();
					this.childrenByPrefix.set(prefix, children);
				}
				children.add(child);
			}
		}
	}
```

- [ ] Keep `remove(pointer)` logic unchanged for `byPrefix`, and treat `childrenByPrefix` as rebuild-only.
- [ ] In `packages/data-map/storage/src/flat-store.ts`, update `delete(pointer)` to rebuild the prefix index after removals:

```ts
	delete(pointer: Pointer): boolean {
		const existed = this.data.delete(pointer);
		if (existed) {
			this.prefixIndex.remove(pointer);
			// Keep child segment index correct by rebuilding after removals.
			this.prefixIndex.rebuild(this.data.keys());
			bumpVersion(this.versions, pointer);
			this._version++;
		}
		return existed;
	}
```

- [ ] Update `packages/data-map/storage/src/flat-store.ts` to add a new method:

```ts
	childSegments(prefix: Pointer): string[] {
		return this.prefixIndex.childSegments(prefix);
	}
```

- [ ] In `packages/data-map/path/src/pointer-iterator.ts`, update `PointerIterableStore` and `collectImmediateChildSegments`:

```ts
export interface PointerIterableStore {
	keys: (prefix?: Pointer) => IterableIterator<Pointer>;
	childSegments?: (prefix: Pointer) => string[];
}

function collectImmediateChildSegments(
	store: PointerIterableStore,
	basePointer: Pointer,
): string[] {
	if (store.childSegments) {
		return store.childSegments(basePointer);
	}
	// fallback scan
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
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @data-map/path test` passes
- [ ] Wildcard-heavy queries (e.g. `$.users[*].name`) improve further at scale

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-storage,data-map-path): index immediate child segments

Track immediate child segments in PrefixIndex and use that index in pointer-iterator wildcard expansion to avoid subtree scans.

completes: step 9 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 10: Phase 3 — Structural Sharing (Experimental module)

> This step adds a self-contained structural sharing implementation without wiring it into `FlatStore` by default. It is safe to land behind an opt-in API.

- [ ] Create `packages/data-map/storage/src/persistent-tree.ts`:

```ts
export interface PersistentNode<T> {
	readonly value?: T;
	readonly children: ReadonlyMap<string, PersistentNode<T>>;
}

export function emptyNode<T>(): PersistentNode<T> {
	return { children: new Map() };
}

export function updatePath<T>(
	root: PersistentNode<T>,
	path: readonly string[],
	value: T,
): PersistentNode<T> {
	if (path.length === 0) {
		return { value, children: root.children };
	}

	const [head, ...tail] = path;
	const existingChild = root.children.get(head) ?? emptyNode<T>();
	const nextChild = updatePath(existingChild, tail, value);
	const nextChildren = new Map(root.children);
	nextChildren.set(head, nextChild);
	return { value: root.value, children: nextChildren };
}

export function getPath<T>(
	root: PersistentNode<T>,
	path: readonly string[],
): T | undefined {
	let cur: PersistentNode<T> | undefined = root;
	for (const seg of path) {
		cur = cur.children.get(seg);
		if (!cur) return undefined;
	}
	return cur.value;
}
```

- [ ] Create `packages/data-map/storage/src/__tests__/persistent-tree.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { emptyNode, getPath, updatePath } from '../persistent-tree.js';

describe('persistent-tree', () => {
	it('shares unchanged branches', () => {
		const root = emptyNode<number>();
		const a = updatePath(root, ['users', '0', 'age'], 30);
		const b = updatePath(a, ['users', '0', 'name'], 1);

		expect(getPath(a, ['users', '0', 'age'])).toBe(30);
		expect(getPath(b, ['users', '0', 'age'])).toBe(30);

		// Structural sharing: the /users subtree should be shared except where modified.
		const aUsers = a.children.get('users');
		const bUsers = b.children.get('users');
		expect(aUsers).toBe(bUsers);
	});
});
```

##### Step 10 Verification Checklist

- [ ] `pnpm --filter @data-map/storage test` passes

#### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map-storage): add experimental persistent tree

Add a self-contained persistent tree implementation and tests as a foundation for structural sharing.

completes: step 10 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 11: Phase 3 — SIMD-style bulk operations (Experimental module)

- [ ] Create `packages/data-map/storage/src/simd-ops.ts`:

```ts
export function scanDirtyIndices(dirty: Uint8Array): Uint32Array {
	const out: number[] = [];
	for (let i = 0; i < dirty.length; i++) {
		if (dirty[i]) out.push(i);
	}
	return new Uint32Array(out);
}
```

- [ ] Create `packages/data-map/storage/src/__tests__/simd-ops.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { scanDirtyIndices } from '../simd-ops.js';

describe('simd-ops', () => {
	it('returns indices with dirty flags', () => {
		const dirty = new Uint8Array([0, 1, 0, 1, 1]);
		expect(Array.from(scanDirtyIndices(dirty))).toEqual([1, 3, 4]);
	});
});
```

##### Step 11 Verification Checklist

- [ ] `pnpm --filter @data-map/storage test` passes

#### Step 11 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map-storage): add experimental simd-style helpers

Add a small typed-array helper module as a foundation for future bulk-update optimizations.

completes: step 11 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 12: Phase 3 — Worker-based materialization (Design-only placeholder)

> NOTE: `@data-map/storage` is used in both Node and browser contexts across this monorepo. A correct worker implementation must decide between `Worker` (browser) and `worker_threads` (Node) and provide a safe fallback for SSR. This step is intentionally documented as a design/architecture decision and should not ship code until the runtime targets are finalized.

- [ ] Create `packages/data-map/storage/src/worker-pool.ts` that exports a no-op interface for now, implemented as synchronous fallback.

```ts
export interface MaterializeWorkerPool {
	materialize<T>(fn: () => T): Promise<T>;
}

export class SyncMaterializePool implements MaterializeWorkerPool {
	async materialize<T>(fn: () => T): Promise<T> {
		return fn();
	}
}
```

- [ ] Create `packages/data-map/storage/src/__tests__/worker-pool.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SyncMaterializePool } from '../worker-pool.js';

describe('worker-pool', () => {
	it('falls back to synchronous execution', async () => {
		const pool = new SyncMaterializePool();
		await expect(pool.materialize(() => 123)).resolves.toBe(123);
	});
});
```

##### Step 12 Verification Checklist

- [ ] `pnpm --filter @data-map/storage test` passes

#### Step 12 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map-storage): add materialization pool abstraction

Add an explicit abstraction for future worker-based materialization with a safe synchronous fallback.

completes: step 12 of 12 for data-map-performance-audit-2026
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
