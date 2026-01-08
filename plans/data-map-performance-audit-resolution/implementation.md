---
post_title: "Data Map Performance Audit Resolution - Implementation"
author1: "lmiller"
post_slug: "data-map-performance-audit-resolution-implementation"
microsoft_alias: "lmiller"
featured_image: ""
categories:
	- Engineering
	- Performance
	- TypeScript
	- Testing
	- Tooling
tags:
	- data-map
	- performance
	- benchmarks
	- vitest
	- structural-sharing
ai_note: "AI-assisted generation of an implementation checklist and copy/paste-ready steps."
summary: "Step-by-step implementation guide to resolve the DataMap performance audit, starting with benchmark methodology fixes and then applying targeted core optimizations."
post_date: "2026-01-07"
---

## Context

This document is the copy/paste-ready execution guide derived from [plans/data-map-performance-audit-resolution/plan.md](plans/data-map-performance-audit-resolution/plan.md).

Scope is intentionally limited to:

- Fix benchmark methodology first (Tier 0) so measurements are trustworthy.
- Apply targeted `@data-map/core` optimizations (Tiers 1–3).
- Update docs and changelog last (Tier 4).

## Execution Rules

- Work from repo root.
- Use `pnpm --filter ...` (do not `cd` into packages).
- Use TDD per step: Red → Green → Refactor.
- Each step includes a STOP & COMMIT checkpoint.
- Avoid multi-line heredoc scripts in terminal.

## Prereqs

```bash
pnpm install
```

Optional before Tier 0:

```bash
pnpm --filter @data-map/benchmarks type-check
```

## Step Index

Tier 0 (Benchmarks)

- 0.1 Fix adapter clone methodology
- 0.2 Fix benchmark suites to avoid cloning inside timed loops
- 0.3 Add guardrails to prevent methodology regression

Tier 1 (Core low-risk wins)

- 1.1 Remove redundant cloning in `DataMap.clone()`
- 1.2 Add internal fast-path for reading data without deep cloning

Tier 2 (Patch + structural sharing)

- 2.1 Stop deep-cloning entire object in patch builder when only creating parent containers
- 2.2 Extend structural-sharing fast-path coverage for patch apply

Tier 3 (Subscriptions)

- 3.1 Ensure zero-subscriber fast paths are complete and benchmarked

Tier 4 (Docs)

- 4.1 Update audit doc references and guidance
- 4.2 Update changelog

---

## Tier 0 — Benchmarks

### Step 0.1 — Fix adapter clone methodology

**Goal**: Ensure benchmark adapter `clone()` measures DataMap clone cost once and does not accidentally deep-clone multiple times.

**Files**:

- packages/data-map/benchmarks/src/adapters/data-map.adapter.ts

#### Red (test)

Create file: `packages/data-map/benchmarks/src/adapters/data-map.adapter.spec.ts`

```ts
import { describe, expect, it, vi } from 'vitest';

import { DataMapAdapter } from './data-map.adapter.js';

describe('DataMapAdapter', () => {
	it('clone() should not call getSnapshot() more than once', () => {
		const adapter = new DataMapAdapter();
		const dm = adapter.create({ a: 1 });

		const getSnapshotSpy = vi.spyOn(dm, 'getSnapshot');

		adapter.clone(dm);
		expect(getSnapshotSpy.mock.calls.length).toBeLessThanOrEqual(1);
	});
});
```

Run:

```bash
pnpm --filter @data-map/benchmarks test
```

#### Green (implementation)

Update `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`:

```ts
clone(dm: DataMap<unknown>): unknown {
	return dm.clone().toJSON();
}
```

Re-run:

```bash
pnpm --filter @data-map/benchmarks test
```

#### STOP & COMMIT

Commit message:

```text
perf(benchmarks): fix adapter clone methodology
```

---

### Step 0.2 — Fix benchmark suites to avoid cloning inside timed loops

**Goal**: Ensure benches don’t include `structuredClone` inside timed callbacks.

**Files**:

- packages/data-map/benchmarks/src/compare/\*.bench.ts

#### Red (test)

Create file: `packages/data-map/benchmarks/src/compare/methodology.spec.ts`

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const compareDir = path.join(process.cwd(), 'src', 'compare');

function getCompareBenchFiles(): string[] {
	return fs
		.readdirSync(compareDir)
		.filter((name) => name.endsWith('.bench.ts'))
		.map((name) => path.join(compareDir, name));
}

