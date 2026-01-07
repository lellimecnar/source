## @data-map/core Performance Optimization — Implementation Guide

This document is copy/paste-oriented and is meant to be executed in order (Step 1 → Step 12) on branch `perf/data-map-core-optimization`.

Each step follows TDD (Red → Green → Refactor) and ends with a **STOP & COMMIT** section containing a multiline conventional commit message.

## Prerequisites

- [ ] Checkout branch `perf/data-map-core-optimization`.
- [ ] Install dependencies:

```bash
pnpm install
```

## Global commands (reference)

```bash
# Core package tests
pnpm --filter @data-map/core test

# Type-check
pnpm --filter @data-map/core type-check

# Optional: core benchmarks
pnpm --filter @data-map/core bench

# Optional: workspace benchmark suite
pnpm --filter @data-map/benchmarks bench
```

---

## Step 1: Replace `structuredClone` with `rfdc`

**Goal:** Replace internal deep cloning from `structuredClone()` with `rfdc` in `@data-map/core`.

### Step 1 — Red (tests)

- [ ] Run tests to establish a baseline:

```bash
pnpm --filter @data-map/core test
```

### Step 1 — Green (implementation)

- [ ] Add dependency:

```bash
pnpm --filter @data-map/core add rfdc
```

- [ ] Create file `packages/data-map/core/src/utils/clone.ts` with:

```ts
import rfdc from 'rfdc';

const clone = rfdc({ circles: false, proto: false });

export function cloneSnapshot<T>(value: T): T {
	return clone(value) as T;
}
```

- [ ] Update `packages/data-map/core/src/datamap.ts`:
  - [ ] Add import near other imports:

```ts
import { cloneSnapshot } from './utils/clone';
```

- [ ] Delete the local `cloneSnapshot()` function that calls `structuredClone`.

- [ ] Update `packages/data-map/core/src/patch/builder.ts`:
  - [ ] Add import:

```ts
import { cloneSnapshot } from '../utils/clone';
```

- [ ] Replace these call sites:
  - [ ] Replace `structuredClone(currentData)` with `cloneSnapshot(currentData)`.
  - [ ] Replace `structuredClone(container)` with `cloneSnapshot(container)`.

- [ ] Update `packages/data-map/core/src/batch/builder.ts`:
  - [ ] Add import:

```ts
import { cloneSnapshot } from '../utils/clone';
```

- [ ] Replace the constructor assignment:

```ts
this.workingData = structuredClone(dm.getSnapshot());
```

with:

```ts
this.workingData = dm.getSnapshot();
```

- [ ] Replace `return structuredClone(this.ops);` with:

```ts
return cloneSnapshot(this.ops);
```

- [ ] Update `packages/data-map/core/src/__fixtures__/helpers.ts`:
  - [ ] Add import:

```ts
import { cloneSnapshot } from '../utils/clone';
```

- [ ] Replace:

```ts
const initial = overrides ?? (structuredClone(complexData) as T);
```

with:

```ts
const initial = overrides ?? (cloneSnapshot(complexData) as T);
```

### Step 1 — Refactor

- [ ] Ensure there are no remaining `structuredClone(` calls in `packages/data-map/core/src/**`.

### Step 1 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): replace structuredClone with rfdc

Use rfdc for DataMap snapshot cloning and patch/batch helper cloning.
Removes structuredClone usage across @data-map/core.

completes: step 1 of 12 for @data-map/core performance optimization
```

---

## Step 2: Add path detection cache

**Goal:** Memoize `detectPathType()` in a bounded in-module cache.

### Step 2 — Red (tests)

- [ ] Add unit tests for cache stability + overflow handling.

In `packages/data-map/core/src/path/detect.spec.ts`, add these tests at the end of the `describe('detectPathType', ...)` block:

```ts
it('is stable across repeated calls (memoization must not change results)', () => {
	const inputs = [
		'',
		'/users/0/name',
		'#/users',
		'#',
		'0',
		'1/foo',
		'2#',
		'$',
		'$.users[*]',
		'$..name',
	] as const;

	for (const input of inputs) {
		const first = detectPathType(input);
		for (let i = 0; i < 50; i++) {
			expect(detectPathType(input)).toBe(first);
		}
	}
});

it('remains correct after cache overflow', () => {
	// Must match DETECT_PATH_TYPE_CACHE_MAX_SIZE in detect.ts
	const maxSize = 10_000;

	for (let i = 0; i < maxSize + 50; i++) {
		expect(detectPathType(`$.x${i}`)).toBe('jsonpath');
	}

	expect(detectPathType('')).toBe('pointer');
	expect(detectPathType('/users/0/name')).toBe('pointer');
	expect(detectPathType('#/users')).toBe('pointer');
	expect(detectPathType('#')).toBe('pointer');
	expect(detectPathType('0')).toBe('relative-pointer');
	expect(detectPathType('1/foo')).toBe('relative-pointer');
	expect(detectPathType('2#')).toBe('relative-pointer');
	expect(detectPathType('$')).toBe('jsonpath');
	expect(detectPathType('$..name')).toBe('jsonpath');
});
```

- [ ] Run tests (expect failure until cache is implemented):

```bash
pnpm --filter @data-map/core test
```

### Step 2 — Green (implementation)

- [ ] Replace `packages/data-map/core/src/path/detect.ts` with:

```ts
import type { PathType } from '../types';

const DETECT_PATH_TYPE_CACHE_MAX_SIZE = 10_000;
const detectPathTypeCache = new Map<string, PathType>();

