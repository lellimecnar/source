## data-map-audit-completion

## Step-by-Step Instructions

### Step 1: Fluent Batch API

**Objective**

Implement the fluent batch API (`dm.batch.set(...).set(...).apply()` and `.toPatch()`), while preserving the existing callback batching API (`dm.batch((d) => { ... })`).

**Files**

- [packages/data-map/core/src/datamap.ts](packages/data-map/core/src/datamap.ts)
- [packages/data-map/core/src/batch/fluent.ts](packages/data-map/core/src/batch/fluent.ts) (new; type surface)
- [packages/data-map/core/src/batch/batch.spec.ts](packages/data-map/core/src/batch/batch.spec.ts)

#### Diff: add fluent batch interface type

```diff
*** Begin Patch
*** Add File: packages/data-map/core/src/batch/fluent.ts
import type { DataMap } from '../datamap';
import type { CallOptions, Operation } from '../types';

// Spec-required fluent batch interface (spec §4.9).
// The concrete implementation is exposed via `DataMap.batch`.
export interface Batch<Target extends DataMap<any, any>> {
	set(pathOrPointer: string, value: unknown, options?: CallOptions): this;
	remove(pathOrPointer: string, options?: CallOptions): this;
	merge(pathOrPointer: string, value: object, options?: CallOptions): this;
	move(from: string, to: string, options?: CallOptions): this;
	copy(from: string, to: string, options?: CallOptions): this;
	apply(): Target;
	toPatch(): Operation[];
}

*** End Patch
```

#### Diff: add fluent tests (RGR)

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/batch/batch.spec.ts
@@
 	it('does not notify during the batch, and notifies once after', async () => {
@@
 	});

	it('supports fluent chaining with apply()', async () => {
		const dm = new DataMap({ a: 1, b: 2 });
		const calls: string[] = [];

		dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('a') });
		dm.subscribe({ path: '/b', after: 'set', fn: () => calls.push('b') });

		dm.batch.set('/a', 10).set('/b', 20).apply();
		expect(dm.get('/a')).toBe(10);
		expect(dm.get('/b')).toBe(20);
		expect(calls).toHaveLength(0);

		await flushMicrotasks();
		expect(calls).toEqual(['a', 'b']);
	});

	it('toPatch() returns operations without applying them', () => {
		const dm = new DataMap({ a: 1 });
		const ops = dm.batch.set('/a', 2).set('/b', 3).toPatch();

		expect(dm.get('/a')).toBe(1);
		expect(dm.get('/b')).toBeUndefined();
		expect(ops).toEqual([
			{ op: 'replace', path: '/a', value: 2 },
			{ op: 'add', path: '/b', value: 3 },
		]);
	});
*** End Patch
```

#### Implement (GREEN)

Implement the fluent API by converting `DataMap.batch` into a callable facade that retains existing callback batching behavior while also exposing fluent entrypoints (`set/remove/merge/move/copy`). The fluent builder should:

- Maintain an internal `ops: Operation[]` list.
- Maintain a `workingData` snapshot (apply ops into it for subsequent steps).
- Provide `toPatch()` that returns a deep-cloned copy of ops.
- Provide `apply()` that runs `dm.patch(ops)` inside a callback `batch` to preserve coalesced notifications.

#### Run (verification)

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

#### STOP & COMMIT

```txt
feat(data-map-core): add fluent batch API

- Add fluent chaining API via dm.batch.set(...).apply() and dm.batch.*.toPatch()
- Preserve callback-based batching behavior
- Add unit tests for apply() scheduling and toPatch() non-mutation

