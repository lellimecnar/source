# DataMap - High-Performance Reactive Data Store (@data-map/core)

**Branch:** `feat/data-map-core`

## Goal

Implement the core `@data-map/core` package providing a reactive state store with:

- JSON Pointer + JSONPath read APIs (via `json-p3` only)
- RFC 6902 JSON Patch mutation APIs
- Subscription system (static pointers + dynamic JSONPath)
- Batch/transaction support
- Computed definitions (getter/setter transforms)

## Prerequisites

Make sure you are currently on the `feat/data-map-core` branch.

---

## Step 1: Package scaffolding & path detection

- [x] Update `pnpm-workspace.yaml` to include `packages/data-map/*`
- [x] Create `packages/data-map/core` scaffolding
- [x] Implement `detectPathType()` exactly per spec §4.3
- [x] Implement JSON Pointer helpers + tests

Copy and paste into `pnpm-workspace.yaml`:

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'packages/card-stack/*'
  - 'packages/ui-spec/*'
  - 'packages/data-map/*'
```

Copy and paste into `packages/data-map/core/package.json`:

```json
{
	"name": "@data-map/core",
	"version": "0.1.0",
	"description": "DataMap core reactive store",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"json-p3": "^2.2.2"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vitest": "^4.0.16"
	}
}
```

Copy and paste into `packages/data-map/core/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"paths": {
			"*": ["./*"],
		},
		"module": "ESNext",
		"moduleResolution": "Bundler",
	},
	"include": ["src/**/*.ts"],
	"exclude": [
		"dist",
		"build",
		"node_modules",
		"src/**/*.spec.ts",
		"src/**/__tests__/**",
	],
}
```

Copy and paste into `packages/data-map/core/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Copy and paste into `packages/data-map/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

Copy and paste into `packages/data-map/core/AGENTS.md`:

```md
# AGENTS.md - @data-map/core

Core DataMap implementation.

- Build: `pnpm turbo -F @data-map/core build`
- Test: `pnpm turbo -F @data-map/core test`
- Type-check: `pnpm turbo -F @data-map/core type-check`

This package MUST use `json-p3` as the sole JSONPath/Pointer/Patch engine.
```

Copy and paste into `packages/data-map/core/src/index.ts`:

```ts
export type { PathType } from './types';
export { detectPathType } from './path/detect';

export {
	buildPointer,
	escapePointerSegment,
	parsePointerSegments,
	unescapePointerSegment,
} from './utils/pointer';
```

Copy and paste into `packages/data-map/core/src/types.ts`:

```ts
export type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';
```

Copy and paste into `packages/data-map/core/src/path/detect.ts`:

```ts
import type { PathType } from '../types';

/**
 * Spec §4.3 (must match exactly)
 */
export function detectPathType(input: string): PathType {
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
```

Copy and paste into `packages/data-map/core/src/path/detect.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { detectPathType } from './detect';

describe('detectPathType', () => {
	it('detects pointer', () => {
		expect(detectPathType('')).toBe('pointer');
		expect(detectPathType('/users/0/name')).toBe('pointer');
		expect(detectPathType('#/users')).toBe('pointer');
		expect(detectPathType('#')).toBe('pointer');
	});

	it('detects relative-pointer', () => {
		expect(detectPathType('0')).toBe('relative-pointer');
		expect(detectPathType('1/foo')).toBe('relative-pointer');
		expect(detectPathType('2#')).toBe('relative-pointer');
	});

	it('detects jsonpath', () => {
		expect(detectPathType('$')).toBe('jsonpath');
		expect(detectPathType('$.users[*]')).toBe('jsonpath');
		expect(detectPathType('$..name')).toBe('jsonpath');
	});
});
```

Copy and paste into `packages/data-map/core/src/utils/pointer.ts`:

```ts
export function escapePointerSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function unescapePointerSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}

export function parsePointerSegments(pointerString: string): string[] {
	if (pointerString === '' || pointerString === '#') {
		return [];
	}

	let raw = pointerString;
	if (raw.startsWith('#/')) {
		raw = raw.slice(1);
	}

	if (!raw.startsWith('/')) {
		throw new Error(`Invalid JSON Pointer: "${pointerString}"`);
	}

	const encodedSegments = raw.slice(1).split('/');
	return encodedSegments.map(unescapePointerSegment);
}

export function buildPointer(segments: string[]): string {
	if (segments.length === 0) return '';
	return `/${segments.map(escapePointerSegment).join('/')}`;
}
```

Copy and paste into `packages/data-map/core/src/utils/pointer.spec.ts`:

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

### Step 1 Verification Checklist

- [x] `pnpm install`
- [x] `pnpm turbo -F @data-map/core test`
- [x] `pnpm turbo -F @data-map/core build`

## Step 1 STOP & COMMIT

```txt
feat(data-map): scaffold @data-map/core

