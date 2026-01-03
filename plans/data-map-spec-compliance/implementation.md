---
post_title: '@data-map/core Spec Compliance Implementation'
author1: 'GitHub Copilot (GPT-5.2)'
post_slug: 'data-map-spec-compliance-implementation'
microsoft_alias: ''
featured_image: ''
categories: ['engineering']
tags: ['data-map', 'vitest', 'json-patch']
ai_note: 'AI-assisted'
summary: 'Step-by-step implementation instructions to bring @data-map/core closer to spec compliance, with concrete code blocks and verification steps.'
post_date: '2026-01-03'
---

## @data-map/core Specification Compliance

## Goal

Bring `@data-map/core` from ~65% to ~95% spec compliance by implementing the missing behaviors called out in `packages/data-map/core/SPEC_COMPLIANCE_REPORT.md` and tracked in `plans/data-map-spec-compliance/plan.md`.

## Prerequisites

- Ensure you are on a feature branch (e.g. `feat/data-map-spec-compliance`) created from the repo’s default branch.
- All commands below are run from the repo root (preferred):

```bash
pnpm --filter @data-map/core test
```

## Step-by-Step Instructions

### Step 1: Before-Hook Value Transformation (AC-024)

- [x] Update `DataMap.patch()` to:
  - [x] Pass the _incoming_ value (`op.value`) to `before` handlers (not the current stored value)
  - [x] Pass the current stored value as `previousValue`
  - [x] Apply the returned `transformedValue` (if any) back onto the operation before applying the patch

- [x] Copy and paste the full `patch` block below into `packages/data-map/core/src/datamap.ts`, replacing the existing `readonly patch = Object.assign(...);` block entirely:

```ts
	readonly patch = Object.assign(
		(ops: Operation[], options: CallOptions = {}) => {
			const strict = options.strict ?? this._strict;

			// Never mutate caller-provided operations; we may rewrite `value` when before-hooks transform.
			const effectiveOps: Operation[] = ops.map((op) => ({ ...op })) as any;

			try {
				for (const op of effectiveOps) {
					const previousValue = this.get(op.path);
					const nextValue = 'value' in op ? op.value : undefined;

					const before = this._subs.notify(
						op.path,
						'patch',
						'before',
						nextValue,
						previousValue,
						op,
						op.path,
					);

					if (before.cancelled) {
						throw new Error('Patch cancelled by subscription');
					}

					if (before.transformedValue !== undefined && 'value' in op) {
						op.value = before.transformedValue;
					}
				}

				const { nextData, affectedPointers, structuralPointers } =
					applyOperations(this._data, effectiveOps);
				this._data = nextData as T;

				if (this._batch.isBatching) {
					this._batch.collect(effectiveOps, affectedPointers, structuralPointers);
					return this;
				}

				for (const p of structuralPointers) {
					this._subs.handleStructuralChange(p);
				}

				for (const op of effectiveOps) {
					this._subs.notify(
						op.path,
						'patch',
						'on',
						this.get(op.path),
						undefined,
						op,
						op.path,
					);
					this._subs.notify(
						op.path,
						'patch',
						'after',
						this.get(op.path),
						undefined,
						op,
						op.path,
					);
				}

				return this;
			} catch (e) {
				if (strict) throw e;
				return this;
			}
		},
		{
			toPatch: (ops: Operation[]) => ops,
		},
	);
```

- [x] Add the tests below to `packages/data-map/core/src/datamap.spec.ts` inside `describe('Write API', () => { ... })`:

```ts
it('applies transformedValue returned by before-hook (AC-024)', async () => {
	const dm = new DataMap({ a: 1 });
	dm.subscribe({
		path: '/a',
		before: 'set',
		fn: (v) => (Number(v) * 10) as any,
	});

	dm.set('/a', 2);
	await flushMicrotasks();
	expect(dm.get('/a')).toBe(20);
});

it('pipelines multiple before-hook transformations (AC-024)', async () => {
	const dm = new DataMap({ a: 0 });
	dm.subscribe({
		path: '/a',
		before: 'set',
		fn: (v) => Number(v) + 1,
	});
	dm.subscribe({
		path: '/a',
		before: 'set',
		fn: (v) => Number(v) * 10,
	});

	dm.set('/a', 1);
	await flushMicrotasks();
	expect(dm.get('/a')).toBe(20);
});
```

#### Step 1 Verification Checklist

- [x] `pnpm --filter @data-map/core test -- src/datamap.spec.ts`
- [x] The new tests pass

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map-spec-compliance): apply before-hook transformed values

- Pass op.value to before hooks and current value as previousValue
- Apply SubscriptionManager transformedValue back onto the operation
- Add tests for single and pipelined before-hook transformations

completes: step 1 of 11 for data-map-spec-compliance
```

---

### Step 2: Definition defaultValue Handling (AC-003)

#### Intent

If a definition provides `defaultValue`, initialize the underlying data at construction time (without invoking getters) so reads have a concrete stored value.

- [x] Add a safe “read-only” accessor in the definition registry to enumerate registered definitions.
- [x] Apply definition defaults in the DataMap constructor immediately after definitions are registered, before any user subscriptions are registered.

- [x] Copy/paste the method below into `packages/data-map/core/src/definitions/registry.ts` (inside `export class DefinitionRegistry...`) to expose registered definitions:

```ts
	getRegisteredDefinitions(): Definition<T, Ctx>[] {
		return this.defs.map((d) => d.def);
	}
