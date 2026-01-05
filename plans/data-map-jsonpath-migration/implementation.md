# data-map-jsonpath-migration

## Goal

Migrate `@data-map/core` off `json-p3` onto the workspace-native `@jsonpath/*` packages, while preserving DataMap semantics (pointer strings, immutability, strict-mode behavior), and adding streaming + subscription precompilation optimizations.

## Prerequisites

- You are on the plan branch: `feat/data-map-native-jsonpath`.
- Workspace uses `pnpm` + Turborepo.

Recommended commands (from repo conventions):

- Install: `pnpm install`
- Type-check: `pnpm --filter @data-map/core type-check`
- Test: `pnpm --filter @data-map/core test`
- Coverage: `pnpm --filter @data-map/core test:coverage`

---

## Step-by-Step Instructions

### Step 1: Update Dependencies + AGENTS.md requirement

#### Step 1.1 Update `@data-map/core` dependencies

- [ ] Edit `packages/data-map/core/package.json`:
  - [ ] Remove `json-p3` from `dependencies`.
  - [ ] Remove `@jsonpath/compat-json-p3` from `devDependencies`.
  - [ ] Add `@jsonpath/jsonpath`, `@jsonpath/pointer`, `@jsonpath/patch` to `dependencies` as `workspace:*`.

- [ ] In `packages/data-map/core/package.json`, replace the **entire** `dependencies` block with:

```json
{
	"dependencies": {
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/patch": "workspace:*"
	}
}
```

- [ ] In `packages/data-map/core/package.json`, remove this line from `devDependencies`:

```json
"@jsonpath/compat-json-p3": "workspace:*",
```

#### Step 1.2 Update package requirement documentation

- [ ] In `packages/data-map/core/AGENTS.md`, replace this sentence:

```md
This package MUST use `json-p3` as the sole JSONPath/Pointer/Patch engine.
```

- [ ] With this sentence:

```md
This package MUST use the workspace-native `@jsonpath/*` packages as the sole JSONPath/Pointer/Patch engine.
```

##### Step 1 Verification Checklist

- [ ] `pnpm install` succeeds.
- [ ] `pnpm --filter @data-map/core type-check` runs and reports migration errors (expected at this stage).

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(data-map): swap json-p3 for @jsonpath/* deps

- Remove json-p3 + compat-json-p3
- Add @jsonpath/jsonpath, @jsonpath/pointer, @jsonpath/patch (workspace:*)
- Update @data-map/core AGENTS.md requirement

completes: step 1 of 9 for data-map-jsonpath-migration
```

---

### Step 2: Add `src/utils/jsonpath.ts` wrapper + unit tests

This step centralizes all `@jsonpath/*` usage behind a thin module so the migration stays localized, and DataMap gets consistent error normalization.

#### Step 2.1 Add wrapper module

- [ ] Create `packages/data-map/core/src/utils/jsonpath.ts` with the exact contents below:

```ts
import {
	query as jpQuery,
	stream as jpStream,
	compileQuery,
} from '@jsonpath/jsonpath';
import { JSONPointer } from '@jsonpath/pointer';
import { applyPatch } from '@jsonpath/patch';
import { JSONPathError, JSONPathSyntaxError } from '@jsonpath/core';

import type { PathSegment } from '@jsonpath/core';
import type { Operation } from '../types';

export class DataMapPathError extends Error {
	readonly code: string;
	readonly path?: string;
	override readonly cause?: Error;

	constructor(
		message: string,
		options: {
			code: string;
			path?: string;
			cause?: Error;
		} = { code: 'PATH_ERROR' },
	) {
		super(message);
		this.name = 'DataMapPathError';
		this.code = options.code;
		this.path = options.path;
		this.cause = options.cause;

		Object.setPrototypeOf(this, new.target.prototype);
	}
}

function normalizeError(err: unknown, path?: string): DataMapPathError {
	if (err instanceof DataMapPathError) return err;

	if (err instanceof JSONPathSyntaxError) {
		return new DataMapPathError(`Invalid JSONPath syntax: ${err.message}`, {
			code: err.code,
			path: path ?? err.path,
			cause: err,
		});
	}

	if (err instanceof JSONPathError) {
		return new DataMapPathError(err.message, {
			code: err.code,
			path: path ?? err.path,
			cause: err,
		});
	}

	if (err instanceof Error) {
		return new DataMapPathError(err.message, {
			code: 'PATH_ERROR',
			path,
			cause: err,
		});
	}

	return new DataMapPathError(String(err), { code: 'PATH_ERROR', path });
}

function toPointerTokens(path: readonly PathSegment[]): string[] {
	return path.map((seg) => (typeof seg === 'number' ? String(seg) : seg));
}

export { compileQuery };

export function queryWithPointers(
	data: unknown,
	path: string,
): { pointers: string[]; values: unknown[] } {
	try {
		const result = jpQuery(data as any, path);
		return {
			pointers: result.pointerStrings(),
			values: result.values(),
		};
	} catch (err) {
		throw normalizeError(err, path);
	}
}

export function* streamQuery(
	data: unknown,
	path: string,
): Generator<{ pointer: string; value: unknown; root?: unknown }> {
	try {
		for (const node of jpStream(data as any, path)) {
			yield {
				pointer: new JSONPointer(toPointerTokens(node.path)).toPointer(),
				value: node.value,
				root: node.root,
			};
		}
	} catch (err) {
		throw normalizeError(err, path);
	}
}

export function resolvePointer<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	try {
		return new JSONPointer(pointer).resolve<T>(data);
	} catch (err) {
		throw normalizeError(err, pointer);
	}
}

export function pointerExists(data: unknown, pointer: string): boolean {
	try {
		return new JSONPointer(pointer).exists(data);
	} catch (err) {
		throw normalizeError(err, pointer);
	}
}

export function applyOperations<T>(
	target: T,
	ops: Operation[],
	options: { mutate?: boolean } = {},
): T {
	try {
		return applyPatch(target as any, ops as any, {
			mutate: options.mutate ?? false,
		}) as T;
	} catch (err) {
		throw normalizeError(err);
	}
}
```

#### Step 2.2 Add unit tests

- [ ] Create `packages/data-map/core/src/utils/jsonpath.spec.ts` with the exact contents below:

```ts
import { describe, expect, it } from 'vitest';

import {
	applyOperations,
	DataMapPathError,
	pointerExists,
	queryWithPointers,
	resolvePointer,
	streamQuery,
} from './jsonpath';

describe('utils/jsonpath', () => {
	it('queryWithPointers returns JSON Pointer strings + values', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const result = queryWithPointers(data, '$.users[*].name');
		expect(result.values).toEqual(['A', 'B']);
		expect(result.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});

	it('streamQuery yields pointer + value (+ root)', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const nodes = Array.from(streamQuery(data, '$.users[*].name'));
		expect(nodes.map((n) => n.pointer)).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
		expect(nodes.map((n) => n.value)).toEqual(['A', 'B']);
		expect(nodes.every((n) => n.root === data)).toBe(true);
	});

	it('resolvePointer resolves root and nested pointers', () => {
		const data: any = { a: { b: [1, 2] } };
		expect(resolvePointer(data, '')).toBe(data);
		expect(resolvePointer(data, '/a/b/1')).toBe(2);
	});

	it('pointerExists distinguishes missing vs present undefined', () => {
		const data: any = { a: { b: undefined }, arr: [undefined] };
		expect(resolvePointer(data, '/a/b')).toBeUndefined();
		expect(pointerExists(data, '/a/b')).toBe(true);
		expect(pointerExists(data, '/a/missing')).toBe(false);
		expect(pointerExists(data, '/arr/0')).toBe(true);
		expect(pointerExists(data, '/arr/1')).toBe(false);
	});

	it('applyOperations is immutable by default', () => {
		const target: any = { a: 1 };
		const next = applyOperations(target, [
			{ op: 'replace', path: '/a', value: 2 },
		]);
		expect(next).toEqual({ a: 2 });
		expect(target).toEqual({ a: 1 });
	});

	it('applyOperations supports mutate=true', () => {
		const target: any = { a: 1 };
		const next = applyOperations(
			target,
			[{ op: 'replace', path: '/a', value: 2 }],
			{ mutate: true },
		);
		expect(next).toBe(target);
		expect(target).toEqual({ a: 2 });
	});

	it('normalizes JSONPath syntax errors to DataMapPathError', () => {
		const data = { a: 1 };
		try {
			queryWithPointers(data, '$[');
			throw new Error('expected throw');
		} catch (err) {
			expect(err).toBeInstanceOf(DataMapPathError);
			const e = err as DataMapPathError;
			expect(e.code).toBe('SYNTAX_ERROR');
			expect(e.path).toBe('$[');
		}
	});

	it('normalizes pointer syntax errors to DataMapPathError', () => {
		const data = { a: 1 };
		try {
			pointerExists(data, 'not-a-pointer');
			throw new Error('expected throw');
		} catch (err) {
			expect(err).toBeInstanceOf(DataMapPathError);
			const e = err as DataMapPathError;
			expect(e.code).toBe('POINTER_ERROR');
			expect(e.path).toBe('not-a-pointer');
		}
	});
});
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @data-map/core test -- src/utils/jsonpath.spec.ts`
- [ ] `queryWithPointers()` returns pointer strings like `/users/0/name`.
- [ ] `pointerExists({ a: { b: undefined } }, '/a/b') === true`.

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @jsonpath wrapper utilities

- Add src/utils/jsonpath.ts wrapper (query, stream, pointer, patch)
- Add unit tests locking pointer-string and error normalization semantics

completes: step 2 of 9 for data-map-jsonpath-migration
```

---

### Step 3: Migrate `src/datamap.ts` resolve/query semantics

This step removes `json-p3` from DataMap itself and routes all JSONPath/Pointer operations through `src/utils/jsonpath.ts`.

#### Step 3.1 Update imports

- [ ] In `packages/data-map/core/src/datamap.ts`, replace the very first import:

```ts
import { jsonpath, JSONPointer } from 'json-p3';
```

- [ ] With this import block:

```ts
import {
	pointerExists,
	queryWithPointers,
	resolvePointer,
} from './utils/jsonpath';
```

#### Step 3.2 Update pointer resolution branch (strict-mode correctness)

- [ ] In `resolve(pathOrPointer: string, ...)`, update the `pathType === 'pointer'` branch so missing pointers are detected via `pointerExists()` (not by relying on thrown exceptions).

Replace the existing `try { ... } catch { ... }` pointer block with:

```ts
const pointerString = normalizePointerInput(pathOrPointer);
if (pointerString === '') {
	const value = cloneSnapshot(this._defs.applyGetter('', this._data, ctx));
	this._subs.scheduleNotify(
		'',
		'resolve',
		'on',
		value,
		undefined,
		undefined,
		pathOrPointer,
	);
	this._subs.scheduleNotify(
		'',
		'resolve',
		'after',
		value,
		undefined,
		undefined,
		pathOrPointer,
	);
	return [
		{
			pointer: '',
			value,
		},
	];
}

const resolved = resolvePointer(this._data, pointerString);
if (resolved === undefined && !pointerExists(this._data, pointerString)) {
	if (strict) throw new Error(`Pointer not found: ${pointerString}`);
	return [];
}

const value = cloneSnapshot(
	this._defs.applyGetter(pointerString, resolved, ctx),
);

this._subs.scheduleNotify(
	pointerString,
	'resolve',
	'on',
	value,
	undefined,
	undefined,
	pathOrPointer,
);
this._subs.scheduleNotify(
	pointerString,
	'resolve',
	'after',
	value,
	undefined,
	undefined,
	pathOrPointer,
);

return [
	{
		pointer: pointerString,
		value,
	},
];
```

#### Step 3.3 Update JSONPath resolution branch

- [ ] In `resolve()`, replace the JSONPath `jsonpath.query(...)` block with the `queryWithPointers(...)` wrapper.

Replace:

```ts
const nodes = jsonpath.query(pathOrPointer, this._data as any);
const pointers = nodes.pointers().map((p) => p.toString());
const values = nodes.values();
```

With:

```ts
const { pointers, values } = queryWithPointers(this._data, pathOrPointer);
```

Then update the surrounding `try/catch` to rethrow normalized errors in strict mode:

```ts
		} catch (err) {
			if (strict) {
				if (err instanceof Error) throw err;
				throw new Error(`Invalid JSONPath: ${pathOrPointer}`, { cause: err });
			}
			return [];
		}
```

#### Step 3.4 Fix internal “exists” helper in `_applyDefinitionDefaults`

Because `@jsonpath/pointer`’s `resolve()` does **not** throw on missing paths, update the local helper to use `pointerExists()`.

In `_applyDefinitionDefaults()`, replace:

```ts
const exists = (data: unknown, pointer: string): boolean => {
	if (pointer === '') return true;
	try {
		new JSONPointer(pointer).resolve(data as any);
		return true;
	} catch {
		return false;
	}
};
```

With:

```ts
const exists = (data: unknown, pointer: string): boolean => {
	if (pointer === '') return true;
	try {
		return pointerExists(data, pointer);
	} catch {
		return false;
	}
};
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] `packages/data-map/core/src/__tests__/spec-compliance.spec.ts` still passes REQ-004 “Path interchangeability”.
- [ ] Strict mode pointer-miss still throws (REQ-001/REQ-004 dependent).

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): migrate DataMap resolve to @jsonpath

- Replace json-p3 jsonpath.query with utils/queryWithPointers
- Fix pointer strict-mode missing detection using pointerExists
- Fix internal exists() logic in _applyDefinitionDefaults

completes: step 3 of 9 for data-map-jsonpath-migration
```

---

### Step 4: Migrate patch application (`src/patch/apply.ts`)

#### Step 4.1 Replace json-p3 patch apply

- [ ] Replace the entire contents of `packages/data-map/core/src/patch/apply.ts` with:

```ts
import type { Operation } from '../types';

import { applyOperations as applyPatchOperations } from '../utils/jsonpath';

export interface ApplyResult {
	nextData: unknown;
	affectedPointers: Set<string>;
	structuralPointers: Set<string>;
}

function parentPointer(pointer: string): string {
	if (pointer === '') return '';
	const idx = pointer.lastIndexOf('/');
	if (idx <= 0) return '';
	return pointer.slice(0, idx);
}

function isStructuralOp(op: Operation): boolean {
	return (
		op.op === 'add' ||
		op.op === 'remove' ||
		op.op === 'move' ||
		op.op === 'copy'
	);
}

export function applyOperations(
	currentData: unknown,
	ops: Operation[],
): ApplyResult {
	// @jsonpath/patch.applyPatch is immutable by default and already clones.
	// Keep DataMap immutability by returning the new object.
	const nextData = applyPatchOperations(currentData, ops, { mutate: false });

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

	return { nextData, affectedPointers, structuralPointers };
}
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Spec compliance REQ-002 patch tests still pass.

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): migrate patch apply to @jsonpath/patch

- Replace json-p3 jsonpatch.apply with @jsonpath-backed applyOperations
- Preserve DataMap immutability by using mutate:false

completes: step 4 of 9 for data-map-jsonpath-migration
```

---

### Step 5: Migrate patch builder module (`src/patch/builder.ts`)

#### Step 5.1 Replace json-p3 pointer usage

- [ ] Replace the entire contents of `packages/data-map/core/src/patch/builder.ts` with:

```ts
import type { Operation } from '../types';
import { resolvePointer, pointerExists } from '../utils/jsonpath';
import { parsePointerSegments, buildPointer } from '../utils/pointer';

function isIndexSegment(seg: string): boolean {
	return /^\d+$/.test(seg);
}

function inferContainerForNextSeg(nextSeg: string | undefined): unknown {
	if (nextSeg === undefined) return {};
	return isIndexSegment(nextSeg) ? [] : {};
}

function getAtPointer(data: unknown, pointer: string): unknown {
	return resolvePointer(data, pointer);
}

function existsAtPointer(data: unknown, pointer: string): boolean {
	try {
		return pointerExists(data, pointer);
	} catch {
		return false;
	}
}

/**
 * Creates intermediate containers so that the parent of target pointer exists.
 * Returns a list of JSON Patch operations needed to create those containers.
 */