function detectPathTypeUncached(input: string): PathType {
	if (input === '' || input.startsWith('/')) {
		return 'pointer';
	}

	if (input.startsWith('#/') || input === '#') {
		return 'pointer';
	}

	if (/^\d+(#|\/|$)/.test(input)) {
		return 'relative-pointer';
	}

	return 'jsonpath';
}

/**
 * Spec §4.3 (must match exactly)
 */
export function detectPathType(input: string): PathType {
	const cached = detectPathTypeCache.get(input);
	if (cached !== undefined) return cached;

	const result = detectPathTypeUncached(input);

	if (detectPathTypeCache.size >= DETECT_PATH_TYPE_CACHE_MAX_SIZE) {
		// Simple bounded-cache behavior: clear all entries.
		detectPathTypeCache.clear();
	}

	detectPathTypeCache.set(input, result);
	return result;
}
```

### Step 2 — Refactor

- [ ] None.

### Step 2 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): cache detectPathType

Memoize path-type detection in a bounded module-level Map.
Improves repeated access performance for immutable string paths.

completes: step 2 of 12 for @data-map/core performance optimization
```

---

## Step 3: Conditional notification scheduling (zero-subscriber fast path)

**Goal:** Avoid microtask scheduling + subscription work when there are zero subscriptions.

### Step 3 — Red (tests)

- [ ] Add a unit test that proves we do not schedule microtasks when there are no subscriptions.

In `packages/data-map/core/src/subscription/manager.spec.ts`, update the import to include `vi`:

```ts
import { describe, expect, it, vi } from 'vitest';
```

Then add this test at the end of the describe block:

```ts
it('does not schedule microtasks when there are no subscriptions', () => {
	const dm = new DataMap({ a: 1 });
	const spy = vi.spyOn(globalThis, 'queueMicrotask');

	dm.get('/a');
	dm.resolve('/a');

	expect(spy).not.toHaveBeenCalled();
});
```

- [ ] Run tests (expect failure until fast-path is implemented):

```bash
pnpm --filter @data-map/core test
```

### Step 3 — Green (implementation)

- [ ] Update `packages/data-map/core/src/subscription/manager.ts`.

Add this method inside `SubscriptionManagerImpl`:

```ts
hasSubscribers(): boolean {
	return this.subscriptions.size > 0;
}
```

Update `scheduleNotify(...)` to return early when there are no subscribers:

```ts
if (!this.hasSubscribers()) return;
```

Update `notify(...)` to return early when there are no subscribers:

```ts
if (!this.hasSubscribers()) {
	return { cancelled: false, handlerCount: 0 };
}
```

### Step 3 — Refactor

- [ ] None.

### Step 3 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): skip notifications when unsubscribed

Avoid notification scheduling and subscription processing when there are zero subscriptions.
Reduces read/write overhead in the common "no subscriptions" case.

completes: step 3 of 12 for @data-map/core performance optimization
```

---

## Step 4: Add optional `clone` parameter to `get()` / `resolve()`

**Goal:** Allow `dm.get(path, { clone: false })` for zero-copy reads while preserving default cloning behavior.

### Step 4 — Red (tests)

- [ ] Add tests proving default cloning behavior and opt-out reference behavior.

In `packages/data-map/core/src/datamap.spec.ts`, inside `describe('Immutability', ...)`, add:

```ts
it('get() returns cloned values by default', () => {
	const dm = new DataMap({ user: { name: 'Alice' } });
	const user = dm.get('/user') as any;
	user.name = 'Bob';
	// Internal value should be unchanged
	expect(dm.get('/user/name')).toBe('Alice');
});

it('get({ clone: false }) returns a direct reference', () => {
	const dm = new DataMap({ user: { name: 'Alice' } });
	const user = dm.get('/user', { clone: false }) as any;
	user.name = 'Bob';
	// Internal value was mutated through the returned reference
	expect(dm.get('/user/name')).toBe('Bob');
});
```

- [ ] Run tests (expect failure until `clone` option is wired):

```bash
pnpm --filter @data-map/core test
```

### Step 4 — Green (implementation)

- [ ] Update `packages/data-map/core/src/types.ts` to add `clone?: boolean` to `CallOptions`:

```ts
export interface CallOptions {
	strict?: boolean;
	contextPointer?: string;
	clone?: boolean;
}
```

- [ ] Update `packages/data-map/core/src/datamap.ts`:
  - [ ] In `resolve(...)`, compute `const shouldClone = options.clone ?? true;` once near the start.
  - [ ] Replace the clone call sites so cloning only happens when `shouldClone` is true.

Replace (root pointer branch):

```ts
const value = cloneSnapshot(this._defs.applyGetter('', this._data, ctx));
```

with:

```ts
const raw = this._defs.applyGetter('', this._data, ctx);
const value = shouldClone ? cloneSnapshot(raw) : raw;
```

Replace (non-root pointer branch):

```ts
const value = cloneSnapshot(
	this._defs.applyGetter(pointerString, resolved, ctx),
);
```

with:

```ts
const raw = this._defs.applyGetter(pointerString, resolved, ctx);
const value = shouldClone ? cloneSnapshot(raw) : raw;
```

Replace the JSONPath mapping branch from:

```ts
const matches = pointers.map((pointer, idx) =>
	this.buildResolvedMatch(
		pointer,
		cloneSnapshot(this._defs.applyGetter(pointer, values[idx], ctx)),
	),
);
```

to:

```ts
const matches = pointers.map((pointer, idx) => {
	const raw = this._defs.applyGetter(pointer, values[idx], ctx);
	const value = shouldClone ? cloneSnapshot(raw) : raw;
	return this.buildResolvedMatch(pointer, value);
});
```

In `resolveStream(...)`, replace:

```ts
const value = cloneSnapshot(this._defs.applyGetter(pointer, node.value, ctx));
```

with:

```ts
const raw = this._defs.applyGetter(pointer, node.value, ctx);
const value = shouldClone ? cloneSnapshot(raw) : raw;
```

### Step 4 — Refactor

- [ ] Ensure the default behavior remains unchanged when `clone` is omitted.

### Step 4 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add clone option for reads

Add opt-in zero-copy reads via CallOptions.clone=false for get/resolve.
Default remains clone=true to preserve immutability guarantees.

completes: step 4 of 12 for @data-map/core performance optimization
```

---

## Step 5: Implement lazy subscription manager

**Goal:** Do not allocate `SubscriptionManagerImpl` until the first `subscribe()` call.

### Step 5 — Red (tests)

- [ ] Add a unit test proving `DataMap` does not create a manager until subscribing.

In `packages/data-map/core/src/subscription/manager.spec.ts`, add:

```ts
it('does not instantiate SubscriptionManagerImpl until first subscribe()', () => {
	const dm = new DataMap({ a: 1 });
	expect((dm as any)._subs).toBeNull();

	dm.subscribe({
		path: '/a',
		after: 'set',
		fn: () => {},
	});

	expect((dm as any)._subs).not.toBeNull();
});
```

- [ ] Run tests (expect failure until lazy init is implemented):

```bash
pnpm --filter @data-map/core test
```

### Step 5 — Green (implementation)

- [ ] Update `packages/data-map/core/src/datamap.ts`:
  - [ ] Replace the eager field:

```ts
private readonly _subs = new SubscriptionManagerImpl<T, Ctx>(this);
```

with:

```ts
private _subs: SubscriptionManagerImpl<T, Ctx> | null = null;

private get subs(): SubscriptionManagerImpl<T, Ctx> {
	if (!this._subs) this._subs = new SubscriptionManagerImpl<T, Ctx>(this);
	return this._subs;
}

private scheduleNotify(
	pointer: string,
	event: SubscriptionEvent,
	stage: 'on' | 'after',
	value: unknown,
	previousValue?: unknown,
	operation?: Operation,
	originalPath: string = pointer,
): void {
	if (!this._subs) return;
	this._subs.scheduleNotify(
		pointer,
		event,
		stage,
		value,
		previousValue,
		operation,
		originalPath,
	);
}

private notify(
	pointer: string,
	event: SubscriptionEvent,
	stage: 'before' | 'on' | 'after',
	value: unknown,
	previousValue?: unknown,
	operation?: Operation,
	originalPath: string = pointer,
): { cancelled: boolean; transformedValue?: unknown; handlerCount: number } {
	if (!this._subs) return { cancelled: false, handlerCount: 0 };
	return this._subs.notify(
		pointer,
		event,
		stage,
		value,
		previousValue,
		operation,
		originalPath,
	);
}
```

- [ ] Update `subscribe(...)` to instantiate lazily:

```ts
subscribe(config: SubscriptionConfig<T, Ctx>): Subscription {
	return this.subs.register(config);
}
```

- [ ] Replace all `this._subs.scheduleNotify(` call sites with `this.scheduleNotify(`.
- [ ] Replace all `this._subs.notify(` call sites with `this.notify(`.
- [ ] Replace `this._subs.handleStructuralChange(...)` / `handleFilterCriteriaChange(...)` with guarded calls:

```ts
this._subs?.handleStructuralChange(p);
this._subs?.handleFilterCriteriaChange(p);
```

### Step 5 — Refactor

- [ ] Ensure no read/write path creates `_subs` unless `.subscribe()` is called.

### Step 5 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): lazily instantiate subscription manager

Avoid allocating SubscriptionManagerImpl unless subscribe() is called.
Reduces baseline overhead for read/write workloads without subscriptions.

completes: step 5 of 12 for @data-map/core performance optimization
```

---

## Step 6: Implement inline pointer resolution fast path

**Goal:** Avoid `new JSONPointer(pointer)` for common pointer reads by introducing an inline resolver and using it from `resolvePointer()` / `pointerExists()`.

### Step 6 — Red (tests)

- [ ] Extend `packages/data-map/core/src/utils/jsonpath.spec.ts` with additional pointer semantics tests.

Add these tests:

```ts
it('does not treat "/" as root', () => {
	const data: any = { '': 123 };
	expect(resolvePointer(data, '')).toBe(data);
	expect(resolvePointer(data, '/')).toBe(123);
});

it('rejects array indices with leading zeros (matches @jsonpath/pointer)', () => {
	const data: any = { arr: ['x', 'y'] };
	expect(resolvePointer(data, '/arr/0')).toBe('x');
	expect(resolvePointer(data, '/arr/01')).toBeUndefined();
	expect(pointerExists(data, '/arr/01')).toBe(false);
});
```

### Step 6 — Green (implementation)

- [ ] Update `packages/data-map/core/src/utils/pointer.ts` by adding these exports (append at the end of the file):

```ts
const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;

function hasInvalidTildeSequence(seg: string): boolean {
	return /~[^01]/.test(seg) || seg.endsWith('~');
}

export function tryResolvePointerInline<T = unknown>(
	data: unknown,
	pointer: string,
): { ok: true; value: T | undefined } | { ok: false } {
	if (pointer === '') {
		return { ok: true, value: data as T };
	}

	// Fast-path only for absolute (non-fragment) pointers.
	if (!pointer.startsWith('/')) {
		return { ok: false };
	}

	const parts = pointer.split('/');
	// parts[0] is always "" because pointer starts with '/'
	let current: any = data;

	for (let i = 1; i < parts.length; i++) {
		const encoded = parts[i]!;
		if (hasInvalidTildeSequence(encoded)) {
			return { ok: false };
		}
		const token = encoded.replace(/~1/g, '/').replace(/~0/g, '~');

		if (current === null || typeof current !== 'object') {
			return { ok: true, value: undefined };
		}

		if (Array.isArray(current)) {
			if (!ARRAY_INDEX.test(token)) {
				return { ok: true, value: undefined };
			}
			const index = Number.parseInt(token, 10);
			if (index < 0 || index >= current.length) {
				return { ok: true, value: undefined };
			}
			current = current[index];
			continue;
		}

		if (!(token in current)) {
			return { ok: true, value: undefined };
		}
		current = current[token];
	}

	return { ok: true, value: current as T };
}

export function tryPointerExistsInline(
	data: unknown,
	pointer: string,
): { ok: true; exists: boolean } | { ok: false } {
	if (pointer === '') {
		return { ok: true, exists: true };
	}

	if (!pointer.startsWith('/')) {
		return { ok: false };
	}

	const parts = pointer.split('/');
	let current: any = data;

	for (let i = 1; i < parts.length; i++) {
		const encoded = parts[i]!;
		if (hasInvalidTildeSequence(encoded)) {
			return { ok: false };
		}
		const token = encoded.replace(/~1/g, '/').replace(/~0/g, '~');

		if (current === null || typeof current !== 'object') {
			return { ok: true, exists: false };
		}

		if (Array.isArray(current)) {
			if (!ARRAY_INDEX.test(token)) {
				return { ok: true, exists: false };
			}
			const index = Number.parseInt(token, 10);
			if (index < 0 || index >= current.length) {
				return { ok: true, exists: false };
			}
			current = current[index];
			continue;
		}

		if (!(token in current)) {
			return { ok: true, exists: false };
		}
		current = current[token];
	}

	return { ok: true, exists: true };
}
```

- [ ] Update `packages/data-map/core/src/utils/jsonpath.ts`:
  - [ ] Import the helpers:

```ts
import { tryPointerExistsInline, tryResolvePointerInline } from './pointer';
```

- [ ] Replace `resolvePointer(...)` with:

```ts
export function resolvePointer<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	try {
		const fast = tryResolvePointerInline<T>(data, pointer);
		if (fast.ok) return fast.value;
		return new JSONPointer(pointer).resolve<T>(data);
	} catch (err) {
		throw normalizeError(err, pointer);
	}
}
```

- [ ] Replace `pointerExists(...)` with:

```ts
export function pointerExists(data: unknown, pointer: string): boolean {
	try {
		const fast = tryPointerExistsInline(data, pointer);
		if (fast.ok) return fast.exists;
		return new JSONPointer(pointer).exists(data);
	} catch (err) {
		throw normalizeError(err, pointer);
	}
}
```

### Step 6 — Refactor

- [ ] Ensure all existing `utils/jsonpath.spec.ts` tests remain green (error normalization must remain intact).

### Step 6 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): inline json pointer resolution

Add inline JSON Pointer resolve/exists fast path for common pointers.
Preserve error normalization by falling back to @jsonpath/pointer on invalid pointers.

completes: step 6 of 12 for @data-map/core performance optimization
```