completes: step 1 of 11 for data-map-audit-completion
```

---

- [x] **Step 1: Fluent Batch API** - COMPLETED

### Step 2: Move Operation Subscription Semantics

**Objective**

Treat JSON Patch `move` semantics as `remove(from)` + `set(to)` for subscription dispatch.

**Files**

- [packages/data-map/core/src/subscription/manager.ts](packages/data-map/core/src/subscription/manager.ts)
- [packages/data-map/core/src/**tests**/move-semantics.spec.ts](packages/data-map/core/src/__tests__/move-semantics.spec.ts) (new)

#### Diff: add move semantics tests

```diff
*** Begin Patch
*** Add File: packages/data-map/core/src/__tests__/move-semantics.spec.ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('move semantics', () => {
	it('treats move as remove(from) + set(to) (subscriptions are pointer-based)', async () => {
		const dm = new DataMap({ users: [{ id: 'u1' }], archived: [] as any[] });
		const calls: string[] = [];

		dm.subscribe({
			path: '/users/0',
			after: ['remove', 'set'],
			fn: (_v, e) => calls.push(`users:${e.type}:${e.pointer}`),
		});

		dm.subscribe({
			path: '/archived/0',
			after: ['remove', 'set'],
			fn: (_v, e) => calls.push(`archived:${e.type}:${e.pointer}`),
		});

		dm.patch([{ op: 'move', from: '/users/0', path: '/archived/0' }]);
		await flushMicrotasks();

		expect(calls).toContain('users:remove:/users/0');
		expect(calls).toContain('archived:set:/archived/0');
	});
});

*** End Patch
```

#### Implement (GREEN)

In the subscription manager, when receiving a `patch` event for an operation with `op === 'move'`, dispatch:

- a synthetic `remove` event for the `from` pointer
- a synthetic `set` event for the destination pointer

Ensure these events participate in the existing `before/on/after` stages and cancellation behavior.

#### Run (verification)

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

```txt
fix(data-map-core): correct move operation subscription semantics

- Treat move patches as remove(from) + set(to) for subscription dispatch
- Add regression test for pointer-based subscription behavior

completes: step 2 of 11 for data-map-audit-completion
```

---

- [x] **Step 1: Fluent Batch API** - COMPLETED
- [x] **Step 2: Move Operation Subscription Semantics** - COMPLETED

### Step 3: Subscription Specificity Ordering

**Objective**

Invoke subscriptions in order of decreasing specificity (static pointer > wildcard > recursive), and preserve registration order for ties.

**Files**

- [packages/data-map/core/src/subscription/manager.ts](packages/data-map/core/src/subscription/manager.ts)
- [packages/data-map/core/src/subscription/manager.spec.ts](packages/data-map/core/src/subscription/manager.spec.ts)

#### Diff: add specificity ordering tests

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/subscription/manager.spec.ts
@@
 	it('runs before handler and can cancel', () => {
@@
 	});

	it('invokes handlers by specificity (most specific first)', async () => {
		const dm = new DataMap({ a: { b: 1 } });
		const calls: string[] = [];

		dm.subscribe({ path: '$..b', after: 'patch', fn: () => calls.push('recursive') });
		dm.subscribe({ path: '$.a.*', after: 'patch', fn: () => calls.push('wildcard') });
		dm.subscribe({ path: '/a/b', after: 'patch', fn: () => calls.push('pointer') });

		dm.patch([{ op: 'replace', path: '/a/b', value: 2 }]);
		await flushMicrotasks();

		expect(calls).toEqual(['pointer', 'wildcard', 'recursive']);
	});
*** End Patch
```

#### Implement (GREEN)

Compute a numeric specificity score per subscription at registration time (or per dispatch if necessary), and sort the final handler list by:

1. higher specificityScore first
2. lower registration index first

#### Run (verification)

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

```txt
feat(data-map-core): add subscription specificity ordering

- Invoke matching subscriptions by descending specificity
- Preserve registration order for equal specificity
- Add tests for ordering behavior

completes: step 3 of 11 for data-map-audit-completion
```

---

- [x] **Step 3: Subscription Specificity Ordering** - COMPLETED

### Step 4: ResolvedMatch Full Metadata

**Objective**

Populate `ResolvedMatch.readOnly`, `ResolvedMatch.type`, `ResolvedMatch.lastUpdated`, and `ResolvedMatch.previousValue`.

**Files**

- [packages/data-map/core/src/definitions/types.ts](packages/data-map/core/src/definitions/types.ts)
- [packages/data-map/core/src/definitions/registry.ts](packages/data-map/core/src/definitions/registry.ts)
- [packages/data-map/core/src/path/resolve.spec.ts](packages/data-map/core/src/path/resolve.spec.ts) (new)

