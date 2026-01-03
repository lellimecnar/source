# data-map-test-audit

## Goal

Raise `@data-map/core` test coverage to 90%+ statements/lines, 85%+ branches, 95%+ functions by systematically expanding unit + integration + spec-compliance tests and enforcing coverage thresholds to prevent regressions.

## Prerequisites

Make sure that the user is currently on the `feat/data-map-test-audit` branch before beginning implementation.
If the branch does not exist, create it from `master`.

### Commands (Monorepo)

- Run package tests: `pnpm --filter @data-map/core test`
- Run package tests with coverage: `pnpm --filter @data-map/core test:coverage`
- Watch mode: `pnpm --filter @data-map/core test:watch`

---

## Codebase State Summary

Before implementing, be aware of the current state:

| Item                              | Status                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `__fixtures__/` directory         | Exists but empty                                               |
| `datamap.spec.ts`                 | Has Read/Write/Immutability/Array API tests (~200 lines)       |
| `definitions/definitions.spec.ts` | Has 3 tests: getter, setter, readOnly                          |
| `subscription/static.spec.ts`     | Has 1 test for patch stages                                    |
| `subscription/dynamic.spec.ts`    | Has 2 tests for dynamic subscriptions                          |
| `utils/pointer.spec.ts`           | Has escape, unescape, parse, build, roundtrip tests            |
| `utils/util.spec.ts`              | Has 3 basic tests for deepEqual, deepExtends, snapshots        |
| `path/*.spec.ts`                  | Has compile, detect, expand, match, predicate, recursive specs |
| `patch/apply.spec.ts`             | Exists                                                         |
| `patch/builder.spec.ts`           | Exists                                                         |
| `patch/array.spec.ts`             | Does NOT exist                                                 |
| `DataMap.clone()`                 | Does NOT preserve `define` options                             |
| `utils/equal.ts`                  | Does NOT handle Date, RegExp, or circular refs                 |
| `src/__tests__/`                  | Does NOT exist                                                 |

---

## Step-by-Step Instructions

### Step 1: Test Infrastructure & Fixtures

**Tasks:**

- [x] Create `packages/data-map/core/src/__fixtures__/data.ts`
- [x] Create `packages/data-map/core/src/__fixtures__/helpers.ts`
- [x] Create `packages/data-map/core/src/__fixtures__/index.ts` (barrel export)
- [x] Update `packages/data-map/core/vitest.config.ts` to enforce initial coverage thresholds

#### 1.1 Create `src/__fixtures__/data.ts`

```ts
export const complexData = {
	users: [
		{
			id: 1,
			profile: {
				name: 'Alice',
				tags: ['dev', 'admin'],
				contact: { email: 'alice@example.com', phone: null },
			},
			settings: { theme: 'dark', notifications: { email: true, push: false } },
		},
		{
			id: 2,
			profile: {
				name: 'Bob',
				tags: ['dev'],
				contact: { email: 'bob@example.com', phone: '555-0102' },
			},
			settings: { theme: 'light', notifications: { email: false, push: true } },
		},
	],
	meta: {
		version: 1,
		flags: { beta: true, internal: false },
	},
	settings: {
		app: { name: 'readon', locale: 'en-US' },
		featureFlags: ['a', 'b', 'c'],
	},
} as const;

export type ComplexData = typeof complexData;
```

#### 1.2 Create `src/__fixtures__/helpers.ts`

```ts
import { DataMap } from '../datamap';
import type { SubscriptionEventInfo } from '../subscription/types';

import { complexData } from './data';

export function createDataMap<T = typeof complexData>(
	overrides?: T,
	options?: Parameters<typeof DataMap<T>>[1],
) {
	const initial = overrides ?? (structuredClone(complexData) as T);
	return new DataMap(initial, options);
}

export interface EventSpy {
	events: SubscriptionEventInfo[];
	values: unknown[];
	fn: (
		value: unknown,
		event: SubscriptionEventInfo,
		cancel: () => void,
	) => void;
}

export function createEventSpy(): EventSpy {
	const events: SubscriptionEventInfo[] = [];
	const values: unknown[] = [];

	return {
		events,
		values,
		fn: (value: unknown, event: SubscriptionEventInfo) => {
			values.push(value);
			events.push(event);
		},
	};
}

export async function flushMicrotasks(): Promise<void> {
	await new Promise<void>((resolve) => queueMicrotask(resolve));
}
```

#### 1.3 Create `src/__fixtures__/index.ts`

```ts
export * from './data';
export * from './helpers';
```

#### 1.4 Update vitest config with initial thresholds

Replace `packages/data-map/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

const base = vitestBaseConfig();

export default defineConfig({
	...base,
	test: {
		...(base.test ?? {}),
		coverage: {
			...((base.test as any)?.coverage ?? {}),
			thresholds: {
				branches: 80,
				functions: 80,
				lines: 80,
				statements: 80,
			},
		},
	},
});
```

#### Step 1 Verification

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core test:coverage
```

- [ ] Tests pass
- [ ] Coverage report runs (thresholds may fail initially - that's expected and will be fixed by subsequent steps)

> **Note:** If coverage thresholds fail at this step, that's OK. The initial thresholds of 80% are set as a baseline. If coverage is below 80%, temporarily lower thresholds or comment them out until Step 11.

#### Step 1 Commit

```txt
test(data-map-core): add shared fixtures and enforce coverage floor