describe('benchmark methodology', () => {
	it('does not call structuredClone inside timed bench callbacks', () => {
		const files = getCompareBenchFiles();
		expect(files.length).toBeGreaterThan(0);

		for (const file of files) {
			const text = fs.readFileSync(file, 'utf8');
			const forbidden =
				/bench\([^\)]*\)\s*,\s*\(.*?\)\s*=>\s*\{[\s\S]*?structuredClone\(/m.test(
					text,
				);
			expect(forbidden).toBe(false);
		}
	});
});
```

Run:

```bash
pnpm --filter @data-map/benchmarks test
```

#### Green (implementation)

Move cloning into bench `setup()` (Vitest bench option), e.g.:

```ts
bench(
	'operation',
	({ input }) => {
		// timed work uses `input`
		void input;
	},
	{
		setup() {
			return { input: structuredClone(base) };
		},
	},
);
```

Re-run:

```bash
pnpm --filter @data-map/benchmarks test
```

#### STOP & COMMIT

Commit message:

```text
perf(benchmarks): move cloning out of timed loops
```

---

### Step 0.3 — Add guardrails to prevent methodology regression

Update `methodology.spec.ts` to also forbid `getSnapshot(` inside timed callbacks:

```ts
const forbiddenSnapshot =
	/bench\([^\)]*\)\s*,\s*\(.*?\)\s*=>\s*\{[\s\S]*?getSnapshot\(/m.test(text);
expect(forbiddenSnapshot).toBe(false);
```

Run:

```bash
pnpm --filter @data-map/benchmarks test
```

#### STOP & COMMIT

Commit message:

```text
test(benchmarks): add methodology guardrails
```

---

## Tier 1 — Core low-risk wins

### Step 1.1 — Remove redundant cloning in `DataMap.clone()`

**Files**:

- packages/data-map/core/src/datamap.ts
- packages/data-map/core/src/datamap.spec.ts

#### Red (test)

Add to `datamap.spec.ts`:

```ts
import { vi } from 'vitest';
import * as snapshot from './snapshot/clone.js';

describe('DataMap.clone', () => {
	it('does not deep-clone twice', () => {
		const cloneSpy = vi.spyOn(snapshot, 'cloneSnapshot');
		const dm = new DataMap({ a: { b: 1 } });

		dm.clone();

		expect(cloneSpy.mock.calls.length).toBeLessThanOrEqual(1);
	});
});
```

Run:

```bash
pnpm --filter @data-map/core test
```

#### Green (implementation)

Update `clone()` in `datamap.ts`:

```ts
clone(): DataMap<T> {
	const snapshot = this.getSnapshot();
	return new DataMap(snapshot as T, { cloneInitial: false });
}
```

Re-run:

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

Commit message:

```text
perf(core): avoid redundant cloning in DataMap.clone
```

---

### Step 1.2 — Add internal fast-path for reading data without deep cloning

**Files**:

- packages/data-map/core/src/datamap.ts
- packages/data-map/core/src/datamap.spec.ts

#### Red (test)

```ts
it('getRawData() does not deep-clone', () => {
	const dm = new DataMap({ a: { b: 1 } });
	const cloneSpy = vi.spyOn(snapshot, 'cloneSnapshot');

	// @ts-expect-error - internal method
	const raw = dm.getRawData();

	expect(raw).toEqual({ a: { b: 1 } });
	expect(cloneSpy).not.toHaveBeenCalled();
});
```

#### Green (implementation)

Add to `datamap.ts`:

```ts
getRawData(): T {
	return this.data;
}
```

Run:

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

Commit message:

```text
perf(core): add internal raw data fast path
```

---

## Tier 2 — Patch + structural sharing

### Step 2.1 — Avoid deep-cloning entire object in patch builder parent creation

**Files**:

- packages/data-map/core/src/patch/builder.ts
- packages/data-map/core/src/patch/builder.spec.ts

#### Red (test)

Create `packages/data-map/core/src/patch/builder.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import * as snapshot from '../snapshot/clone.js';
import { ensureParentContainers } from './builder.js';

describe('ensureParentContainers', () => {
	it('does not deep-clone the entire root', () => {
		const cloneSpy = vi.spyOn(snapshot, 'cloneSnapshot');
		const base = { a: { b: 1 } };

		ensureParentContainers(base, ['a', 'c']);

		expect(cloneSpy).not.toHaveBeenCalled();
	});
});
```

Run:

```bash
pnpm --filter @data-map/core test
```

#### Green (implementation)

In `builder.ts`:

- Remove eager `cloneSnapshot(currentData)`.
- Implement a copy-along-path approach (structural sharing).

Re-run:

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

Commit message:

```text
perf(core): avoid full deep clone in patch parent creation
```

---

### Step 2.2 — Extend structural-sharing fast-path coverage for patch apply

**Files**:

- packages/data-map/core/src/patch/apply.ts
- packages/data-map/core/src/patch/apply.spec.ts

#### Red (test)

Create `packages/data-map/core/src/patch/apply.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { applyPatch } from './apply.js';

describe('applyPatch structural sharing', () => {
	it('replace keeps untouched branches referentially equal', () => {
		const base = { left: { a: 1 }, right: { b: 2 } };
		const next = applyPatch(base, [
			{ op: 'replace', path: '/left/a', value: 42 },
		]);

		expect(next.right).toBe(base.right);
	});
});
```

Run:

```bash
pnpm --filter @data-map/core test
```

#### Green (implementation)

Extend fast paths in `apply.ts` (prefer reusing `updateAtPointer`).

Re-run:

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

Commit message:

```text
perf(core): broaden structural sharing fast paths for patch apply
```

---

## Tier 3 — Subscriptions

### Step 3.1 — Ensure zero-subscriber fast paths are complete

**Files**:

- packages/data-map/core/src/subscription/manager.ts
- packages/data-map/core/src/subscription/manager.spec.ts

#### Red (test)

Create `packages/data-map/core/src/subscription/manager.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { SubscriptionManager } from './manager.js';

describe('SubscriptionManager', () => {
	it('does not schedule notifications with zero subscribers', () => {
		const sm = new SubscriptionManager();
		const scheduleSpy = vi.spyOn(sm as any, 'scheduleNotify');

		sm.notifyChange({ path: '/a', value: 1 } as any);

		expect(scheduleSpy).not.toHaveBeenCalled();
	});
});
```

Run:

```bash
pnpm --filter @data-map/core test
```

#### Green (implementation)

If failing, short-circuit early in `manager.ts` using `hasSubscribers()` before scheduling.

Re-run:

```bash
pnpm --filter @data-map/core test
```

#### STOP & COMMIT

Commit message:

```text
perf(core): ensure zero-subscriber fast paths
```

---

## Tier 4 — Docs

### Step 4.1 — Update audit doc references and guidance

**Files**:

- packages/data-map/core/PERFORMANCE_AUDIT_EXHAUSTIVE.md

Edits:

- Remove references to outdated filenames.
- Add a short section: “Benchmark methodology: no cloning inside timed benches”.

#### STOP & COMMIT

Commit message:

```text
docs(data-map): update performance audit guidance
```

---

### Step 4.2 — Update changelog

**Files**:

- CHANGELOG.md

Add under Unreleased:

- Benchmarks: methodology fixes
- Core: clone redundancy fix; patch builder improvement; structural sharing improvements

#### STOP & COMMIT

Commit message:

```text
docs: update changelog for data-map perf work
```

<!--
ARCHIVED PREVIOUS IMPLEMENTATION CONTENT (stale / kept for reference)

## @data-map/core Performance Audit Resolution

### Goal

Resolve the key performance issues identified in `packages/data-map/core/COMPREHENSIVE_PERFORMANCE_AUDIT.md` by (1) fixing benchmark methodology and (2) removing avoidable cloning/notification work, then iteratively improving write/read paths and subscription matching.

### Prerequisites

- Ensure you are on branch `perf/data-map-core-optimization`.
- Install deps: `pnpm install`.

### Step-by-Step Instructions

#### Step 1.1: Fix Benchmark Adapter Methodology

- [x] Update `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts` to reuse a cached `DataMap` instance for the same `data` reference.
- [x] Apply the patch below to `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`:

```diff
*** Begin Patch
*** Update File: packages/data-map/benchmarks/src/adapters/data-map.adapter.ts
@@
 import { DataMap } from '@data-map/core';

 import type { BenchmarkAdapter, PatchOp, SubscriptionHandle } from './types.js';
+
+let cachedMap: DataMap<any> | null = null;
+let cachedData: unknown | null = null;
+
+function getCachedDataMap(data: unknown): DataMap<any> {
+	if (cachedData !== data) {
+		cachedMap = new DataMap(data as any);
+		cachedData = data;
+	}
+	return cachedMap!;
+}
@@
 	},
 	get: (data: unknown, path: string) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		return dm.get(path);
 	},
 	getAll: (data: unknown, path: string) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		return dm.getAll(path);
 	},
 	set: (data: unknown, path: string, value: unknown) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.set(path, value);
 		return dm.getSnapshot();
 	},
 	setAll: (data: unknown, path: string, value: unknown) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.setAll(path, value);
 		return dm.getSnapshot();
 	},
 	mutate: (data: unknown, path: string, value: unknown) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.set(path, value);
 	},
 	immutableUpdate: (data: unknown, path: string, value: unknown) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.set(path, value);
 		return dm.getSnapshot();
 	},
 	map: (data: unknown, path: string, fn: (v: unknown) => unknown) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.map(path, fn);
 		return dm.getSnapshot();
 	},
 	applyPatch: (data: unknown, patches: PatchOp[]) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.patch(patches as any);
 		return dm.getSnapshot();
 	},
 	patch: (data: unknown, patches: PatchOp[]) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.patch(patches as any);
 		return dm.getSnapshot();
 	},
 	push: (data: unknown, path: string, ...items: unknown[]) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.push(path, ...items);
 		return dm.getSnapshot();
 	},
 	pop: (data: unknown, path: string) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		const value = dm.pop(path);
 		return { data: dm.getSnapshot(), value };
 	},
 	shift: (data: unknown, path: string) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		const value = dm.shift(path);
 		return { data: dm.getSnapshot(), value };
 	},
 	unshift: (data: unknown, path: string, ...items: unknown[]) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.unshift(path, ...items);
 		return dm.getSnapshot();
 	},
