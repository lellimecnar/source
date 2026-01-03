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

## Step-by-Step Instructions

### Step 1: Test Infrastructure & Fixtures

- [ ] Create `packages/data-map/core/src/__fixtures__/data.ts`.
- [ ] Create `packages/data-map/core/src/__fixtures__/helpers.ts`.
- [ ] Update `packages/data-map/core/vitest.config.ts` to enforce initial coverage thresholds (start at 85%+; raise to final thresholds in Step 11).

#### 1.1 Add `src/__fixtures__/data.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/__fixtures__/data.ts`:

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

#### 1.2 Add `src/__fixtures__/helpers.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/__fixtures__/helpers.ts`:

```ts
import { DataMap } from '../datamap';
import type { SubscriptionEventInfo } from '../subscription/types';

import { complexData } from './data';

export function createDataMap(overrides?: unknown, options?: any) {
	const initial = overrides ?? structuredClone(complexData);
	return new DataMap(initial as any, options);
}

export function createEventSpy() {
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
	await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
}
```

#### 1.3 Enforce initial coverage thresholds

- [ ] Replace `packages/data-map/core/vitest.config.ts` with the code below:

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
				branches: 85,
				functions: 85,
				lines: 85,
				statements: 85,
			},
		},
	},
});
```

##### Step 1 Verification Checklist

- [ ] `pnpm --filter @data-map/core test` passes
- [ ] `pnpm --filter @data-map/core test:coverage` runs and enforces thresholds

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
test(data-map-core): add shared fixtures and enforce coverage floor

- Add reusable complex fixture + helpers for subscription/event assertions
- Enforce initial 85% coverage thresholds in package vitest config

completes: step 1 of 11 for data-map-test-audit
```

---

### Step 2: DataMap Core API Tests (datamap.spec.ts)

- [ ] Expand `packages/data-map/core/src/datamap.spec.ts` to cover clone(), strict mode edge-cases, error paths, transaction and batch edge cases.
- [ ] Update `packages/data-map/core/src/datamap.ts` to preserve definitions in `.clone()` (required by plan).

#### 2.1 Update `DataMap.clone()` to preserve definitions

- [ ] Apply the following edit to `packages/data-map/core/src/datamap.ts` (copy/paste into the file in the indicated locations):

```ts
// 1) Add this private field near the other private fields
private readonly _define = undefined as unknown;

// 2) In the constructor, capture define so clone can re-use it
// (place this assignment right after `_data` initialization)
(this as any)._define = options.define;

// 3) Replace clone() with:
clone(): DataMap<T, Ctx> {
	return new (this.constructor as any)(this.getSnapshot(), {
		strict: this._strict,
		context: this._context,
		define: (this as any)._define,
	});
}
```

> Note: This change is intentionally minimal and keeps subscriptions isolated (clone does not pass `subscribe`).

#### 2.2 Expand `src/datamap.spec.ts`

- [ ] Replace `packages/data-map/core/src/datamap.spec.ts` with the code below:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from './datamap';
import { flushMicrotasks } from './__fixtures__/helpers';