---

## Step 7: Tiered subscription lookup (Set for small N, Bloom for large N)

**Goal:** Avoid Bloom filter overhead for small subscription counts.

### Step 7 — Red (tests)

- [ ] Add tests proving tier switching behavior.

In `packages/data-map/core/src/subscription/manager.spec.ts`, add:

```ts
it('uses Set-based pointer tracking for small subscription counts and switches to Bloom at threshold', async () => {
	const dm = new DataMap({ root: Array.from({ length: 200 }, (_, i) => i) });
	const calls: string[] = [];

	for (let i = 0; i < 101; i++) {
		dm.subscribe({
			path: `/root/${i}`,
			after: 'set',
			fn: () => calls.push(String(i)),
		});
	}

	dm.set('/root/0', 999);
	await flushMicrotasks();
	expect(calls.includes('0')).toBe(true);
});
```

### Step 7 — Green (implementation)

- [ ] Update `packages/data-map/core/src/subscription/manager.ts`:

Add fields to `SubscriptionManagerImpl`:

```ts
private readonly BLOOM_THRESHOLD = 100;
private readonly pointerSet = new Set<string>();
private useBloom = false;
```

Update `addToReverseIndex(...)` to also track pointers:

```ts
this.pointerSet.add(pointer);

if (!this.useBloom && this.pointerSet.size > this.BLOOM_THRESHOLD) {
	this.useBloom = true;
	for (const p of this.pointerSet) this.bloomFilter.add(p);
}

if (this.useBloom) {
	this.bloomFilter.add(pointer);
}
```