- Add reusable complex fixture + helpers for subscription/event assertions
- Enforce initial 80% coverage thresholds in package vitest config

completes: step 1 of 11 for data-map-test-audit
```

---

### Step 2: Fix DataMap.clone() and Expand Core Tests

**Tasks:**

- [x] Update `DataMap` constructor to store `define` options
- [x] Update `DataMap.clone()` to pass stored `define` options
- [x] Add new tests to `datamap.spec.ts` (do NOT duplicate existing tests)

#### 2.1 Update `src/datamap.ts` - Store define options

**Step 2.1.1:** Add a private field after line 44 (after `_defs`):

```ts
private readonly _defineOptions:
	| DataMapOptions<T, Ctx>['define']
	| undefined;
```

**Step 2.1.2:** In the constructor, add this assignment after `this._data = cloneSnapshot(initialValue);` (around line 50):

```ts
this._defineOptions = options.define;
```

**Step 2.1.3:** Replace the `clone()` method (around line 533-537) with:

```ts
clone(): DataMap<T, Ctx> {
	return new (this.constructor as any)(this.getSnapshot(), {
		strict: this._strict,
		context: this._context,
		define: this._defineOptions,
	});
}
```

> **Note:** This ensures cloned DataMaps have the same computed property definitions as the original.

#### 2.2 Expand `src/datamap.spec.ts`

**First**, add this import at the TOP of the file (after the existing imports):

```ts
import { flushMicrotasks } from './__fixtures__/helpers';
```

**Then**, add the following tests AFTER the existing `describe` blocks (do NOT replace the file - these are additional tests):

```ts
describe('DataMap clone()', () => {
	it('should clone with isolated subscriptions', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('orig'),
		});

		const cloned = dm.clone();
		cloned.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('clone'),
		});

		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		cloned.patch([{ op: 'replace', path: '/a', value: 3 }]);
		await flushMicrotasks();
		expect(calls.sort()).toEqual(['clone', 'orig']);
	});

	it('should preserve definitions in clone', () => {
		type Ctx = { prefix: string };
		const define = [
			{
				pointer: '/x',
				get: (v: unknown, _depValues: unknown[], _instance: any, ctx: Ctx) =>
					`${ctx.prefix}${String(v)}`,
			},
		];

		const dm = new DataMap({ x: '1' }, { context: { prefix: 'v=' }, define });
		const cloned = dm.clone();
		expect(cloned.get('/x')).toBe('v=1');
	});
});

describe('DataMap strict mode', () => {
	it('should throw for relative pointers in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('0')).toThrow(
			'Unsupported path type: relative-pointer',
		);
	});

	it('should return empty matches for relative pointers in non-strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.get('0')).toBeUndefined();
	});
});

describe('DataMap error paths', () => {
	it('should handle get() with invalid JSONPath syntax (non-strict)', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.get('$.a[')).toBeUndefined();
	});

	it('should throw for invalid JSONPath in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('$.a[')).toThrow();
	});
});

describe('DataMap transaction edge cases', () => {
	it('should not trigger notifications on transaction rollback', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('a') });

		try {
			dm.transaction((d) => {
				d.set('/a', 2);
				throw new Error('fail');
			});
		} catch {
			// expected
		}

		await flushMicrotasks();
		expect(dm.get('/a')).toBe(1);
		expect(calls).toHaveLength(0);
	});

	it('should allow nested transactions', () => {
		const dm = new DataMap({ a: 1, b: 1 });
		dm.transaction((d) => {
			d.set('/a', 2);
			d.transaction((d2) => {
				d2.set('/b', 2);
			});
		});
		expect(dm.get('/a')).toBe(2);
		expect(dm.get('/b')).toBe(2);
	});
});

describe('DataMap batch edge cases', () => {
	it('should defer notifications within batch', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('after') });

		dm.batch((d) => {
			d.set('/a', 2);
			expect(calls).toEqual([]);
		});

		await flushMicrotasks();
		expect(calls).toEqual(['after']);
	});
});
```

#### Step 2 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All tests pass
- [ ] Clone preserves definitions

#### Step 2 Commit

```txt
fix(data-map-core): preserve definitions in DataMap.clone()

- Store define options in constructor for clone() reuse
- Add tests for clone isolation, definition preservation, strict mode, transactions

completes: step 2 of 11 for data-map-test-audit
```

---

### Step 3: Expand Definitions Module Tests

**Tasks:**

- [x] Add new tests to `definitions/definitions.spec.ts` (without duplicating existing ones)

The existing file has: getter, setter, readOnly tests. Add these NEW tests:

#### 3.1 Expand `src/definitions/definitions.spec.ts`

Add these tests to the existing `describe('definitions')` block:

```ts
it('registers multiple definitions targeting the same pointer (chained getters)', () => {
	const dm = new DataMap(
		{ user: { name: 'alice' } },
		{
			context: {},
			define: [
				{
					pointer: '/user/name',
					get: (v) => String(v).toUpperCase(),
				},
				{
					pointer: '/user/name',
					get: (v) => `@${String(v)}`,
				},
			],
		},
	);
	expect(dm.get('/user/name')).toBe('@ALICE');
});

it('registers JSONPath definitions (path) and matches computed pointers', () => {
	const dm = new DataMap(
		{ users: [{ name: 'a' }, { name: 'b' }] },
		{
			context: {},
			define: [
				{
					path: '$.users[*].name',
					get: (v) => String(v).toUpperCase(),
				},
			],
		},
	);

	expect(dm.get('/users/0/name')).toBe('A');
	expect(dm.get('/users/1/name')).toBe('B');
});