export function ensureParentContainers(
	currentData: unknown,
	targetPointer: string,
): { ops: Operation[]; nextData: unknown } {
	const ops: Operation[] = [];
	const nextData = structuredClone(currentData);

	const segments = parsePointerSegments(targetPointer);
	if (segments.length === 0) {
		return { ops, nextData };
	}

	// Walk down until parent of last segment.
	for (let depth = 0; depth < segments.length - 1; depth++) {
		const parentPointer = buildPointer(segments.slice(0, depth));
		const seg = segments[depth]!;
		const childPointer = buildPointer(segments.slice(0, depth + 1));
		const nextSeg = segments[depth + 1];

		// If child already exists, continue.
		if (existsAtPointer(nextData, childPointer)) {
			continue;
		}

		// If we're setting a property on a missing parent, create it.
		const container = inferContainerForNextSeg(nextSeg);

		// Root-level property creation is still an add on childPointer.
		// We clone the container for the op so that subsequent mutations to nextData
		// (to build further ops) don't leak into this op's value.
		ops.push({
			op: 'add',
			path: childPointer,
			value: structuredClone(container),
		});

		// Apply the op to nextData by directly mutating through JSON Pointer.
		// (We keep this local to builder to avoid pulling in patch apply here.)
		const parentValue =
			parentPointer === '' ? nextData : getAtPointer(nextData, parentPointer);
		if (parentPointer === '') {
			if (Array.isArray(nextData) && isIndexSegment(seg)) {
				(nextData as unknown[])[Number(seg)] = container;
			} else if (typeof nextData === 'object' && nextData !== null) {
				(nextData as Record<string, unknown>)[seg] = container;
			}
		} else if (Array.isArray(parentValue) && isIndexSegment(seg)) {
			(parentValue as unknown[])[Number(seg)] = container;
		} else if (typeof parentValue === 'object' && parentValue !== null) {
			(parentValue as Record<string, unknown>)[seg] = container;
		}
	}

	return { ops, nextData };
}