```

- [x] In `packages/data-map/core/src/datamap.ts`, add this private helper method inside `export class DataMap...` (anywhere among other private helpers):

```ts
	private _applyDefinitionDefaults(): void {
		const defs = this._defs.getRegisteredDefinitions();

		let working = this._data as unknown;
		const allOps: Operation[] = [];

		const exists = (data: unknown, pointer: string): boolean => {
			if (pointer === '') return true;
			try {
				new JSONPointer(pointer).resolve(data as any);
				return true;
			} catch {
				return false;
			}
		};

		const apply = (ops: Operation[]) => {
			if (ops.length === 0) return;
			const { nextData } = applyOperations(working, ops);
			working = nextData;
			allOps.push(...ops);
		};

		for (const def of defs) {
			if (def.defaultValue === undefined) continue;

			if ('pointer' in def && typeof def.pointer === 'string') {
				const pointer = normalizePointerInput(def.pointer);
				if (!exists(working, pointer)) {
					apply(buildSetPatch(working, pointer, def.defaultValue));
				}
				continue;
			}

			if ('path' in def && typeof def.path === 'string') {
				const pattern = compilePathPattern(def.path);

				if (pattern.isSingular) {
					const pointer = pattern.concretePrefixPointer;
					if (!exists(working, pointer)) {
						apply(buildSetPatch(working, pointer, def.defaultValue));
					}
					continue;
				}

				const pointers = pattern.expand(working);
				for (const p of pointers) {
					if (!exists(working, p)) {
						apply(buildSetPatch(working, p, def.defaultValue));
					}
				}
			}
		}

		if (allOps.length === 0) return;
		this._data = working as T;
	}
```

- [x] Update `packages/data-map/core/src/datamap.ts` imports to include `compilePathPattern` (and ensure it is used only by the defaulting helper):

```ts
import { compilePathPattern } from './path/compile';
```

- [x] In the `DataMap` constructor in `packages/data-map/core/src/datamap.ts`, call the new helper immediately after registering definitions:

```ts
if (options.define && options.context !== undefined) {
	this._defs.registerAll(options.define, options.context);
	this._applyDefinitionDefaults();
}
```

- [x] Add tests to `packages/data-map/core/src/definitions/definitions.spec.ts`:

```ts
it('applies defaultValue into underlying data (AC-003)', () => {
	const dm = new DataMap<any>(
		{},
		{
			context: {},
			define: [{ pointer: '/a', defaultValue: 123 }],
		},
	);

	expect(dm.get('/a')).toBe(123);
	expect(dm.getSnapshot()).toEqual({ a: 123 });
});

it('does not invoke getters during construction when defaultValue exists (AC-003)', () => {
	let calls = 0;
	const dm = new DataMap<any>(
		{},
		{
			context: {},
			define: [
				{
					pointer: '/a',
					defaultValue: 1,
					get: () => {
						calls++;
						return 999;
					},
				},
			],
		},
	);

	expect(calls).toBe(0);
	expect(dm.getSnapshot()).toEqual({ a: 1 });
});
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @data-map/core test -- src/definitions/definitions.spec.ts`

#### Step 2 STOP & COMMIT

```txt
feat(data-map-spec-compliance): support definition defaultValue initialization

- Expose registered definitions from DefinitionRegistry
- Apply defaultValue into _data at construction time without invoking getters
- Add tests for defaultValue initialization and getter non-invocation

completes: step 2 of 11 for data-map-spec-compliance
```

---

### Step 3: CompiledPathPattern.toJSON() (REQ-026)

- [x] Create `packages/data-map/core/src/path/types.ts` with the following content:

```ts
import type { PathSegment } from './segments';

export type SerializedSegment =
	| { type: 'static'; value: string }
	| { type: 'index'; value: number }
	| { type: 'wildcard' }
	| { type: 'slice'; start?: number; end?: number; step: number }
	| { type: 'filter'; expression: string; hash: string }
	| { type: 'recursive'; following: SerializedSegment[] };

export interface SerializedPattern {
	source: string;
	segments: SerializedSegment[];
	isSingular: boolean;
	concretePrefix: string;
}