it('supports getter with explicit deps array', () => {
	const dm = new DataMap(
		{ a: 1, b: 2, sum: 0 },
		{
			context: {},
			define: [
				{
					pointer: '/sum',
					get: {
						deps: ['/a', '/b'],
						fn: (_v, depValues) =>
							(depValues[0] as number) + (depValues[1] as number),
					},
				},
			],
		},
	);
	expect(dm.get('/sum')).toBe(3);
});

it('supports setter with explicit deps array', () => {
	const dm = new DataMap(
		{ a: 1, b: 2, out: '' },
		{
			context: {},
			define: [
				{
					pointer: '/out',
					set: {
						deps: ['/a', '/b'],
						fn: (next, _current, depValues) =>
							`${depValues[0]}+${depValues[1]}=${next}`,
					},
				},
			],
		},
	);
	dm.set('/out', 123);
	expect(dm.get('/out')).toBe('1+2=123');
});
```

#### Step 3 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All definition tests pass
- [ ] Coverage for `definitions/registry.ts` improves

#### Step 3 Commit

```txt
test(data-map-core): expand definitions module coverage

- Add chained getter, JSONPath path, and deps config tests
- Cover setter transform with dependency values

completes: step 3 of 11 for data-map-test-audit
```

---

### Step 4: Expand Subscription Module Tests

**Tasks:**

- [x] Add `src/subscription/events.spec.ts` for event-specific tests
- [x] Add `src/subscription/manager.spec.ts` for manager-specific tests

Existing tests in `static.spec.ts` and `dynamic.spec.ts` cover basic scenarios. These new files add edge cases.

#### 4.1 Create `src/subscription/events.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('subscription events', () => {
	it("treats 'set' as an alias for 'patch' for stage selection", async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => calls.push('after:set'),
		});
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		expect(calls).toEqual(['after:set']);
	});

	it('supports multiple event types in single subscription', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			before: ['patch', 'set'],
			after: 'patch',
			fn: (_v, e) => calls.push(`${e.stage}:${e.type}`),
		});
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		// before fires for both types, after fires once
		expect(calls).toContain('before:patch');
		expect(calls).toContain('after:patch');
	});

	it('receives operation info in event', async () => {
		const dm = new DataMap({ a: 1 });
		let operation: any;
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: (_v, e) => {
				operation = e.operation;
			},
		});
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		expect(operation?.op).toBe('replace');
	});
});
```

#### 4.2 Create `src/subscription/manager.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('subscription manager', () => {
	it('returns subscription with id and query', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const sub = dm.subscribe({
			path: '/a/b',
			after: 'patch',
			fn: () => {},
		});

		expect(sub.id).toBeTruthy();
		expect(sub.query).toBe('/a/b');
	});

	it('cleans up on unsubscribe (no further notifications)', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		const sub = dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('hit'),
		});

		sub.unsubscribe();
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		expect(calls).toEqual([]);
	});

	it('tracks isDynamic for wildcard patterns', () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		const sub = dm.subscribe({
			path: '$.users[*].name',
			after: 'set',
			fn: () => {},
		});

		expect(sub.isDynamic).toBe(true);
	});

	it('tracks isDynamic=false for static pointers', () => {
		const dm = new DataMap({ a: 1 });
		const sub = dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => {},
		});

		expect(sub.isDynamic).toBe(false);
	});
});
```

#### Step 4 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All subscription tests pass
- [ ] Coverage for `subscription/manager.ts` improves

#### Step 4 Commit

```txt
test(data-map-core): add subscription event and manager tests

- Add event alias, multi-type, and previousValue tests
- Add manager subscription tracking and cleanup tests

completes: step 4 of 11 for data-map-test-audit
```

---

### Step 5: Add Patch Array Tests

**Tasks:**

- [x] Create `src/patch/array.spec.ts`

The array patch builders have specific return types:

- `buildPushPatch(data, pointer, items): Operation[]`
- `buildPopPatch(data, pointer): { ops: Operation[], value: unknown }`
- `buildShiftPatch(data, pointer): { ops: Operation[], value: unknown }`
- `buildUnshiftPatch(data, pointer, items): Operation[]`
- `buildSplicePatch(data, pointer, start, deleteCount, items): { ops: Operation[], removed: unknown[] }`
- `buildSortPatch(data, pointer, compareFn?): Operation[]`
- `buildShufflePatch(data, pointer, rng?): Operation[]`

#### 5.1 Create `src/patch/array.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import {
	buildPopPatch,
	buildPushPatch,
	buildShiftPatch,
	buildShufflePatch,
	buildSortPatch,
	buildSplicePatch,
	buildUnshiftPatch,
} from './array';