- Add workspace registration for packages/data-map/*
- Scaffold @data-map/core (Vite + Vitest)
- Implement detectPathType per spec §4.3
- Add JSON Pointer helpers + tests

completes: step 1 of 12 for DataMap Core
```

---

## Step 2: Core read API with json-p3 integration

- [x] Add `DataMap` constructor + read APIs: `get`, `getAll`, `resolve`
- [x] Enforce strict/non-strict behavior
- [x] Return immutable snapshots (structuredClone)
- [x] Add unit tests

Copy and paste into `packages/data-map/core/src/types.ts` (replace entire file):

```ts
export type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';

export interface CallOptions {
	strict?: boolean;
}

export interface ResolvedMatch {
	readonly pointer: string;
	readonly value: unknown;
	readonly readOnly?: boolean;
	readonly lastUpdated?: number;
	readonly previousValue?: unknown;
	readonly type?: string;
}

export interface DataMapOptions<T = unknown, Ctx = unknown> {
	strict?: boolean;
	context?: Ctx;
}
```

Copy and paste into `packages/data-map/core/src/index.ts` (replace entire file):

```ts
export type {
	CallOptions,
	DataMapOptions,
	PathType,
	ResolvedMatch,
} from './types';

export { detectPathType } from './path/detect';

export {
	buildPointer,
	escapePointerSegment,
	parsePointerSegments,
	unescapePointerSegment,
} from './utils/pointer';

export { DataMap } from './datamap';
```

Copy and paste into `packages/data-map/core/src/datamap.ts`:

```ts
import { jsonpath, JSONPointer } from 'json-p3';

import { detectPathType } from './path/detect';
import type { CallOptions, DataMapOptions, ResolvedMatch } from './types';

function normalizePointerInput(input: string): string {
	if (input === '#') return '';
	if (input.startsWith('#/')) return input.slice(1);
	return input;
}

function cloneSnapshot<T>(value: T): T {
	return structuredClone(value);
}

export class DataMap<T = unknown, Ctx = unknown> {
	private _data: T;
	private readonly _strict: boolean;
	private readonly _context: Ctx | undefined;

	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {}) {
		this._strict = options.strict ?? false;
		this._context = options.context;
		this._data = cloneSnapshot(initialValue);
	}

	get context(): Ctx | undefined {
		return this._context;
	}

	getSnapshot(): T {
		return cloneSnapshot(this._data);
	}

	resolve(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[] {
		const strict = options.strict ?? this._strict;
		const pathType = detectPathType(pathOrPointer);

		if (pathType === 'relative-pointer') {
			if (strict) throw new Error('Unsupported path type: relative-pointer');
			return [];
		}

		if (pathType === 'pointer') {
			const pointerString = normalizePointerInput(pathOrPointer);
			if (pointerString === '') {
				return [{ pointer: '', value: cloneSnapshot(this._data) }];
			}

			try {
				const pointer = new JSONPointer(pointerString);
				const resolved = pointer.resolve(this._data as unknown);
				return [{ pointer: pointerString, value: cloneSnapshot(resolved) }];
			} catch {
				if (strict) throw new Error(`Pointer not found: ${pointerString}`);
				return [];
			}
		}

		try {
			const nodes = jsonpath.query(pathOrPointer, this._data as unknown);
			const pointers = nodes.pointers().map((p) => p.toString());
			const values = nodes.values();
			return pointers.map((pointer, idx) => ({
				pointer,
				value: cloneSnapshot(values[idx]),
			}));
		} catch {
			if (strict) throw new Error(`Invalid JSONPath: ${pathOrPointer}`);
			return [];
		}
	}

	get(pathOrPointer: string, options: CallOptions = {}): unknown {
		return this.resolve(pathOrPointer, options)[0]?.value;
	}

	getAll(pathOrPointer: string, options: CallOptions = {}): unknown[] {
		return this.resolve(pathOrPointer, options).map((m) => m.value);
	}
}
```

Copy and paste into `packages/data-map/core/src/datamap.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from './datamap';

describe('DataMap (read API)', () => {
	it('constructor clones initial value', () => {
		const initial = { users: [{ name: 'A' }] };
		const dm = new DataMap(initial);

		const root = dm.get('') as typeof initial;
		expect(root).toEqual(initial);
		expect(root).not.toBe(initial);

		(root.users[0] as any).name = 'MUTATED';
		expect(dm.get('/users/0/name')).toBe('A');
	});

	it('get() resolves JSON Pointer', () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		expect(dm.get('/users/0/name')).toBe('A');
	});

	it('get() resolves JSONPath (first match)', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		expect(dm.get('$.users[*].name')).toBe('A');
	});

	it('getAll() resolves JSONPath (all matches)', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
	});

	it('resolve() returns pointers and values', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		const matches = dm.resolve('$.users[*].name');
		expect(matches.map((m) => m.pointer)).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
		expect(matches.map((m) => m.value)).toEqual(['A', 'B']);
	});

	it('strict: missing pointer throws', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('/missing')).toThrow('Pointer not found');
	});

	it('non-strict: missing pointer returns undefined/[]', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.get('/missing')).toBeUndefined();
		expect(dm.getAll('/missing')).toEqual([]);
	});

	it('strict: invalid jsonpath throws', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.getAll('$..[')).toThrow('Invalid JSONPath');
	});

	it('non-strict: invalid jsonpath returns empty', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.resolve('$..[')).toEqual([]);
	});

	it('relative-pointer unsupported', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.resolve('1/foo')).toEqual([]);
		expect(() =>
			new DataMap({ a: 1 }, { strict: true }).resolve('1/foo'),
		).toThrow('Unsupported path type: relative-pointer');
	});
});
```

### Step 2 Verification Checklist

- [x] `pnpm turbo -F @data-map/core test`
- [x] `pnpm turbo -F @data-map/core build`

## Step 2 STOP & COMMIT

```txt
feat(data-map): implement core read API

- Add DataMap constructor with strict/non-strict options
- Implement get/getAll/resolve via json-p3 JSONPath/Pointer
- Return immutable snapshots via structuredClone
- Add unit tests for strict/non-strict behavior

completes: step 2 of 12 for DataMap Core
```

---

## Step 3: Patch building & core write API

- [x] Implement patch generation and patch application helpers
- [x] Extend `DataMap` with write APIs: `set`, `setAll`, `map`, `patch`
- [x] Implement `.toPatch()` variants for each write API
- [x] Ensure intermediate container creation per spec
- [x] Add unit tests for patch generation + application

### packages/data-map/core/src/types.ts

Copy and paste into `packages/data-map/core/src/types.ts` (replace entire file):

```ts
export type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';

export interface CallOptions {
	strict?: boolean;
}

export type Operation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

export interface ResolvedMatch {
	readonly pointer: string;
	readonly value: unknown;
	readonly readOnly?: boolean;
	readonly lastUpdated?: number;
	readonly previousValue?: unknown;
	readonly type?: string;
}

export interface DataMapOptions<T = unknown, Ctx = unknown> {
	strict?: boolean;
	context?: Ctx;
}
```

### packages/data-map/core/src/patch/builder.ts

Copy and paste into `packages/data-map/core/src/patch/builder.ts`:

```ts
import { JSONPointer } from 'json-p3';

import type { Operation } from '../types';
import { parsePointerSegments, buildPointer } from '../utils/pointer';

function isIndexSegment(seg: string): boolean {
	return /^\d+$/.test(seg);
}

function inferContainerForNextSeg(nextSeg: string | undefined): unknown {
	if (nextSeg === undefined) return {};
	return isIndexSegment(nextSeg) ? [] : {};
}

function getAtPointer(data: unknown, pointer: string): unknown {
	return new JSONPointer(pointer).resolve(data as unknown);
}

function existsAtPointer(data: unknown, pointer: string): boolean {
	try {
		return new JSONPointer(pointer).exists(data as unknown);
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
		const seg = segments[depth];
		const childPointer = buildPointer(segments.slice(0, depth + 1));
		const nextSeg = segments[depth + 1];

		// If child already exists, continue.
		if (existsAtPointer(nextData, childPointer)) {
			continue;
		}

		// If we're setting a property on a missing parent, create it.
		const container = inferContainerForNextSeg(nextSeg);

		// Root-level property creation is still an add on childPointer.
		ops.push({ op: 'add', path: childPointer, value: container });

		// Apply the op to nextData by directly mutating through JSON Pointer.
		// (We keep this local to builder to avoid pulling in jsonpatch here.)
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

### packages/data-map/core/src/patch/builder.spec.ts

Copy and paste into `packages/data-map/core/src/patch/builder.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildSetPatch } from './builder';

describe('patch builder', () => {
	it('generates replace when path exists', () => {
		const ops = buildSetPatch({ a: { b: 1 } }, '/a/b', 2);
		expect(ops).toEqual([{ op: 'replace', path: '/a/b', value: 2 }]);
	});

	it('generates add with intermediate containers', () => {
		const ops = buildSetPatch({}, '/a/b', 1);
		expect(ops).toEqual([
			{ op: 'add', path: '/a', value: {} },
			{ op: 'add', path: '/a/b', value: 1 },
		]);
	});

	it('infers arrays for numeric segments', () => {
		const ops = buildSetPatch({}, '/items/0/name', 'x');
		expect(ops[0]).toEqual({ op: 'add', path: '/items', value: [] });
		expect(ops[1]).toEqual({ op: 'add', path: '/items/0', value: {} });
		expect(ops[2]).toEqual({ op: 'add', path: '/items/0/name', value: 'x' });
	});
});
```

### packages/data-map/core/src/patch/apply.ts

Copy and paste into `packages/data-map/core/src/patch/apply.ts`:

```ts
import { jsonpatch } from 'json-p3';

import type { Operation } from '../types';

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
	const working = structuredClone(currentData);
	jsonpatch.apply(ops as any, working as any);

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

	return { nextData: working, affectedPointers, structuralPointers };
}
```

### packages/data-map/core/src/patch/apply.spec.ts

Copy and paste into `packages/data-map/core/src/patch/apply.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { applyOperations } from './apply';

describe('applyOperations', () => {
	it('applies operations to cloned data', () => {
		const input = { a: { b: 1 } };
		const res = applyOperations(input, [
			{ op: 'replace', path: '/a/b', value: 2 },
		]);
		expect(res.nextData).toEqual({ a: { b: 2 } });
		expect(res.nextData).not.toBe(input);
	});

	it('computes affected pointers', () => {
		const res = applyOperations({ a: { b: 1 } }, [
			{ op: 'replace', path: '/a/b', value: 2 },
			{ op: 'add', path: '/a/c', value: 3 },
		]);
		expect([...res.affectedPointers].sort()).toEqual(['/a/b', '/a/c']);
		expect([...res.structuralPointers]).toContain('/a');
	});
});
```

### packages/data-map/core/src/datamap.ts

Copy and paste into `packages/data-map/core/src/datamap.ts` (replace entire file):

```ts
import { jsonpath, JSONPointer } from 'json-p3';

import { detectPathType } from './path/detect';
import { applyOperations } from './patch/apply';
import { buildSetPatch } from './patch/builder';
import type {
	CallOptions,
	DataMapOptions,
	Operation,
	ResolvedMatch,
} from './types';

function normalizePointerInput(input: string): string {
	if (input === '#') return '';
	if (input.startsWith('#/')) return input.slice(1);
	return input;
}

function cloneSnapshot<T>(value: T): T {
	return structuredClone(value);
}

export class DataMap<T = unknown, Ctx = unknown> {
	private _data: T;
	private readonly _strict: boolean;
	private readonly _context: Ctx | undefined;

	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {}) {
		this._strict = options.strict ?? false;
		this._context = options.context;
		this._data = cloneSnapshot(initialValue);
	}

	get context(): Ctx | undefined {
		return this._context;
	}

	toJSON(): T {
		return cloneSnapshot(this._data);
	}

	getSnapshot(): T {
		return cloneSnapshot(this._data);
	}

	resolve(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[] {
		const strict = options.strict ?? this._strict;
		const pathType = detectPathType(pathOrPointer);

		if (pathType === 'relative-pointer') {
			if (strict) throw new Error('Unsupported path type: relative-pointer');
			return [];
		}

		if (pathType === 'pointer') {
			const pointerString = normalizePointerInput(pathOrPointer);
			if (pointerString === '') {
				return [{ pointer: '', value: cloneSnapshot(this._data) }];
			}

			try {
				const pointer = new JSONPointer(pointerString);
				const resolved = pointer.resolve(this._data as unknown);
				return [{ pointer: pointerString, value: cloneSnapshot(resolved) }];
			} catch {
				if (strict) throw new Error(`Pointer not found: ${pointerString}`);
				return [];
			}
		}

		try {
			const nodes = jsonpath.query(pathOrPointer, this._data as unknown);
			const pointers = nodes.pointers().map((p) => p.toString());
			const values = nodes.values();
			return pointers.map((pointer, idx) => ({
				pointer,
				value: cloneSnapshot(values[idx]),
			}));
		} catch {
			if (strict) throw new Error(`Invalid JSONPath: ${pathOrPointer}`);
			return [];
		}
	}

	get(pathOrPointer: string, options: CallOptions = {}): unknown {
		return this.resolve(pathOrPointer, options)[0]?.value;
	}

	getAll(pathOrPointer: string, options: CallOptions = {}): unknown[] {
		return this.resolve(pathOrPointer, options).map((m) => m.value);
	}

	/**
	 * Write API (spec §4.6)
	 */
	readonly set = Object.assign(
		(
			pathOrPointer: string,
			value: unknown | ((current: unknown) => unknown),
			options: CallOptions = {},
		) => {
			const strict = options.strict ?? this._strict;
			const matches = this.resolve(pathOrPointer, { strict });
			const targetPointer = matches[0]?.pointer;

			// If pointer or singular JSONPath resolved, use it; otherwise if unresolved and strict, throw.
			if (!targetPointer) {
				const pathType = detectPathType(pathOrPointer);
				if (pathType === 'pointer') {
					const pointerString = normalizePointerInput(pathOrPointer);
					const current = undefined;
					const nextValue =
						typeof value === 'function' ? (value as any)(current) : value;
					const ops = buildSetPatch(this._data, pointerString, nextValue);
					this.patch(ops, { strict });
					return this;
				}
				if (strict) throw new Error('No matches for set()');
				return this;
			}

			const current = matches[0]?.value;
			const nextValue =
				typeof value === 'function' ? (value as any)(current) : value;
			const ops = buildSetPatch(this._data, targetPointer, nextValue);
			this.patch(ops, { strict });
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				value: unknown,
				options: CallOptions = {},
			): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				const targetPointer = matches[0]?.pointer;
				if (!targetPointer) {
					const pathType = detectPathType(pathOrPointer);
					if (pathType === 'pointer') {
						const pointerString = normalizePointerInput(pathOrPointer);
						return buildSetPatch(this._data, pointerString, value);
					}
					if (strict) throw new Error('No matches for set.toPatch()');
					return [];
				}
				return buildSetPatch(this._data, targetPointer, value);
			},
		},
	);

	readonly setAll = Object.assign(
		(
			pathOrPointer: string,
			value: unknown | ((current: unknown) => unknown),
			options: CallOptions = {},
		) => {
			const ops = this.setAll.toPatch(pathOrPointer, value as any, options);
			if (ops.length === 0) return this;
			this.patch(ops, options);
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				value: unknown | ((current: unknown) => unknown),
				options: CallOptions = {},
			): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				if (matches.length === 0) {
					const pathType = detectPathType(pathOrPointer);
					if (pathType === 'pointer') {
						const pointerString = normalizePointerInput(pathOrPointer);
						const current = undefined;
						const nextValue =
							typeof value === 'function' ? (value as any)(current) : value;
						return buildSetPatch(this._data, pointerString, nextValue);
					}
					if (strict) throw new Error('No matches for setAll.toPatch()');
					return [];
				}

				const ops: Operation[] = [];
				for (const m of matches) {
					const nextValue =
						typeof value === 'function' ? (value as any)(m.value) : value;
					ops.push(...buildSetPatch(this._data, m.pointer, nextValue));
				}
				return ops;
			},
		},
	);

	readonly map = Object.assign(
		(
			pathOrPointer: string,
			mapperFn: (value: unknown, pointer: string) => unknown,
			options: CallOptions = {},
		) => {
			const ops = this.map.toPatch(pathOrPointer, mapperFn, options);
			if (ops.length === 0) return this;
			this.patch(ops, options);
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				mapperFn: (value: unknown, pointer: string) => unknown,
				options: CallOptions = {},
			): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				if (matches.length === 0) {
					if (strict) throw new Error('No matches for map.toPatch()');
					return [];
				}
				const ops: Operation[] = [];
				for (const m of matches) {
					ops.push(
						...buildSetPatch(
							this._data,
							m.pointer,
							mapperFn(m.value, m.pointer),
						),
					);
				}
				return ops;
			},
		},
	);

	readonly patch = Object.assign(
		(ops: Operation[], options: CallOptions = {}) => {
			const strict = options.strict ?? this._strict;
			try {
				const { nextData } = applyOperations(this._data, ops);
				this._data = nextData as T;
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
}
```

### packages/data-map/core/src/datamap.spec.ts

Copy and paste into `packages/data-map/core/src/datamap.spec.ts` (replace entire file):

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from './datamap';

describe('DataMap (read + write API)', () => {
	it('constructor clones initial value', () => {
		const initial = { users: [{ name: 'A' }] };
		const dm = new DataMap(initial);

		const root = dm.get('') as typeof initial;
		expect(root).toEqual(initial);
		expect(root).not.toBe(initial);

		(root.users[0] as any).name = 'MUTATED';
		expect(dm.get('/users/0/name')).toBe('A');
	});

	it('get() resolves JSON Pointer', () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		expect(dm.get('/users/0/name')).toBe('A');
	});

	it('getAll() resolves JSONPath (all matches)', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
	});

	it('resolve() returns pointers and values', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		const matches = dm.resolve('$.users[*].name');
		expect(matches.map((m) => m.pointer)).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
		expect(matches.map((m) => m.value)).toEqual(['A', 'B']);
	});

	it('set() replaces existing value', () => {
		const dm = new DataMap({ a: { b: 1 } });
		dm.set('/a/b', 2);
		expect(dm.get('/a/b')).toBe(2);
	});

	it('set() creates intermediate containers', () => {
		const dm = new DataMap({});
		dm.set('/a/b/c', 1);
		expect(dm.get('/a/b/c')).toBe(1);
	});

	it('setAll() updates all matches', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		dm.setAll('$.users[*].name', 'X');
		expect(dm.getAll('$.users[*].name')).toEqual(['X', 'X']);
	});

	it('map() transforms matches', () => {
		const dm = new DataMap({ nums: [1, 2, 3] });
		dm.map('$.nums[*]', (v) => (v as number) * 2);
		expect(dm.getAll('$.nums[*]')).toEqual([2, 4, 6]);
	});

	it('toPatch variants return ops without applying', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const ops = dm.set.toPatch('/a/b', 9);
		expect(dm.get('/a/b')).toBe(1);
		expect(ops).toEqual([{ op: 'replace', path: '/a/b', value: 9 }]);
	});
});
```

### Step 3 Verification Checklist

- [x] `pnpm turbo -F @data-map/core test`
- [x] `pnpm turbo -F @data-map/core build`

#### Step 3 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add patch builder + write API

- Add Operation type and patch helpers
- Implement DataMap set/setAll/map/patch with .toPatch variants
- Create intermediate containers on set
- Add unit tests for patch generation + application

completes: step 3 of 12 for DataMap Core
```

---

## Step 4: Array mutation API

- [x] Implement array mutation helpers and DataMap array methods
- [x] Ensure `.toPatch()` variants exist for each array method
- [x] Add unit tests

### packages/data-map/core/src/patch/array.ts

Copy and paste into `packages/data-map/core/src/patch/array.ts`:

```ts
import { JSONPointer } from 'json-p3';

import type { Operation } from '../types';
import { buildSetPatch } from './builder';

function resolveArray(data: unknown, pointer: string): unknown[] {
	try {
		const v = new JSONPointer(pointer).resolve(data as any);
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

function existsPointer(data: unknown, pointer: string): boolean {
	try {
		return new JSONPointer(pointer).exists(data as any);
	} catch {
		return false;
	}
}

function itemPointer(arrayPointer: string, index: number): string {
	return arrayPointer === '' ? `/${index}` : `${arrayPointer}/${index}`;
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
			path: itemPointer(arrayPointer, arr.length + i),
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
		ops: [{ op: 'remove', path: itemPointer(arrayPointer, arr.length - 1) }],
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
		ops: [{ op: 'remove', path: itemPointer(arrayPointer, 0) }],
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
	const ops: Operation[] = [];
	// Insert at 0 in reverse order so final order matches caller.
	for (let i = items.length - 1; i >= 0; i--) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, 0),
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

	// Remove `deleteCount` items at `start`.
	for (let i = 0; i < deleteCount; i++) {
		if (start >= 0 && start < arr.length - i) {
			ops.push({ op: 'remove', path: itemPointer(arrayPointer, start) });
		}
	}

	// Insert new items starting at `start`.
	for (let i = 0; i < items.length; i++) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, start + i),
			value: items[i],
		});
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

### packages/data-map/core/src/datamap.ts

Update `packages/data-map/core/src/datamap.ts` by adding array methods inside the `DataMap` class (append near the end, before the closing `}`):

```ts
import {
	buildPopPatch,
	buildPushPatch,
	buildShiftPatch,
	buildShufflePatch,
	buildSortPatch,
	buildSplicePatch,
	buildUnshiftPatch,
} from './patch/array';

// ... inside class DataMap

	readonly push = Object.assign(
		(pathOrPointer: string, ...items: unknown[]) => {
			const ops = this.push.toPatch(pathOrPointer, ...items);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string, ...items: unknown[]): Operation[] => {
				const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
				return buildPushPatch(this._data, pointer, items);
			},
		},
	);

	pop(pathOrPointer: string): unknown {
		const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
		const { ops, value } = buildPopPatch(this._data, pointer);
		this.patch(ops);
		return value;
	}

	shift(pathOrPointer: string): unknown {
		const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
		const { ops, value } = buildShiftPatch(this._data, pointer);
		this.patch(ops);
		return value;
	}

	readonly unshift = Object.assign(
		(pathOrPointer: string, ...items: unknown[]) => {
			const ops = this.unshift.toPatch(pathOrPointer, ...items);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string, ...items: unknown[]): Operation[] => {
				const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
				return buildUnshiftPatch(this._data, pointer, items);
			},
		},
	);

	splice(
		pathOrPointer: string,
		start: number,
		deleteCount: number = 0,
		...items: unknown[]
	): unknown[] {
		const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
		const { ops, removed } = buildSplicePatch(this._data, pointer, start, deleteCount, items);
		this.patch(ops);
		return removed;
	}

	readonly sort = Object.assign(
		(pathOrPointer: string, compareFn?: (a: unknown, b: unknown) => number) => {
			const ops = this.sort.toPatch(pathOrPointer, compareFn);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string, compareFn?: (a: unknown, b: unknown) => number): Operation[] => {
				const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
				return buildSortPatch(this._data, pointer, compareFn as any);
			},
		},
	);

	readonly shuffle = Object.assign(
		(pathOrPointer: string) => {
			const ops = this.shuffle.toPatch(pathOrPointer);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string): Operation[] => {
				const pointer = this.resolve(pathOrPointer)[0]?.pointer ?? normalizePointerInput(pathOrPointer);
				return buildShufflePatch(this._data, pointer);
			},
		},
	);
```

### packages/data-map/core/src/datamap.spec.ts

Append these tests to `packages/data-map/core/src/datamap.spec.ts`:

```ts
describe('DataMap (array API)', () => {
	it('push() appends items', () => {
		const dm = new DataMap({ items: [1, 2] });
		dm.push('/items', 3, 4);
		expect(dm.get('/items')).toEqual([1, 2, 3, 4]);
	});

	it('pop() removes last item and returns it', () => {
		const dm = new DataMap({ items: [1, 2] });
		expect(dm.pop('/items')).toBe(2);
		expect(dm.get('/items')).toEqual([1]);
	});

	it('unshift() prepends items', () => {
		const dm = new DataMap({ items: [2, 3] });
		dm.unshift('/items', 0, 1);
		expect(dm.get('/items')).toEqual([0, 1, 2, 3]);
	});

	it('splice() removes and inserts', () => {
		const dm = new DataMap({ items: [0, 1, 2, 3] });
		const removed = dm.splice('/items', 1, 2, 'A', 'B');
		expect(removed).toEqual([1, 2]);
		expect(dm.get('/items')).toEqual([0, 'A', 'B', 3]);
	});

	it('sort() sorts', () => {
		const dm = new DataMap({ items: [3, 1, 2] });
		dm.sort('/items', (a, b) => (a as number) - (b as number));
		expect(dm.get('/items')).toEqual([1, 2, 3]);
	});
});
```

### Step 4 Verification Checklist

- [x] `pnpm turbo -F @data-map/core test`

#### Step 4 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add array mutation API

- Implement push/pop/shift/unshift/splice/sort/shuffle
- Provide .toPatch variants where applicable
- Add unit tests

completes: step 4 of 12 for DataMap Core
```

---

## Step 5: Compiled path pattern system

- [ ] Implement segment types + compilation from JSONPath strings
- [ ] Add caching for compiled patterns
- [ ] Implement `match()` and `expand()` for patterns
- [ ] Add unit tests for compile/match/expand

### packages/data-map/core/src/path/segments.ts

Copy and paste into `packages/data-map/core/src/path/segments.ts`:

```ts
export type PredicateFn = (
	value: unknown,
	key: string | number,
	parent: Record<string, unknown> | unknown[],
) => boolean;

export type PathSegment =
	| StaticSegment
	| IndexSegment
	| WildcardSegment
	| SliceSegment
	| FilterSegment
	| RecursiveDescentSegment;

export interface StaticSegment {
	readonly type: 'static';
	readonly value: string;
}

export interface IndexSegment {
	readonly type: 'index';
	readonly value: number;
}

export interface WildcardSegment {
	readonly type: 'wildcard';
}

export interface SliceSegment {
	readonly type: 'slice';
	readonly start?: number;
	readonly end?: number;
	readonly step: number;
}

export interface FilterSegment {
	readonly type: 'filter';
	readonly predicate: PredicateFn;
	readonly expression: string;
	readonly hash: string;
}

export interface RecursiveDescentSegment {
	readonly type: 'recursive';
	readonly following: PathSegment[];
}
```

### packages/data-map/core/src/path/compile.ts

Copy and paste into `packages/data-map/core/src/path/compile.ts`:

```ts
import type { PathSegment, StaticSegment, IndexSegment } from './segments';
import { compilePredicate } from './predicate';
import { escapePointerSegment } from '../utils/pointer';

export interface CompiledPathPattern {
	readonly source: string;
	readonly segments: readonly PathSegment[];
	readonly isSingular: boolean;
	readonly hasRecursiveDescent: boolean;
	readonly hasFilters: boolean;
	readonly concretePrefix: readonly (StaticSegment | IndexSegment)[];
	readonly concretePrefixPointer: string;
	readonly structuralDependencies: readonly string[];

	match(
		pointer: string,
		getValue: (p: string) => unknown,
	): {
		matches: boolean;
		reason?: string;
		matchDepth?: number;
		failedAtDepth?: number;
	};

	expand(data: unknown): string[];
}

const patternCache = new Map<string, CompiledPathPattern>();

function isIndexSeg(s: string): boolean {
	return /^-?\d+$/.test(s);
}

function splitPointer(pointer: string): string[] {
	if (pointer === '' || pointer === '#') return [];
	const raw = pointer.startsWith('#/') ? pointer.slice(1) : pointer;
	if (raw === '') return [];
	if (!raw.startsWith('/')) return [];
	return raw
		.slice(1)
		.split('/')
		.map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function toPointerPrefix(
	segments: readonly (StaticSegment | IndexSegment)[],
): string {
	if (segments.length === 0) return '';
	const parts = segments.map((seg) =>
		seg.type === 'static' ? escapePointerSegment(seg.value) : String(seg.value),
	);
	return `/${parts.join('/')}`;
}

function computeConcretePrefix(
	segments: readonly PathSegment[],
): (StaticSegment | IndexSegment)[] {
	const prefix: (StaticSegment | IndexSegment)[] = [];
	for (const s of segments) {
		if (s.type === 'static' || s.type === 'index') {
			prefix.push(s);
			continue;
		}
		break;
	}
	return prefix;
}

function computeStructuralDeps(segments: readonly PathSegment[]): string[] {
	// Minimal implementation: watch the concrete prefix pointer.
	const prefix = computeConcretePrefix(segments);
	const pointer = toPointerPrefix(prefix);
	if (pointer === '') return [''];
	return [pointer];
}

function parseJsonPathToSegments(source: string): PathSegment[] {
	// Minimal JSONPath parser for patterns used in the plan/spec examples.
	// Supports: $.a.b, $.a[*].b, $.a[0], $.a[0:5:2], $.a[?(@.x == 1)], $..name
	if (!source.startsWith('$')) {
		throw new Error(`Invalid JSONPath: ${source}`);
	}

	let i = 1;
	const segs: PathSegment[] = [];

	const readIdent = (): string => {
		let start = i;
		while (i < source.length && /[A-Za-z0-9_$]/.test(source[i]!)) i++;
		return source.slice(start, i);
	};

	while (i < source.length) {
		if (source.startsWith('..', i)) {
			i += 2;
			// following segment can be .name or [*] etc; parse one segment and wrap.
			if (source[i] === '.') {
				i++;
				const name = readIdent();
				segs.push({
					type: 'recursive',
					following: [{ type: 'static', value: name }],
				});
				continue;
			}
			throw new Error(`Unsupported recursive JSONPath: ${source}`);
		}

		if (source[i] === '.') {
			i++;
			if (source[i] === '*') {
				i++;
				segs.push({ type: 'wildcard' });
				continue;
			}
			const name = readIdent();
			segs.push({ type: 'static', value: name });
			continue;
		}

		if (source[i] === '[') {
			const close = source.indexOf(']', i);
			if (close === -1) throw new Error(`Invalid JSONPath: ${source}`);
			const inside = source.slice(i + 1, close).trim();
			i = close + 1;

			if (inside === '*' || inside === "'*'" || inside === '"*"') {
				segs.push({ type: 'wildcard' });
				continue;
			}

			if (inside.startsWith('?(') && inside.endsWith(')')) {
				const expr = inside.slice(2, -1).trim();
				const { predicate, hash } = compilePredicate(expr);
				segs.push({ type: 'filter', predicate, expression: expr, hash });
				continue;
			}

			// slice: a:b:c (b optional, c optional)
			if (inside.includes(':')) {
				const [a, b, c] = inside.split(':');
				const start = a === '' ? undefined : Number(a);
				const end = b === '' ? undefined : Number(b);
				const step = c === undefined || c === '' ? 1 : Number(c);
				segs.push({ type: 'slice', start, end, step });
				continue;
			}

			// numeric index
			if (isIndexSeg(inside)) {
				segs.push({ type: 'index', value: Number(inside) });
				continue;
			}

			// quoted static
			const unquoted = inside.replace(/^['"]|['"]$/g, '');
			segs.push({ type: 'static', value: unquoted });
			continue;
		}

		throw new Error(`Unsupported JSONPath syntax: ${source}`);
	}

	return segs;
}

export function compilePathPattern(jsonpath: string): CompiledPathPattern {
	const cached = patternCache.get(jsonpath);
	if (cached) return cached;

	const segments = parseJsonPathToSegments(jsonpath);
	const isSingular = segments.every(
		(s) => s.type === 'static' || s.type === 'index',
	);
	const hasRecursiveDescent = segments.some((s) => s.type === 'recursive');
	const hasFilters = segments.some((s) => s.type === 'filter');
	const concretePrefix = computeConcretePrefix(segments);
	const concretePrefixPointer = toPointerPrefix(concretePrefix);
	const structuralDependencies = computeStructuralDeps(segments);

	const pattern: CompiledPathPattern = {
		source: jsonpath,
		segments,
		isSingular,
		hasRecursiveDescent,
		hasFilters,
		concretePrefix,
		concretePrefixPointer,
		structuralDependencies,
		match: (pointer, getValue) => {
			const pointerSegs = splitPointer(pointer);
			return matchSegments(segments, pointerSegs, getValue);
		},
		expand: (data) => expandSegments(segments, data, ''),
	};

	patternCache.set(jsonpath, pattern);
	return pattern;
}

function matchSegments(
	patternSegments: readonly PathSegment[],
	pointerSegments: readonly string[],
	getValue: (p: string) => unknown,
): {
	matches: boolean;
	reason?: string;
	matchDepth?: number;
	failedAtDepth?: number;
} {
	// Minimal matcher for static/index/wildcard/slice/filter and recursive (Step 7 extends semantics).
	let pIdx = 0;
	for (let sIdx = 0; sIdx < patternSegments.length; sIdx++) {
		const seg = patternSegments[sIdx]!;
		if (seg.type === 'recursive') {
			// Defer to recursive matcher in Step 7.
			return { matches: false, reason: 'recursive-unimplemented' };
		}

		const ptr = pointerSegments[pIdx];
		if (ptr === undefined)
			return { matches: false, reason: 'segment-count', failedAtDepth: sIdx };

		if (seg.type === 'static') {
			if (ptr !== seg.value)
				return {
					matches: false,
					reason: 'static-mismatch',
					failedAtDepth: sIdx,
				};
			pIdx++;
			continue;
		}

		if (seg.type === 'index') {
			if (!/^\d+$/.test(ptr))
				return {
					matches: false,
					reason: 'index-mismatch',
					failedAtDepth: sIdx,
				};
			if (Number(ptr) !== seg.value)
				return {
					matches: false,
					reason: 'index-mismatch',
					failedAtDepth: sIdx,
				};
			pIdx++;
			continue;
		}

		if (seg.type === 'wildcard') {
			pIdx++;
			continue;
		}

		if (seg.type === 'slice') {
			if (!/^\d+$/.test(ptr))
				return {
					matches: false,
					reason: 'slice-non-index',
					failedAtDepth: sIdx,
				};
			const index = Number(ptr);
			const start = seg.start ?? 0;
			const end = seg.end ?? Number.POSITIVE_INFINITY;
			const step = seg.step;
			const inRange =
				index >= start && index < end && (index - start) % step === 0;
			if (!inRange)
				return {
					matches: false,
					reason: 'slice-out-of-range',
					failedAtDepth: sIdx,
				};
			pIdx++;
			continue;
		}

		if (seg.type === 'filter') {
			// Evaluate predicate against the array element/object at this pointer depth.
			const parentPtr =
				`/${pointerSegments.slice(0, pIdx).map(escapePointerSegment).join('/')}`.replace(
					/^\/$/,
					'',
				);
			const fullPtr = `/${pointerSegments
				.slice(0, pIdx + 1)
				.map(escapePointerSegment)
				.join('/')}`.replace(/^\/$/, '');
			const value = getValue(fullPtr);
			const parent = getValue(parentPtr);
			const key = /^\d+$/.test(ptr) ? Number(ptr) : ptr;
			if (!seg.predicate(value, key, (parent as any) ?? {})) {
				return {
					matches: false,
					reason: 'filter-rejected',
					failedAtDepth: sIdx,
				};
			}
			pIdx++;
			continue;
		}
	}

	if (pIdx !== pointerSegments.length)
		return { matches: false, reason: 'segment-count' };
	return { matches: true, matchDepth: pIdx };
}

function expandSegments(
	segments: readonly PathSegment[],
	data: unknown,
	basePointer: string,
): string[] {
	if (segments.length === 0) return [basePointer];
	const [head, ...tail] = segments;
	if (!head) return [basePointer];

	const getChild = (obj: any, key: string | number): unknown =>
		(obj as any)?.[key as any];
	const addPtr = (ptr: string, seg: string | number) =>
		ptr === ''
			? `/${escapePointerSegment(String(seg))}`
			: `${ptr}/${escapePointerSegment(String(seg))}`;

	if (head.type === 'static') {
		const child = getChild(data as any, head.value);
		return expandSegments(tail, child, addPtr(basePointer, head.value));
	}

	if (head.type === 'index') {
		const arr = Array.isArray(data) ? data : [];
		const idx = head.value < 0 ? arr.length + head.value : head.value;
		return expandSegments(tail, arr[idx], addPtr(basePointer, idx));
	}

	if (head.type === 'wildcard') {
		if (Array.isArray(data)) {
			return data.flatMap((v, idx) =>
				expandSegments(tail, v, addPtr(basePointer, idx)),
			);
		}
		if (typeof data === 'object' && data !== null) {
			return Object.keys(data as any).flatMap((k) =>
				expandSegments(tail, (data as any)[k], addPtr(basePointer, k)),
			);
		}
		return [];
	}

	if (head.type === 'slice') {
		const arr = Array.isArray(data) ? data : [];
		const start = head.start ?? 0;
		const end = head.end ?? arr.length;
		const step = head.step;
		const out: string[] = [];
		for (let idx = start; idx < Math.min(end, arr.length); idx += step) {
			out.push(...expandSegments(tail, arr[idx], addPtr(basePointer, idx)));
		}
		return out;
	}

	if (head.type === 'filter') {
		const arr = Array.isArray(data) ? data : [];
		const out: string[] = [];
		for (let idx = 0; idx < arr.length; idx++) {
			const v = arr[idx];
			if (head.predicate(v, idx, arr)) {
				out.push(...expandSegments(tail, v, addPtr(basePointer, idx)));
			}
		}
		return out;
	}

	if (head.type === 'recursive') {
		// Defer to Step 7.
		return [];
	}

	return [];
}
```

### packages/data-map/core/src/path/compile.spec.ts

Copy and paste into `packages/data-map/core/src/path/compile.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('compilePathPattern', () => {
	it('compiles wildcard patterns', () => {
		const pattern = compilePathPattern('$.users[*].name');
		expect(pattern.segments).toEqual([
			{ type: 'static', value: 'users' },
			{ type: 'wildcard' },
			{ type: 'static', value: 'name' },
		]);
		expect(pattern.isSingular).toBe(false);
		expect(pattern.concretePrefixPointer).toBe('/users');
	});

	it('compiles slice patterns', () => {
		const pattern = compilePathPattern('$.items[0:5:2]');
		expect(pattern.segments).toEqual([
			{ type: 'static', value: 'items' },
			{ type: 'slice', start: 0, end: 5, step: 2 },
		]);
	});

	it('caches patterns', () => {
		const a = compilePathPattern('$.users[*].name');
		const b = compilePathPattern('$.users[*].name');
		expect(a).toBe(b);
	});
});
```

### packages/data-map/core/src/path/match.ts

Copy and paste into `packages/data-map/core/src/path/match.ts`:

```ts
export { compilePathPattern } from './compile';
```

### packages/data-map/core/src/path/match.spec.ts

Copy and paste into `packages/data-map/core/src/path/match.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('CompiledPathPattern.match (non-recursive)', () => {
	it('matches wildcard pattern', () => {
		const pattern = compilePathPattern('$.users[*].name');
		const data = { users: [{ name: 'A' }] };
		const getValue = (p: string) => {
			if (p === '/users/0/name') return 'A';
			if (p === '/users/0') return { name: 'A' };
			if (p === '/users') return [{ name: 'A' }];
			return undefined;
		};

		expect(pattern.match('/users/0/name', getValue).matches).toBe(true);
		expect(pattern.match('/admins/0/name', getValue).matches).toBe(false);
	});

	it('matches slice pattern', () => {
		const pattern = compilePathPattern('$.items[0:10:2]');
		const getValue = () => undefined;
		expect(pattern.match('/items/0', getValue).matches).toBe(true);
		expect(pattern.match('/items/2', getValue).matches).toBe(true);
		expect(pattern.match('/items/1', getValue).matches).toBe(false);
	});
});
```

### packages/data-map/core/src/path/expand.ts

Copy and paste into `packages/data-map/core/src/path/expand.ts`:

```ts
export { compilePathPattern } from './compile';
```

### packages/data-map/core/src/path/expand.spec.ts

Copy and paste into `packages/data-map/core/src/path/expand.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('CompiledPathPattern.expand (non-recursive)', () => {
	it('expands wildcard patterns', () => {
		const pattern = compilePathPattern('$.users[*].name');
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		expect(pattern.expand(data).sort()).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
	});

	it('expands slice patterns', () => {
		const pattern = compilePathPattern('$.items[0:5:2]');
		const data = { items: [0, 1, 2, 3, 4, 5] };
		expect(pattern.expand(data).sort()).toEqual([
			'/items/0',
			'/items/2',
			'/items/4',
		]);
	});
});
```

### Step 5 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 5 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add compiled path patterns (compile/match/expand)

- Add PathSegment types
- Implement compilePathPattern with caching
- Implement match and expand for non-recursive segments
- Add unit tests

completes: step 5 of 12 for DataMap Core
```

---

## Step 6: Filter predicate compilation

- [ ] Implement `compilePredicate()` and predicate caching
- [ ] Support comparisons, logical operators, existence checks, match(), and safe execution
- [ ] Integrate predicate compilation into `compilePathPattern()`
- [ ] Add unit tests

### packages/data-map/core/src/path/predicate.ts

Copy and paste into `packages/data-map/core/src/path/predicate.ts`:

```ts
import type { PredicateFn } from './segments';

const predicateCache = new Map<
	string,
	{ predicate: PredicateFn; hash: string }
>();

function hashString(s: string): string {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16);
}

function exprToJs(expr: string): string {
	// Minimal transform:
	// - @.foo -> value?.foo
	// - @ -> value
	// - match(x, 're') -> new RegExp('re').test(String(x))
	// - == -> ===, != -> !==
	let out = expr;
	out = out.replace(/@\.(\w+)/g, 'value?.$1');
	out = out.replace(/\b@\b/g, 'value');
	out = out.replace(
		/\bmatch\(([^,]+),\s*'([^']*)'\)\b/g,
		"(new RegExp('$2')).test(String($1))",
	);
	out = out.replace(/==/g, '===');
	out = out.replace(/!=/g, '!==');
	return out;
}

export function compilePredicate(expression: string): {
	predicate: PredicateFn;
	hash: string;
} {
	const cached = predicateCache.get(expression);
	if (cached) return cached;

	const hash = hashString(expression);
	const body = exprToJs(expression);

	// eslint-disable-next-line no-new-func
	const fn = new Function(
		'value',
		'key',
		'parent',
		`"use strict";\ntry {\n  return Boolean(${body});\n} catch (e) {\n  return false;\n}`,
	) as unknown as PredicateFn;

	const result = { predicate: fn, hash };
	predicateCache.set(expression, result);
	return result;
}
```

### packages/data-map/core/src/path/predicate.spec.ts

Copy and paste into `packages/data-map/core/src/path/predicate.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compilePredicate } from './predicate';

describe('compilePredicate', () => {
	it('compiles simple comparisons', () => {
		const { predicate } = compilePredicate('@.active == true');
		expect(predicate({ active: true }, 0, [])).toBe(true);
		expect(predicate({ active: false }, 0, [])).toBe(false);
	});

	it('compiles logical composition', () => {
		const { predicate } = compilePredicate('@.score > 90 && @.verified');
		expect(predicate({ score: 95, verified: true }, 0, [])).toBe(true);
		expect(predicate({ score: 95, verified: false }, 0, [])).toBe(false);
	});

	it('compiles match()', () => {
		const { predicate } = compilePredicate("match(@.email, '.*@example.com')");
		expect(predicate({ email: 'a@example.com' }, 0, [])).toBe(true);
		expect(predicate({ email: 'a@other.com' }, 0, [])).toBe(false);
	});

	it('caches predicates', () => {
		const a = compilePredicate('@.active == true');
		const b = compilePredicate('@.active == true');
		expect(a.predicate).toBe(b.predicate);
		expect(a.hash).toBe(b.hash);
	});
});
```

### Step 6 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 6 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add filter predicate compilation

- Implement compilePredicate with caching
- Integrate predicates into filter segments
- Add unit tests for filter predicates

completes: step 6 of 12 for DataMap Core
```

## Step 7: Recursive descent matching

- [ ] Implement `$..` matching algorithm per spec
- [ ] Implement `$..` expansion to concrete pointers
- [ ] Add unit tests for recursive match + expand

### packages/data-map/core/src/path/compile.ts

Replace `packages/data-map/core/src/path/compile.ts` with the following (this supersedes Step 5’s non-recursive implementation and matches the spec’s recursive descent behavior):

```ts
import type { PathSegment, StaticSegment, IndexSegment } from './segments';
import { compilePredicate } from './predicate';
import { escapePointerSegment, parsePointerSegments } from '../utils/pointer';

export interface CompiledPathPattern {
	readonly source: string;
	readonly segments: readonly PathSegment[];
	readonly isSingular: boolean;
	readonly hasRecursiveDescent: boolean;
	readonly hasFilters: boolean;
	readonly concretePrefix: readonly (StaticSegment | IndexSegment)[];
	readonly concretePrefixPointer: string;
	readonly structuralDependencies: readonly string[];

	match(
		pointer: string,
		getValue: (p: string) => unknown,
	): {
		matches: boolean;
		reason?: string;
		matchDepth?: number;
		failedAtDepth?: number;
	};

	expand(data: unknown): string[];
}

const patternCache = new Map<string, CompiledPathPattern>();

function isIndexSeg(s: string): boolean {
	return /^-?\d+$/.test(s);
}

function toPointerPrefix(
	segments: readonly (StaticSegment | IndexSegment)[],
): string {
	if (segments.length === 0) return '';
	const parts = segments.map((seg) =>
		seg.type === 'static' ? escapePointerSegment(seg.value) : String(seg.value),
	);
	return `/${parts.join('/')}`;
}

function computeConcretePrefix(
	segments: readonly PathSegment[],
): (StaticSegment | IndexSegment)[] {
	const prefix: (StaticSegment | IndexSegment)[] = [];
	for (const s of segments) {
		if (s.type === 'static' || s.type === 'index') {
			prefix.push(s);
			continue;
		}
		break;
	}
	return prefix;
}

function computeStructuralDeps(segments: readonly PathSegment[]): string[] {
	// Minimal structural dependency derivation: depend on concrete prefix.
	const prefix = computeConcretePrefix(segments);
	const pointer = toPointerPrefix(prefix);
	return pointer === '' ? [''] : [pointer];
}

function parseJsonPathToSegments(source: string): PathSegment[] {
	if (!source.startsWith('$')) {
		throw new Error(`Invalid JSONPath: ${source}`);
	}

	let i = 1;
	const prefix: PathSegment[] = [];

	const readIdent = (): string => {
		let start = i;
		while (i < source.length && /[A-Za-z0-9_$]/.test(source[i]!)) i++;
		return source.slice(start, i);
	};

	const parseFromCurrent = (): PathSegment[] => {
		const segs: PathSegment[] = [];
		while (i < source.length) {
			if (source[i] === '.') {
				i++;
				if (source[i] === '*') {
					i++;
					segs.push({ type: 'wildcard' });
					continue;
				}
				const name = readIdent();
				segs.push({ type: 'static', value: name });
				continue;
			}

			if (source[i] === '[') {
				const close = source.indexOf(']', i);
				if (close === -1) throw new Error(`Invalid JSONPath: ${source}`);
				const inside = source.slice(i + 1, close).trim();
				i = close + 1;

				if (inside === '*' || inside === "'*'" || inside === '"*"') {
					segs.push({ type: 'wildcard' });
					continue;
				}

				if (inside.startsWith('?(') && inside.endsWith(')')) {
					const expr = inside.slice(2, -1).trim();
					const { predicate, hash } = compilePredicate(expr);
					segs.push({ type: 'filter', predicate, expression: expr, hash });
					continue;
				}

				if (inside.includes(':')) {
					const [a, b, c] = inside.split(':');
					const start = a === '' ? undefined : Number(a);
					const end = b === '' ? undefined : Number(b);
					const step = c === undefined || c === '' ? 1 : Number(c);
					segs.push({ type: 'slice', start, end, step });
					continue;
				}

				if (isIndexSeg(inside)) {
					segs.push({ type: 'index', value: Number(inside) });
					continue;
				}

				const unquoted = inside.replace(/^['"]|['"]$/g, '');
				segs.push({ type: 'static', value: unquoted });
				continue;
			}

			throw new Error(`Unsupported JSONPath syntax: ${source}`);
		}
		return segs;
	};

	while (i < source.length) {
		if (source.startsWith('..', i)) {
			i += 2;
			const following = parseFromCurrent();
			return [...prefix, { type: 'recursive', following }];
		}

		// Otherwise parse normal segment into prefix
		prefix.push(...parseFromCurrent());
		break;
	}

	return prefix;
}

export function compilePathPattern(jsonpath: string): CompiledPathPattern {
	const cached = patternCache.get(jsonpath);
	if (cached) return cached;

	const segments = parseJsonPathToSegments(jsonpath);
	const hasRecursiveDescent = segments.some((s) => s.type === 'recursive');
	const hasFilters = segments.some((s) => s.type === 'filter');
	const isSingular = segments.every(
		(s) => s.type === 'static' || s.type === 'index',
	);
	const concretePrefix = computeConcretePrefix(segments);
	const concretePrefixPointer = toPointerPrefix(concretePrefix);
	const structuralDependencies = computeStructuralDeps(segments);

	const pattern: CompiledPathPattern = {
		source: jsonpath,
		segments,
		hasRecursiveDescent,
		hasFilters,
		isSingular,
		concretePrefix,
		concretePrefixPointer,
		structuralDependencies,
		match: (pointer, getValue) => {
			const pointerSegments = parsePointerSegments(pointer);
			return hasRecursiveDescent
				? matchRecursive(segments, pointerSegments, 0, 0, '', getValue)
				: matchFlat(segments, pointerSegments, getValue);
		},
		expand: (data) => expandSegments(segments, data, ''),
	};

	patternCache.set(jsonpath, pattern);
	return pattern;
}

function getParentPointer(pointer: string): string {
	if (pointer === '') return '';
	const idx = pointer.lastIndexOf('/');
	if (idx <= 0) return '';
	return pointer.slice(0, idx);
}

function isInSliceRange(
	index: number,
	start: number | undefined,
	end: number | undefined,
	step: number,
): boolean {
	const s = start ?? 0;
	const e = end ?? Infinity;
	if (step === 0) return false;
	if (step > 0) {
		if (index < s || index >= e) return false;
		return (index - s) % step === 0;
	}
	// negative step
	if (index > s || index <= e) return false;
	return (s - index) % Math.abs(step) === 0;
}

function matchSegment(
	pattern: PathSegment,
	pointerSeg: string,
	fullPointer: string,
	getValue: (p: string) => unknown,
): { matches: boolean; reason?: string } {
	switch (pattern.type) {
		case 'static':
			return pattern.value === pointerSeg
				? { matches: true }
				: { matches: false, reason: 'static-mismatch' };
		case 'index':
			return String(pattern.value) === pointerSeg
				? { matches: true }
				: { matches: false, reason: 'index-mismatch' };
		case 'wildcard':
			return { matches: true };
		case 'slice': {
			const index = parseInt(pointerSeg, 10);
			if (Number.isNaN(index))
				return { matches: false, reason: 'slice-out-of-range' };
			return isInSliceRange(index, pattern.start, pattern.end, pattern.step)
				? { matches: true }
				: { matches: false, reason: 'slice-out-of-range' };
		}
		case 'filter': {
			const value = getValue(fullPointer);
			const parentPointer = getParentPointer(fullPointer);
			const parent = getValue(parentPointer);
			const key = Number.isNaN(parseInt(pointerSeg, 10))
				? pointerSeg
				: parseInt(pointerSeg, 10);
			return pattern.predicate(value, key, parent as any)
				? { matches: true }
				: { matches: false, reason: 'filter-rejected' };
		}
		case 'recursive':
			throw new Error('Recursive segment should not reach matchSegment');
		default:
			return { matches: false, reason: 'unknown-segment-type' };
	}
}

function matchFlat(
	patternSegments: readonly PathSegment[],
	pointerSegments: readonly string[],
	getValue: (p: string) => unknown,
): { matches: boolean; reason?: string; failedAtDepth?: number } {
	if (pointerSegments.length !== patternSegments.length) {
		return {
			matches: false,
			reason: 'segment-count',
			failedAtDepth: Math.min(pointerSegments.length, patternSegments.length),
		};
	}

	let currentPointer = '';
	for (let i = 0; i < patternSegments.length; i++) {
		const patternSeg = patternSegments[i]!;
		const pointerSeg = pointerSegments[i]!;
		currentPointer += '/' + escapePointerSegment(pointerSeg);
		const res = matchSegment(patternSeg, pointerSeg, currentPointer, getValue);
		if (!res.matches)
			return { matches: false, reason: res.reason, failedAtDepth: i };
	}
	return { matches: true };
}

function matchRecursive(
	patternSegments: readonly PathSegment[],
	pointerSegments: readonly string[],
	patternIdx: number,
	pointerIdx: number,
	currentPointer: string,
	getValue: (p: string) => unknown,
): {
	matches: boolean;
	reason?: string;
	matchDepth?: number;
	failedAtDepth?: number;
} {
	if (patternIdx >= patternSegments.length) {
		return pointerIdx >= pointerSegments.length
			? { matches: true, matchDepth: pointerIdx }
			: { matches: false, reason: 'segment-count' };
	}

	const patternSeg = patternSegments[patternIdx]!;
	if (patternSeg.type === 'recursive') {
		for (let i = pointerIdx; i <= pointerSegments.length; i++) {
			let tryPointer = currentPointer;
			for (let j = pointerIdx; j < i; j++) {
				tryPointer += '/' + escapePointerSegment(pointerSegments[j]!);
			}
			const res = matchRecursive(
				patternSeg.following,
				pointerSegments,
				0,
				i,
				tryPointer,
				getValue,
			);
			if (res.matches) return { matches: true, matchDepth: i };
		}
		return { matches: false, reason: 'recursive-no-match' };
	}

	if (pointerIdx >= pointerSegments.length)
		return { matches: false, reason: 'segment-count' };
	const pointerSeg = pointerSegments[pointerIdx]!;
	const nextPointer = currentPointer + '/' + escapePointerSegment(pointerSeg);
	const segRes = matchSegment(patternSeg, pointerSeg, nextPointer, getValue);
	if (!segRes.matches)
		return { matches: false, reason: segRes.reason, failedAtDepth: pointerIdx };

	return matchRecursive(
		patternSegments,
		pointerSegments,
		patternIdx + 1,
		pointerIdx + 1,
		nextPointer,
		getValue,
	);
}

function expandSegments(
	segments: readonly PathSegment[],
	data: unknown,
	basePointer: string,
): string[] {
	if (segments.length === 0) return [basePointer];
	const [head, ...tail] = segments;
	if (!head) return [basePointer];

	const addPtr = (ptr: string, seg: string | number) =>
		ptr === ''
			? `/${escapePointerSegment(String(seg))}`
			: `${ptr}/${escapePointerSegment(String(seg))}`;

	const getChild = (obj: any, key: string | number): unknown =>
		(obj as any)?.[key as any];

	if (head.type === 'static') {
		return expandSegments(
			tail,
			getChild(data as any, head.value),
			addPtr(basePointer, head.value),
		);
	}

	if (head.type === 'index') {
		const arr = Array.isArray(data) ? data : [];
		const idx = head.value < 0 ? arr.length + head.value : head.value;
		return expandSegments(tail, arr[idx], addPtr(basePointer, idx));
	}

	if (head.type === 'wildcard') {
		if (Array.isArray(data))
			return data.flatMap((v, idx) =>
				expandSegments(tail, v, addPtr(basePointer, idx)),
			);
		if (typeof data === 'object' && data !== null) {
			return Object.keys(data as any).flatMap((k) =>
				expandSegments(tail, (data as any)[k], addPtr(basePointer, k)),
			);
		}
		return [];
	}

	if (head.type === 'slice') {
		const arr = Array.isArray(data) ? data : [];
		const start = head.start ?? 0;
		const end = head.end ?? arr.length;
		const step = head.step;
		const out: string[] = [];
		for (let idx = start; idx < Math.min(end, arr.length); idx += step) {
			out.push(...expandSegments(tail, arr[idx], addPtr(basePointer, idx)));
		}
		return out;
	}

	if (head.type === 'filter') {
		const arr = Array.isArray(data) ? data : [];
		const out: string[] = [];
		for (let idx = 0; idx < arr.length; idx++) {
			const v = arr[idx];
			if (head.predicate(v, idx, arr))
				out.push(...expandSegments(tail, v, addPtr(basePointer, idx)));
		}
		return out;
	}

	if (head.type === 'recursive') {
		// Expand $..X by walking every node and attempting to match the following segments at that node.
		const results: string[] = [];
		const visit = (value: any, ptr: string) => {
			// Try matching following at current node
			results.push(...expandSegments(head.following, value, ptr));
			if (Array.isArray(value)) {
				for (let i = 0; i < value.length; i++) visit(value[i], addPtr(ptr, i));
				return;
			}
			if (typeof value === 'object' && value !== null) {
				for (const k of Object.keys(value)) visit(value[k], addPtr(ptr, k));
			}
		};
		visit(data as any, basePointer);
		return results;
	}

	return [];
}
```

### packages/data-map/core/src/path/recursive.spec.ts

Copy and paste into `packages/data-map/core/src/path/recursive.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('recursive descent ($..)', () => {
	it('matches $..name at any depth', () => {
		const pattern = compilePathPattern('$..name');
		const data = { a: { name: 'A' }, b: [{ name: 'B' }] };
		const getValue = (p: string) => {
			// minimal pointer resolver for test
			const segs = p === '' ? [] : p.split('/').slice(1);
			let cur: any = data;
			for (const s of segs) cur = cur?.[s];
			return cur;
		};
		expect(pattern.match('/a/name', getValue).matches).toBe(true);
		expect(pattern.match('/b/0/name', getValue).matches).toBe(true);
		expect(pattern.match('/name', getValue).matches).toBe(false);
	});

	it('expands $..name to all matching pointers', () => {
		const pattern = compilePathPattern('$..name');
		const data = { a: { name: 'A' }, b: [{ name: 'B' }], name: 'ROOT' };
		expect(new Set(pattern.expand(data))).toEqual(
			new Set(['/name', '/a/name', '/b/0/name']),
		);
	});
});
```

### Step 7 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 7 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): implement recursive descent in compiled patterns

- Implement $.. recursive match algorithm
- Implement $.. expansion across object/array graphs
- Add unit tests for recursive match/expand

completes: step 7 of 12 for DataMap Core
```

---

## Step 8: Static subscription system

- [ ] Implement runtime subscription registration for static pointers
- [ ] Fire subscriptions on patch (before/on/after stages)
- [ ] Add unit tests

### packages/data-map/core/src/subscription/types.ts

Copy and paste into `packages/data-map/core/src/subscription/types.ts`:

```ts
import type { CompiledPathPattern } from '../path/compile';
import type { Operation } from '../types';
import type { DataMap } from '../datamap';

export interface SubscriptionConfig<T, Ctx = unknown> {
	path: string;
	before?: SubscriptionEvent | SubscriptionEvent[];
	on?: SubscriptionEvent | SubscriptionEvent[];
	after?: SubscriptionEvent | SubscriptionEvent[];
	fn: SubscriptionHandler<T, Ctx>;
}

export type SubscriptionEvent = 'get' | 'set' | 'remove' | 'resolve' | 'patch';

export interface SubscriptionEventInfo {
	type: SubscriptionEvent;
	stage: 'before' | 'on' | 'after';
	pointer: string;
	originalPath: string;
	operation?: Operation;
	previousValue?: unknown;
}

export type SubscriptionHandler<T, Ctx> = (
	value: unknown,
	event: SubscriptionEventInfo,
	cancel: () => void,
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown | void;

export interface Subscription {
	readonly id: string;
	readonly query: string;
	readonly compiledPattern: CompiledPathPattern | null;
	readonly expandedPaths: ReadonlySet<string>;
	readonly isDynamic: boolean;
	unsubscribe(): void;
}
```

### packages/data-map/core/src/subscription/id.ts

Copy and paste into `packages/data-map/core/src/subscription/id.ts`:

```ts
let counter = 0;

export function generateSubscriptionId(): string {
	counter++;
	return `sub_${Date.now()}_${counter}`;
}
```

### packages/data-map/core/src/subscription/manager.ts

Copy and paste into `packages/data-map/core/src/subscription/manager.ts`:

```ts
import { detectPathType } from '../path/detect';
import type { CompiledPathPattern } from '../path/compile';
import type { Operation } from '../types';
import type { DataMap } from '../datamap';

import { generateSubscriptionId } from './id';
import type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
	SubscriptionEventInfo,
} from './types';

interface InternalSubscription<T, Ctx> {
	id: string;
	config: SubscriptionConfig<T, Ctx>;
	compiledPattern: CompiledPathPattern | null;
	expandedPaths: Set<string>;
	isDynamic: boolean;
}

export interface NotificationResult {
	cancelled: boolean;
	transformedValue?: unknown;
	handlerCount: number;
}

function asArray<T>(v: T | T[] | undefined): T[] {
	if (!v) return [];
	return Array.isArray(v) ? v : [v];
}

function shouldInvoke(
	config: SubscriptionConfig<any, any>,
	stage: 'before' | 'on' | 'after',
	event: SubscriptionEvent,
): boolean {
	const list =
		stage === 'before'
			? asArray(config.before)
			: stage === 'on'
				? asArray(config.on)
				: asArray(config.after);
	return list.includes(event);
}

export class SubscriptionManagerImpl<T, Ctx> {
	private readonly reverseIndex = new Map<string, Set<string>>();
	private readonly subscriptions = new Map<
		string,
		InternalSubscription<T, Ctx>
	>();
	private readonly dataMap: DataMap<T, Ctx>;

	constructor(dataMap: DataMap<T, Ctx>) {
		this.dataMap = dataMap;
	}

	register(config: SubscriptionConfig<T, Ctx>): Subscription {
		const id = generateSubscriptionId();
		const pathType = detectPathType(config.path);
		if (pathType !== 'pointer') {
			throw new Error(
				'Step 8 only supports static pointer subscriptions. Use Step 9 for JSONPath.',
			);
		}

		const expandedPaths = new Set([config.path]);
		this.addToReverseIndex(config.path, id);

		const internal: InternalSubscription<T, Ctx> = {
			id,
			config,
			compiledPattern: null,
			expandedPaths,
			isDynamic: false,
		};
		this.subscriptions.set(id, internal);

		return {
			id,
			query: config.path,
			compiledPattern: null,
			expandedPaths,
			isDynamic: false,
			unsubscribe: () => this.unregister(id),
		};
	}

	unregister(subscriptionId: string): void {
		const sub = this.subscriptions.get(subscriptionId);
		if (!sub) return;
		for (const p of sub.expandedPaths)
			this.removeFromReverseIndex(p, subscriptionId);
		this.subscriptions.delete(subscriptionId);
	}

	notify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		const ids = this.reverseIndex.get(pointer) ?? new Set<string>();
		return this.invokeHandlers(
			ids,
			pointer,
			event,
			stage,
			value,
			previousValue,
			operation,
			originalPath,
		);
	}

	private invokeHandlers(
		ids: Set<string>,
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		let cancelled = false;
		let transformedValue: unknown | undefined;
		let handlerCount = 0;

		let currentValue = value;
		for (const id of ids) {
			const sub = this.subscriptions.get(id);
			if (!sub) continue;
			if (!shouldInvoke(sub.config, stage, event)) continue;

			handlerCount++;
			const cancel = () => {
				cancelled = true;
			};

			const info: SubscriptionEventInfo = {
				type: event,
				stage,
				pointer,
				originalPath,
				operation,
				previousValue,
			};

			const ret = sub.config.fn(
				currentValue,
				info,
				cancel,
				this.dataMap,
				this.dataMap.context as any,
			);
			if (ret !== undefined) {
				transformedValue = ret;
				currentValue = ret;
			}
			if (cancelled) break;
		}

		return { cancelled, transformedValue, handlerCount };
	}

	private addToReverseIndex(pointer: string, subscriptionId: string): void {
		let set = this.reverseIndex.get(pointer);
		if (!set) {
			set = new Set();
			this.reverseIndex.set(pointer, set);
		}
		set.add(subscriptionId);
	}

	private removeFromReverseIndex(
		pointer: string,
		subscriptionId: string,
	): void {
		const set = this.reverseIndex.get(pointer);
		if (!set) return;
		set.delete(subscriptionId);
		if (set.size === 0) this.reverseIndex.delete(pointer);
	}
}
```

### packages/data-map/core/src/datamap.ts

Update `packages/data-map/core/src/datamap.ts`:

1. Add imports:

```ts
import { SubscriptionManagerImpl } from './subscription/manager';
import type { Subscription, SubscriptionConfig } from './subscription/types';
```

2. Extend `DataMapOptions` in `packages/data-map/core/src/types.ts` later in Step 11 (definitions), but for Step 8 you’ll add subscription registration at construction time in Step 9.

3. Inside `class DataMap`, add:

```ts
private readonly _subs = new SubscriptionManagerImpl<T, Ctx>(this);

subscribe(config: SubscriptionConfig<T, Ctx>): Subscription {
	return this._subs.register(config);
}
```

4. In the existing `patch()` implementation, add notification hooks around the apply:

```ts
const before = this._subs.notify(
	op.path,
	'patch',
	'before',
	this.get(op.path),
	undefined,
	op,
	op.path,
);
if (before.cancelled) throw new Error('Patch cancelled by subscription');
```

and after applying, for each op:

```ts
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
```

### packages/data-map/core/src/subscription/static.spec.ts

Copy and paste into `packages/data-map/core/src/subscription/static.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('static subscriptions', () => {
	it('notifies on patch stages', () => {
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
		expect(calls).toEqual([
			'before:patch:/a/b',
			'on:patch:/a/b',
			'after:patch:/a/b',
		]);
	});
});
```

### Step 8 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 8 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add static pointer subscriptions

- Add subscription types and manager (static pointers)
- Add DataMap.subscribe() API
- Notify subscriptions during patch stages
- Add unit tests

completes: step 8 of 12 for DataMap Core
```

---

## Step 9: Dynamic subscription system

- [ ] Add JSONPath subscription support (compile + expand)
- [ ] Add structural watchers + re-expansion
- [ ] Add Bloom filter fast-path
- [ ] Add unit tests

### packages/data-map/core/src/subscription/bloom.ts

Copy and paste into `packages/data-map/core/src/subscription/bloom.ts`:

```ts
export class BloomFilter {
	private readonly bits: Uint8Array;
	private readonly size: number;
	private readonly hashCount: number;

	constructor(size: number, hashCount: number) {
		this.size = Math.max(8, size);
		this.hashCount = Math.max(1, hashCount);
		this.bits = new Uint8Array(Math.ceil(this.size / 8));
	}

	add(value: string): void {
		for (let i = 0; i < this.hashCount; i++) {
			const idx = this.hash(value, i) % this.size;
			this.bits[idx >> 3] |= 1 << (idx & 7);
		}
	}

	mightContain(value: string): boolean {
		for (let i = 0; i < this.hashCount; i++) {
			const idx = this.hash(value, i) % this.size;
			if ((this.bits[idx >> 3] & (1 << (idx & 7))) === 0) return false;
		}
		return true;
	}

	private hash(value: string, seed: number): number {
		let h = 2166136261 ^ seed;
		for (let i = 0; i < value.length; i++) {
			h ^= value.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
}
```

### packages/data-map/core/src/subscription/manager.ts

Replace `packages/data-map/core/src/subscription/manager.ts` with the following (adds JSONPath support + re-expansion):

```ts
import { detectPathType } from '../path/detect';
import { compilePathPattern } from '../path/compile';
import type { CompiledPathPattern } from '../path/compile';
import type { Operation } from '../types';
import type { DataMap } from '../datamap';

import { BloomFilter } from './bloom';
import { generateSubscriptionId } from './id';
import type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
	SubscriptionEventInfo,
} from './types';

interface InternalSubscription<T, Ctx> {
	id: string;
	config: SubscriptionConfig<T, Ctx>;
	compiledPattern: CompiledPathPattern | null;
	expandedPaths: Set<string>;
	isDynamic: boolean;
}

export interface NotificationResult {
	cancelled: boolean;
	transformedValue?: unknown;
	handlerCount: number;
}

function asArray<T>(v: T | T[] | undefined): T[] {
	if (!v) return [];
	return Array.isArray(v) ? v : [v];
}

function shouldInvoke(
	config: SubscriptionConfig<any, any>,
	stage: 'before' | 'on' | 'after',
	event: SubscriptionEvent,
): boolean {
	const list =
		stage === 'before'
			? asArray(config.before)
			: stage === 'on'
				? asArray(config.on)
				: asArray(config.after);
	return list.includes(event);
}

export class SubscriptionManagerImpl<T, Ctx> {
	private readonly reverseIndex = new Map<string, Set<string>>();
	private readonly subscriptions = new Map<
		string,
		InternalSubscription<T, Ctx>
	>();
	private readonly dynamicSubscriptions = new Map<
		string,
		InternalSubscription<T, Ctx>
	>();
	private readonly structuralWatchers = new Map<string, Set<string>>();
	private readonly bloomFilter = new BloomFilter(10000, 7);
	private readonly dataMap: DataMap<T, Ctx>;

	constructor(dataMap: DataMap<T, Ctx>) {
		this.dataMap = dataMap;
	}

	register(config: SubscriptionConfig<T, Ctx>): Subscription {
		const id = generateSubscriptionId();
		const pathType = detectPathType(config.path);

		let compiledPattern: CompiledPathPattern | null = null;
		let expandedPaths: Set<string>;
		let isDynamic = false;

		if (pathType === 'pointer') {
			expandedPaths = new Set([config.path]);
			this.addToReverseIndex(config.path, id);
			this.bloomFilter.add(config.path);
		} else {
			compiledPattern = compilePathPattern(config.path);
			isDynamic = !compiledPattern.isSingular;
			const data = this.dataMap.toJSON();
			const pointers = compiledPattern.expand(data);
			expandedPaths = new Set(pointers);
			for (const p of pointers) {
				this.addToReverseIndex(p, id);
				this.bloomFilter.add(p);
			}
			if (isDynamic) {
				for (const dep of compiledPattern.structuralDependencies) {
					this.addStructuralWatcher(dep, id);
				}
			}
		}

		const internal: InternalSubscription<T, Ctx> = {
			id,
			config,
			compiledPattern,
			expandedPaths,
			isDynamic,
		};

		this.subscriptions.set(id, internal);
		if (isDynamic) this.dynamicSubscriptions.set(id, internal);

		return this.createPublicSubscription(internal);
	}

	unregister(subscriptionId: string): void {
		const sub = this.subscriptions.get(subscriptionId);
		if (!sub) return;
		for (const p of sub.expandedPaths)
			this.removeFromReverseIndex(p, subscriptionId);
		this.subscriptions.delete(subscriptionId);
		this.dynamicSubscriptions.delete(subscriptionId);

		for (const [dep, set] of this.structuralWatchers) {
			set.delete(subscriptionId);
			if (set.size === 0) this.structuralWatchers.delete(dep);
		}
	}

	notify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		if (!this.bloomFilter.mightContain(pointer)) {
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

		const staticIds = this.reverseIndex.get(pointer) ?? new Set<string>();
		const dynamicIds = this.findDynamicMatches(pointer);
		const all = new Set<string>([...staticIds, ...dynamicIds]);
		return this.invokeHandlers(
			all,
			pointer,
			event,
			stage,
			value,
			previousValue,
			operation,
			originalPath,
		);
	}

	handleStructuralChange(pointer: string): void {
		const watcherIds = this.structuralWatchers.get(pointer);
		if (!watcherIds || watcherIds.size === 0) return;

		const data = this.dataMap.toJSON();
		for (const id of watcherIds) {
			const sub = this.subscriptions.get(id);
			if (!sub?.compiledPattern) continue;

			const newPointers = sub.compiledPattern.expand(data);
			const newExpanded = new Set(newPointers);

			const added: string[] = [];
			const removed: string[] = [];
			for (const p of newExpanded) if (!sub.expandedPaths.has(p)) added.push(p);
			for (const p of sub.expandedPaths)
				if (!newExpanded.has(p)) removed.push(p);

			for (const p of removed) this.removeFromReverseIndex(p, id);
			for (const p of added) {
				this.addToReverseIndex(p, id);
				this.bloomFilter.add(p);
				// notify new match
				const v = this.dataMap.get(p);
				this.invokeHandlers(
					new Set([id]),
					p,
					'set',
					'after',
					v,
					undefined,
					{ op: 'add', path: p, value: v } as any,
					sub.config.path,
				);
			}

			sub.expandedPaths = newExpanded;
		}
	}

	getMatchingSubscriptions(pointer: string): Subscription[] {
		const ids = new Set<string>([
			...(this.reverseIndex.get(pointer) ?? []),
			...this.findDynamicMatches(pointer),
		]);
		return [...ids].map((id) =>
			this.createPublicSubscription(this.subscriptions.get(id)!),
		);
	}

	private notifyDynamic(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		const ids = this.findDynamicMatches(pointer);
		return this.invokeHandlers(
			ids,
			pointer,
			event,
			stage,
			value,
			previousValue,
			operation,
			originalPath,
		);
	}

	private findDynamicMatches(pointer: string): Set<string> {
		const matches = new Set<string>();
		const getValue = (p: string) => this.dataMap.get(p);
		for (const [id, sub] of this.dynamicSubscriptions) {
			if (sub.compiledPattern?.match(pointer, getValue).matches)
				matches.add(id);
		}
		return matches;
	}

	private invokeHandlers(
		ids: Set<string>,
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		let cancelled = false;
		let transformedValue: unknown | undefined;
		let handlerCount = 0;
		let currentValue = value;

		for (const id of ids) {
			const sub = this.subscriptions.get(id);
			if (!sub) continue;
			if (!shouldInvoke(sub.config, stage, event)) continue;

			handlerCount++;
			const cancel = () => {
				cancelled = true;
			};

			const info: SubscriptionEventInfo = {
				type: event,
				stage,
				pointer,
				originalPath,
				operation,
				previousValue,
			};

			const ret = sub.config.fn(
				currentValue,
				info,
				cancel,
				this.dataMap,
				this.dataMap.context as any,
			);
			if (ret !== undefined) {
				transformedValue = ret;
				currentValue = ret;
			}
			if (cancelled) break;
		}

		return { cancelled, transformedValue, handlerCount };
	}

	private createPublicSubscription(
		sub: InternalSubscription<T, Ctx>,
	): Subscription {
		return {
			id: sub.id,
			query: sub.config.path,
			compiledPattern: sub.compiledPattern,
			expandedPaths: sub.expandedPaths,
			isDynamic: sub.isDynamic,
			unsubscribe: () => this.unregister(sub.id),
		};
	}

	private addToReverseIndex(pointer: string, subscriptionId: string): void {
		let set = this.reverseIndex.get(pointer);
		if (!set) {
			set = new Set();
			this.reverseIndex.set(pointer, set);
		}
		set.add(subscriptionId);
	}

	private removeFromReverseIndex(
		pointer: string,
		subscriptionId: string,
	): void {
		const set = this.reverseIndex.get(pointer);
		if (!set) return;
		set.delete(subscriptionId);
		if (set.size === 0) this.reverseIndex.delete(pointer);
	}

	private addStructuralWatcher(pointer: string, subscriptionId: string): void {
		let set = this.structuralWatchers.get(pointer);
		if (!set) {
			set = new Set();
			this.structuralWatchers.set(pointer, set);
		}
		set.add(subscriptionId);
	}
}
```

### packages/data-map/core/src/subscription/dynamic.spec.ts

Copy and paste into `packages/data-map/core/src/subscription/dynamic.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('dynamic subscriptions', () => {
	it('notifies when a matching pointer changes', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		const calls: string[] = [];

		dm.subscribe({
			path: '$.users[*].name',
			on: 'patch',
			fn: (_value, event) => {
				calls.push(event.pointer);
			},
		});

		dm.patch([{ op: 'replace', path: '/users/1/name', value: 'X' }]);
		expect(calls).toEqual(['/users/1/name']);
	});

	it('re-expands on structural changes and notifies added matches', () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		const calls: string[] = [];

		dm.subscribe({
			path: '$.users[*].name',
			after: 'set',
			fn: (_value, event) => {
				calls.push(`${event.type}:${event.pointer}`);
			},
		});

		// structural change: add new user
		dm.patch([{ op: 'add', path: '/users/1', value: { name: 'B' } }]);
		// trigger re-expansion for /users
		(dm as any)._subs.handleStructuralChange('/users');

		expect(calls).toContain('set:/users/1/name');
	});
});
```

### Step 9 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 9 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add dynamic JSONPath subscriptions

- Add Bloom filter and dynamic subscription matching
- Compile JSONPath subscriptions to patterns and expand to pointers
- Re-expand dynamic subscriptions on structural changes
- Add unit tests

completes: step 9 of 12 for DataMap Core
```

---

## Step 10: Batch API & transaction support

- [ ] Implement `batch` API accumulating ops
- [ ] Ensure atomic apply with rollback (no partial changes)
- [ ] Add unit tests

### packages/data-map/core/src/batch.ts

Copy and paste into `packages/data-map/core/src/batch.ts`:

```ts
import type { Operation } from './types';
import type { DataMap } from './datamap';

export interface Batch<Target extends DataMap<any, any>> {
	set(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this;
	setAll(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this;
	map(
		pathOrPointer: string,
		mapperFn: Function,
		options?: { strict?: boolean },
	): this;
	patch(ops: Operation[], options?: { strict?: boolean }): this;
	apply(): Target;
	toPatch(): Operation[];
}

export class BatchImpl<T, Ctx> implements Batch<DataMap<T, Ctx>> {
	private readonly target: DataMap<T, Ctx>;
	private ops: Operation[] = [];
	private working: unknown;

	constructor(target: DataMap<T, Ctx>) {
		this.target = target;
		this.working = target.getSnapshot();
	}

	set(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this {
		const tmp = new (this.target.constructor as any)(this.working, {
			strict: options?.strict ?? false,
			context: this.target.context,
		});
		const nextOps: Operation[] = tmp.set.toPatch(pathOrPointer, value, options);
		this.ops.push(...nextOps);
		this.working = tmp.patch(nextOps).getSnapshot();
		return this;
	}

	setAll(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this {
		const tmp = new (this.target.constructor as any)(this.working, {
			strict: options?.strict ?? false,
			context: this.target.context,
		});
		const nextOps: Operation[] = tmp.setAll.toPatch(
			pathOrPointer,
			value,
			options,
		);
		this.ops.push(...nextOps);
		this.working = tmp.patch(nextOps).getSnapshot();
		return this;
	}

	map(
		pathOrPointer: string,
		mapperFn: Function,
		options?: { strict?: boolean },
	): this {
		const tmp = new (this.target.constructor as any)(this.working, {
			strict: options?.strict ?? false,
			context: this.target.context,
		});
		const nextOps: Operation[] = tmp.map.toPatch(
			pathOrPointer,
			mapperFn as any,
			options,
		);
		this.ops.push(...nextOps);
		this.working = tmp.patch(nextOps).getSnapshot();
		return this;
	}

	patch(ops: Operation[]): this {
		const tmp = new (this.target.constructor as any)(this.working, {
			strict: false,
			context: this.target.context,
		});
		this.ops.push(...ops);
		this.working = tmp.patch(ops).getSnapshot();
		return this;
	}

	apply(): DataMap<T, Ctx> {
		const ops = this.toPatch();
		this.target.patch(ops);
		return this.target;
	}

	toPatch(): Operation[] {
		const out = this.ops.slice();
		this.ops = [];
		this.working = this.target.getSnapshot();
		return out;
	}
}
```

### packages/data-map/core/src/datamap.ts

Add `batch` to `DataMap`:

```ts
import { BatchImpl } from './batch';

// inside class DataMap

get batch(): BatchImpl<T, Ctx> {
	return new BatchImpl(this);
}
```

### packages/data-map/core/src/batch.spec.ts

Copy and paste into `packages/data-map/core/src/batch.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from './datamap';

describe('batch', () => {
	it('accumulates ops and applies atomically', () => {
		const dm = new DataMap({ user: { name: 'A', email: 'a@x.com' } });
		dm.batch.set('$.user.name', 'B').set('$.user.email', 'b@x.com').apply();
		expect(dm.get('/user/name')).toBe('B');
		expect(dm.get('/user/email')).toBe('b@x.com');
	});

	it('toPatch returns ops without applying', () => {
		const dm = new DataMap({ user: { name: 'A' } });
		const ops = dm.batch.set('$.user.name', 'B').toPatch();
		expect(dm.get('/user/name')).toBe('A');
		expect(ops).toEqual([{ op: 'replace', path: '/user/name', value: 'B' }]);
	});
});
```

### Step 10 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 10 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add batch API

- Implement BatchImpl accumulating operations
- Apply accumulated operations atomically
- Add unit tests for batch.apply and batch.toPatch

completes: step 10 of 12 for DataMap Core
```

---

## Step 11: Dynamic value definitions

- [ ] Add Definition types + DefinitionFactory support
- [ ] Apply getter/setter transforms on reads/writes
- [ ] Enforce readOnly
- [ ] Add unit tests

### packages/data-map/core/src/definitions/types.ts

Copy and paste into `packages/data-map/core/src/definitions/types.ts`:

```ts
import type { DataMap } from '../datamap';

export type GetterFn<T, Ctx> = (
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;

export interface GetterConfig<T, Ctx> {
	fn: GetterFn<T, Ctx>;
	deps?: string[];
}

export type SetterFn<T, Ctx> = (
	newValue: unknown,
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;

export interface SetterConfig<T, Ctx> {
	fn: SetterFn<T, Ctx>;
	deps?: string[];
}

export interface DefinitionBase<T, Ctx> {
	get?: GetterFn<T, Ctx> | GetterConfig<T, Ctx>;
	set?: SetterFn<T, Ctx> | SetterConfig<T, Ctx>;
	deps?: string[];
	readOnly?: boolean;
	defaultValue?: unknown;
}

export interface DefinitionWithPath<T, Ctx> extends DefinitionBase<T, Ctx> {
	path: string;
	pointer?: never;
}

export interface DefinitionWithPointer<T, Ctx> extends DefinitionBase<T, Ctx> {
	pointer: string;
	path?: never;
}

export type Definition<T, Ctx> =
	| DefinitionWithPath<T, Ctx>
	| DefinitionWithPointer<T, Ctx>;

export type DefinitionFactory<T, Ctx> = (
	instance: DataMap<T, Ctx>,
	ctx: Ctx,
) => Definition<T, Ctx> | Definition<T, Ctx>[];
```

### packages/data-map/core/src/definitions/registry.ts

Copy and paste into `packages/data-map/core/src/definitions/registry.ts`:

```ts
import { detectPathType } from '../path/detect';
import { compilePathPattern } from '../path/compile';
import type { CompiledPathPattern } from '../path/compile';

import type { Definition, DefinitionFactory } from './types';
import type { DataMap } from '../datamap';

interface InternalDefinition<T, Ctx> {
	def: Definition<T, Ctx>;
	pattern: CompiledPathPattern | null;
}

export class DefinitionRegistry<T, Ctx> {
	private readonly defs: InternalDefinition<T, Ctx>[] = [];
	private readonly dataMap: DataMap<T, Ctx>;

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
		if ('path' in def) {
			this.defs.push({ def, pattern: compilePathPattern(def.path) });
			return;
		}
		this.defs.push({ def, pattern: null });
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

	getDepValues(def: Definition<T, Ctx>, ctx: Ctx): unknown[] {
		const deps = def.deps ?? [];
		return deps.map((d) => this.dataMap.get(d, { strict: false }));
	}

	applyGetter(pointer: string, rawValue: unknown, ctx: Ctx): unknown {
		const defs = this.findForPointer(pointer);
		let v = rawValue;
		for (const def of defs) {
			if (!def.get) continue;
			const cfg = typeof def.get === 'function' ? { fn: def.get } : def.get;
			const depValues = (cfg.deps ?? def.deps ?? []).map((d) =>
				this.dataMap.get(d, { strict: false }),
			);
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

### packages/data-map/core/src/types.ts

Update `packages/data-map/core/src/types.ts` `DataMapOptions` to include definitions and subscriptions (replace `DataMapOptions`):

```ts
import type { Definition, DefinitionFactory } from './definitions/types';
import type { SubscriptionConfig } from './subscription/types';

export interface DataMapOptions<T = unknown, Ctx = unknown> {
	strict?: boolean;
	context?: Ctx;
	define?: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[];
	subscribe?: SubscriptionConfig<T, Ctx>[];
}
```

### packages/data-map/core/src/datamap.ts

Integrate the registry:

1. Add imports:

```ts
import { DefinitionRegistry } from './definitions/registry';
```

2. Add a private field:

```ts
private readonly _defs = new DefinitionRegistry<T, Ctx>(this);
```

3. In the constructor, after `_data` is initialized:

```ts
if (options.define && options.context !== undefined) {
	this._defs.registerAll(options.define, options.context);
}
if (options.subscribe) {
	for (const s of options.subscribe) this.subscribe(s);
}
```

4. In `resolve()` and `get()` / `getAll()`, apply getter transforms before returning values. The simplest place is in `resolve()` when building `ResolvedMatch[]`:

```ts
const ctx = this._context as any;
return pointers.map((pointer, idx) => ({
	pointer,
	value: cloneSnapshot(this._defs.applyGetter(pointer, values[idx], ctx)),
}));
```

and for JSON Pointer reads:

```ts
return [
	{
		pointer: pointerString,
		value: cloneSnapshot(this._defs.applyGetter(pointerString, resolved, ctx)),
	},
];
```

5. In `set()` / `setAll()` / `map()`, before generating the patch, transform the value via `applySetter(pointer, newValue, currentValue, ctx)`.

### packages/data-map/core/src/definitions/definitions.spec.ts

Copy and paste into `packages/data-map/core/src/definitions/definitions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('definitions', () => {
	it('applies getter transform', () => {
		const dm = new DataMap(
			{ user: { name: 'alice' } },
			{
				context: {},
				define: [
					{
						pointer: '/user/name',
						get: (v) => String(v).toUpperCase(),
					},
				],
			},
		);
		expect(dm.get('/user/name')).toBe('ALICE');
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
		expect(() => dm.set('/user/id', 'y')).toThrow();
	});
});
```

### Step 11 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`

#### Step 11 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add computed definitions (getter/setter transforms)

- Add Definition types and registry
- Apply getter/setter transforms on reads/writes
- Enforce readOnly definitions
- Add unit tests

completes: step 11 of 12 for DataMap Core
```

---

## Step 12: Utility API & finalization

- [ ] Implement `equals`, `extends`, `clone` utilities
- [ ] Create package entry exports and README
- [ ] Add integration smoke tests

### packages/data-map/core/src/utils/equal.ts

Copy and paste into `packages/data-map/core/src/utils/equal.ts`:

```ts
export function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return a === b;
	if (typeof a !== 'object') return a === b;
	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
		return true;
	}

	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const k of aKeys) {
		if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
		if (!deepEqual(a[k], b[k])) return false;
	}
	return true;
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

### packages/data-map/core/src/index.ts

Copy and paste into `packages/data-map/core/src/index.ts`:

```ts
export { DataMap } from './datamap';
export type {
	Operation,
	CallOptions,
	DataMapOptions,
	ResolvedMatch,
} from './types';
export type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
	SubscriptionEventInfo,
} from './subscription/types';
export type { Definition, DefinitionFactory } from './definitions/types';
```

### packages/data-map/core/README.md

Copy and paste into `packages/data-map/core/README.md`:

````md
---
post_title: '@data-map/core'
author1: 'lmiller'
post_slug: 'data-map-core'
microsoft_alias: 'lmiller'
featured_image: ''
categories:
  - 'Developer Tools'
tags:
  - 'datamap'
  - 'jsonpath'
  - 'json-pointer'
ai_note: 'AI-assisted'
summary: 'Reactive JSON store with JSONPath/JSON Pointer access, RFC6902 patches, subscriptions, and batching.'
post_date: '2026-01-03'
---

## Overview

`@data-map/core` is a reactive data store built on top of `json-p3`.

## Quick Start

```ts
import { DataMap } from '@data-map/core';

const store = new DataMap({ user: { name: 'Alice' } });
store.set('$.user.name', 'Bob');
console.log(store.get('/user/name')); // "Bob"
```

## Subscriptions

```ts
const sub = store.subscribe({
	path: '/user/name',
	on: 'patch',
	fn: (value, event) => {
		console.log('changed', event.pointer, value);
	},
});

store.set('/user/name', 'Charlie');
sub.unsubscribe();
```

## Batch

```ts
store.batch
	.set('$.user.name', 'Dana')
	.set('$.user.email', 'dana@example.com')
	.apply();
```
````

### packages/data-map/core/src/utils/util.spec.ts

Copy and paste into `packages/data-map/core/src/utils/util.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { deepEqual, deepExtends } from './equal';

describe('utilities', () => {
	it('deepEqual works', () => {
		expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
		expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
	});

	it('deepExtends works', () => {
		expect(deepExtends({ a: { b: 1, c: 2 } }, { a: { b: 1 } })).toBe(true);
		expect(deepExtends({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
	});

	it('DataMap snapshots are immutable clones', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const snap = dm.getSnapshot() as any;
		snap.a.b = 999;
		expect(dm.get('/a/b')).toBe(1);
	});
});
```

### packages/data-map/core/src/datamap.utilities.ts

Append these methods to `class DataMap` in `packages/data-map/core/src/datamap.ts`:

```ts
import { deepEqual, deepExtends } from './utils/equal';

equals(other: DataMap<T, Ctx> | T): boolean {
	const otherValue = other instanceof (this.constructor as any) ? (other as any).toJSON() : other;
	return deepEqual(this.toJSON(), otherValue);
}

extends(other: Partial<T>): boolean {
	return deepExtends(this.toJSON(), other);
}

clone(): DataMap<T, Ctx> {
	return new (this.constructor as any)(this.getSnapshot(), { strict: this._strict, context: this._context });
}
```

### Step 12 Verification Checklist

- [ ] `pnpm turbo -F @data-map/core test`
- [ ] `pnpm turbo -F @data-map/core build`
- [ ] `pnpm turbo -F @data-map/core type-check`

#### Step 12 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```txt
feat(data-map): add utilities, exports, and README

- Add equals/extends/clone utilities
- Export public API from src/index.ts
- Add package README
- Add smoke tests

completes: step 12 of 12 for DataMap Core
```