// Helper to keep serialization aligned with in-memory segments.
export function serializeSegment(seg: PathSegment): SerializedSegment {
	switch (seg.type) {
		case 'static':
			return { type: 'static', value: seg.value };
		case 'index':
			return { type: 'index', value: seg.value };
		case 'wildcard':
			return { type: 'wildcard' };
		case 'slice':
			return {
				type: 'slice',
				start: seg.start,
				end: seg.end,
				step: seg.step,
			};
		case 'filter':
			return { type: 'filter', expression: seg.expression, hash: seg.hash };
		case 'recursive':
			return {
				type: 'recursive',
				following: seg.following.map(serializeSegment),
			};
		default:
			return seg as never;
	}
}
```

- [x] Update `packages/data-map/core/src/path/compile.ts`:
  - [x] Extend `CompiledPathPattern` to include `toJSON(): SerializedPattern`
  - [x] Import `SerializedPattern` + `serializeSegment`
  - [x] Implement `toJSON()` on the compiled object

- [x] In `packages/data-map/core/src/path/compile.ts`, add the import near the top:

```ts
import type { SerializedPattern } from './types';
import { serializeSegment } from './types';
```

- [x] In `packages/data-map/core/src/path/compile.ts`, update the interface definition by inserting `toJSON`:

```ts
toJSON: () => SerializedPattern;
```

- [x] In `compilePathPattern(...)`, add the method on `pattern`:

```ts
		toJSON: () => ({
			source: jsonpath,
			segments: segments.map(serializeSegment),
			isSingular,
			concretePrefix: concretePrefixPointer,
		}),
```

- [x] Add tests to `packages/data-map/core/src/path/compile.spec.ts`:

```ts
it('serializes to JSON via toJSON() (REQ-026)', () => {
	const pattern = compilePathPattern('$.users[?(@.active)].name');
	const json = pattern.toJSON();
	expect(json.source).toBe('$.users[?(@.active)].name');
	expect(json.isSingular).toBe(false);
	expect(json.concretePrefix).toBe('/users');
	expect(json.segments.some((s) => s.type === 'filter')).toBe(true);
});

it('toJSON() covers recursive segment serialization', () => {
	const pattern = compilePathPattern('$..name');
	const json = pattern.toJSON();
	expect(json.segments.some((s) => s.type === 'recursive')).toBe(true);
});

it('toJSON source round-trips behavior (REQ-026)', () => {
	const p1 = compilePathPattern('$.users[*].name');
	const p2 = compilePathPattern(p1.toJSON().source);
	expect(p2.match('/users/0/name', () => undefined).matches).toBe(true);
});
```

##### Step 3 Verification Checklist

- [x] `pnpm --filter @data-map/core test -- src/path/compile.spec.ts`

#### Step 3 STOP & COMMIT

```txt
feat(data-map-spec-compliance): add CompiledPathPattern.toJSON

- Add SerializedPattern/SerializedSegment types
- Implement CompiledPathPattern.toJSON() for persistence/debugging
- Add tests covering serialization and round-trip by source

completes: step 3 of 11 for data-map-spec-compliance
```

---

### Step 4: Computed Value Caching System

#### Intent

Cache getter results for definitions that declare dependencies so repeated reads are stable and cheap until invalidated.

- [x] Replace `packages/data-map/core/src/definitions/registry.ts` entirely with the full content below (this includes the Step 2 accessor and adds caching + invalidation hooks):

```ts
import type { Definition, DefinitionFactory, GetterConfig } from './types';
import type { DataMap } from '../datamap';
import type { CompiledPathPattern } from '../path/compile';
import { compilePathPattern } from '../path/compile';

interface InternalDefinition<T, Ctx> {
	def: Definition<T, Ctx>;
	pattern: CompiledPathPattern | null;
}

type CacheKey = { def: Definition<any, any>; pointer: string };
export class DefinitionRegistry<T, Ctx> {
	private readonly defs: InternalDefinition<T, Ctx>[] = [];
	private readonly dataMap: DataMap<T, Ctx>;

	// Cache getter outputs per (definition object, pointer)
	private readonly getterCache = new WeakMap<
		Definition<T, Ctx>,
		Map<string, unknown>
	>();
	private readonly getterCacheValid = new WeakMap<
		Definition<T, Ctx>,
		Set<string>
	>();

	constructor(dataMap: DataMap<T, Ctx>) {
		this.dataMap = dataMap;
	}

	registerAll(
		items: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[],
		ctx: Ctx,
	): void {
		for (const item of items) {
			const defs =
				typeof item === 'function' ? (item as any)(this.dataMap, ctx) : item;
			const list = Array.isArray(defs) ? defs : [defs];
			for (const def of list) this.register(def);
		}
	}

	register(def: Definition<T, Ctx>): void {
		if ('path' in def && typeof def.path === 'string') {
			this.defs.push({ def, pattern: compilePathPattern(def.path) });
			return;
		}
		this.defs.push({ def, pattern: null });
	}

	getRegisteredDefinitions(): Definition<T, Ctx>[] {
		return this.defs.map((d) => d.def);
	}

	invalidateDefinitionForPointer(
		def: Definition<T, Ctx>,
		pointer: string,
	): void {
		const valid = this.getterCacheValid.get(def);
		valid?.delete(pointer);
	}

	invalidateAllForDefinition(def: Definition<T, Ctx>): void {
		this.getterCacheValid.delete(def);
	}

	findForPointer(pointer: string): Definition<T, Ctx>[] {
		const matches: Definition<T, Ctx>[] = [];
		const getValue = (p: string) => this.dataMap.get(p);
		for (const entry of this.defs) {
			if (entry.pattern) {
				if (entry.pattern.match(pointer, getValue).matches)
					matches.push(entry.def);
				continue;
			}
			if ('pointer' in entry.def && entry.def.pointer === pointer)
				matches.push(entry.def);
		}
		return matches;
	}