export function buildSetPatch(
	currentData: unknown,
	targetPointer: string,
	value: unknown,
): Operation[] {
	const { ops: containerOps, nextData } = ensureParentContainers(
		currentData,
		targetPointer,
	);
	const exists = existsAtPointer(nextData, targetPointer);

	const finalOp: Operation = exists
		? { op: 'replace', path: targetPointer, value }
		: { op: 'add', path: targetPointer, value };

	return [...containerOps, finalOp];
}
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Array operations and set operations still generate valid patches.

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): migrate patch builder pointers to @jsonpath

- Replace json-p3 JSONPointer usage in patch/builder.ts
- Use utils/jsonpath resolvePointer + pointerExists for compatibility

completes: step 5 of 9 for data-map-jsonpath-migration
```

---

### Step 6: Migrate array patch module (`src/patch/array.ts`)

#### Step 6.1 Replace json-p3 pointer usage

- [ ] Replace the entire contents of `packages/data-map/core/src/patch/array.ts` with:

```ts
import type { Operation } from '../types';
import { resolvePointer, pointerExists } from '../utils/jsonpath';
import { buildSetPatch } from './builder';

function resolveArray(data: unknown, pointer: string): unknown[] {
	try {
		const v = resolvePointer<unknown>(data, pointer);
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

function existsPointer(data: unknown, pointer: string): boolean {
	try {
		return pointerExists(data, pointer);
	} catch {
		return false;
	}
}

function itemPointer(
	arrayPointer: string,
	index: number,
	length: number,
): string {
	const seg = index === length ? '-' : index.toString();
	return arrayPointer === '' ? `/${seg}` : `${arrayPointer}/${seg}`;
}

export function buildPushPatch(
	currentData: unknown,
	arrayPointer: string,
	items: unknown[],
): Operation[] {
	if (!existsPointer(currentData, arrayPointer)) {
		return items.length === 0
			? []
			: buildSetPatch(currentData, arrayPointer, [...items]);
	}
	const arr = resolveArray(currentData, arrayPointer);
	const ops: Operation[] = [];
	for (let i = 0; i < items.length; i++) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, arr.length + i, arr.length + i),
			value: items[i],
		});
	}
	return ops;
}