#### Diff: add definition type metadata

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/definitions/types.ts
@@
 export interface DefinitionBase<T, Ctx> {
@@
 	readOnly?: boolean;
+	type?: string;
 	defaultValue?: unknown;
 }
*** End Patch
```

#### Diff: add resolve metadata tests

```diff
*** Begin Patch
*** Add File: packages/data-map/core/src/path/resolve.spec.ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('DataMap.resolve metadata', () => {
	it('returns readOnly + type from definitions', () => {
		const store = new DataMap(
			{ a: 1 },
			{ context: {}, define: [{ pointer: '/a', readOnly: true, type: 'number' }] },
		);
		const [m] = store.resolve('/a');
		expect(m?.readOnly).toBe(true);
		expect(m?.type).toBe('number');
	});
});

*** End Patch
```

#### Implement (GREEN)

- Extend the definition registry to derive `readOnly` and `type` metadata for a pointer.
- Track per-pointer write metadata (`lastUpdated`, `previousValue`) when applying successful writes.
- Add those fields into `resolve()` and `resolveStream()` results.

#### Run (verification)

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

#### STOP & COMMIT

```txt
feat(data-map-core): populate resolve metadata

- Add definition `type` metadata and expose definition metadata in resolve results
- Track previousValue + lastUpdated for writes and expose in ResolvedMatch
- Add tests for metadata behavior

completes: step 4 of 11 for data-map-audit-completion
```

---

- [x] **Step 4: ResolvedMatch Full Metadata** - COMPLETED

### Step 5: Performance Benchmark Suite

**Objective**

Add a Vitest benchmark suite under `packages/data-map/core/src/__benchmarks__/` and a `bench` script to run it.

**Files**

- packages/data-map/core/package.json
- packages/data-map/core/src/**benchmarks**/\* (new)

#### Run (verification)

```bash
pnpm --filter @data-map/core bench
```

#### STOP & COMMIT

```txt
feat(data-map-core): add benchmark suite

- Add vitest bench suite for resolve/get/set, subscriptions, and pattern matching
- Add bench script to package.json

completes: step 5 of 11 for data-map-audit-completion
```

---

- [x] **Step 5: Performance Benchmark Suite** - COMPLETED

### Step 6: Schema Validation Option

**Objective**

Add `schema?: unknown` to `DataMapOptions` (type surface only; no runtime behavior).

**Files**

- packages/data-map/core/src/types.ts
- packages/data-map/core/README.md

#### Run (verification)

```bash
pnpm --filter @data-map/core type-check
```

#### STOP & COMMIT

```txt
feat(data-map-core): add schema option type definition

- Add schema?: unknown to DataMapOptions (reserved for future schema validation)

completes: step 6 of 11 for data-map-audit-completion
```

---

- [x] **Step 6: Schema Validation Option** - COMPLETED

### Step 7: SubscriptionManager Interface Export

**Objective**

Export a public `SubscriptionManager<T, Ctx>` interface (types) for advanced integrations.

**Files**

- packages/data-map/core/src/subscription/types.ts
- packages/data-map/core/src/index.ts

#### Run (verification)

```bash
pnpm --filter @data-map/core type-check
```

#### STOP & COMMIT

```txt
feat(data-map-core): export SubscriptionManager interface

- Add and export SubscriptionManager<T, Ctx> interface

completes: step 7 of 11 for data-map-audit-completion
```

---

- [x] **Step 7: SubscriptionManager Interface Export** - COMPLETED

### Step 8: Relative JSON Pointer Support

**Objective**

Implement relative JSON Pointer support behind an explicit `CallOptions.contextPointer`.

**Files**

- packages/data-map/core/src/types.ts
- packages/data-map/core/src/path/relative.ts (new)
- packages/data-map/core/src/path/relative.spec.ts (new)

#### Run (verification)

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

#### STOP & COMMIT

```txt
feat(data-map-core): add relative JSON pointer support

- Add CallOptions.contextPointer
- Add relative pointer resolver and tests