describe('patch/array', () => {
	describe('buildPushPatch', () => {
		it('creates array when pushing to non-existent path', () => {
			const ops = buildPushPatch({}, '/items', [1, 2]);
			expect(ops).toEqual([{ op: 'add', path: '/items', value: [1, 2] }]);
		});

		it('appends items to existing array', () => {
			const ops = buildPushPatch({ items: [1] }, '/items', [2, 3]);
			expect(ops).toEqual([
				{ op: 'add', path: '/items/-', value: 2 },
				{ op: 'add', path: '/items/-', value: 3 },
			]);
		});

		it('returns empty ops when pushing empty array', () => {
			const ops = buildPushPatch({}, '/items', []);
			expect(ops).toEqual([]);
		});
	});

	describe('buildPopPatch', () => {
		it('returns empty ops and undefined for empty array', () => {
			const { ops, value } = buildPopPatch({ items: [] }, '/items');
			expect(ops).toEqual([]);
			expect(value).toBeUndefined();
		});

		it('removes and returns last item', () => {
			const { ops, value } = buildPopPatch({ items: [1, 2, 3] }, '/items');
			expect(value).toBe(3);
			expect(ops).toEqual([{ op: 'remove', path: '/items/2' }]);
		});
	});

	describe('buildShiftPatch', () => {
		it('returns empty ops and undefined for empty array', () => {
			const { ops, value } = buildShiftPatch({ items: [] }, '/items');
			expect(ops).toEqual([]);
			expect(value).toBeUndefined();
		});

		it('removes and returns first item', () => {
			const { ops, value } = buildShiftPatch({ items: [1, 2, 3] }, '/items');
			expect(value).toBe(1);
			expect(ops).toEqual([{ op: 'remove', path: '/items/0' }]);
		});
	});

	describe('buildUnshiftPatch', () => {
		it('creates array when unshifting to non-existent path', () => {
			const ops = buildUnshiftPatch({}, '/items', [1, 2]);
			expect(ops).toEqual([{ op: 'add', path: '/items', value: [1, 2] }]);
		});

		it('prepends items to existing array', () => {
			const ops = buildUnshiftPatch({ items: [3] }, '/items', [1, 2]);
			// Items inserted at 0 in reverse order
			expect(ops.length).toBe(2);
			expect(ops[0]!.op).toBe('add');
			expect(ops[0]!.path).toBe('/items/0');
		});
	});

	describe('buildSplicePatch', () => {
		it('handles splice with deleteCount exceeding length', () => {
			const { ops, removed } = buildSplicePatch(
				{ items: [1, 2, 3] },
				'/items',
				1,
				999,
				[],
			);
			expect(removed).toEqual([2, 3]);
			expect(ops.length).toBeGreaterThan(0);
		});

		it('inserts items without removing', () => {
			const { ops, removed } = buildSplicePatch(
				{ items: [1, 3] },
				'/items',
				1,
				0,
				[2],
			);
			expect(removed).toEqual([]);
			expect(ops).toContainEqual({ op: 'add', path: '/items/1', value: 2 });
		});

		it('removes and inserts items', () => {
			const { ops, removed } = buildSplicePatch(
				{ items: [1, 2, 3, 4] },
				'/items',
				1,
				2,
				[99],
			);
			expect(removed).toEqual([2, 3]);
			expect(ops.length).toBeGreaterThan(0);
		});
	});

	describe('buildSortPatch', () => {
		it('sorts with default comparator', () => {
			const ops = buildSortPatch({ items: [3, 1, 2] }, '/items');
			expect(ops).toEqual([
				{ op: 'replace', path: '/items', value: [1, 2, 3] },
			]);
		});

		it('sorts with custom comparator', () => {
			const ops = buildSortPatch(
				{ items: [1, 2, 3] },
				'/items',
				(a, b) => Number(b) - Number(a),
			);
			expect(ops).toEqual([
				{ op: 'replace', path: '/items', value: [3, 2, 1] },
			]);
		});
	});

	describe('buildShufflePatch', () => {
		it('uses custom RNG for deterministic shuffle', () => {
			// RNG that always returns 0 should produce a specific order
			const ops = buildShufflePatch({ items: [1, 2, 3] }, '/items', () => 0);
			expect(ops).toHaveLength(1);
			expect(ops[0]!.op).toBe('replace');
		});

		it('shuffles array (result has same elements)', () => {
			const original = [1, 2, 3, 4, 5];
			const ops = buildShufflePatch({ items: [...original] }, '/items');
			expect(ops).toHaveLength(1);
			expect(ops[0]!.op).toBe('replace');
			const shuffled = (ops[0] as any).value as number[];
			expect([...shuffled].sort()).toEqual([...original].sort());
		});
	});
});
```

#### Step 5 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All patch/array tests pass
- [ ] Coverage for `patch/array.ts` improves significantly

#### Step 5 Commit

```txt
test(data-map-core): add patch array builder tests

- Add comprehensive tests for push, pop, shift, unshift, splice, sort, shuffle
- Cover edge cases: empty arrays, non-existent paths, custom comparators