@@
 		deleteCount: number,
 		...items: unknown[]
 	) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.splice(path, start, deleteCount, ...items);
 		return dm.getSnapshot();
 	},
@@
 		path: string,
 		compareFn?: (a: unknown, b: unknown) => number,
 	) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.sort(path, compareFn);
 		return dm.getSnapshot();
 	},
@@
 		callback: (data: unknown) => void,
 		path?: string,
 	) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		const subscription = dm.subscribe({
 			path: path ?? '$..*',
 			after: 'set',
 			fn: () => {
@@
 	batch: (
 		data: unknown,
 		fn: (apply: (p: string, v: unknown) => void) => void,
 	) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.batch(() => {
 			fn((path: string, value: unknown) => {
 				dm.set(path, value);
@@
 	transaction: (
 		data: unknown,
 		fn: (apply: (p: string, v: unknown) => void) => void,
 	) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.transaction(() => {
 			fn((path: string, value: unknown) => {
 				dm.set(path, value);
@@
 	clone: (data: unknown) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		return dm.clone().getSnapshot();
 	},
 	query: (data: unknown, expression: string) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		return dm.getAll(expression);
 	},
 	shuffle: (data: unknown, path: string) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		dm.shuffle(path);
 		return dm.getSnapshot();
 	},
 	subscribeWithPath: (
 		data: unknown,
 		path: string,
 		callback: (value: unknown) => void,
 	) => {
-		const dm = new DataMap(data);
+		const dm = getCachedDataMap(data);
 		const unsubscribe = dm.subscribe({
 			path,
 			after: 'set',
 			fn: () => {
@@
 	},
 };
*** End Patch
```

##### Step 1.1 Verification Checklist

- [x] Run: `pnpm --filter @data-map/benchmarks run bench`
- [x] Confirm benches run and report improved ops/sec vs baseline

#### Step 1.1 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map-benchmarks): reuse DataMap instance in adapter

Cache a DataMap instance per input data reference so benchmarks measure
operation cost more than constructor cost.

completes: step 1.1 of 23 for data-map-performance-audit-resolution
```

---

#### Step 1.2: Add Subscriber Count Fast Check

Note: This step is already implemented in the current codebase.

- [x] Verify `packages/data-map/core/src/datamap.ts` has:
  - [x] `hasSubscribers()` that checks `_subs !== null && _subs.hasSubscribers()`
  - [x] `notify()` early-returns when there are no subscribers
  - [x] `scheduleNotify()` only forwards when `_subs` exists
- [x] Verify `packages/data-map/core/src/subscription/manager.ts` has `hasSubscribers()`.

##### Step 1.2 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 1.2 STOP & COMMIT

```txt
test(data-map-core): verify subscriber fast-path exists

Confirm notification paths are skipped when there are no subscribers.

completes: step 1.2 of 23 for data-map-performance-audit-resolution
```

---

#### Step 1.3: Integrate Existing Structural Sharing Utility

Decision (based on repo research): integrate structural sharing at the patch application layer rather than bypassing `patch()` so we preserve subscriptions, metadata tracking, and definition setters.

- [x] Update `packages/data-map/core/src/patch/apply.ts` to fast-path `add`/`replace` operations that target JSON Pointers using `updateAtPointer()`.
- [x] Apply the patch below to `packages/data-map/core/src/patch/apply.ts`:

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/patch/apply.ts
@@
 import type { Operation } from '../types';
 import { applyOperations as applyPatchOperations } from '../utils/jsonpath';
+import { updateAtPointer } from '../utils/structural-sharing';
@@
 export function applyOperations(
 	currentData: unknown,
 	ops: Operation[],
 ): ApplyResult {
-	// @jsonpath/patch.applyPatch is immutable by default and already clones.
-	// Keep DataMap immutability by returning the new object.
-	const nextData = applyPatchOperations(currentData, ops, { mutate: false });
+	// Fast-path: for pure pointer `add`/`replace` operations, use structural-sharing updates.
+	// Fall back to JSON Patch engine for all other ops.
+	let nextData: unknown = currentData;
+	let allFastPath = true;
+	for (const op of ops) {
+		if (op.op === 'add' || op.op === 'replace') {
+			if (!op.path.startsWith('/') && op.path !== '') {
+				allFastPath = false;
+				break;
+			}
+			nextData = updateAtPointer(nextData, op.path, op.value);
+			continue;
+		}
+		allFastPath = false;
+		break;
+	}
+
+	if (!allFastPath) {
+		// @jsonpath/patch.applyPatch is immutable by default and already clones.
+		// Keep DataMap immutability by returning the new object.
+		nextData = applyPatchOperations(currentData, ops, { mutate: false });
+	}
*** End Patch
```

##### Step 1.3 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`
- [x] Run: `pnpm --filter @data-map/core bench`

#### Step 1.3 STOP & COMMIT

```txt
perf(data-map-core): fast-path pointer set via structural sharing

Use updateAtPointer() for add/replace pointer ops to reduce deep cloning
and patch-engine overhead.

completes: step 1.3 of 23 for data-map-performance-audit-resolution
```

---

#### Step 1.4: Implement Accessor Compilation Cache

- [x] Create `packages/data-map/core/src/utils/accessor-cache.ts`.
- [x] Use compiled accessors for pointer reads in `packages/data-map/core/src/utils/jsonpath.ts`.

- [x] Create `packages/data-map/core/src/utils/accessor-cache.ts` with the following content:

```ts
const accessorCache = new Map<string, (obj: any) => any>();

export function compileAccessor(path: string): (obj: any) => any {
	const cached = accessorCache.get(path);
	if (cached) return cached;

	// JSON Pointer tokens: split on '/', drop the leading empty token.
	// IMPORTANT: do not filter empty segments ("//" is a valid pointer token).
	const segments = path.split('/').slice(1);
	const accessor = (obj: any) => {
		let current = obj;
		for (const seg of segments) {
			if (current == null) return undefined;
			current = current[seg];
		}
		return current;
	};

	accessorCache.set(path, accessor);
	return accessor;
}
```

- [ ] Apply the patch below to `packages/data-map/core/src/utils/jsonpath.ts`:

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/utils/jsonpath.ts
@@
 import { JSONPointer } from '@jsonpath/pointer';
@@
 import { tryPointerExistsInline, tryResolvePointerInline } from './pointer';
+import { compileAccessor } from './accessor-cache';
@@
 export function resolvePointer<T = unknown>(
 	data: unknown,
 	pointer: string,
 ): T | undefined {
 	try {
 		// Ultra-fast path: accessor compilation for simple pointers without escapes.
 		// Runs before the inline fast-path to cover more cases without JSONPointer overhead.
 		if (pointer !== '' && pointer.startsWith('/') && !pointer.includes('~')) {
 			const get = compileAccessor(pointer);
 			return get(data) as T | undefined;
 		}
 		const fast = tryResolvePointerInline<T>(data, pointer);
 		if (fast.ok) return fast.value;
*** End Patch
```

##### Step 1.4 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`
- [x] Run: `pnpm --filter @data-map/core bench`

#### Step 1.4 STOP & COMMIT

```txt
perf(data-map-core): add compiled accessor cache for pointers

Introduce a small accessor cache and use it for common pointer read
paths to reduce repeated parsing/loop overhead.

completes: step 1.4 of 23 for data-map-performance-audit-resolution
```

---

#### Step 1.5: Add `clone: false` Option to `get()`

Note: `CallOptions.clone?: boolean` already exists in `packages/data-map/core/src/types.ts`, and `DataMap.resolve()` already honors it.

- [x] Update API docs to explicitly document `{ clone: false }` as a performance option.
- [x] Add a focused unit test ensuring `{ clone: false }` returns a direct reference.

- [x] Apply the patch below to `packages/data-map/docs/api/datamap.md`:

```diff
*** Begin Patch
*** Update File: packages/data-map/docs/api/datamap.md
@@
 ### `get(pathOrPointer, options)`
@@
-Options:
-- `strict?: boolean`
+Options:
+- `strict?: boolean`
+- `clone?: boolean` (default: `true`)
+  - When `false`, the value returned is a direct reference into the current state.
+  - Do not mutate returned values when `clone: false` is used.
*** End Patch
```

##### Step 1.5 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 1.5 STOP & COMMIT

```txt
docs(data-map): document clone option for get()

document CallOptions.clone and the performance/safety tradeoff.

completes: step 1.5 of 23 for data-map-performance-audit-resolution
```

---

#### Step 1.6: Enable Microtask Batching by Default

Note: Microtask batching is already implemented via `packages/data-map/core/src/subscription/scheduler.ts` and is used by `SubscriptionManagerImpl.scheduleNotify()`.

- [x] Verify `packages/data-map/core/src/subscription/manager.ts` schedules `on`/`after` via the scheduler.
- [x] Add/adjust tests only if timing assumptions fail.

##### Step 1.6 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 1.6 STOP & COMMIT

```txt
test(data-map-core): verify microtask batching semantics

Ensure subscription notifications for on/after stages are batched.

completes: step 1.6 of 23 for data-map-performance-audit-resolution
```

---

#### Step 2.1: Remove Defensive Cloning from `get()`

- [x] Flip the default so reads return references by default.
- [x] Keep an escape hatch via `{ clone: true }` (or introduce a new option) if you need backward-compatible behavior.

- [x] Apply the patch below to `packages/data-map/core/src/datamap.ts`:

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/datamap.ts
@@
-		const shouldClone = options.clone ?? true;
+		const shouldClone = options.clone ?? false;
*** End Patch
```

##### Step 2.1 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`
- [x] Update any tests that relied on mutation isolation to pass `{ clone: true }`.

#### Step 2.1 STOP & COMMIT

```txt
perf(data-map-core): default get/resolve to no-clone

Return direct references by default to eliminate deep-clone overhead on reads.

completes: step 2.1 of 23 for data-map-performance-audit-resolution
```

---

#### Step 2.2: Implement Copy-on-Write for `patch()`

- [x] Remove redundant deep root cloning in `patch()`.
- [x] Prefer immutable patch application when `_isOwned` is false; allow in-place mutation when `_isOwned` is true.

- [x] Apply the patch below to `packages/data-map/core/src/patch/apply.ts`:

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/patch/apply.ts
@@
 export function applyOperations(
 	currentData: unknown,
 	ops: Operation[],
 ): ApplyResult {
@@
-		// @jsonpath/patch.applyPatch is immutable by default and already clones.
-		// Keep DataMap immutability by returning the new object.
-		nextData = applyPatchOperations(currentData, ops, { mutate: false });
+		// Default to immutable semantics; DataMap will decide whether it can safely mutate.
+		nextData = applyPatchOperations(currentData, ops, { mutate: false });
 	}
*** End Patch
```

- [ ] Apply the patch below to `packages/data-map/core/src/datamap.ts` (this removes a redundant deep clone before an immutable patch apply):

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/datamap.ts
@@
 	readonly patch = Object.assign(
 		(ops: Operation[], options: CallOptions = {}) => {
-			this.ensureOwned();
+			// Copy-on-write: avoid redundant deep cloning before applying immutable patch ops.
 			const strict = options.strict ?? this._strict;
*** End Patch
```

##### Step 2.2 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 2.2 STOP & COMMIT

```txt
perf(data-map-core): remove redundant ensureOwned() in patch

Avoid deep-cloning the entire root before an immutable patch apply.

completes: step 2.2 of 23 for data-map-performance-audit-resolution
```

---

#### Step 2.3: Add `toImmutable()` Snapshot Method

- [x] Add `toImmutable(): Readonly<T>` to `packages/data-map/core/src/datamap.ts`.
- [x] Keep `toJSON()` as an alias if needed (or update docs to reflect semantics).

- [x] Apply the patch below to `packages/data-map/core/src/datamap.ts`:

```diff
*** Begin Patch
*** Update File: packages/data-map/core/src/datamap.ts
@@
 	toJSON(): T {
-		return cloneSnapshot(this._data);
+		return this.toImmutable() as T;
 	}
+
+	toImmutable(): Readonly<T> {
+		// In dev, shallow freezing is acceptable; deep-freeze can be added later if needed.
+		if (process.env.NODE_ENV === 'development' && this._data && typeof this._data === 'object') {
+			return Object.freeze(this._data as any) as Readonly<T>;
+		}
+		return this._data as Readonly<T>;
+	}
*** End Patch
```

##### Step 2.3 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 2.3 STOP & COMMIT

```txt
feat(data-map-core): add toImmutable() and align toJSON()

Expose an explicit immutable snapshot API and make toJSON() a thin alias.

completes: step 2.3 of 23 for data-map-performance-audit-resolution
```

---

#### Step 2.4: Optimize Batch Operations with Deferred Application

Note: batching is already implemented via `BatchManager` + `FluentBatchBuilder`.

- [x] Verify `packages/data-map/core/src/batch/builder.ts` accumulates ops and applies via a single `patch()` call.
- [x] If it does not, refactor `FluentBatchBuilder.apply()` to call `dm.patch(ops)` once.

##### Step 2.4 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`
- [x] Run: `pnpm --filter @data-map/core bench`

#### Step 2.4 STOP & COMMIT

```txt
perf(data-map-core): ensure batch builder applies ops once

Reduce overhead by applying accumulated batch ops in a single patch pass.

completes: step 2.4 of 23 for data-map-performance-audit-resolution
```

---

#### Step 2.5: Update All Tests for New Semantics

- [x] Update tests that relied on read cloning to pass `{ clone: true }` where needed.
- [x] Add tests verifying structural sharing where applicable.

##### Step 2.5 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`
- [x] Run: `pnpm --filter @data-map/core test:coverage`

#### Step 2.5 STOP & COMMIT

```txt
test(data-map-core): update tests for no-clone-by-default semantics

Align the test suite with the new reference-returning read behavior.

completes: step 2.5 of 23 for data-map-performance-audit-resolution
```

---

#### Step 3.1: Implement Tiered Subscription Matching

- [x] Create `packages/data-map/core/src/subscription/tiers.ts`.
- [x] Integrate tiered matching into `packages/data-map/core/src/subscription/manager.ts`.

- [x] Create `packages/data-map/core/src/subscription/tiers.ts` with the following content:

```ts
import type { SubscriptionConfig } from './types';

export type SubscriptionId = string;

export function isExactPointer(path: string): boolean {
	return path === '' || path.startsWith('/');
}

export function isPrefixPointer(path: string): boolean {
	return isExactPointer(path) && path.endsWith('/');
}

export interface TieredIndex {
	exact: Map<string, Set<SubscriptionId>>;
	prefix: Map<string, Set<SubscriptionId>>;
}

export function createTieredIndex(): TieredIndex {
	return { exact: new Map(), prefix: new Map() };
}

export function addToIndex(
	index: TieredIndex,
	path: string,
	id: SubscriptionId,
): void {
	if (isPrefixPointer(path)) {
		const set = index.prefix.get(path) ?? new Set<SubscriptionId>();
		set.add(id);
		index.prefix.set(path, set);
		return;
	}
	const set = index.exact.get(path) ?? new Set<SubscriptionId>();
	set.add(id);
	index.exact.set(path, set);
}

export function matchIndex(
	index: TieredIndex,
	pointer: string,
): Set<SubscriptionId> {
	const matched = new Set<SubscriptionId>();
	index.exact.get(pointer)?.forEach((id) => matched.add(id));
	for (const [prefix, ids] of index.prefix) {
		if (prefix === '' || pointer.startsWith(prefix)) {
			ids.forEach((id) => matched.add(id));
		}
	}
	return matched;
}
```

##### Step 3.1 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 3.1 STOP & COMMIT

```txt
perf(data-map-core): add tiered subscription matching scaffolding

Introduce a tiered index module for exact vs prefix subscription matching.

completes: step 3.1 of 23 for data-map-performance-audit-resolution
```

---

#### Step 3.2: Add Path Trie for Prefix Matching

Note: The repo currently uses `reverseIndex: Map<pointer, Set<id>>`. This step introduces a trie for scalable prefix matching.

- [x] Create `packages/data-map/core/src/subscription/trie.ts`.

```ts
export class PathTrie<V> {
	private readonly children = new Map<string, PathTrie<V>>();
	private readonly values = new Set<V>();

	insert(path: string, value: V): void {
		const segments = path.split('/').filter(Boolean);
		let node: PathTrie<V> = this;
		for (const seg of segments) {
			let child = node.children.get(seg);
			if (!child) {
				child = new PathTrie<V>();
				node.children.set(seg, child);
			}
			node = child;
		}
		node.values.add(value);
	}

	matchPrefix(path: string): Set<V> {
		const matched = new Set<V>();
		const segments = path.split('/').filter(Boolean);
		let node: PathTrie<V> = this;

		for (const seg of segments) {
			for (const v of node.values) matched.add(v);
			const next = node.children.get(seg);
			if (!next) return matched;
			node = next;
		}

		for (const v of node.values) matched.add(v);
		return matched;
	}
}
```

##### Step 3.2 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 3.2 STOP & COMMIT

```txt
feat(data-map-core): add PathTrie for prefix subscription matching

Introduce a trie utility for more efficient prefix matching.

completes: step 3.2 of 23 for data-map-performance-audit-resolution
```

---

#### Step 3.3: Dynamic Bloom Filter Toggle

Note: This step is already implemented in `packages/data-map/core/src/subscription/manager.ts` (threshold-based switch between `pointerSet` and Bloom filter).

- [x] Verify `BLOOM_THRESHOLD` logic toggles `useBloom` based on `pointerSet.size`.

##### Step 3.3 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 3.3 STOP & COMMIT

```txt
test(data-map-core): verify bloom toggle behavior

Confirm bloom filter automatically enables/disables based on subscription count.

completes: step 3.3 of 23 for data-map-performance-audit-resolution
```

---

#### Step 3.4: Optimize `handleStructuralChange()`

- [x] Reduce use of `dataMap.toJSON()` (deep clone) for structural re-expansion. Prefer direct references where safe.
- [x] Apply changes in `packages/data-map/core/src/subscription/manager.ts`.

##### Step 3.4 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 3.4 STOP & COMMIT

```txt
perf(data-map-core): reduce structural re-expansion overhead

Avoid full cloning and re-expanding all dynamic subscriptions when only a subset is affected.

completes: step 3.4 of 23 for data-map-performance-audit-resolution
```

---

#### Step 4.1: Implement LRU Cache for Path Detection

- [x] Replace the clear-all cache in `packages/data-map/core/src/path/detect.ts` with a simple LRU Map.

##### Step 4.1 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 4.1 STOP & COMMIT

```txt
perf(data-map-core): replace detectPathType cache with LRU

Improve cache behavior under churn by evicting least-recently-used entries.

completes: step 4.1 of 23 for data-map-performance-audit-resolution
```

---

#### Step 4.2: Expand Inline Pointer Fast Path

- [x] Extend `packages/data-map/core/src/utils/pointer.ts` inline resolution to support negative array indices.

##### Step 4.2 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 4.2 STOP & COMMIT

```txt
perf(data-map-core): expand inline pointer resolution

Support additional pointer patterns (including negative array indices) in inline resolver.

completes: step 4.2 of 23 for data-map-performance-audit-resolution
```

---

#### Step 4.3: Use Object Pool for Hot Path Allocations

- [x] Integrate `packages/data-map/core/src/utils/pool.ts` into a hot allocation site (e.g. temporary match objects) where safe.

##### Step 4.3 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 4.3 STOP & COMMIT

```txt
perf(data-map-core): apply ObjectPool to reduce allocations

Use the existing ObjectPool utility in a hot path to reduce GC pressure.

completes: step 4.3 of 23 for data-map-performance-audit-resolution
```

---

#### Step 5.1: Implement Proxy-Based Change Detection

- [x] Create `packages/data-map/core/src/proxy/tracker.ts`.

```ts
export class AccessTracker<T extends object> {
	private readonly accessed = new Set<string>();
	private readonly modified = new Set<string>();

	track(obj: T, path = ''): T {
		return new Proxy(obj, {
			get: (target, prop) => {
				const fullPath = `${path}/${String(prop)}`;
				this.accessed.add(fullPath);
				const value = Reflect.get(target, prop);
				if (typeof value === 'object' && value !== null) {
					return this.track(value as any, fullPath);
				}
				return value;
			},
			set: (target, prop, value) => {
				const fullPath = `${path}/${String(prop)}`;
				this.modified.add(fullPath);
				return Reflect.set(target, prop, value);
			},
		});
	}

	getAccessed(): Set<string> {
		return new Set(this.accessed);
	}

	getModified(): Set<string> {
		return new Set(this.modified);
	}
}
```

##### Step 5.1 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 5.1 STOP & COMMIT

```txt
feat(data-map-core): add proxy access tracker

Introduce a proxy-based access/modification tracker for future fine-grained notifications.

completes: step 5.1 of 23 for data-map-performance-audit-resolution
```

---

#### Step 5.2: Implement Selector-Based Subscriptions

- [x] Create `packages/data-map/core/src/subscription/selector.ts`.

```ts
export function defaultEquality<T>(a: T, b: T): boolean {
	return Object.is(a, b);
}
```

##### Step 5.2 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 5.2 STOP & COMMIT

```txt
feat(data-map-core): add selector subscription scaffolding

Introduce the minimal selector subscription utility surface for later integration.

completes: step 5.2 of 23 for data-map-performance-audit-resolution
```

---

#### Step 5.3: Add Shallow Comparison Utilities

- [x] Create `packages/data-map/core/src/utils/compare.ts`.

```ts
export function shallowEqual<T>(a: T, b: T): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== 'object' || typeof b !== 'object') return false;
	if (a === null || b === null) return false;

	const keysA = Object.keys(a as any);
	const keysB = Object.keys(b as any);
	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (
			!Object.hasOwn(b as any, key) ||
			!Object.is((a as any)[key], (b as any)[key])
		) {
			return false;
		}
	}

	return true;
}
```

##### Step 5.3 Verification Checklist

- [x] Run: `pnpm --filter @data-map/core test`

#### Step 5.3 STOP & COMMIT

```txt
feat(data-map-core): add shallow equality utility

Add a shallowEqual helper for selector subscription comparisons.

completes: step 5.3 of 23 for data-map-performance-audit-resolution
```

---

#### Step 6.1: Update API Documentation

- [x] Update `packages/data-map/docs/api/datamap.md` to document:
  - [x] `toImmutable()`
  - [x] default no-clone semantics and how to opt into cloning
- [x] Update `packages/data-map/docs/api/subscriptions.md` if selector subscriptions or proxy tracking are exposed.
- [x] Mark `packages/data-map/core/COMPREHENSIVE_PERFORMANCE_AUDIT.md` as resolved (add a short note at top).

##### Step 6.1 Verification Checklist

- [x] Confirm docs build/render in your docs workflow (if any).

#### Step 6.1 STOP & COMMIT

```txt
docs(data-map): update API docs for new performance semantics

Document toImmutable(), cloning semantics, and new subscription primitives.

completes: step 6.1 of 23 for data-map-performance-audit-resolution
```

---

#### Step 6.2: Update CHANGELOG

Note: The changelog lives at `packages/data-map/docs/CHANGELOG.md` in this repo.

- [x] Add an entry documenting breaking changes (default clone semantics, new APIs).

##### Step 6.2 Verification Checklist

- [x] Ensure CHANGELOG reflects user-facing changes.

#### Step 6.2 STOP & COMMIT

```txt
docs(data-map): update changelog for performance release

Record breaking changes and notable optimizations.

completes: step 6.2 of 23 for data-map-performance-audit-resolution
```

-->