export function buildPopPatch(
	currentData: unknown,
	arrayPointer: string,
): { ops: Operation[]; value: unknown } {
	const arr = resolveArray(currentData, arrayPointer);
	if (arr.length === 0) return { ops: [], value: undefined };
	const value = arr[arr.length - 1];
	return {
		ops: [
			{
				op: 'remove',
				path: itemPointer(arrayPointer, arr.length - 1, arr.length),
			},
		],
		value,
	};
}

export function buildShiftPatch(
	currentData: unknown,
	arrayPointer: string,
): { ops: Operation[]; value: unknown } {
	const arr = resolveArray(currentData, arrayPointer);
	if (arr.length === 0) return { ops: [], value: undefined };
	return {
		ops: [{ op: 'remove', path: itemPointer(arrayPointer, 0, arr.length) }],
		value: arr[0],
	};
}

export function buildUnshiftPatch(
	currentData: unknown,
	arrayPointer: string,
	items: unknown[],
): Operation[] {
	if (!existsPointer(currentData, arrayPointer)) {
		return items.length === 0
			? []
			: buildSetPatch(currentData, arrayPointer, [...items]);
	}
	const arr = resolveArray(currentData, arrayPointer);
	const ops: Operation[] = [];
	// Insert at 0 in reverse order so final order matches caller.
	for (let i = items.length - 1; i >= 0; i--) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, 0, arr.length + (items.length - 1 - i)),
			value: items[i],
		});
	}
	return ops;
}