Update `removeFromReverseIndex(...)` to delete pointers when they no longer have subscribers:

```ts
if (set.size === 0) {
	this.reverseIndex.delete(pointer);
	this.pointerSet.delete(pointer);
}
```

Update the Bloom check in `notify(...)` to use the tiered lookup:

Replace:

```ts
if (!this.bloomFilter.mightContain(pointer)) {
	return this.notifyDynamic(...);
}
```

with:

```ts
const mightHaveStatic = this.useBloom
	? this.bloomFilter.mightContain(pointer)
	: this.pointerSet.has(pointer);

if (!mightHaveStatic) {
	return this.notifyDynamic(
		pointer,
		event,
		stage,
		value,
		previousValue,
		operation,
		originalPath,
	);
}
```

### Step 7 — Refactor

- [ ] Keep correctness: dynamic subscriptions must still be checked even when the static fast path says "no".

### Step 7 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`

### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): tiered subscription pointer lookup

Use an exact Set for small subscription counts and switch to Bloom filter at a threshold.
Reduces constant-factor overhead in the common small-N case.

completes: step 7 of 12 for @data-map/core performance optimization
```

---

## Step 8: Single-clone batch operations

**Goal:** In a `dm.batch(...)` block, clone once and apply operations mutably to a single working copy.

### Step 8 — Red (tests)

- [ ] Add a correctness test that ensures batched operations apply against the updated intermediate state.

In `packages/data-map/core/src/datamap.spec.ts`, add:

```ts
it('batch applies operations against a single evolving working state', () => {
	const dm = new DataMap({ a: 0 });

	dm.batch(() => {
		dm.set('/a', 1);
		dm.map('/a', (v) => Number(v) + 1);
	});

	expect(dm.get('/a')).toBe(2);
});
```

### Step 8 — Green (implementation)

- [ ] Replace `packages/data-map/core/src/batch/types.ts` with:

```ts
import type { Operation } from '../types';