	applyGetter(pointer: string, rawValue: unknown, ctx: Ctx): unknown {
		const defs = this.findForPointer(pointer);
		let v = rawValue;

		for (const def of defs) {
			if (!def.get) continue;
			const cfg: GetterConfig<T, Ctx> =
				typeof def.get === 'function' ? { fn: def.get } : def.get;

			const deps = cfg.deps ?? def.deps ?? [];
			const depValues = deps.map((d) => this.dataMap.get(d, { strict: false }));

			// Only cache getters that declare dependencies.
			if (deps.length > 0) {
				let map = this.getterCache.get(def);
				if (!map) {
					map = new Map();
					this.getterCache.set(def, map);
				}
				let valid = this.getterCacheValid.get(def);
				if (!valid) {
					valid = new Set();
					this.getterCacheValid.set(def, valid);
				}

				if (valid.has(pointer)) {
					v = map.get(pointer);
					continue;
				}

				v = cfg.fn(v, depValues, this.dataMap, ctx);
				map.set(pointer, v);
				valid.add(pointer);
				continue;
			}

			v = cfg.fn(v, depValues, this.dataMap, ctx);
		}

		return v;
	}

	applySetter(
		pointer: string,
		newValue: unknown,
		currentValue: unknown,
		ctx: Ctx,
	): unknown {
		const defs = this.findForPointer(pointer);
		for (const def of defs) {
			if (def.readOnly) throw new Error(`Read-only path: ${pointer}`);
			if (!def.set) continue;
			const cfg = typeof def.set === 'function' ? { fn: def.set } : def.set;
			const depValues = (cfg.deps ?? def.deps ?? []).map((d) =>
				this.dataMap.get(d, { strict: false }),
			);
			return cfg.fn(newValue, currentValue, depValues, this.dataMap, ctx);
		}
		return newValue;
	}
}
```

- [x] Add tests to `packages/data-map/core/src/definitions/definitions.spec.ts`:

```ts
it('caches getter results when deps are declared', () => {
	let calls = 0;
	const dm = new DataMap(
		{ a: 1, b: 2, sum: 0 },
		{
			context: {},
			define: [
				{
					pointer: '/sum',
					deps: ['/a', '/b'],
					get: (_v, deps) => {
						calls++;
						return Number(deps[0]) + Number(deps[1]);
					},
				},
			],
		},
	);

	expect(dm.get('/sum')).toBe(3);
	expect(dm.get('/sum')).toBe(3);
	expect(calls).toBe(1);
});

it('manual invalidation forces recomputation', () => {
	let calls = 0;
	const dm = new DataMap(
		{ a: 1, b: 2, sum: 0 },
		{
			context: {},
			define: [
				{
					pointer: '/sum',
					deps: ['/a', '/b'],
					get: (_v, deps) => {
						calls++;
						return Number(deps[0]) + Number(deps[1]);
					},
				},
			],
		},
	);

	expect(dm.get('/sum')).toBe(3);
	(dm as any)._defs.invalidateAllForDefinition(
		(dm as any)._defs.getRegisteredDefinitions()[0],
	);
	expect(dm.get('/sum')).toBe(3);
	expect(calls).toBe(2);
});
```

##### Step 4 Verification Checklist

- [x] `pnpm --filter @data-map/core test -- src/definitions/definitions.spec.ts`

#### Step 4 STOP & COMMIT

```txt
feat(data-map-spec-compliance): cache computed getters with deps

- Add per-definition getter caching keyed by (definition, pointer)
- Add invalidation hooks for future deps auto-subscription
- Add tests for caching and manual invalidation

completes: step 4 of 11 for data-map-spec-compliance
```

---

### Step 5: Definition deps Auto-Subscription (AC-031)

#### Intent

When a dependency changes, invalidate the cached computed value so subsequent reads recompute.

- [x] Update `packages/data-map/core/src/definitions/registry.ts` `register(def)` to auto-subscribe to each `dep` path and invalidate caches synchronously using `before: 'set'` (so it runs during the synchronous patch block).

- [x] Replace only the `register(def: Definition<T, Ctx>): void { ... }` method with the version below:

```ts
	register(def: Definition<T, Ctx>): void {
		const entry: InternalDefinition<T, Ctx> =
			'path' in def && typeof def.path === 'string'
				? { def, pattern: compilePathPattern(def.path) }
				: { def, pattern: null };

		this.defs.push(entry);

		const deps = def.deps ?? [];
		if (deps.length === 0) return;

		// Auto-subscribe to dependency paths and invalidate cached computed values.
		// Use stage 'before' so invalidation happens synchronously during patch application.
		for (const dep of deps) {
			this.dataMap.subscribe({
				path: dep,
				before: 'set',
				fn: () => {
					// Invalidate all cached pointers for this definition.
					this.invalidateAllForDefinition(def);
				},
			});
		}
	}