completes: step 5 of 11 for data-map-test-audit
```

---

### Step 6: Add Path Filter Tests

**Tasks:**

- [x] Create `src/path/filter.spec.ts` for filter expression tests

#### 6.1 Create `src/path/filter.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('path filter expressions', () => {
	it('expands filter expressions with boolean comparison', () => {
		const pattern = compilePathPattern('$.users[?(@.active == true)].name');
		const data = {
			users: [
				{ name: 'A', active: true },
				{ name: 'B', active: false },
				{ name: 'C', active: true },
			],
		};

		const pointers = pattern.expand(data);
		expect(pointers.sort()).toEqual(['/users/0/name', '/users/2/name']);
	});

	it('handles numeric comparison in filters', () => {
		const pattern = compilePathPattern('$.users[?(@.score > 90)].id');
		const data = {
			users: [
				{ id: 1, score: 95 },
				{ id: 2, score: 85 },
				{ id: 3, score: 92 },
			],
		};
		expect(pattern.expand(data).sort()).toEqual(['/users/0/id', '/users/2/id']);
	});

	it('handles logical AND in filters', () => {
		const pattern = compilePathPattern(
			'$.users[?(@.score > 90 && @.verified == true)].id',
		);
		const data = {
			users: [
				{ id: 1, score: 95, verified: true },
				{ id: 2, score: 95, verified: false },
				{ id: 3, score: 50, verified: true },
			],
		};
		expect(pattern.expand(data)).toEqual(['/users/0/id']);
	});

	it('handles logical OR in filters', () => {
		const pattern = compilePathPattern(
			'$.users[?(@.role == "admin" || @.role == "mod")].name',
		);
		const data = {
			users: [
				{ name: 'A', role: 'admin' },
				{ name: 'B', role: 'user' },
				{ name: 'C', role: 'mod' },
			],
		};
		expect(pattern.expand(data).sort()).toEqual([
			'/users/0/name',
			'/users/2/name',
		]);
	});

	it('handles negation in filters', () => {
		const pattern = compilePathPattern('$.items[?(!@.deleted)].id');
		const data = {
			items: [
				{ id: 1, deleted: false },
				{ id: 2, deleted: true },
				{ id: 3 }, // deleted is undefined, which is falsy
			],
		};
		expect(pattern.expand(data).sort()).toEqual(['/items/0/id', '/items/2/id']);
	});

	it('returns empty for non-matching filter', () => {
		const pattern = compilePathPattern('$.users[?(@.score > 100)].id');
		const data = {
			users: [
				{ id: 1, score: 50 },
				{ id: 2, score: 60 },
			],
		};
		expect(pattern.expand(data)).toEqual([]);
	});
});
```

#### Step 6 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All path filter tests pass
- [ ] Coverage for `path/compile.ts` and `path/predicate.ts` improves

#### Step 6 Commit

```txt
test(data-map-core): add path filter expression tests

- Add tests for boolean, numeric, logical AND/OR, and negation filters
- Cover empty result case and complex filter expressions

completes: step 6 of 11 for data-map-test-audit
```

---

### Step 7: Expand Utils Tests and Upgrade deepEqual

> **⚠️ CODE CHANGE:** This step modifies production code (`equal.ts`), not just tests. The current `deepEqual` does NOT handle Date, RegExp, or circular references. This upgrade adds those capabilities.

**Tasks:**

- [x] **REPLACE** `src/utils/equal.ts` with upgraded implementation
- [x] Expand `src/utils/util.spec.ts` with new test cases
- [x] Add invalid pointer test to `src/utils/pointer.spec.ts`

#### 7.1 Replace `src/utils/equal.ts`

```ts
function isObject(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object';
}

function sameRegExp(a: RegExp, b: RegExp): boolean {
	return a.source === b.source && a.flags === b.flags;
}

export function deepEqual(a: any, b: any): boolean {
	const seen = new WeakMap<object, WeakSet<object>>();

	const inner = (x: any, y: any): boolean => {
		if (x === y) return true;
		if (typeof x !== typeof y) return false;
		if (x === null || y === null) return x === y;
		if (typeof x !== 'object') return x === y;

		// Date comparison
		if (x instanceof Date && y instanceof Date) {
			return x.getTime() === y.getTime();
		}

		// RegExp comparison
		if (x instanceof RegExp && y instanceof RegExp) {
			return sameRegExp(x, y);
		}

		// Array vs object mismatch
		if (Array.isArray(x) !== Array.isArray(y)) return false;

		// Circular reference handling
		if (isObject(x) && isObject(y)) {
			const existing = seen.get(x);
			if (existing?.has(y)) return true;
			if (!existing) seen.set(x, new WeakSet([y]));
			else existing.add(y);
		}

		if (Array.isArray(x)) {
			if (x.length !== y.length) return false;
			for (let i = 0; i < x.length; i++) {
				if (!inner(x[i], y[i])) return false;
			}
			return true;
		}

		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);
		if (xKeys.length !== yKeys.length) return false;
		for (const k of xKeys) {
			if (!Object.prototype.hasOwnProperty.call(y, k)) return false;
			if (!inner(x[k], y[k])) return false;
		}
		return true;
	};

	return inner(a, b);
}

export function deepExtends(target: any, partial: any): boolean {
	if (partial === undefined) return true;
	if (partial === null || typeof partial !== 'object') {
		return deepEqual(target, partial);
	}
	if (target === null || typeof target !== 'object') return false;

	if (Array.isArray(partial)) {
		if (!Array.isArray(target)) return false;
		if (partial.length > target.length) return false;
		for (let i = 0; i < partial.length; i++) {
			if (!deepExtends(target[i], partial[i])) return false;
		}
		return true;
	}

	for (const k of Object.keys(partial)) {
		if (!Object.prototype.hasOwnProperty.call(target, k)) return false;
		if (!deepExtends(target[k], partial[k])) return false;
	}
	return true;
}
```

#### 7.2 Expand `src/utils/util.spec.ts`

Add these tests to the existing file (do NOT replace - add after existing tests):

```ts
it('deepEqual compares null vs undefined', () => {
	expect(deepEqual(null, undefined)).toBe(false);
	expect(deepEqual(undefined, null)).toBe(false);
	expect(deepEqual(null, null)).toBe(true);
	expect(deepEqual(undefined, undefined)).toBe(true);
});