export interface BatchContext {
	operations: Operation[];
	affectedPointers: Set<string>;
	structuralPointers: Set<string>;
	/**
	 * Working data used for "single-clone" batching.
	 * Only set on the outermost batch context.
	 */
	workingData: unknown | null;
}

export type BatchFn<T = void> = (dm: any) => T;
```

- [ ] Replace `packages/data-map/core/src/batch/manager.ts` with:

```ts
import type { Operation } from '../types';
import type { BatchContext } from './types';

export class BatchManager {
	private stack: BatchContext[] = [];

	get isBatching(): boolean {
		return this.stack.length > 0;
	}

	get depth(): number {
		return this.stack.length;
	}

	start(): void {
		this.stack.push({
			operations: [],
			affectedPointers: new Set(),
			structuralPointers: new Set(),
			workingData: null,
		});
	}

	getOrCreateWorkingData<T>(cloneFrom: T, cloneFn: (v: T) => T): T {
		const root = this.stack[0];
		if (!root) return cloneFrom;
		if (root.workingData === null) {
			root.workingData = cloneFn(cloneFrom);
		}
		return root.workingData as T;
	}

	collect(
		ops: Operation[],
		affected: Set<string>,
		structural: Set<string>,
	): void {
		const current = this.stack[this.stack.length - 1];
		if (!current) return;

		current.operations.push(...ops);
		for (const p of affected) current.affectedPointers.add(p);
		for (const p of structural) current.structuralPointers.add(p);
	}

	end(): BatchContext | undefined {
		const context = this.stack.pop();
		if (!context) return undefined;

		// If we are still batching (nested), merge current context into parent
		if (this.stack.length > 0) {
			const parent = this.stack[this.stack.length - 1];
			if (parent) {
				parent.operations.push(...context.operations);
				for (const p of context.affectedPointers)
					parent.affectedPointers.add(p);
				for (const p of context.structuralPointers)
					parent.structuralPointers.add(p);
			}
		}

		return context;
	}
}
```

- [ ] Update `packages/data-map/core/src/patch/apply.ts`:
  - [ ] Add a mutating apply function.

Append this export to the file:

```ts
export function applyOperationsMutating(
	currentData: unknown,
	ops: Operation[],
): ApplyResult {
	// Mutate the passed object in-place.
	applyPatchOperations(currentData, ops, { mutate: true });

	const affectedPointers = new Set<string>();
	const structuralPointers = new Set<string>();

	for (const op of ops) {
		affectedPointers.add(op.path);
		if (isStructuralOp(op)) {
			structuralPointers.add(parentPointer(op.path));
		}
		if (op.op === 'move' || op.op === 'copy') {
			affectedPointers.add(op.from);
			structuralPointers.add(parentPointer(op.from));
		}
	}

	return { nextData: currentData, affectedPointers, structuralPointers };
}
```

- [ ] Update `packages/data-map/core/src/datamap.ts`:
  - [ ] Update the import to include the new function:

```ts
import { applyOperations, applyOperationsMutating } from './patch/apply';
```

- [ ] In the `patch(...)` implementation, replace the current batching branch:

```ts
if (this._batch.isBatching) {
	this._batch.collect(effectiveOps, affectedPointers, structuralPointers);
	return this;
}
```

with this single-clone batching version:

```ts
if (this._batch.isBatching) {
	const working = this._batch.getOrCreateWorkingData(this._data, cloneSnapshot);
	const result = applyOperationsMutating(working, effectiveOps);
	this._data = result.nextData as T;

	this._batch.collect(
		effectiveOps,
		result.affectedPointers,
		result.structuralPointers,
	);
	return this;
}
```

### Step 8 — Refactor

- [ ] Ensure nested batches reuse the same `workingData` (only clone once for the outermost batch).

### Step 8 — Verification Checklist

- [ ] Tests pass: `pnpm --filter @data-map/core test`
- [ ] Type-check passes: `pnpm --filter @data-map/core type-check`
- [ ] Bench (optional): `pnpm --filter @data-map/benchmarks bench:mutations`

### Step 8 STOP & COMMIT

```txt
perf(data-map): single-clone batch operations