```

- [ ] Add tests to `packages/data-map/core/src/definitions/definitions.spec.ts`:

```ts
it('recomputes cached computed value when a dependency changes (AC-031)', () => {
	let calls = 0;
	const dm = new DataMap(
		{ a: 1, b: 2, sum: 0 },
		{
			context: {},
			define: [
				{
					pointer: '/sum',
					deps: ['/a', '/b'],
					get: (_v, deps) => {
						calls++;
						return Number(deps[0]) + Number(deps[1]);
					},
				},
			],
		},
	);

	expect(dm.get('/sum')).toBe(3);
	expect(calls).toBe(1);
	dm.set('/a', 10);
	expect(dm.get('/sum')).toBe(12);
	expect(calls).toBe(2);
});
```

##### Step 5 Verification Checklist

- [x] `pnpm --filter @data-map/core test -- src/definitions/definitions.spec.ts`

#### Step 5 STOP & COMMIT

```txt
feat(data-map-spec-compliance): auto-invalidate computed caches via deps subscriptions

- Auto-subscribe to definition deps during registration
- Invalidate cache for specific pointer (or all for patterns) when deps change
- Support deps declared at top-level or within getter config

completes: step 5 of 11 for data-map-spec-compliance
```

---

### Step 6: Enhance Batch API (if needed)

- [x] Audit `packages/data-map/core/src/datamap.ts` `batch()` and `packages/data-map/core/src/batch/manager.ts`:
  - [x] Ensure nested batches merge contexts correctly
  - [x] Ensure `transaction()` rollback prevents notifications

No code changes are required if existing tests pass.

##### Step 6 Verification Checklist

- [x] `pnpm --filter @data-map/core test -- src/batch/batch.spec.ts`

#### Step 6 STOP & COMMIT

```txt
chore(data-map-spec-compliance): verify batch/transaction behavior

- Confirm existing batch tests cover atomicity and rollback

completes: step 6 of 11 for data-map-spec-compliance
```

---

### [x] Step 7: queueMicrotask Notification Batching (REQ-016/REQ-017)

#### Intent

Deliver `on`/`after` notifications asynchronously via `queueMicrotask`, while keeping `before` synchronous (so cancel/transform semantics remain reliable).

- [x] Create `packages/data-map/core/src/subscription/scheduler.ts`:
- [x] Update `packages/data-map/core/src/subscription/manager.ts` to use the scheduler for `on`/`after` stages.
- [x] Update `packages/data-map/core/src/datamap.ts` to call `this._subs.scheduleNotify(...)` for `on` and `after` (and keep `before` synchronous).

---

### [x] Step 8: Filter Re-expansion on Criteria Change (AC-027)

#### Intent

Re-evaluate all filter predicates when any path within a filter's `concretePrefix` changes.

- [x] Implement `handleFilterCriteriaChange` in `SubscriptionManagerImpl`.
- [x] Track `filterWatchers` in `register`.
- [x] Call `handleFilterCriteriaChange` in `notify` during `on` stage.
- [x] Verify with tests in `manager.spec.ts`.

---

### [x] Step 9: Missing .toPatch() Methods for Array Operations

#### Intent

Ensure all array mutation methods (`pop`, `shift`, `splice`) have a corresponding `.toPatch()` variant that returns the JSON Patch operations without applying them.

- [x] Update `packages/data-map/core/src/datamap.ts` to add `.toPatch()` to `pop`, `shift`, and `splice`.
- [x] Verify with tests in `datamap.spec.ts`.

---

### Step 10: Subscription get/resolve Events

- [ ] Add `.toPatch()` to `shift`:

```ts
		{
			toPatch: (pathOrPointer: string, options: CallOptions = {}): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				const targetPointer = matches[0]?.pointer;
				if (!targetPointer) {
					if (strict) throw new Error('No matches for shift()');
					return [];
				}
				const arr = this.get(targetPointer);
				if (!Array.isArray(arr)) {
					if (strict) throw new Error('Target is not an array');
					return [];
				}
				if (arr.length === 0) return [];
				return [{ op: 'remove', path: `${targetPointer}/0` }];
			},
		},
```

- [ ] Add `.toPatch()` to `splice`:

```ts
		{
			toPatch: (
				pathOrPointer: string,
				start: number,
				deleteCount?: number,
				...items: unknown[]
			): Operation[] => {
				const strict = this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				const targetPointer = matches[0]?.pointer;
				if (!targetPointer) {
					if (strict) throw new Error('No matches for splice()');
					return [];
				}
				const arr = this.get(targetPointer);
				if (!Array.isArray(arr)) {
					if (strict) throw new Error('Target is not an array');
					return [];
				}

				const ops: Operation[] = [];
				const actualStart = start < 0 ? Math.max(arr.length + start, 0) : Math.min(start, arr.length);
				const actualDeleteCount = deleteCount === undefined ? arr.length - actualStart : Math.min(Math.max(deleteCount, 0), arr.length - actualStart);

				// Remove items from end to start to keep indices stable
				for (let i = actualDeleteCount - 1; i >= 0; i--) {
					ops.push({ op: 'remove', path: `${targetPointer}/${actualStart + i}` });
				}

				// Add items
				for (let i = 0; i < items.length; i++) {
					ops.push({ op: 'add', path: `${targetPointer}/${actualStart + i}`, value: items[i] });
				}

				return ops;
			},
		},