it('deepEqual compares empty objects and arrays', () => {
	expect(deepEqual({}, {})).toBe(true);
	expect(deepEqual([], [])).toBe(true);
	expect(deepEqual({}, [])).toBe(false);
});

it('deepEqual compares Date objects', () => {
	expect(deepEqual(new Date(0), new Date(0))).toBe(true);
	expect(deepEqual(new Date(0), new Date(1))).toBe(false);
});

it('deepEqual compares RegExp objects', () => {
	expect(deepEqual(/a/i, /a/i)).toBe(true);
	expect(deepEqual(/a/i, /a/g)).toBe(false);
	expect(deepEqual(/a/, /b/)).toBe(false);
});

it('deepEqual handles circular references', () => {
	const a: any = { x: 1 };
	a.self = a;
	const b: any = { x: 1 };
	b.self = b;
	expect(deepEqual(a, b)).toBe(true);
});

it('deepExtends returns false when partial array is longer', () => {
	expect(deepExtends([1], [1, 2])).toBe(false);
});

it('deepExtends returns true for undefined partial', () => {
	expect(deepExtends({ a: 1 }, undefined)).toBe(true);
});
```

#### 7.3 Expand `src/utils/pointer.spec.ts`

Add this test to the existing file:

```ts
it('throws for invalid pointers (not starting with / or #)', () => {
	expect(() => parsePointerSegments('invalid')).toThrow('Invalid JSON Pointer');
	expect(() => parsePointerSegments('a/b/c')).toThrow('Invalid JSON Pointer');
});
```

#### Step 7 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All utils tests pass
- [ ] Coverage for `utils/equal.ts` and `utils/pointer.ts` reaches 95%+

#### Step 7 Commit

```txt
feat(data-map-core): enhance deepEqual with Date/RegExp/circular support

- Add Date and RegExp comparison support to deepEqual
- Add circular reference detection to prevent infinite loops
- Add comprehensive edge case tests for utils

completes: step 7 of 11 for data-map-test-audit
```

---

### Step 8: Add Integration Tests

**Tasks:**

- [x] Create `src/__tests__/` directory
- [x] Create `src/__tests__/integration.spec.ts`

#### 8.1 Create `src/__tests__/integration.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('integration workflows', () => {
	it('supports read-modify-write cycle with subscriptions', async () => {
		const dm = new DataMap({ user: { name: 'Alice' } });
		const calls: string[] = [];
		dm.subscribe({
			path: '/user/name',
			after: 'set',
			fn: (v) => calls.push(String(v)),
		});

		dm.set('/user/name', (curr: unknown) => `${String(curr)}!`);
		await flushMicrotasks();
		expect(dm.get('/user/name')).toBe('Alice!');
		expect(calls).toContain('Alice!');
	});

	it('supports patch preview via toPatch (no immediate mutation)', () => {
		const dm = new DataMap({ a: 1 });
		const ops = dm.set.toPatch('/a', 2);
		expect(dm.get('/a')).toBe(1); // unchanged
		dm.patch(ops);
		expect(dm.get('/a')).toBe(2);
	});

	it('handles deeply nested objects (10+ levels)', () => {
		const deep: Record<string, any> = {};
		let node = deep;
		for (let i = 0; i < 12; i++) {
			node.next = {};
			node = node.next;
		}
		const dm = new DataMap(deep);
		dm.set('/next/next/next/value', 123);
		expect(dm.get('/next/next/next/value')).toBe(123);
	});

	it('maintains immutability across chained operations', () => {
		const initial = { items: [1, 2, 3] };
		const dm = new DataMap(initial);

		dm.push('/items', 4);
		dm.pop('/items');
		dm.shift('/items');

		// Original unchanged
		expect(initial.items).toEqual([1, 2, 3]);
		// DataMap has modified copy
		expect(dm.get('/items')).toEqual([2, 3]);
	});

	it('combines JSONPath queries with subscriptions', async () => {
		const dm = new DataMap({
			users: [
				{ name: 'Alice', active: true },
				{ name: 'Bob', active: false },
			],
		});

		const activeNames: string[] = [];
		dm.subscribe({
			path: '$.users[?(@.active == true)].name',
			after: 'set',
			fn: (v) => activeNames.push(String(v)),
		});

		dm.set('/users/0/name', 'Alicia');
		await flushMicrotasks();

		expect(activeNames).toContain('Alicia');
	});

	it('supports equals() comparison between DataMaps', () => {
		const dm1 = new DataMap({ a: 1, b: { c: 2 } });
		const dm2 = new DataMap({ a: 1, b: { c: 2 } });
		const dm3 = new DataMap({ a: 1, b: { c: 3 } });

		expect(dm1.equals(dm2)).toBe(true);
		expect(dm1.equals(dm3)).toBe(false);
	});

	it('supports extends() for partial matching', () => {
		const dm = new DataMap({ a: 1, b: { c: 2, d: 3 } });

		expect(dm.extends({ b: { c: 2 } })).toBe(true);
		expect(dm.extends({ b: { c: 99 } })).toBe(false);
	});
});
```

#### Step 8 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] Integration tests pass
- [ ] Coverage improves for core DataMap methods

#### Step 8 Commit

```txt
test(data-map-core): add integration workflow tests

- Add end-to-end tests for read/modify/write, patch preview, deep nesting
- Add tests for equals(), extends(), and combined JSONPath+subscriptions