Apply operations mutably to a single working copy within batch(), avoiding per-operation cloning.
Preserves observable semantics while reducing batch overhead.

completes: step 8 of 12 for @data-map/core performance optimization
```

---

## Step 9: Lazy ownership tracking

**Goal:** Avoid cloning the initial value in the constructor; clone only on first mutation.

### Step 9 — Red (tests)

- [ ] Add a test proving `cloneInitial: false` stores the initial reference until the first mutation clones.

In `packages/data-map/core/src/datamap.spec.ts`, inside `describe('Immutability', ...)`, add:

```ts
it('cloneInitial=false stores initial reference until first mutation', () => {
	const initial = { a: { b: 1 } };
	const dm = new DataMap(initial, { cloneInitial: false } as any);
	expect((dm as any)._data).toBe(initial);

	dm.set('/a/b', 2);
	expect((dm as any)._data).not.toBe(initial);
	expect(initial.a.b).toBe(1);
});
```

### Step 9 — Green (implementation)

- [ ] Update `packages/data-map/core/src/types.ts` to add a backward-compatible option:

```ts
export interface DataMapOptions<T = unknown, Ctx = unknown> {
	strict?: boolean;
	context?: Ctx;
	define?: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[];
	subscribe?: SubscriptionConfig<T, Ctx>[];
	schema?: unknown;
	/**
	 * When false, DataMap will not clone the initial value in the constructor.
	 * Defaults to true to preserve current immutability guarantees.
	 */
	cloneInitial?: boolean;
}
```

- [ ] Update `packages/data-map/core/src/datamap.ts`:
  - [ ] Add field:

```ts
private _isOwned = false;
```

- [ ] Replace the constructor assignment:

```ts
this._data = cloneSnapshot(initialValue);
```

with:

```ts
const cloneInitial = options.cloneInitial ?? true;
this._data = cloneInitial ? cloneSnapshot(initialValue) : initialValue;
this._isOwned = cloneInitial;
```

- [ ] Add helper:

```ts
private ensureOwned(): void {
	if (this._isOwned) return;
	this._data = cloneSnapshot(this._data);
	this._isOwned = true;
}
```

- [ ] At the start of the `patch(...)` implementation (before applying ops), call:

```ts
this.ensureOwned();
```

### Step 9 STOP & COMMIT

```txt
perf(data-map): add lazy ownership tracking

Avoid cloning initial values in constructor; clone only on first mutation.
Reduces overhead for read-heavy workloads and improves startup time.

completes: step 9 of 12 for @data-map/core performance optimization
```

---

## Step 10: Deferred subscription notifications for batch

**Goal:** Collect pointers during a batch and notify once at the end.

### Step 10 — Red (tests)

- [ ] Add a test proving a batch emits one notification per pointer even when updated repeatedly.

In `packages/data-map/core/src/subscription/manager.spec.ts`, add:

```ts
it('batch notifies once per affected pointer (deduped)', async () => {
	const dm = new DataMap({ a: 0 });
	const calls: string[] = [];

	dm.subscribe({
		path: '/a',
		after: 'patch',
		fn: () => calls.push('after'),
	});

	dm.batch(() => {
		dm.set('/a', 1);
		dm.set('/a', 2);
		dm.set('/a', 3);
	});

	await flushMicrotasks();
	expect(calls).toEqual(['after']);
});
```

### Step 10 — Green (implementation)

- [ ] Update `packages/data-map/core/src/datamap.ts` `_flushBatch(context)` to use the lazy-safe subscription hooks introduced in Step 5.

Replace the contents of `_flushBatch(context)` with:

```ts
private _flushBatch(context: BatchContext): void {
	for (const p of context.structuralPointers) {
		this._subs?.handleStructuralChange(p);
	}

	for (const p of context.affectedPointers) {
		this._subs?.handleFilterCriteriaChange(p);
	}

	for (const p of context.affectedPointers) {
		const val = this.get(p);
		this.notify(p, 'patch', 'on', val, undefined, undefined, p);
		this.notify(p, 'patch', 'after', val, undefined, undefined, p);
	}
}
```

### Step 10 STOP & COMMIT

```txt
perf(data-map): defer notifications to batch end

Collect affected pointers during batch and deliver subscription notifications once at the end.
Reduces redundant work for subscription-heavy batch updates.

completes: step 10 of 12 for @data-map/core performance optimization
```

---

## Step 11: Object pooling for hot paths

**Goal:** Reduce GC pressure by pooling frequently allocated objects.

### Step 11 — Green (implementation)

- [ ] Create `packages/data-map/core/src/utils/pool.ts`:

```ts
export class ObjectPool<T> {
	private readonly pool: T[] = [];
	private readonly create: () => T;
	private readonly reset: (obj: T) => void;
	private readonly maxSize: number;

	constructor(options: {
		create: () => T;
		reset: (obj: T) => void;
		maxSize?: number;
	}) {
		this.create = options.create;
		this.reset = options.reset;
		this.maxSize = options.maxSize ?? 1000;
	}

	acquire(): T {
		return this.pool.pop() ?? this.create();
	}

	release(obj: T): void {
		if (this.pool.length >= this.maxSize) return;
		this.reset(obj);
		this.pool.push(obj);
	}
}
```

### Step 11 STOP & COMMIT

```txt
perf(data-map): add object pooling utility

Introduce a generic ObjectPool for hot-path allocations.
Used by later optimizations to reduce GC churn.