```

#### Step 9 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Add tests in `packages/data-map/core/src/datamap.spec.ts` for `pop.toPatch()`, `shift.toPatch()`, and `splice.toPatch()`.

#### Step 9 STOP & COMMIT

```txt
feat(data-map-spec-compliance): add .toPatch() methods for array operations

- Implement .toPatch() for pop, shift, and splice
- Ensure strict mode compliance and error handling

completes: step 9 of 11 for data-map-spec-compliance
```

- [ ] Update `packages/data-map/core/src/subscription/manager.ts` to use the scheduler for `on`/`after` stages.
  - [ ] Add import at top:

```ts
import { NotificationScheduler } from './scheduler';
```

- [ ] Add a scheduler field inside `SubscriptionManagerImpl`:

```ts
	private readonly scheduler = new NotificationScheduler();
```

- [ ] Add this helper method inside `SubscriptionManagerImpl`:

```ts
	scheduleNotify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): void {
		this.scheduler.schedule(() => {
			this.notify(pointer, event, stage, value, previousValue, operation, originalPath);
		});
	}
```

- [ ] Update `packages/data-map/core/src/datamap.ts` to call `this._subs.scheduleNotify(...)` for `on` and `after` (and keep `before` synchronous).
  - Do NOT use `(this._subs as any)`; `this._subs` is a `SubscriptionManagerImpl<T, Ctx>`.

  - In `patch()`, replace the two synchronous calls:
    - `this._subs.notify(op.path, 'patch', 'on', ...)`
    - `this._subs.notify(op.path, 'patch', 'after', ...)`

    with:
    - `this._subs.scheduleNotify(op.path, 'patch', 'on', ...)`
    - `this._subs.scheduleNotify(op.path, 'patch', 'after', ...)`

  - Copy/paste replacement for the `on`/`after` loop:

```ts
for (const op of effectiveOps) {
	const value = this.get(op.path);
	this._subs.scheduleNotify(
		op.path,
		'patch',
		'on',
		value,
		undefined,
		op,
		op.path,
	);
	this._subs.scheduleNotify(
		op.path,
		'patch',
		'after',
		value,
		undefined,
		op,
		op.path,
	);
}
```

- [ ] Update `_flushBatch()` in `packages/data-map/core/src/datamap.ts` to schedule (not sync notify) for `on` and `after`:
  - Replace the two synchronous calls to `this._subs.notify(...)` with `this._subs.scheduleNotify(...)`.

  - Copy/paste replacement for the affected pointer loop:

```ts
for (const p of context.affectedPointers) {
	const val = this.get(p);
	this._subs.scheduleNotify(p, 'patch', 'on', val, undefined, undefined, p);
	this._subs.scheduleNotify(p, 'patch', 'after', val, undefined, undefined, p);
}
```

- [ ] Also update `packages/data-map/core/src/subscription/manager.ts` `handleStructuralChange()` so the “notify new match” path uses the same async semantics:
  - Schedule the `after` notification (type `set`) through the scheduler (either by wrapping `invokeHandlers(...)` in `this.scheduler.schedule(...)`, or by adding a small helper for `after:set` and using it here).

- [ ] Update tests that assert `on`/`after` synchronously to await microtasks:
  - [ ] `packages/data-map/core/src/batch/batch.spec.ts`
    - Make the first two tests `async` and `await flushMicrotasks()` after `dm.batch(...)` before asserting final `calls`.

  - [ ] `packages/data-map/core/src/subscription/static.spec.ts`
    - Make the test `async`.
    - After `dm.patch(...)`, assert only the `before` call is present.
    - `await flushMicrotasks()`, then assert the `on` and `after` calls appear (in order).

  - [ ] `packages/data-map/core/src/subscription/dynamic.spec.ts`
    - Make both tests `async`.
    - After `dm.patch(...)`, assert `calls` is empty, then `await flushMicrotasks()` and assert the expected calls.
    - For the structural-change test, `await flushMicrotasks()` before checking the “set:/users/1/name” notification.

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Add a one-off assertion: after `dm.patch(...)`, `after` handlers do not run until microtask

#### Step 7 STOP & COMMIT

```txt
feat(data-map-spec-compliance): batch subscription notifications with queueMicrotask

- Add NotificationScheduler and schedule on/after notifications
- Keep before hooks synchronous for cancel/transform
- Schedule structural-change (set/after) notifications consistently
- Update tests for async on/after delivery

completes: step 7 of 11 for data-map-spec-compliance
```

---

### Step 8: Filter Re-expansion on Criteria Change (AC-027)

#### Intent

When a filter criterion changes (e.g. `@.active` flips), recompute expandedPaths so filter-based subscriptions add/remove pointers accordingly.

- [ ] In `packages/data-map/core/src/subscription/manager.ts`, add a new mapping for filter watchers:

```ts
	private readonly filterWatchers = new Map<string, Set<string>>();