completes: step 8 of 11 for data-map-audit-completion
```

---

- [x] **Step 8: Relative JSON Pointer Support** - COMPLETED

### Step 9: Predicate Caching by Hash

**Objective**

Cache compiled predicates by a normalized hash key so whitespace-only differences reuse cached predicates.

**Files**

- packages/data-map/core/src/path/predicate.ts
- packages/data-map/core/src/path/predicate.spec.ts

#### Run (verification)

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

```txt
refactor(data-map-core): cache predicates by hash

- Cache predicates by normalized hash instead of raw expression
- Whitespace variations now reuse cached predicates
- Add tests for whitespace normalization and cache reuse

completes: step 9 of 11 for data-map-audit-completion
```

---

- [x] **Step 9: Predicate Caching by Hash** - COMPLETED

### Step 10: Integration Test Suite

- Normalize predicate expressions and key cache by stable hash
- Add tests for cache sharing

completes: step 9 of 11 for data-map-audit-completion

````

### Step 10: Integration Test Suite

**Objective**

Expand the integration and negative-case suites in `@data-map/core` to push coverage toward:

- Statements: 90%+
- Branches: 85%+
- Functions: 95%+

**Primary Coverage Targets**

- `DataMap.batch` (callback and fluent API) scheduling and patch application
- `DataMap.transaction` rollback behavior
- `DataMap.setAll` + `DataMap.map` multi-match mutation paths
- Subscription microtask behavior and event routing

**Files**

- [packages/data-map/core/src/**tests**/integration.spec.ts](packages/data-map/core/src/__tests__/integration.spec.ts)
- [packages/data-map/core/src/**tests**/errors.spec.ts](packages/data-map/core/src/__tests__/errors.spec.ts)

#### Diff: expand integration workflows

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/__tests__/integration.spec.ts
@@
-import { flushMicrotasks } from '../__fixtures__/helpers';
+import { createEventSpy, flushMicrotasks } from '../__fixtures__/helpers';
@@
 	it('resolveStream produces the same matches as resolve for JSONPath', () => {
 		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
 		const fromResolve = dm.resolve('$.users[*].name');
 		const fromStream = Array.from(dm.resolveStream('$.users[*].name'));
 		expect(fromStream).toEqual(fromResolve);
 	});
+
+	it('supports fluent batch preview (toPatch) and apply() with correct notification scheduling', async () => {
+		const dm = new DataMap({ a: 1, b: 1 });
+		const spy = createEventSpy();
+
+		dm.subscribe({
+			path: '/a',
+			after: 'set',
+			fn: spy.fn,
+		});
+
+		const b = dm.batch.set('/a', 2).set('/b', 3);
+		const ops = b.toPatch();
+		expect(ops.length).toBeGreaterThan(0);
+		expect(dm.get('/a')).toBe(1);
+		expect(dm.get('/b')).toBe(1);
+
+		b.apply();
+		// after-handlers are scheduled via queueMicrotask
+		expect(spy.events).toHaveLength(0);
+		await flushMicrotasks();
+
+		expect(dm.get('/a')).toBe(2);
+		expect(dm.get('/b')).toBe(3);
+		expect(spy.values).toContain(2);
+	});
+
+	it('batch() coalesces multi-op updates and updates multi-match paths (setAll + map)', async () => {
+		const dm = new DataMap({
+			users: [
+				{ name: 'Alice', active: false },
+				{ name: 'Bob', active: false },
+			],
+		});
+
+		const seen: Array<{ value: unknown; pointer: string; stage: string }> = [];
+		dm.subscribe({
+			path: '/users/0/name',
+			after: 'set',
+			fn: (value, event) => {
+				seen.push({ value, pointer: event.pointer, stage: event.stage });
+			},
+		});
+
+		dm.batch((d) => {
+			d.setAll('$.users[*].active', true);
+			d.map('$.users[*].name', (v) => `${String(v)}!`);
+		});
+
+		// after-handlers should not have executed yet
+		expect(seen).toHaveLength(0);
+		await flushMicrotasks();
+
+		expect(dm.get('/users/0/active')).toBe(true);
+		expect(dm.get('/users/1/active')).toBe(true);
+		expect(dm.get('/users/0/name')).toBe('Alice!');
+		expect(dm.get('/users/1/name')).toBe('Bob!');
+
+		expect(seen).toEqual([
+			{ value: 'Alice!', pointer: '/users/0/name', stage: 'after' },
+		]);
+	});
+
+	it('map() mapper receives JSON Pointer strings (not JSONPath) for each match', () => {
+		const dm = new DataMap({ nums: [1, 2] });
+		const pointers: string[] = [];
+
+		dm.map('$.nums[*]', (v, pointer) => {
+			pointers.push(pointer);
+			return (v as number) + 1;
+		});
+
+		expect(pointers).toEqual(['/nums/0', '/nums/1']);
+		expect(dm.get('/nums')).toEqual([2, 3]);
+	});
+
+	it('transaction() rolls back state and does not schedule after-handlers on failure', async () => {
+		const dm = new DataMap({ a: 1 });
+		let afterCalls = 0;
+
+		dm.subscribe({
+			path: '/a',
+			after: 'set',
+			fn: () => {
+				afterCalls++;
+			},
+		});
+
+		expect(() =>
+			dm.transaction((d) => {
+				d.set('/a', 2);
+				throw new Error('boom');
+			}),
+		).toThrow('boom');
+
+		await flushMicrotasks();
+		expect(dm.get('/a')).toBe(1);
+		expect(afterCalls).toBe(0);
+	});
 });
*** End Patch
````

#### Diff: expand error and negative cases

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/__tests__/errors.spec.ts
@@
 	it('throws DataMapPathError for invalid JSONPath in strict mode', () => {
 		const dm = new DataMap({ a: 1 }, { strict: true });
 		expect(() => dm.get('$.a[')).toThrow(DataMapPathError);
 	});
+
+	it('map() throws on no matches in strict mode and is a no-op in non-strict mode', () => {
+		const dmLoose = new DataMap({ a: 1 }, { strict: false });
+		expect(() => dmLoose.map('$.missing[*]', () => 1)).not.toThrow();
+		expect(dmLoose.get('/a')).toBe(1);
+
+		const dmStrict = new DataMap({ a: 1 }, { strict: true });
+		expect(() => dmStrict.map('$.missing[*]', () => 1)).toThrow(
+			'No matches for map()',
+		);
+		// strict mode should not partially mutate
+		expect(dmStrict.get('/a')).toBe(1);
+	});
+
+	it('setAll() does not throw in non-strict mode for invalid JSONPath, but throws DataMapPathError in strict mode', () => {
+		const dmLoose = new DataMap({ a: 1 }, { strict: false });
+		expect(() => dmLoose.setAll('$.a[', 2)).not.toThrow();
+		expect(dmLoose.get('/a')).toBe(1);
+
+		const dmStrict = new DataMap({ a: 1 }, { strict: true });
+		expect(() => dmStrict.setAll('$.a[', 2)).toThrow(DataMapPathError);
+		expect(dmStrict.get('/a')).toBe(1);
+	});
+
+	it('a before:set cancel() aborts mutation; strict controls whether an error is thrown', () => {
+		const dmLoose = new DataMap({ a: 1 }, { strict: false });
+		dmLoose.subscribe({
+			path: '/a',
+			before: 'set',
+			fn: (_value, _event, cancel) => cancel(),
+		});
+		expect(() => dmLoose.set('/a', 2)).not.toThrow();
+		expect(dmLoose.get('/a')).toBe(1);
+
+		const dmStrict = new DataMap({ a: 1 }, { strict: true });
+		dmStrict.subscribe({
+			path: '/a',
+			before: 'set',
+			fn: (_value, _event, cancel) => cancel(),
+		});
+		expect(() => dmStrict.set('/a', 2)).toThrow('Patch cancelled by subscription');
+		expect(dmStrict.get('/a')).toBe(1);
+	});
+
+	it('relative-pointer paths are rejected in strict mode and treated as no-match in non-strict mode', () => {
+		const dmLoose = new DataMap({ a: 1 }, { strict: false });
+		expect(dmLoose.get('1/a')).toBeUndefined();
+		expect(dmLoose.resolve('1/a')).toEqual([]);
+
+		const dmStrict = new DataMap({ a: 1 }, { strict: true });
+		expect(() => dmStrict.get('1/a')).toThrow('Unsupported path type: relative-pointer');
+		expect(() => dmStrict.resolve('1/a')).toThrow(
+			'Unsupported path type: relative-pointer',
+		);
+	});
 });
*** End Patch
```