completes: step 11 of 12 for @data-map/core performance optimization
```

---

## Step 12: Structural sharing (copy-on-write)

**Goal:** Only clone branches along the modified path; share unmodified references.

### Step 12 — Green (implementation)

- [ ] Create `packages/data-map/core/src/utils/structural-sharing.ts`:

```ts
import { parsePointerSegments } from './pointer';

export function updateAtPointer<T>(
	data: T,
	pointer: string,
	value: unknown,
): T {
	const segments = parsePointerSegments(pointer);
	return updateRecursive(data, segments, 0, value) as T;
}

function updateRecursive(
	node: unknown,
	segments: string[],
	depth: number,
	value: unknown,
): unknown {
	if (depth === segments.length) return value;

	if (node === null || typeof node !== 'object') {
		throw new Error('Cannot set path: intermediate value is not an object');
	}

	const key = segments[depth]!;
	const isArray = Array.isArray(node);
	const currentChild = (node as any)[key];
	const nextChild = updateRecursive(currentChild, segments, depth + 1, value);

	if (isArray) {
		// Match pointer array index semantics: only digits, no leading zeros.
		if (!/^(0|[1-9][0-9]*)$/.test(key)) {
			throw new Error('Cannot set path: invalid array index');
		}
		const arr = node as unknown[];
		const next = arr.slice();
		const idx = Number.parseInt(key, 10);
		next[idx] = nextChild;
		return next;
	}

	return { ...(node as any), [key]: nextChild };
}
```

### Step 12 STOP & COMMIT

```txt
perf(data-map): add structural sharing helper

Introduce a copy-on-write helper that only clones along modified paths.
Enables higher-performance updates for large objects.

completes: step 12 of 12 for @data-map/core performance optimization
```

Then update `notify(...)` to start with:

```ts
if (!this.hasSubscribers()) {
	return { cancelled: false, handlerCount: 0 };
}
```

2. Update packages/data-map/core/src/subscription/manager.spec.ts

- Update vitest import:

```ts
import { describe, expect, it, vi } from 'vitest';
```

- Add test:

```ts
it('does not schedule microtasks when there are no subscriptions', () => {
	const spy = vi.spyOn(globalThis, 'queueMicrotask');
	try {
		const dm = new DataMap({ a: 1 });
		dm.get('/a');
		dm.resolve('/a');
		expect(spy).not.toHaveBeenCalled();
	} finally {
		spy.mockRestore();
	}
});
```

### Refactor

None.

### Verify

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

### STOP & COMMIT

`perf(data-map): skip notification scheduling when no subscribers`

---

## Step 4 — Add optional clone parameter to get()

**Goal:** Allow `dm.get(path, { clone: false })` for zero-copy reads (opt-in), while preserving default behavior.

### Red (tests)

Add tests for:

- Default `get()` still returns a cloned value (mutating the result does not affect internal state).
- `{ clone: false }` returns a direct reference (mutating the result DOES affect internal state).

### Green (implementation)

1. Update packages/data-map/core/src/types.ts

Add:

```ts
export interface GetOptions extends CallOptions {
	clone?: boolean;
}
```

2. Update packages/data-map/core/src/datamap.ts

- Import `GetOptions` alongside `CallOptions`.
- Update `get()` signature to accept `GetOptions`.
- Implement `clone` behavior by passing an internal `_skipClone` flag to `resolve()`.

Replace `get(...)` with:

```ts
get(pathOrPointer: string, options: GetOptions = {}): unknown {
	const shouldClone = options.clone ?? true;
	const matches = this.resolve(
		pathOrPointer,
		{ ...options, _skipClone: !shouldClone } as any,
	);
	const match = matches[0];
	if (!match) return undefined;

	const before = this._subs.notify(
		match.pointer,
		'get',
		'before',
		match.value,
		undefined,
		undefined,
		pathOrPointer,
	);

	this._subs.scheduleNotify(
		match.pointer,
		'get',
		'on',
		match.value,
		undefined,
		undefined,
		pathOrPointer,
	);
	this._subs.scheduleNotify(
		match.pointer,
		'get',
		'after',
		match.value,
		undefined,
		undefined,
		pathOrPointer,
	);

	return before.transformedValue !== undefined
		? before.transformedValue
		: match.value;
}
```

Then update `resolve(...)` so it conditionally clones based on that internal flag.

In each branch where `value` is created from `this._defs.applyGetter(...)`, change it to:

```ts
const shouldClone = !(options as any)._skipClone;
const nextValue = this._defs.applyGetter(pointer, rawValue, ctx);
const value = shouldClone ? cloneSnapshot(nextValue) : nextValue;
```

(Apply this pattern to: root pointer, non-root pointer, JSONPath `queryWithPointers` branch, and JSONPath `stream()` branch.)

3. Update packages/data-map/core/src/datamap.spec.ts

Add in the “Immutability” describe block:

```ts
it('get() returns cloned values by default', () => {
	const dm = new DataMap({ user: { name: 'Alice' } });
	const v = dm.get('/user') as any;
	v.name = 'Bob';
	expect(dm.get('/user/name')).toBe('Alice');
});

it('get({ clone: false }) returns a direct reference', () => {
	const dm = new DataMap({ user: { name: 'Alice' } });
	const v = dm.get('/user', { clone: false } as any) as any;
	v.name = 'Bob';
	expect(dm.get('/user/name')).toBe('Bob');
});
```

### Refactor

None.

### Verify

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

### STOP & COMMIT

`perf(data-map): add clone option to get()`

---

## Step 5 — Implement lazy subscription manager

**Goal:** Do not allocate `SubscriptionManagerImpl` until the first `subscribe()` call.

### Red (tests)

Add a unit test that asserts `DataMap` instances do not create a subscription manager until subscribing.

### Green (implementation)

1. Update packages/data-map/core/src/datamap.ts

Replace the eager field:

```ts
private readonly _subs = new SubscriptionManagerImpl<T, Ctx>(this);
```

With:

```ts
private _subs: SubscriptionManagerImpl<T, Ctx> | null = null;