```

- [ ] In `register(...)`, after `compiledPattern = compilePathPattern(config.path);` and after `isDynamic` is set, register filter watchers for patterns with filters:

```ts
if (compiledPattern.hasFilters) {
	const prefix = compiledPattern.concretePrefixPointer;
	let set = this.filterWatchers.get(prefix);
	if (!set) {
		set = new Set();
		this.filterWatchers.set(prefix, set);
	}
	set.add(id);
}
```

- [ ] Add this helper inside `SubscriptionManagerImpl`:

```ts
	handleFilterCriteriaChange(changedPointer: string): void {
		const data = this.dataMap.toJSON();
		for (const [prefix, ids] of this.filterWatchers) {
			if (prefix !== '') {
				const relevant = changedPointer === prefix || changedPointer.startsWith(prefix + '/');
				if (!relevant) continue;
			}

			for (const id of ids) {
				const sub = this.subscriptions.get(id);
				if (!sub?.compiledPattern) continue;

				const newPointers = sub.compiledPattern.expand(data);
				const newExpanded = new Set(newPointers);

				const added: string[] = [];
				const removed: string[] = [];
				for (const p of newExpanded) if (!sub.expandedPaths.has(p)) added.push(p);
				for (const p of sub.expandedPaths) if (!newExpanded.has(p)) removed.push(p);

				for (const p of removed) this.removeFromReverseIndex(p, id);
				for (const p of added) {
					this.addToReverseIndex(p, id);
					this.bloomFilter.add(p);
				}

				sub.expandedPaths = newExpanded;
			}
		}
	}
```

- [ ] In `notify(...)` at the top of the method (before bloom filter check), call it for any change pointer:

```ts
this.handleFilterCriteriaChange(pointer);
```

- [ ] Add tests to `packages/data-map/core/src/subscription/manager.spec.ts`:

```ts
it('re-expands filter subscriptions when criteria changes (AC-027)', async () => {
	const dm = new DataMap({ users: [{ active: true, name: 'A' }] });
	const sub = dm.subscribe({
		path: '$.users[?(@.active)].name',
		after: 'set',
		fn: () => {},
	});

	expect([...sub.expandedPaths]).toContain('/users/0/name');

	dm.set('/users/0/active', false);
	await flushMicrotasks();
	expect([...sub.expandedPaths]).not.toContain('/users/0/name');
});
```

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @data-map/core test -- src/subscription/manager.spec.ts`

#### Step 8 STOP & COMMIT

```txt
feat(data-map-spec-compliance): re-expand filter subscriptions on criteria changes

- Track filter subscriptions by concretePrefixPointer
- Recompute expandedPaths when any pointer within prefix changes
- Add tests for removal of matches when filter criterion flips

completes: step 8 of 11 for data-map-spec-compliance
```

---

### Step 9: Missing .toPatch() Methods for Array Operations

- [ ] Update `packages/data-map/core/src/datamap.ts` to make `pop`, `shift`, and `splice` support `.toPatch()`.

- [ ] Replace the existing `pop(...)`, `shift(...)`, and `splice(...)` members with these `Object.assign` variants:

```ts
	readonly pop = Object.assign(
		(pathOrPointer: string): unknown => {
			const pointer =
				this.resolve(pathOrPointer)[0]?.pointer ??
				normalizePointerInput(pathOrPointer);
			const { ops, value } = buildPopPatch(this._data, pointer);
			this.patch(ops);
			return value;
		},
		{
			toPatch: (pathOrPointer: string): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildPopPatch(this._data, pointer).ops;
			},
		},
	);

	readonly shift = Object.assign(
		(pathOrPointer: string): unknown => {
			const pointer =
				this.resolve(pathOrPointer)[0]?.pointer ??
				normalizePointerInput(pathOrPointer);
			const { ops, value } = buildShiftPatch(this._data, pointer);
			this.patch(ops);
			return value;
		},
		{
			toPatch: (pathOrPointer: string): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildShiftPatch(this._data, pointer).ops;
			},
		},
	);

	readonly splice = Object.assign(
		(
			pathOrPointer: string,
			start: number,
			deleteCount = 0,
			...items: unknown[]
		): unknown[] => {
			const pointer =
				this.resolve(pathOrPointer)[0]?.pointer ??
				normalizePointerInput(pathOrPointer);
			const { ops, removed } = buildSplicePatch(
				this._data,
				pointer,
				start,
				deleteCount,
				items,
			);
			this.patch(ops);
			return removed;
		},
		{
			toPatch: (
				pathOrPointer: string,
				start: number,
				deleteCount = 0,
				...items: unknown[]
			): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildSplicePatch(this._data, pointer, start, deleteCount, items).ops;
			},
		},
	);
```

- [ ] Add tests to `packages/data-map/core/src/datamap.spec.ts` in the `Array API` suite:

```ts
it('pop.toPatch() returns remove operation', () => {
	const dm = new DataMap({ items: [1, 2] });
	expect(dm.pop.toPatch('/items')).toEqual([
		{ op: 'remove', path: '/items/1' },
	]);
});

it('shift.toPatch() returns remove operation', () => {
	const dm = new DataMap({ items: [1, 2] });
	expect(dm.shift.toPatch('/items')).toEqual([
		{ op: 'remove', path: '/items/0' },
	]);
});

it('splice.toPatch() returns combined remove/add operations', () => {
	const dm = new DataMap({ items: [1, 2, 3] });
	const ops = dm.splice.toPatch('/items', 1, 1, 99);
	expect(ops.some((o) => o.op === 'remove')).toBe(true);
	expect(ops.some((o) => o.op === 'add')).toBe(true);
});
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @data-map/core test -- src/datamap.spec.ts`