export function buildSplicePatch(
	currentData: unknown,
	arrayPointer: string,
	start: number,
	deleteCount: number,
	items: unknown[],
): { ops: Operation[]; removed: unknown[] } {
	if (!existsPointer(currentData, arrayPointer)) {
		return {
			ops:
				items.length === 0
					? []
					: buildSetPatch(currentData, arrayPointer, [...items]),
			removed: [],
		};
	}
	const arr = resolveArray(currentData, arrayPointer);
	const removed = arr.slice(start, start + deleteCount);
	const ops: Operation[] = [];

	let currentLength = arr.length;

	// Remove `deleteCount` items at `start`.
	for (let i = 0; i < deleteCount; i++) {
		if (start >= 0 && start < currentLength) {
			ops.push({
				op: 'remove',
				path: itemPointer(arrayPointer, start, currentLength),
			});
			currentLength--;
		}
	}

	// Insert new items starting at `start`.
	for (let i = 0; i < items.length; i++) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, start + i, currentLength),
			value: items[i],
		});
		currentLength++;
	}

	return { ops, removed };
}

export function buildSortPatch(
	currentData: unknown,
	arrayPointer: string,
	compareFn?: (a: unknown, b: unknown) => number,
): Operation[] {
	const arr = resolveArray(currentData, arrayPointer);
	const nextArr = [...arr].sort(compareFn as any);
	// Sorting is a whole-array transformation; represent as a replace.
	return [{ op: 'replace', path: arrayPointer, value: nextArr }];
}

export function buildShufflePatch(
	currentData: unknown,
	arrayPointer: string,
	rng: () => number = Math.random,
): Operation[] {
	const arr = resolveArray(currentData, arrayPointer);
	const nextArr = [...arr];
	for (let i = nextArr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[nextArr[i], nextArr[j]] = [nextArr[j], nextArr[i]];
	}
	// Shuffling is a whole-array transformation; represent as a replace.
	return [{ op: 'replace', path: arrayPointer, value: nextArr }];
}
```

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Spec compliance REQ-002 patch tests still pass.

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): migrate array patch pointers to @jsonpath

- Replace json-p3 JSONPointer usage in patch/array.ts
- Use utils/jsonpath resolvePointer + pointerExists for compatibility

completes: step 6 of 9 for data-map-jsonpath-migration
```

---

### Step 7: Update tests + remove json-p3 leftovers

#### Step 7.1 Remove json-p3 parity test

- [ ] Delete `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts` entirely.

#### Step 7.2 Update spec compliance wording

- [ ] In `packages/data-map/core/src/__tests__/spec-compliance.spec.ts`, rename the REQ-001 describe block from json-p3 wording:

Replace:

```ts
describe('REQ-001: json-p3 JSONPath behavior', () => {
```

With:

```ts
describe('REQ-001: @jsonpath/jsonpath JSONPath behavior', () => {
```

And replace:

```ts
it('uses json-p3 semantics for JSONPath queries', () => {
```

With:

```ts
it('uses @jsonpath/jsonpath semantics for JSONPath queries', () => {
```

#### Step 7.3 Remove compat alias (optional but recommended)

Once `@jsonpath/compat-json-p3` is removed from deps, remove its alias entry.

- [ ] In `packages/data-map/core/vitest.config.ts`, remove the entire alias entry for `@jsonpath/compat-json-p3`:

```ts
'@jsonpath/compat-json-p3': path.resolve(
	__dirname,
	'../../jsonpath/compat-json-p3/src/index.ts',
),
```

#### Step 7.4 Add DataMap-level strict invalid JSONPath test

- [ ] In `packages/data-map/core/src/__tests__/errors.spec.ts`, add this import:

```ts
import { DataMapPathError } from '../utils/jsonpath';
```

- [ ] Then add this test near the other negative cases:

```ts
it('throws DataMapPathError for invalid JSONPath in strict mode', () => {
	const dm = new DataMap({ a: 1 }, { strict: true });
	expect(() => dm.get('$.a[')).toThrow(DataMapPathError);
});
```

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] No remaining `json-p3` or `@jsonpath/compat-json-p3` imports in `packages/data-map/core/src/**`.

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
test(data-map): remove json-p3 parity tests and update compliance

- Delete jsonpath-integration.spec.ts (json-p3 parity)
- Update compliance wording away from json-p3
- Add strict invalid JSONPath test for DataMapPathError
- Remove vitest alias for compat-json-p3

completes: step 7 of 9 for data-map-jsonpath-migration
```

---

### Step 8: Performance optimization — subscription query precompilation

This adds an opt-out knob (`noPrecompile`) and caches a compiled JSONPath query for subscriptions using JSONPath (not pointers). It’s enabled by default.

#### Step 8.1 Update subscription config type

- [ ] In `packages/data-map/core/src/subscription/types.ts`, update `SubscriptionConfig` to include `noPrecompile?: boolean`.

Replace the interface with:

```ts
export interface SubscriptionConfig<T, Ctx = unknown> {
	path: string;
	before?: SubscriptionEvent | SubscriptionEvent[];
	on?: SubscriptionEvent | SubscriptionEvent[];
	after?: SubscriptionEvent | SubscriptionEvent[];
	fn: SubscriptionHandler<T, Ctx>;

	/**
	 * Disable JSONPath query pre-compilation for this subscription.
	 * Pre-compilation is enabled by default for JSONPath subscriptions.
	 * @default false
	 */
	noPrecompile?: boolean;
}
```

#### Step 8.2 Cache compiled query in SubscriptionManager

- [ ] In `packages/data-map/core/src/subscription/manager.ts`:
  - [ ] Import `compileQuery` from `../utils/jsonpath`.
  - [ ] Store a compiled query on internal subscription records.
  - [ ] Use the compiled query (when present) to expand pointers, falling back to `compiledPattern.expand(data)`.

1. Add this import near other imports:

```ts
import { compileQuery } from '../utils/jsonpath';
```

2. Extend `InternalSubscription`:

```ts
type CompiledQuery = ReturnType<typeof compileQuery>;

interface InternalSubscription<T, Ctx> {
	id: string;
	config: SubscriptionConfig<T, Ctx>;
	compiledPattern: CompiledPathPattern | null;
	expandedPaths: Set<string>;
	isDynamic: boolean;
	compiledQuery?: CompiledQuery;
}
```

3. In `register(...)`, after `compiledPattern = compilePathPattern(config.path)`, add:

```ts
const compiledQuery =
	pathType === 'jsonpath' && !config.noPrecompile
		? compileQuery(config.path)
		: undefined;
```

Then replace:

```ts
const pointers = compiledPattern.expand(data);
```

With:

```ts
const pointers = compiledQuery
	? compiledQuery(data).pointerStrings()
	: compiledPattern.expand(data);
```

And include `compiledQuery` in the `internal` object:

```ts
const internal: InternalSubscription<T, Ctx> = {
	id,
	config,
	compiledPattern,
	expandedPaths,
	isDynamic,
	compiledQuery,
};
```

4. In `handleStructuralChange(...)` and `handleFilterCriteriaChange(...)`, replace:

```ts
const newPointers = sub.compiledPattern.expand(data);
```

With:

```ts
const newPointers = sub.compiledQuery
	? sub.compiledQuery(data).pointerStrings()
	: sub.compiledPattern.expand(data);