#### Run (verification)

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core test:coverage
```

- Confirm coverage improves without regressions.
- If any branch threshold is still short, add 1–2 targeted tests for `setAll.toPatch()` and `map.toPatch()` (focus on strict vs non-strict branches).

#### STOP & COMMIT

```txt
test(data-map-core): expand integration + error suites for coverage

- Add fluent batch + callback batch workflow coverage
- Add transaction rollback coverage
- Add strict/non-strict negative cases for map/setAll and subscription cancellation

completes: step 10 of 11 for data-map-audit-completion
```

---

### Step 11: Spec Compliance Test Suite

**Objective**

Expand [packages/data-map/core/src/**tests**/spec-compliance.spec.ts](packages/data-map/core/src/__tests__/spec-compliance.spec.ts) so it maps directly to the canonical spec IDs and provides a sustainable structure for completing the REQ/AC matrix.

**Files**

- [packages/data-map/core/src/**tests**/spec-compliance.spec.ts](packages/data-map/core/src/__tests__/spec-compliance.spec.ts)
- [plans/data-map-audit-completion/SPEC_COMPLIANCE_REPORT.md](plans/data-map-audit-completion/SPEC_COMPLIANCE_REPORT.md) (new)

#### Diff: restructure and expand spec compliance coverage

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/__tests__/spec-compliance.spec.ts
@@
 describe('spec compliance', () => {
-	describe('REQ-001: @jsonpath/jsonpath JSONPath behavior', () => {
-		it('uses @jsonpath/jsonpath semantics for JSONPath queries', () => {
-			const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
-			expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
-		});
-
-		it('supports recursive descent', () => {
-			const dm = new DataMap({
-				a: { b: { name: 'x' } },
-				c: { name: 'y' },
-			});
-			expect(dm.getAll('$..name').sort()).toEqual(['x', 'y']);
-		});
-	});
-
-	describe('REQ-002: RFC6902 patch operations', () => {
+	describe('Requirements (REQ-*)', () => {
+		describe('REQ-001: json-p3 JSONPath behavior', () => {
+			it('uses json-p3 semantics for JSONPath queries', () => {
+				const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
+				expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
+			});
+
+			it('supports recursive descent', () => {
+				const dm = new DataMap({
+					a: { b: { name: 'x' } },
+					c: { name: 'y' },
+				});
+				expect(dm.getAll('$..name').sort()).toEqual(['x', 'y']);
+			});
+		});
+
+		describe('REQ-002: RFC6902 patch operations', () => {
 		it('supports add operation', () => {
 			const dm = new DataMap({ items: [1] });
 			dm.patch([{ op: 'add', path: '/items/-', value: 2 }]);
 			expect(dm.get('/items')).toEqual([1, 2]);
 		});
@@
 		it('supports test operation', () => {
 			const dm = new DataMap({ a: 1 }, { strict: true });
 			expect(() => dm.patch([{ op: 'test', path: '/a', value: 2 }])).toThrow();
 			expect(() =>
 				dm.patch([{ op: 'test', path: '/a', value: 1 }]),
 			).not.toThrow();
 		});
-	});
-
-	describe('REQ-003: Immutability', () => {
+		});
+
+		describe('REQ-003: Immutability', () => {
 		it('does not mutate initial data', () => {
 			const initial = { a: 1 };
 			const dm = new DataMap(initial);
 			dm.set('/a', 2);
 			expect(initial.a).toBe(1);
 		});
@@
 			const snap = dm.getSnapshot() as any;
 			snap.a.b = 999;
 			expect(dm.get('/a/b')).toBe(1);
 		});
-	});
-
-	describe('REQ-004: Path interchangeability', () => {
+		});
+
+		describe('REQ-004: Path interchangeability', () => {
 		it('accepts JSON Pointer and JSONPath interchangeably for reads', () => {
 			const dm = new DataMap({ user: { id: 1 } });
 			expect(dm.get('/user/id')).toBe(1);
 			expect(dm.get('$.user.id')).toBe(1);
 		});
-	});
-
-	describe('REQ-005: Path type detection', () => {
+		});
+
+		describe('REQ-005: Path type detection', () => {
 		it('classifies pointer vs relative-pointer vs jsonpath', () => {
 			expect(detectPathType('')).toBe('pointer');
 			expect(detectPathType('/')).toBe('pointer');
 			expect(detectPathType('/a')).toBe('pointer');
@@
 			expect(detectPathType('$.a')).toBe('jsonpath');
 			expect(detectPathType('$..a')).toBe('jsonpath');
 		});
-	});
-
-	describe('REQ-006: Subscription system', () => {
+		});
+
+		describe('REQ-006: Subscription system', () => {
 		it('supports before/on/after stages', async () => {
 			const dm = new DataMap({ a: 1 });
 			const stages: string[] = [];
@@
 			await flushMicrotasks();
 			expect(calls).toEqual([2]);
 		});
+		});
+
+		describe('REQ-010/011/012: patch generation (minimal, deterministic, container creation)', () => {
+			it('AC-008: set() on an existing pointer generates a replace op', () => {
+				const dm = new DataMap({ a: 1 });
+				expect(dm.set.toPatch('/a', 2)).toEqual([
+					{ op: 'replace', path: '/a', value: 2 },
+				]);
+			});
+
+			it('AC-009: set() on a missing deep pointer creates intermediate containers', () => {
+				const dm = new DataMap({} as any);
+				expect(dm.set.toPatch('/a/0/b', 'x')).toEqual([
+					{ op: 'add', path: '/a', value: [] },
+					{ op: 'add', path: '/a/0', value: {} },
+					{ op: 'add', path: '/a/0/b', value: 'x' },
+				]);
+			});
+
+			it('REQ-011: setAll.toPatch() is deterministic for stable match sets', () => {
+				const dm = new DataMap({ users: [{ active: false }, { active: true }] });
+				const p1 = dm.setAll.toPatch('$.users[*].active', (v) => !v);
+				const p2 = dm.setAll.toPatch('$.users[*].active', (v) => !v);
+				expect(p1).toEqual(p2);
+			});
+		});
 	});
+
+	describe('Acceptance Criteria (AC-*)', () => {
+		// Use SPEC_COMPLIANCE_REPORT.md as the source-of-truth matrix.
+		// Add one describe() per AC-* grouping (constructor/read/mutate/batch/subscriptions/definitions/array ops).
+		// Prefer tests that verify both strict and non-strict branches where applicable.
+
+		describe('AC-010: setAll updates all matched locations', () => {
+			it('updates every match and preserves deterministic match order', () => {
+				const dm = new DataMap({ users: [{ active: false }, { active: false }] });
+				dm.setAll('$.users[*].active', true);
+				expect(dm.get('/users/0/active')).toBe(true);
+				expect(dm.get('/users/1/active')).toBe(true);
+			});
+		});
+
+		describe('AC-023/AC-024: before:set cancellation and transformation', () => {
+			it('AC-023: cancel() aborts a set() in strict mode', () => {
+				const dm = new DataMap({ a: 1 }, { strict: true });
+				dm.subscribe({
+					path: '/a',
+					before: 'set',
+					fn: (_v, _e, cancel) => cancel(),
+				});
+				expect(() => dm.set('/a', 2)).toThrow('Patch cancelled by subscription');
+				expect(dm.get('/a')).toBe(1);
+			});
+
+			it('AC-024: returning a value from before:set transforms stored value', () => {
+				const dm = new DataMap({ a: 1 }, { strict: true });
+				dm.subscribe({
+					path: '/a',
+					before: 'set',
+					fn: (v) => (v as number) * 2,
+				});
+				dm.set('/a', 3);
+				expect(dm.get('/a')).toBe(6);
+			});
+		});
+	});
 });
*** End Patch
```