#### Step 9 STOP & COMMIT

```txt
feat(data-map-spec-compliance): add toPatch variants for pop/shift/splice

- Convert pop/shift/splice to Object.assign pattern
- Expose .toPatch() returning the underlying JSON Patch ops
- Add tests for new .toPatch() methods

completes: step 9 of 11 for data-map-spec-compliance
```

---

### Step 10: Subscription get/resolve Events

#### Intent

Emit subscription events for reads so adapters can observe access.

- [ ] Refactor `packages/data-map/core/src/datamap.ts` to avoid `get()` implicitly firing `resolve` events by splitting resolve logic.

- [ ] Replace the existing `resolve(...)` and `get(...)` methods in `packages/data-map/core/src/datamap.ts` with the block below:

```ts
	private _resolveInternal(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[] {
		const strict = options.strict ?? this._strict;
		const pathType = detectPathType(pathOrPointer);
		const ctx = this._context as any;

		if (pathType === 'relative-pointer') {
			if (strict) throw new Error('Unsupported path type: relative-pointer');
			return [];
		}

		if (pathType === 'pointer') {
			const pointerString = normalizePointerInput(pathOrPointer);
			if (pointerString === '') {
				return [
					{
						pointer: '',
						value: cloneSnapshot(this._defs.applyGetter('', this._data, ctx)),
					},
				];
			}

			try {
				const pointer = new JSONPointer(pointerString);
				const resolved = pointer.resolve(this._data as any);
				return [
					{
						pointer: pointerString,
						value: cloneSnapshot(this._defs.applyGetter(pointerString, resolved, ctx)),
					},
				];
			} catch {
				if (strict) throw new Error(`Pointer not found: ${pointerString}`);
				return [];
			}
		}

		try {
			const nodes = jsonpath.query(pathOrPointer, this._data as any);
			const pointers = nodes.pointers().map((p) => p.toString());
			const values = nodes.values();
			return pointers.map((pointer, idx) => ({
				pointer,
				value: cloneSnapshot(this._defs.applyGetter(pointer, values[idx], ctx)),
			}));
		} catch {
			if (strict) throw new Error(`Invalid JSONPath: ${pathOrPointer}`);
			return [];
		}
	}

	resolve(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[] {
		const matches = this._resolveInternal(pathOrPointer, options);
		for (const m of matches) {
			this._subs.scheduleNotify(
				m.pointer,
				'resolve',
				'after',
				m.value,
				undefined,
				undefined,
				pathOrPointer,
			);
		}
		return matches;
	}

	get(pathOrPointer: string, options: CallOptions = {}): unknown {
		const first = this._resolveInternal(pathOrPointer, options)[0];
		if (first) {
			this._subs.scheduleNotify(
				first.pointer,
				'get',
				'after',
				first.value,
				undefined,
				undefined,
				pathOrPointer,
			);
		}
		return first?.value;
	}
```

- [ ] Add tests to `packages/data-map/core/src/subscription/events.spec.ts`:

```ts
it('fires get events on get() calls', async () => {
	const dm = new DataMap({ a: 1 });
	const calls: string[] = [];
	dm.subscribe({
		path: '/a',
		after: 'get',
		fn: () => calls.push('get'),
	});
	dm.get('/a');
	await flushMicrotasks();
	expect(calls).toEqual(['get']);
});

it('fires resolve events on resolve() calls', async () => {
	const dm = new DataMap({ a: 1 });
	const calls: string[] = [];
	dm.subscribe({
		path: '/a',
		after: 'resolve',
		fn: () => calls.push('resolve'),
	});
	dm.resolve('/a');
	await flushMicrotasks();
	expect(calls).toEqual(['resolve']);
});
```

##### Step 10 Verification Checklist

- [ ] `pnpm --filter @data-map/core test -- src/subscription/events.spec.ts`

#### Step 10 STOP & COMMIT

```txt
feat(data-map-spec-compliance): emit subscription events for get/resolve

- Refactor resolve logic into a private helper
- Schedule 'get' and 'resolve' events for subscribers
- Add tests verifying read events are emitted

completes: step 10 of 11 for data-map-spec-compliance
```

---

### Step 11: Documentation and Cleanup

- [ ] Update `packages/data-map/core/README.md` with:
  - [ ] Subscription timing semantics (on/after delivered via microtask)
  - [ ] Before-hook value transformation behavior
  - [ ] Definition `defaultValue` behavior

- [ ] Update `packages/data-map/core/CHANGELOG.md` with an entry for the new behavior.

- [ ] Regenerate `packages/data-map/core/SPEC_COMPLIANCE_REPORT.md` and update the compliance score.

##### Step 11 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Manual scan of docs for accuracy

#### Step 11 STOP & COMMIT

```txt
docs(data-map-spec-compliance): update docs and compliance report

- Document new subscription batching and read-event semantics
- Update changelog and compliance report

completes: step 11 of 11 for data-map-spec-compliance
```