```

#### Step 8.3 Tests

- [ ] In `packages/data-map/core/src/__tests__/integration.spec.ts`, add a coverage test that `noPrecompile: true` doesn’t change behavior.

Add this test near the existing “combines JSONPath queries with subscriptions” test:

```ts
it('subscription noPrecompile=true still works for JSONPath subscriptions', async () => {
	const dm = new DataMap({
		users: [
			{ name: 'Alice', active: true },
			{ name: 'Bob', active: false },
		],
	});

	const activeNames: string[] = [];
	dm.subscribe({
		path: '$.users[?(@.active == true)].name',
		noPrecompile: true,
		after: 'set',
		fn: (v) => activeNames.push(String(v)),
	});

	dm.set('/users/0/name', 'Alicia');
	await flushMicrotasks();

	expect(activeNames).toContain('Alicia');
});
```

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Subscription tests still pass.

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): precompile subscription JSONPath queries by default

- Add SubscriptionConfig.noPrecompile opt-out
- Cache compiled JSONPath query for pointer expansion
- Add regression test for noPrecompile=true behavior

completes: step 8 of 9 for data-map-jsonpath-migration
```

---

### Step 9: Expose streaming resolve API (`resolveStream`)

#### Step 9.1 Add `resolveStream()` to DataMap

- [ ] In `packages/data-map/core/src/datamap.ts`, add `streamQuery` import.

Update the utils import block to include it:

```ts
import {
	pointerExists,
	queryWithPointers,
	resolvePointer,
	streamQuery,
} from './utils/jsonpath';
```

- [ ] Add this method to the `DataMap` class (place it immediately after `resolve(...)`):

```ts
	*resolveStream(
		pathOrPointer: string,
		options: CallOptions = {},
	): Generator<ResolvedMatch> {
		const strict = options.strict ?? this._strict;
		const pathType = detectPathType(pathOrPointer);
		const ctx = this._context as any;

		if (pathType !== 'jsonpath') {
			const matches = this.resolve(pathOrPointer, options);
			for (const match of matches) yield match;
			return;
		}

		try {
			for (const node of streamQuery(this._data, pathOrPointer)) {
				const pointer = node.pointer;
				const value = cloneSnapshot(
					this._defs.applyGetter(pointer, node.value, ctx),
				);

				this._subs.scheduleNotify(
					pointer,
					'resolve',
					'on',
					value,
					undefined,
					undefined,
					pathOrPointer,
				);
				this._subs.scheduleNotify(
					pointer,
					'resolve',
					'after',
					value,
					undefined,
					undefined,
					pathOrPointer,
				);

				yield { pointer, value };
			}
		} catch (err) {
			if (strict) {
				if (err instanceof Error) throw err;
				throw new Error(`Invalid JSONPath: ${pathOrPointer}`, { cause: err });
			}
			return;
		}
	}
```

#### Step 9.2 Tests

- [ ] In `packages/data-map/core/src/__tests__/integration.spec.ts`, add a test ensuring streaming matches resolve.

Add:

```ts
it('resolveStream produces the same matches as resolve for JSONPath', () => {
	const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
	const fromResolve = dm.resolve('$.users[*].name');
	const fromStream = Array.from(dm.resolveStream('$.users[*].name'));
	expect(fromStream).toEqual(fromResolve);
});
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @data-map/core test`
- [ ] Streaming test passes and `resolveStream` returns pointer strings.

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add resolveStream for streaming JSONPath resolution

- Add DataMap.resolveStream generator
- Add test asserting resolveStream parity with resolve

completes: step 9 of 9 for data-map-jsonpath-migration
```

---

## Final full-suite verification

- [x] `pnpm --filter @data-map/core type-check` ✅ PASSED (0 errors)
- [x] `pnpm --filter @data-map/core test` ✅ PASSED (214/214 tests)
- [x] `pnpm --filter @data-map/core test:coverage` ✅ PASSED (91.73% statements, 97.09% functions)
- [x] Confirm no `json-p3` or `@jsonpath/compat-json-p3` in `packages/data-map/core/package.json`. ✅ VERIFIED
- [x] Fixed missing `@jsonpath/core` dependency in package.json ✅ COMMITTED

## Notes

- `@jsonpath/patch.applyPatch` clones internally; DataMap patch apply should not `structuredClone` first.
- Pointer existence must use `JSONPointer.exists` (via `pointerExists`) to distinguish missing vs present `undefined`.