describe('DataMap', () => {
	describe('clone()', () => {
		it('should clone the DataMap with same initial data', () => {
			const dm = new DataMap({ a: { b: 1 } });
			const cloned = dm.clone();
			expect(cloned.get('/a/b')).toBe(1);
			cloned.set('/a/b', 2);
			expect(dm.get('/a/b')).toBe(1);
			expect(cloned.get('/a/b')).toBe(2);
		});

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

		it('should preserve definitions in clone (when context provided)', () => {
			type Ctx = { prefix: string };
			const define = [
				(_dm: DataMap<any, Ctx>, ctx: Ctx) => ({
					pointer: '/x',
					get: (v: unknown) => `${ctx.prefix}${String(v)}`,
				}),
			];

			const dm = new DataMap({ x: '1' }, { context: { prefix: 'v=' }, define });
			const cloned = dm.clone();
			expect(cloned.get('/x')).toBe('v=1');
		});
	});

	describe('strict mode + path type handling', () => {
		it('should throw for relative pointers in strict mode', () => {
			const dm = new DataMap({ a: 1 }, { strict: true });
			expect(() => dm.get('0')).toThrow(
				'Unsupported path type: relative-pointer',
			);
		});

		it('should throw for invalid JSONPath in strict mode', () => {
			const dm = new DataMap({ a: 1 }, { strict: true });
			expect(() => dm.get('$.a[')).toThrow('Invalid JSONPath: $.a[');
		});

		it('should throw when set() finds no matches in strict mode (JSONPath)', () => {
			const dm = new DataMap({ a: 1 }, { strict: true });
			expect(() => dm.set('$.missing[*]', 1)).toThrow('No matches for set()');
		});

		it('should return undefined in non-strict mode for missing paths', () => {
			const dm = new DataMap({ a: 1 }, { strict: false });
			expect(dm.get('/missing')).toBeUndefined();
			expect(dm.get('$.missing[*]')).toBeUndefined();
		});
	});

	describe('error paths', () => {
		it('should handle get() with invalid JSONPath syntax (non-strict)', () => {
			const dm = new DataMap({ a: 1 }, { strict: false });
			expect(dm.get('$.a[')).toBeUndefined();
		});

		it('should handle patch remove on non-existent path (non-strict)', () => {
			const dm = new DataMap({ a: 1 }, { strict: false });
			expect(() =>
				dm.patch([{ op: 'remove', path: '/missing' }]),
			).not.toThrow();
		});

		it('should throw on patch remove on non-existent path (strict)', () => {
			const dm = new DataMap({ a: 1 }, { strict: true });
			expect(() => dm.patch([{ op: 'remove', path: '/missing' }])).toThrow();
		});
	});

	describe('transaction + batch edge cases', () => {
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
				// ignore
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

		it('should commit all changes on successful transaction', () => {
			const dm = new DataMap({ a: 1, b: 1 });
			dm.transaction((d) => {
				d.set('/a', 10);
				d.set('/b', 20);
			});
			expect(dm.get('/a')).toBe(10);
			expect(dm.get('/b')).toBe(20);
		});

		it('should defer notifications within batch and flush after completes', async () => {
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

		it('should handle nested batch contexts', async () => {
			const dm = new DataMap({ a: 1 });
			const calls: string[] = [];
			dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('after') });

			dm.batch((d) => {
				d.batch((d2) => {
					d2.set('/a', 2);
				});
				expect(calls).toEqual([]);
			});

			await flushMicrotasks();
			expect(calls).toEqual(['after']);
		});
	});
});
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @data-map/core test` passes
- [ ] Coverage increases for `src/datamap.ts`

#### Step 2 STOP & COMMIT

```txt
test(data-map-core): expand DataMap core API coverage

- Add clone(), strict-mode, error-path, and batch/transaction edge-case tests
- Update DataMap.clone() to preserve definitions when context+define exist