completes: step 8 of 11 for data-map-test-audit
```

---

### Step 9: Add Error and Negative Tests

**Tasks:**

- [x] Create `src/__tests__/errors.spec.ts`

#### 9.1 Create `src/__tests__/errors.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('error and negative cases', () => {
	it('handles get() with empty path as root pointer', () => {
		const dm = new DataMap({ a: 1 });
		expect(dm.get('')).toEqual({ a: 1 });
		expect(dm.get('#')).toEqual({ a: 1 });
	});

	it('returns undefined for non-existent nested path (non-strict)', () => {
		const dm = new DataMap({ a: { b: 1 } });
		expect(dm.get('/a/b/c/d')).toBeUndefined();
	});

	it('throws for non-existent path in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('/missing')).toThrow();
	});

	it('handles patch on non-existent path in non-strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		// Should not throw
		dm.patch([{ op: 'add', path: '/new', value: 2 }]);
		expect(dm.get('/new')).toBe(2);
	});

	it('handles resolve() with fragment pointer', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const matches = dm.resolve('#/a/b');
		expect(matches).toHaveLength(1);
		expect(matches[0]!.value).toBe(1);
	});

	it('handles JSONPath with no matches gracefully', () => {
		const dm = new DataMap({ items: [] });
		expect(dm.getAll('$.items[*].name')).toEqual([]);
	});

	it('subscription handler error does not prevent patch application', async () => {
		const dm = new DataMap({ a: 1 });
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => {
				throw new Error('handler error');
			},
		});

		// Patch should still apply
		expect(() =>
			dm.patch([{ op: 'replace', path: '/a', value: 2 }]),
		).not.toThrow();
		await flushMicrotasks();
		expect(dm.get('/a')).toBe(2);
	});

	it('toJSON returns cloned data', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const json = dm.toJSON() as any;
		json.a.b = 999;
		expect(dm.get('/a/b')).toBe(1);
	});
});
```

#### Step 9 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] Error tests pass
- [ ] Coverage for error branches improves

#### Step 9 Commit

```txt
test(data-map-core): add error and negative case tests

- Add tests for missing paths, strict mode errors, handler errors
- Cover edge cases for resolve(), toJSON(), and patch recovery

completes: step 9 of 11 for data-map-test-audit
```

---

### Step 10: Add Spec Compliance Tests

**Tasks:**

- [ ] Create `src/__tests__/spec-compliance.spec.ts`

This maps tests to requirements from `spec/spec-data-datamap.md`.

#### 10.1 Create `src/__tests__/spec-compliance.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { detectPathType } from '../path/detect';

describe('spec compliance', () => {
	describe('REQ-001: json-p3 JSONPath behavior', () => {
		it('uses json-p3 semantics for JSONPath queries', () => {
			const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
			expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
		});

		it('supports recursive descent', () => {
			const dm = new DataMap({
				a: { b: { name: 'x' } },
				c: { name: 'y' },
			});
			expect(dm.getAll('$..name').sort()).toEqual(['x', 'y']);
		});
	});

	describe('REQ-002: RFC6902 patch operations', () => {
		it('supports add operation', () => {
			const dm = new DataMap({ items: [1] });
			dm.patch([{ op: 'add', path: '/items/-', value: 2 }]);
			expect(dm.get('/items')).toEqual([1, 2]);
		});

		it('supports remove operation', () => {
			const dm = new DataMap({ a: 1, b: 2 });
			dm.patch([{ op: 'remove', path: '/a' }]);
			expect(dm.get('/a')).toBeUndefined();
		});

		it('supports replace operation', () => {
			const dm = new DataMap({ a: 1 });
			dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
			expect(dm.get('/a')).toBe(2);
		});

		it('supports copy operation', () => {
			const dm = new DataMap({ a: 1 });
			dm.patch([{ op: 'copy', from: '/a', path: '/b' }]);
			expect(dm.get('/b')).toBe(1);
		});

		it('supports move operation', () => {
			const dm = new DataMap({ a: 1 });
			dm.patch([{ op: 'move', from: '/a', path: '/b' }]);
			expect(dm.get('/a')).toBeUndefined();
			expect(dm.get('/b')).toBe(1);
		});

		it('supports test operation', () => {
			const dm = new DataMap({ a: 1 });
			expect(() => dm.patch([{ op: 'test', path: '/a', value: 2 }])).toThrow();
			expect(() =>
				dm.patch([{ op: 'test', path: '/a', value: 1 }]),
			).not.toThrow();
		});
	});

	describe('REQ-003: Immutability', () => {
		it('does not mutate initial data', () => {
			const initial = { a: 1 };
			const dm = new DataMap(initial);
			dm.set('/a', 2);
			expect(initial.a).toBe(1);
		});

		it('returns cloned snapshots', () => {
			const dm = new DataMap({ a: { b: 1 } });
			const snap = dm.getSnapshot() as any;
			snap.a.b = 999;
			expect(dm.get('/a/b')).toBe(1);
		});
	});

	describe('REQ-004: Path interchangeability', () => {
		it('accepts JSON Pointer and JSONPath interchangeably for reads', () => {
			const dm = new DataMap({ user: { id: 1 } });
			expect(dm.get('/user/id')).toBe(1);
			expect(dm.get('$.user.id')).toBe(1);
		});
	});

	describe('REQ-005: Path type detection', () => {
		it('classifies pointer vs relative-pointer vs jsonpath', () => {
			expect(detectPathType('')).toBe('pointer');
			expect(detectPathType('/')).toBe('pointer');
			expect(detectPathType('/a')).toBe('pointer');
			expect(detectPathType('#/a')).toBe('pointer');
			expect(detectPathType('0')).toBe('relative-pointer');
			expect(detectPathType('1/a')).toBe('relative-pointer');
			expect(detectPathType('$')).toBe('jsonpath');
			expect(detectPathType('$.a')).toBe('jsonpath');
			expect(detectPathType('$..a')).toBe('jsonpath');
		});
	});

	describe('REQ-006: Subscription system', () => {
		it('supports before/on/after stages', () => {
			const dm = new DataMap({ a: 1 });
			const stages: string[] = [];

			dm.subscribe({
				path: '/a',
				before: 'patch',
				on: 'patch',
				after: 'patch',
				fn: (_v, e) => stages.push(e.stage),
			});

			dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
			expect(stages).toEqual(['before', 'on', 'after']);
		});

		it('supports unsubscribe', () => {
			const dm = new DataMap({ a: 1 });
			const calls: number[] = [];

			const sub = dm.subscribe({
				path: '/a',
				after: 'patch',
				fn: (v) => calls.push(v as number),
			});

			dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
			sub.unsubscribe();
			dm.patch([{ op: 'replace', path: '/a', value: 3 }]);

			expect(calls).toEqual([2]);
		});
	});
});
```

#### Step 10 Verification

```bash
pnpm --filter @data-map/core test
```

- [ ] All spec compliance tests pass
- [ ] Coverage is comprehensive for core requirements

#### Step 10 Commit

```txt
test(data-map-core): add spec compliance test suite