private get subs(): SubscriptionManagerImpl<T, Ctx> {
	if (!this._subs) this._subs = new SubscriptionManagerImpl<T, Ctx>(this);
	return this._subs;
}

private hasSubscribers(): boolean {
	return this._subs !== null && this._subs.hasSubscribers();
}

private scheduleNotify(
	pointer: string,
	event: SubscriptionEvent,
	stage: 'on' | 'after',
	value: unknown,
	previousValue?: unknown,
	operation?: Operation,
	originalPath: string = pointer,
): void {
	if (!this._subs) return;
	this._subs.scheduleNotify(
		pointer,
		event,
		stage,
		value,
		previousValue,
		operation,
		originalPath,
	);
}

private notify(
	pointer: string,
	event: SubscriptionEvent,
	stage: 'before' | 'on' | 'after',
	value: unknown,
	previousValue?: unknown,
	operation?: Operation,
	originalPath: string = pointer,
): { cancelled: boolean; transformedValue?: unknown; handlerCount: number } {
	if (!this._subs) return { cancelled: false, handlerCount: 0 };
	return this._subs.notify(
		pointer,
		event,
		stage,
		value,
		previousValue,
		operation,
		originalPath,
	);
}
```

Then update `subscribe(...)` to instantiate lazily:

```ts
subscribe(config: SubscriptionConfig<T, Ctx>): Subscription {
	return this.subs.register(config);
}
```

Finally, replace all `this._subs.scheduleNotify(` call sites with `this.scheduleNotify(`, and replace `this._subs.notify(` call sites with `this.notify(`.

2. Update packages/data-map/core/src/subscription/manager.spec.ts

Add:

```ts
it('does not instantiate SubscriptionManagerImpl until first subscribe()', () => {
	const dm = new DataMap({ a: 1 });
	expect((dm as any)._subs).toBeNull();

	dm.subscribe({ path: '/a', after: 'set', fn: () => {} });
	expect((dm as any)._subs).not.toBeNull();
});
```

### Refactor

None.

### Verify

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

### STOP & COMMIT

`perf(data-map): lazily instantiate subscription manager`

---

## Step 6 — Implement inline pointer resolution fast path

**Goal:** Avoid `new JSONPointer(pointer)` for common pointer reads by introducing an inline resolver and using it from `resolvePointer()`.

### Red (tests)

Extend pointer resolution tests to ensure the inline resolver matches existing behavior for:

- root pointer (`''`)
- normal pointers (`/a/b/0`)
- escaped segments (`~0`, `~1`)

### Green (implementation)

1. Update packages/data-map/core/src/utils/pointer.ts

Add this function (re-using existing `parsePointerSegments`):

```ts
export function resolvePointerInline<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	if (pointer === '' || pointer === '/') return data as T;
	if (!pointer.startsWith('/')) return undefined;

	const segments = parsePointerSegments(pointer);
	let current: unknown = data;
	for (const seg of segments) {
		if (current == null) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as any)[seg];
	}
	return current as T;
}
```

2. Update packages/data-map/core/src/utils/jsonpath.ts

Change `resolvePointer(...)` to use the inline resolver first:

```ts
import { resolvePointerInline } from './pointer';

export function resolvePointer<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	try {
		const fast = resolvePointerInline<T>(data, pointer);
		if (fast !== undefined || pointer === '' || pointerExists(data, pointer)) {
			return fast;
		}
		return undefined;
	} catch {
		return new JSONPointer(pointer).resolve<T>(data);
	}
}
```

3. Update packages/data-map/core/src/utils/jsonpath.spec.ts

Add cases to compare output for escaped pointers (existing file already exercises `resolvePointer`).

### Refactor

None.

### Verify

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

### STOP & COMMIT

`perf(data-map): add inline JSON Pointer resolver`

---

## Step 7 — Implement tiered subscription lookup

**Goal:** Use a lightweight Set-based membership check for low subscription counts, switching to bloom filter only above a threshold.

### Red (tests)

Add a unit test that registers < threshold pointers and asserts the Set path is used, and another that registers >= threshold and asserts bloom mode.

### Green (implementation)

1. Update packages/data-map/core/src/subscription/manager.ts

Add fields to `SubscriptionManagerImpl`:

```ts
private static readonly BLOOM_THRESHOLD = 100;
private pointerSet = new Set<string>();
private useBloom = false;
```

In `register(...)`, when adding pointers:

- always add to `pointerSet`
- when `pointerSet.size > BLOOM_THRESHOLD`, set `useBloom = true` and backfill bloom filter once.

In `notify(...)`, replace the bloom check with:

```ts
const mightContainPointer = this.useBloom
	? this.bloomFilter.mightContain(pointer)
	: this.pointerSet.has(pointer);
```

2. Update packages/data-map/core/src/subscription/manager.spec.ts

Add tests that validate `useBloom` flips when expected by reaching the threshold.

### Refactor

None.

### Verify

```bash
pnpm --filter @data-map/core test
pnpm --filter @data-map/core type-check
```

### STOP & COMMIT

`perf(data-map): tier subscription lookup with Set then bloom`