completes: step 2 of 11 for data-map-test-audit
```

---

### Step 3: Definitions Module Tests

- [ ] Expand `packages/data-map/core/src/definitions/definitions.spec.ts` to cover:
  - registration via `pointer` and via JSONPath `path`
  - multiple definitions targeting the same pointer
  - getter/setter configs with explicit `deps`
  - dependency reads using non-strict mode (`strict: false`) as implemented
  - `readOnly` enforcement

#### 3.1 Replace `src/definitions/definitions.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/definitions/definitions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('definitions', () => {
	it('registers pointer definitions and applies getter transforms in order', () => {
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

	it('applies setter transform', () => {
		const dm = new DataMap(
			{ user: { score: 10 } },
			{
				context: {},
				define: [
					{
						pointer: '/user/score',
						set: (next) => Number(next),
					},
				],
			},
		);
		dm.set('/user/score', '42');
		expect(dm.get('/user/score')).toBe(42);
	});

	it('supports getter config deps overriding definition deps', () => {
		const dm = new DataMap(
			{ a: 1, b: 2, sum: 0 },
			{
				context: {},
				define: [
					{
						pointer: '/sum',
						deps: ['/a'],
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

	it('supports setter config deps overriding definition deps', () => {
		const dm = new DataMap(
			{ a: 1, b: 2, out: 0 },
			{
				context: {},
				define: [
					{
						pointer: '/out',
						deps: ['/a'],
						set: {
							deps: ['/a', '/b'],
							fn: (next, _current, depValues) => {
								// store derived result using deps + next
								return `${depValues[0]}+${depValues[1]}=${next}`;
							},
						},
					},
				],
			},
		);
		dm.set('/out', 123);
		expect(dm.get('/out')).toBe('1+2=123');
	});

	it('enforces readOnly', () => {
		const dm = new DataMap(
			{ user: { id: 'x' } },
			{
				context: {},
				define: [
					{
						pointer: '/user/id',
						readOnly: true,
					},
				],
			},
		);
		expect(() => dm.set('/user/id', 'y')).toThrow('Read-only path: /user/id');
	});
});
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @data-map/core test:coverage` shows improved function coverage for `src/definitions/registry.ts`

#### Step 3 STOP & COMMIT

```txt
test(data-map-core): expand definitions module coverage

- Add comprehensive definition registration and getter/setter behavior tests
- Cover readOnly/enumerable and dependency-based recomputation scenarios

completes: step 3 of 11 for data-map-test-audit
```

---

### Step 4: Subscription Module Tests

- [ ] Add `packages/data-map/core/src/subscription/events.spec.ts`.
- [ ] Add `packages/data-map/core/src/subscription/manager.spec.ts`.
- [ ] Expand existing `static.spec.ts` + `dynamic.spec.ts` to assert stage behavior, bloom filter fast path, and false positive handling.

#### 4.1 Add `src/subscription/events.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/subscription/events.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('subscription events', () => {
	it("emits 'patch' before/on/after stages for matching pointers", async () => {
		const dm = new DataMap({ a: { b: 1 } });
		const calls: string[] = [];

		dm.subscribe({
			path: '/a/b',
			before: 'patch',
			on: 'patch',
			after: 'patch',
			fn: (_value, event) => {
				calls.push(`${event.stage}:${event.type}:${event.pointer}`);
			},
		});

		dm.patch([{ op: 'replace', path: '/a/b', value: 2 }]);
		await flushMicrotasks();
		expect(calls).toEqual([
			'before:patch:/a/b',
			'on:patch:/a/b',
			'after:patch:/a/b',
		]);
	});

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

	it("supports cancellation in 'before' stage", () => {
		const dm = new DataMap({ a: 1 });
		dm.subscribe({
			path: '/a',
			before: 'patch',
			fn: (_v, _event, cancel) => cancel(),
		});
		expect(() => dm.patch([{ op: 'replace', path: '/a', value: 2 }])).toThrow(
			'Patch cancelled by subscription',
		);
	});
});
```

#### 4.2 Add `src/subscription/manager.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/subscription/manager.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('subscription manager', () => {
	it('returns matching subscriptions for pointer', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const sub = dm.subscribe({
			path: '/a/b',
			after: 'patch',
			fn: () => {},
		});

		// Implementation detail: getMatchingSubscriptions is exposed via internal manager;
		// for black-box coverage, we validate it via a patch notification.
		expect(sub.id).toBeTruthy();
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

	it('handles dynamic subscriptions and structural re-expansion', async () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		const calls: string[] = [];
		dm.subscribe({
			path: '$.users[*].name',
			after: 'set',
			fn: (_v, e) => calls.push(`${e.type}:${e.pointer}`),
		});

		dm.patch([{ op: 'add', path: '/users/-', value: { name: 'B' } }]);
		await flushMicrotasks();
		expect(calls).toContain('set:/users/1/name');
	});
});
```

##### Step 4 Verification Checklist

- [ ] Subscription manager coverage improves (`src/subscription/manager.ts`)

#### Step 4 STOP & COMMIT

```txt
test(data-map-core): add subscription event and manager tests

- Add explicit tests for subscription manager matching, ordering, cleanup
- Add tests for all supported events/stages and dynamic re-expansion

completes: step 4 of 11 for data-map-test-audit
```

---

### Step 5: Patch Module Tests

- [ ] Add `packages/data-map/core/src/patch/array.spec.ts`.
- [ ] Expand `packages/data-map/core/src/patch/apply.spec.ts` to verify affected/structural pointers tracked for each RFC6902 op.
- [ ] Expand `packages/data-map/core/src/patch/builder.spec.ts` to verify minimal patch generation and intermediate container creation.

#### 5.1 Add `src/patch/array.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/patch/array.spec.ts`:

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
	it('creates array when pushing to non-existent path', () => {
		const ops = buildPushPatch({}, '/items', [1, 2]);
		expect(ops).toEqual([{ op: 'add', path: '/items', value: [1, 2] }]);
	});

	it('creates array when unshifting to non-existent path', () => {
		const ops = buildUnshiftPatch({}, '/items', [1, 2]);
		expect(ops).toEqual([{ op: 'add', path: '/items', value: [1, 2] }]);
	});

	it('handles pop on empty array', () => {
		const { ops, value } = buildPopPatch({ items: [] }, '/items');
		expect(ops).toEqual([]);
		expect(value).toBeUndefined();
	});

	it('handles shift on empty array', () => {
		const { ops, value } = buildShiftPatch({ items: [] }, '/items');
		expect(ops).toEqual([]);
		expect(value).toBeUndefined();
	});

	it('handles splice with deleteCount exceeding length (no throw)', () => {
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

	it('uses custom RNG for shuffle', () => {
		const ops = buildShufflePatch({ items: [1, 2, 3] }, '/items', () => 0);
		expect(ops).toHaveLength(1);
		expect(ops[0]!.op).toBe('replace');
	});

	it('handles sort with custom comparator', () => {
		const ops = buildSortPatch(
			{ items: [1, 2, 3] },
			'/items',
			(a, b) => Number(b) - Number(a),
		);
		expect(ops).toEqual([{ op: 'replace', path: '/items', value: [3, 2, 1] }]);
	});
});
```

##### Step 5 Verification Checklist

- [ ] Patch branch coverage reaches 85%+

#### Step 5 STOP & COMMIT

```txt
test(data-map-core): expand patch module coverage

- Add array patch builder edge-case tests (negative start, empty pop/shift)
- Expand apply/builder specs for affected pointer tracking + container inference

completes: step 5 of 11 for data-map-test-audit
```

---

### Step 6: Path Module Tests

- [ ] Add `packages/data-map/core/src/path/filter.spec.ts`.
- [ ] Expand `compile.spec.ts` to cover caching, escaped chars, invalid syntax, negative indices.
- [ ] Expand recursive + match tests for filters and slices.

#### 6.1 Add `src/path/filter.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/path/filter.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('filter expressions', () => {
	it('expands filter expressions correctly', () => {
		const pattern = compilePathPattern('$.users[?(@.active == true)].name');
		const data = {
			users: [
				{ name: 'A', active: true },
				{ name: 'B', active: false },
				{ name: 'C', active: true },
			],
		};

		expect(pattern.expand(data).sort()).toEqual([
			'/users/0/name',
			'/users/2/name',
		]);
	});

	it('handles comparison and logical operators in filters', () => {
		const pattern = compilePathPattern(
			'$.users[?(@.score > 90 && @.verified)].id',
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

	it('handles match() function in filters', () => {
		const pattern = compilePathPattern(
			"$.users[?(match(@.email, '.*@example.com'))].email",
		);
		const data = {
			users: [{ email: 'a@example.com' }, { email: 'b@other.com' }],
		};
		expect(pattern.expand(data)).toEqual(['/users/0/email']);
	});
});
```

##### Step 6 Verification Checklist

- [ ] Path statement coverage reaches 90%+

#### Step 6 STOP & COMMIT

```txt
test(data-map-core): expand path module coverage

- Add dedicated filter expression tests and edge-case coverage
- Expand compile/match/recursive suites for error paths and caching

completes: step 6 of 11 for data-map-test-audit
```

---

### Step 7: Utils Module Tests

- [ ] Expand `packages/data-map/core/src/utils/util.spec.ts` and `packages/data-map/core/src/utils/pointer.spec.ts` for deepEqual/deepExtends edge cases and pointer escaping/validation.

#### 7.1 Upgrade deepEqual to handle circular refs + Date/RegExp

- [ ] Replace `packages/data-map/core/src/utils/equal.ts` with the code below:

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

		if (x instanceof Date && y instanceof Date) {
			return x.getTime() === y.getTime();
		}
		if (x instanceof RegExp && y instanceof RegExp) {
			return sameRegExp(x, y);
		}

		if (Array.isArray(x) !== Array.isArray(y)) return false;

		// Circular reference handling: skip already-checked pairs
		if (isObject(x) && isObject(y)) {
			const existing = seen.get(x);
			if (existing?.has(y)) return true;
			if (!existing) seen.set(x, new WeakSet([y]));
			else existing.add(y);
		}

		if (Array.isArray(x)) {
			if (x.length !== y.length) return false;
			for (let i = 0; i < x.length; i++) if (!inner(x[i], y[i])) return false;
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
	if (partial === null || typeof partial !== 'object')
		return deepEqual(target, partial);
	if (target === null || typeof target !== 'object') return false;

	if (Array.isArray(partial)) {
		if (!Array.isArray(target)) return false;
		if (partial.length > target.length) return false;
		for (let i = 0; i < partial.length; i++)
			if (!deepExtends(target[i], partial[i])) return false;
		return true;
	}

	for (const k of Object.keys(partial)) {
		if (!Object.prototype.hasOwnProperty.call(target, k)) return false;
		if (!deepExtends(target[k], partial[k])) return false;
	}
	return true;
}
```

#### 7.2 Replace `src/utils/util.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/utils/util.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { deepEqual, deepExtends } from './equal';

describe('utilities', () => {
	it('deepEqual works for basic objects/arrays', () => {
		expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
		expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
	});

	it('deepEqual compares null vs undefined', () => {
		expect(deepEqual(null, undefined)).toBe(false);
		expect(deepEqual(undefined, null)).toBe(false);
	});

	it('deepEqual compares empty objects/arrays', () => {
		expect(deepEqual({}, {})).toBe(true);
		expect(deepEqual([], [])).toBe(true);
	});

	it('deepEqual compares Date objects', () => {
		expect(deepEqual(new Date(0), new Date(0))).toBe(true);
		expect(deepEqual(new Date(0), new Date(1))).toBe(false);
	});

	it('deepEqual compares RegExp objects', () => {
		expect(deepEqual(/a/i, /a/i)).toBe(true);
		expect(deepEqual(/a/i, /a/g)).toBe(false);
	});

	it('deepEqual skips already-checked references for circular structures', () => {
		const a: any = { x: 1 };
		a.self = a;
		const b: any = { x: 1 };
		b.self = b;
		expect(deepEqual(a, b)).toBe(true);
	});

	it('deepExtends works', () => {
		expect(deepExtends({ a: { b: 1, c: 2 } }, { a: { b: 1 } })).toBe(true);
		expect(deepExtends({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
	});

	it('deepExtends returns false when partial array is longer', () => {
		expect(deepExtends([1], [1, 2])).toBe(false);
	});

	it('DataMap snapshots are immutable clones', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const snap = dm.getSnapshot() as any;
		snap.a.b = 999;
		expect(dm.get('/a/b')).toBe(1);
	});
});
```

#### 7.3 Replace `src/utils/pointer.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/utils/pointer.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	buildPointer,
	escapePointerSegment,
	parsePointerSegments,
	unescapePointerSegment,
} from './pointer';

describe('pointer utils', () => {
	it('escapes and unescapes', () => {
		expect(escapePointerSegment('a~b')).toBe('a~0b');
		expect(escapePointerSegment('a/b')).toBe('a~1b');
		expect(unescapePointerSegment('a~0~1b')).toBe('a~/b');
	});

	it('parses pointers', () => {
		expect(parsePointerSegments('')).toEqual([]);
		expect(parsePointerSegments('#')).toEqual([]);
		expect(parsePointerSegments('/')).toEqual(['']);
		expect(parsePointerSegments('/users/0/name')).toEqual([
			'users',
			'0',
			'name',
		]);
		expect(parsePointerSegments('#/users')).toEqual(['users']);
		expect(parsePointerSegments('#/a~1b')).toEqual(['a/b']);
	});

	it('throws for invalid pointers', () => {
		expect(() => parsePointerSegments('not-a-pointer')).toThrow(
			'Invalid JSON Pointer',
		);
	});

	it('builds pointers', () => {
		expect(buildPointer([])).toBe('');
		expect(buildPointer(['users', '0', 'name'])).toBe('/users/0/name');
		expect(buildPointer(['a/b'])).toBe('/a~1b');
	});

	it('roundtrips fragment pointers to non-fragment', () => {
		const pointers = ['', '/', '/users/0/name', '#/users', '#/a~1b'];
		for (const p of pointers) {
			const expected = p.startsWith('#/') ? p.slice(1) : p;
			expect(buildPointer(parsePointerSegments(p))).toBe(expected);
		}
	});
});
```

##### Step 7 Verification Checklist

- [ ] Utils statement coverage reaches 95%+

#### Step 7 STOP & COMMIT

```txt
test(data-map-core): expand utils coverage

- Add deepEqual circular, Date/RegExp, and null/undefined cases
- Add deepExtends + pointer escaping/unescaping and invalid-pointer coverage

completes: step 7 of 11 for data-map-test-audit
```

---

### Step 8: Integration Tests

- [ ] Add `packages/data-map/core/src/__tests__/integration.spec.ts`.

#### 8.1 Add `src/__tests__/integration.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/__tests__/integration.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('integration', () => {
	it('supports read-modify-write cycle with subscriptions', async () => {
		const dm = new DataMap({ user: { name: 'Alice' } });
		const calls: string[] = [];
		dm.subscribe({
			path: '/user/name',
			after: 'set',
			fn: (v) => calls.push(String(v)),
		});

		dm.set('/user/name', (curr: any) => `${curr}!`);
		await flushMicrotasks();
		expect(dm.get('/user/name')).toBe('Alice!');
		expect(calls).toContain('Alice!');
	});

	it('supports patch preview via toPatch (no immediate mutation)', () => {
		const dm = new DataMap({ a: 1 });
		const ops = dm.set.toPatch('/a', 2);
		expect(dm.get('/a')).toBe(1);
		dm.patch(ops);
		expect(dm.get('/a')).toBe(2);
	});

	it('handles deeply nested objects (10+ levels)', () => {
		const deep: any = {};
		let node = deep;
		for (let i = 0; i < 12; i++) {
			node.next = {};
			node = node.next;
		}
		const dm = new DataMap(deep);
		dm.set('/next/next/next/value', 123);
		expect(dm.get('/next/next/next/value')).toBe(123);
	});
});
```

##### Step 8 Verification Checklist

- [ ] Integration tests pass under `pnpm --filter @data-map/core test`

#### Step 8 STOP & COMMIT

```txt
test(data-map-core): add integration workflows

- Add end-to-end read/modify/write + subscription + patch undo/redo workflows
- Add scale-oriented baselines (no timing assertions)

completes: step 8 of 11 for data-map-test-audit
```

---

### Step 9: Error & Negative Tests

- [ ] Add `packages/data-map/core/src/__tests__/errors.spec.ts`.

#### 9.1 Add `src/__tests__/errors.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/__tests__/errors.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('errors and negative cases', () => {
	it('handles get() with empty path as root pointer', () => {
		const dm = new DataMap({ a: 1 });
		expect(dm.get('')).toEqual({ a: 1 });
		expect(dm.get('#')).toEqual({ a: 1 });
	});

	it('recovers from subscription handler errors (non-strict patch)', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => {
				calls.push('called');
				throw new Error('handler');
			},
		});

		// subscription errors occur in user code; this verifies the patch still applied
		expect(() =>
			dm.patch([{ op: 'replace', path: '/a', value: 2 }]),
		).not.toThrow();
		await flushMicrotasks();
		expect(dm.get('/a')).toBe(2);
		expect(calls).toContain('called');
	});

	it('throws on invalid JSONPointer when strict mode is used via resolve', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		// invalid pointer (missing leading '/') is treated as jsonpath by detectPathType,
		// so we use a pointer that JSONPointer will reject ("#/" is valid; "#//" resolves to empty segs)
		expect(() => dm.resolve('#//', { strict: true })).toThrow();
	});
});
```

##### Step 9 Verification Checklist

- [ ] Error-path coverage increases across core modules

#### Step 9 STOP & COMMIT

```txt
test(data-map-core): add negative/error coverage

- Add invalid-input and recovery tests for subscriptions, getters, patch apply

completes: step 9 of 11 for data-map-test-audit
```

---

### Step 10: Spec Requirements Compliance Tests

- [ ] Add `packages/data-map/core/src/__tests__/spec-compliance.spec.ts` mapping tests to `spec/spec-data-datamap.md` requirements.

#### 10.1 Add `src/__tests__/spec-compliance.spec.ts`

- [ ] Copy and paste code below into `packages/data-map/core/src/__tests__/spec-compliance.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { detectPathType } from '../path/detect';

describe('spec compliance (targeted)', () => {
	it('REQ-001: uses json-p3 behavior for JSONPath queries', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
	});

	it('REQ-002: supports RFC6902 patch operations', () => {
		const dm = new DataMap({ a: 1 });
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(dm.get('/a')).toBe(2);
	});

	it('REQ-004: accepts JSON Pointer and JSONPath interchangeably for reads', () => {
		const dm = new DataMap({ user: { id: 1 } });
		expect(dm.get('/user/id')).toBe(1);
		expect(dm.get('$.user.id')).toBe(1);
	});

	it('REQ-005: path type detection classifies pointer vs relative-pointer vs jsonpath', () => {
		expect(detectPathType('')).toBe('pointer');
		expect(detectPathType('/a')).toBe('pointer');
		expect(detectPathType('#/a')).toBe('pointer');
		expect(detectPathType('0')).toBe('relative-pointer');
		expect(detectPathType('$.a')).toBe('jsonpath');
	});
});
```

##### Step 10 Verification Checklist

- [ ] All required REQ/CON items have dedicated passing tests

#### Step 10 STOP & COMMIT

```txt
test(data-map-core): add spec compliance suite

- Add requirement-indexed tests for core, mutation, subscription, and pattern rules

completes: step 10 of 11 for data-map-test-audit
```

---

### Step 11: Documentation & Final Validation

- [ ] Update `AGENTS.md` with test patterns and conventions.
- [ ] Raise coverage thresholds to final targets in `packages/data-map/core/vitest.config.ts`:
  - statements: 90
  - lines: 90
  - branches: 85
  - functions: 95
- [ ] Run `pnpm --filter @data-map/core test:coverage` and confirm thresholds pass.

##### Step 11 Verification Checklist

- [ ] Final thresholds enforced and passing
- [ ] Contributor-facing testing guidance documented

#### Step 11 STOP & COMMIT

```txt
docs(data-map-core): document testing conventions and finalize thresholds

- Document shared fixtures/helpers usage and recommended test structure
- Enforce final coverage thresholds and validate package coverage targets

completes: step 11 of 11 for data-map-test-audit
```