- Add requirement-indexed tests for JSONPath, RFC6902, immutability
- Cover path detection, interchangeability, and subscription system

completes: step 10 of 11 for data-map-test-audit
```

---

### Step 11: Final Validation and Threshold Raise

**Tasks:**

- [ ] Raise coverage thresholds to final targets
- [ ] Run full coverage report and verify passing
- [ ] Update package AGENTS.md with test patterns

#### 11.1 Update `vitest.config.ts` with final thresholds

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

const base = vitestBaseConfig();

export default defineConfig({
	...base,
	test: {
		...(base.test ?? {}),
		coverage: {
			...((base.test as any)?.coverage ?? {}),
			thresholds: {
				statements: 90,
				lines: 90,
				branches: 85,
				functions: 95,
			},
		},
	},
});
```

#### 11.2 Update `packages/data-map/core/AGENTS.md`

Add this section to the package's AGENTS.md:

````md
## Testing Conventions

### Test Location

- Unit tests: Co-located with source files (`*.spec.ts`)
- Integration tests: `src/__tests__/integration.spec.ts`
- Error tests: `src/__tests__/errors.spec.ts`
- Spec compliance: `src/__tests__/spec-compliance.spec.ts`

### Shared Fixtures

Import from `__fixtures__/`:

```ts
import {
	createDataMap,
	createEventSpy,
	flushMicrotasks,
} from './__fixtures__/helpers';
import { complexData } from './__fixtures__/data';
```
````

### Running Tests

```bash
pnpm --filter @data-map/core test           # Run once
pnpm --filter @data-map/core test:watch     # Watch mode
pnpm --filter @data-map/core test:coverage  # With coverage
```

### Coverage Requirements

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 90%       |
| Lines      | 90%       |
| Branches   | 85%       |
| Functions  | 95%       |

````

#### Step 11 Verification

```bash
pnpm --filter @data-map/core test:coverage
````

- [ ] All tests pass
- [ ] Coverage meets or exceeds thresholds:
  - statements: 90%
  - lines: 90%
  - branches: 85%
  - functions: 95%

#### Step 11 Commit

```txt
docs(data-map-core): finalize test coverage and document conventions

- Raise coverage thresholds to final targets (90/90/85/95)
- Document testing patterns and fixture usage in AGENTS.md

completes: step 11 of 11 for data-map-test-audit
```

---

## Summary

| Step | Description                    | Files Modified/Created                                                                         |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1    | Test infrastructure & fixtures | `__fixtures__/data.ts`, `__fixtures__/helpers.ts`, `__fixtures__/index.ts`, `vitest.config.ts` |
| 2    | DataMap core + clone fix       | `datamap.ts`, `datamap.spec.ts`                                                                |
| 3    | Definitions module             | `definitions/definitions.spec.ts`                                                              |
| 4    | Subscription module            | `subscription/events.spec.ts`, `subscription/manager.spec.ts`                                  |
| 5    | Patch array builders           | `patch/array.spec.ts`                                                                          |
| 6    | Path filter expressions        | `path/filter.spec.ts`                                                                          |
| 7    | Utils + deepEqual upgrade      | `utils/equal.ts`, `utils/util.spec.ts`, `utils/pointer.spec.ts`                                |
| 8    | Integration tests              | `__tests__/integration.spec.ts`                                                                |
| 9    | Error/negative tests           | `__tests__/errors.spec.ts`                                                                     |
| 10   | Spec compliance tests          | `__tests__/spec-compliance.spec.ts`                                                            |
| 11   | Final validation               | `vitest.config.ts`, `AGENTS.md`                                                                |

## Final Coverage Targets

| Metric     | Target |
| ---------- | ------ |
| Statements | 90%    |
| Lines      | 90%    |
| Branches   | 85%    |
| Functions  | 95%    |