#### Diff: add spec compliance report matrix

```diff
*** Begin Patch
*** Add File: plans/data-map-audit-completion/SPEC_COMPLIANCE_REPORT.md
+# @data-map/core Spec Compliance Report
+
+Generated: 2026-01-05
+
+Source specification: [spec/spec-data-datamap.md](spec/spec-data-datamap.md)
+
+This file is the checklist for completing Step 11. Items are marked checked only when they are covered by assertions in [packages/data-map/core/src/__tests__/spec-compliance.spec.ts](packages/data-map/core/src/__tests__/spec-compliance.spec.ts) (or another test file with an explicit link).
+
+## Requirements (REQ-*)
+
+| ID | Status |
+| --- | --- |
+| REQ-001 | - [x] |
+| REQ-002 | - [x] |
+| REQ-003 | - [x] |
+| REQ-004 | - [x] |
+| REQ-005 | - [x] |
+| REQ-006 | - [x] |
+| REQ-007 | - [ ] |
+| REQ-008 | - [ ] |
+| REQ-009 | - [ ] |
+| REQ-010 | - [x] |
+| REQ-011 | - [x] |
+| REQ-012 | - [x] |
+| REQ-013 | - [ ] |
+| REQ-014 | - [ ] |
+| REQ-015 | - [ ] |
+| REQ-016 | - [ ] |
+| REQ-017 | - [ ] |
+| REQ-018 | - [ ] |
+| REQ-019 | - [ ] |
+| REQ-020 | - [ ] |
+| REQ-021 | - [ ] |
+| REQ-022 | - [ ] |
+| REQ-023 | - [ ] |
+| REQ-024 | - [ ] |
+| REQ-025 | - [ ] |
+| REQ-026 | - [ ] |
+| REQ-027 | - [ ] |
+| REQ-028 | - [ ] |
+| REQ-029 | - [ ] |
+| REQ-030 | - [ ] |
+| REQ-031 | - [ ] |
+
+## Acceptance Criteria (AC-*)
+
+| ID | Status |
+| --- | --- |
+| AC-001 | - [ ] |
+| AC-002 | - [ ] |
+| AC-003 | - [ ] |
+| AC-004 | - [ ] |
+| AC-005 | - [ ] |
+| AC-006 | - [ ] |
+| AC-007 | - [ ] |
+| AC-008 | - [x] |
+| AC-009 | - [x] |
+| AC-010 | - [x] |
+| AC-011 | - [ ] |
+| AC-012 | - [ ] |
+| AC-013 | - [ ] |
+| AC-014 | - [ ] |
+| AC-015 | - [ ] |
+| AC-016 | - [ ] |
+| AC-017 | - [ ] |
+| AC-018 | - [ ] |
+| AC-019 | - [ ] |
+| AC-020 | - [ ] |
+| AC-021 | - [ ] |
+| AC-022 | - [ ] |
+| AC-023 | - [x] |
+| AC-024 | - [x] |
+| AC-025 | - [ ] |
+| AC-026 | - [ ] |
+| AC-027 | - [ ] |
+| AC-028 | - [ ] |
+| AC-029 | - [ ] |
+| AC-030 | - [ ] |
+| AC-031 | - [ ] |
+| AC-032 | - [ ] |
+| AC-033 | - [ ] |
+| AC-034 | - [ ] |
+| AC-035 | - [ ] |
+| AC-036 | - [ ] |
+| AC-037 | - [ ] |
+| AC-038 | - [ ] |
*** End Patch
```

#### Run (verification)

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core test:coverage
```

- Add/adjust spec tests until the matrix in [plans/data-map-audit-completion/SPEC_COMPLIANCE_REPORT.md](plans/data-map-audit-completion/SPEC_COMPLIANCE_REPORT.md) reflects reality.
- Keep each test mapped to one REQ/AC (or a very tight cluster) to avoid ambiguity.

#### STOP & COMMIT

```txt
test(data-map-core): expand spec compliance suite and add compliance report

- Restructure spec-compliance tests into REQ-* and AC-* sections
- Add concrete coverage for patch generation and subscription cancellation/transform
- Add SPEC_COMPLIANCE_REPORT.md checklist for remaining REQ/AC matrix

completes: step 11 of 11 for data-map-audit-completion
```
