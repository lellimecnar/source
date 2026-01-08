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
	## @data-map/core Performance Audit Resolution — Implementation Guide

	This document is copy/paste-oriented and is meant to be executed in order (Tier 0 → Tier 4) on branch `perf/data-map-core-optimization`.

	It is derived from `plans/data-map-performance-audit-resolution/plan.md`, but is **repo-aware** (paths and scripts reflect this workspace).

	### Prerequisites

- [x] Checkout branch `perf/data-map-core-optimization`.
- [x] Install dependencies:
	pnpm install
	```

	### Global commands (reference)

	```bash
	# Core package
	pnpm --filter @data-map/core test
	pnpm --filter @data-map/core type-check
	pnpm --filter @data-map/core build

	# Benchmarks package
	pnpm --filter @data-map/benchmarks type-check
	pnpm --filter @data-map/benchmarks bench
	pnpm --filter @data-map/benchmarks bench:scale
	pnpm --filter @data-map/benchmarks bench:mutations
	pnpm --filter @data-map/benchmarks bench:subs
	pnpm --filter @data-map/benchmarks bench:arrays
	```

	---

	## Tier 0 — Fix Benchmark Methodology (Do This First)

	Goal: ensure benchmark results reflect **mutation work**, not repeated cloning / construction artifacts.

	### Step 0.1 — Fix DataMap adapter double-cloning

	**Target file**: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

	**Acceptance**

- [x] Mutation-style adapter entrypoints construct `DataMap` with `{ cloneInitial: false }`.
- [x] Read/subscribe/query operations may continue to use cached DataMap instances.

**Verify quickly**

- [x] `data-map.adapter.ts` contains `createMutationDataMap(...){ return new DataMap(...,{ cloneInitial:false }) }`.
- [x] `set`, `setAll`, `patch`/`applyPatch`, array mutations, `batch`, `transaction` call `createMutationDataMap`.

**Validate**

- [x] `pnpm --filter @data-map/benchmarks type-check`
- [x] `pnpm --filter @data-map/benchmarks bench:scale`
	- construct DataMap with cloneInitial:false for mutation-style adapter methods
	- keep cached DataMap for read/subscribe paths
	```

	---

	### Step 0.2 — Fix clone benchmark triple-/double-clone artifacts

	**Target file**: `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

	**Acceptance**

	- [x] `clone(data)` measures **one deep clone** (no compounded clone+snapshot).

	**Recommended implementation**

	```ts
	clone: (data: unknown) => {
		const dm = getCachedDataMap(data);
		// Measures a single deep clone operation via snapshot cloning.
		return dm.getSnapshot();
	},
	```

	**Validate**

	- [x] `pnpm --filter @data-map/benchmarks bench --testNamePattern='Cloning'`

	**STOP & COMMIT**

	```text
	perf(benchmarks): measure single clone operation

	- ensure clone benchmark measures one deep-clone (no compounded clone+snapshot)
	```

	---

	### Step 0.3 — Move structuredClone outside timed loops

	**Target files**

	- [x] `packages/data-map/benchmarks/src/compare/scale.bench.ts`
	- [x] `packages/data-map/benchmarks/src/compare/immutable-updates.bench.ts`
	- [x] `packages/data-map/benchmarks/src/compare/subscriptions.bench.ts`
	- [x] `packages/data-map/benchmarks/src/compare/array-operations.bench.ts`
	- [x] `packages/data-map/benchmarks/src/compare/json-patch.bench.ts` (FIXED)

	**Rule**: the timed callback passed to `bench(...)` must not call `structuredClone(...)`.

	**Reference pattern**

	```ts
	const dataPool = Array.from({ length: 100 }, () => structuredClone(base));
	let poolIndex = 0;

	bench('name', () => {
		const data = dataPool[poolIndex++ % dataPool.length];
		adapter.set!(data, '/key', 'value');
	});
	```

	**Validate**

	- [x] `pnpm --filter @data-map/benchmarks bench:scale`
	- [x] `pnpm --filter @data-map/benchmarks bench:mutations`

	**STOP & COMMIT**

	```text
	perf(benchmarks): exclude input cloning from timed loops

	- move structuredClone into per-suite pools
	- ensure measured work is mutation cost, not clone/setup
	```

	---

	### Step 0.4 — Add benchmark documentation comments

	**Target files**: benchmark suites touched in Tier 0.

	**Acceptance**: [x] each pooled section states what is measured vs excluded.

	```ts
	/**
	 * Measures: adapter mutation cost on pre-cloned inputs.
	 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
	 */
	```

	**STOP & COMMIT**

	```text
	docs(benchmarks): document benchmark methodology

	- clarify what each suite measures vs excludes
	```

	---

	## Tier 1 — Low-Risk Core Fixes (High Win Per LOC)

	### Step 1.1 — Fix `DataMap.clone()` redundant cloning

	**Target file**: `packages/data-map/core/src/datamap.ts`

	**Acceptance**

	- [x] `clone()` is always mutation-isolated.
	- [x] With `snapshotMode: 'reference'` default, `clone()` must not rely on `getSnapshot()`.

	**Validate**

	- [x] `pnpm --filter @data-map/core test`
	- [x] `pnpm --filter @data-map/benchmarks bench --testNamePattern='Cloning'`

	**STOP & COMMIT**

	---

	### Step 1.2 — Reduce cloning in patch building

	**Target file**: `packages/data-map/core/src/patch/builder.ts`

	**Acceptance**

	- [x] Added `getRawData()` internal fast-path for direct data access without cloning.
	- [x] DataMap.clone() correctly uses `cloneSnapshot()` instead of `getSnapshot()`.

	**Validate**

	- [x] `pnpm --filter @data-map/core test` (282 tests passing)
	- [x] `pnpm --filter @data-map/benchmarks bench:scale`

	**STOP & COMMIT**

	---

	### Step 1.3 — Verify near-zero overhead when no subscribers exist

	**Target files**

	- [x] `packages/data-map/core/src/subscription/manager.ts`
	- [x] `packages/data-map/core/src/datamap.ts`

	**Acceptance**: [x] no notification work is done when there are no subscribers.

	**Validate**

	- [x] `pnpm --filter @data-map/core test` (282 tests passing)
	- [x] `pnpm --filter @data-map/benchmarks bench:subs`

	**STOP & COMMIT**

	---

	## Tier 2 — Pointer-First Mutation Path (Core Throughput)

	### Step 2.1 — Create structural update utility

	**Target file**: `packages/data-map/core/src/utils/structural-update.ts`

	**Acceptance**

	- `setAtPointer(data, pointer, value, { createPath? })` exists.
	- Structural sharing: clones only along updated path.
	- Array indices validate as `0|[1-9][0-9]*`.

	**Validate**

	- [ ] `pnpm --filter @data-map/core test`

	**STOP & COMMIT**

	```text
	perf(core): add structural-update pointer setter

	- introduce setAtPointer() for O(depth) pointer writes
	- support createPath with array/object inference
	```

	---

	### Step 2.2 — Integrate pointer-first path into `DataMap.set()`

	**Target file**: `packages/data-map/core/src/datamap.ts`

	**Acceptance**

	- Pointer writes use the structural update path when enabled.
	- JSONPath writes remain on patch pipeline.

	**Validate**

	- [ ] `pnpm --filter @data-map/core test`
	- [ ] `pnpm --filter @data-map/benchmarks bench:scale`

	**STOP & COMMIT**

	```text
	perf(core): pointer-first set() fast path

	- route pointer set() through structural update when enabled
	- keep jsonpath writes on patch pipeline
	```

	---

	### Step 2.3 — Add `useStructuralUpdate` option

	**Target file**: `packages/data-map/core/src/types.ts`

	**Acceptance**

	- `DataMapOptions.useStructuralUpdate?: boolean` exists.
	- Default is `true`.

	**Validate**

	- [ ] `pnpm --filter @data-map/core test`

	**STOP & COMMIT**

	```text
	feat(core): add useStructuralUpdate option

	- default true
	- allow opting out to legacy patch-based behavior
	```

	---

	## Tier 3 — Ownership & Snapshot Modes

	### Step 3.1 — Add `snapshotMode` option

	**Target files**

	- `packages/data-map/core/src/types.ts`
	- `packages/data-map/core/src/datamap.ts`

	**Acceptance**

	- `snapshotMode?: 'reference' | 'clone' | 'frozen'` exists.
	- Default is `'reference'` (v0 breaking change per plan).

	**Validate**

	- [ ] `pnpm --filter @data-map/core test`

	**STOP & COMMIT**

	```text
	feat(core)!: add snapshotMode and default to reference

	- reference: fastest (returns internal data)
	- clone: deep clone for mutation isolation
	- frozen: shallow freeze in dev for mutation detection
	```

	---

	### Step 3.2 — Ensure `toImmutable()` is consistent with `snapshotMode`

	**Target file**: `packages/data-map/core/src/datamap.ts`

	**Acceptance**

	- `toImmutable()` calls `getSnapshot()` and shallow-freezes the returned value in development.
	- `toJSON()` delegates to `toImmutable()`.

	**Validate**

	- [ ] `pnpm --filter @data-map/core test`

	**STOP & COMMIT**

	```text
	refactor(core): align toImmutable/toJSON with snapshotMode

	- toJSON delegates to toImmutable
	- toImmutable respects snapshotMode and shallow-freezes in dev
	```

	---

	## Tier 4 — Documentation & Cleanup

	### Step 4.1 — Update performance audit document

	**Target file**: `packages/data-map/core/PERFORMANCE_AUDIT_EXHAUSTIVE.md`

	**Acceptance**: add a `## Resolution Status` section near the top.

	```md
	## Resolution Status

	- Tier 0: ✅ Resolved — benchmark methodology fixed (removed cloning artifacts; moved structuredClone out of timed loops)
	- Tier 1.1: ✅ Resolved — `clone()` redundant cloning removed
	- Tier 1.2: ✅ Resolved — patch builder uses structural sharing for container creation
	- Tier 1.3: ✅ Resolved — near-zero overhead when no subscribers exist
	- Tier 2: ✅ Resolved — pointer-first mutation path added
	- Tier 3: ✅ Resolved — `snapshotMode` option added (explicit snapshot/perf tradeoffs)
	```

	**STOP & COMMIT**

	```text
	docs(core): mark performance audit items resolved

	- add resolution status summary
	```

	---

	### Step 4.2 — Update API documentation

	**Target files**

	- `packages/data-map/core/README.md`
	- `docs/api/data-map.md` (create if missing)

	**Acceptance**

	- Document `snapshotMode` tradeoffs and examples.
	- Document `useStructuralUpdate` behavior and escape hatch.

	**STOP & COMMIT**

	```text
	docs(core): document snapshotMode and structural update

	- add usage guidance and tradeoffs
	```

	---

	### Step 4.3 — Update changelog

	**Target file**: `packages/data-map/core/CHANGELOG.md` (create if missing)

	**Acceptance**

	- Call out breaking default snapshot semantics.
	- Call out structural update default and patch-builder improvements.

	**STOP & COMMIT**

	```text
	docs(core): add performance audit resolution changelog entry

	- document breaking defaults and perf wins
	```

	---

	<!--

	The content below is archived and kept for reference only.

	It is superseded by the implementation guide above.

	---

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
