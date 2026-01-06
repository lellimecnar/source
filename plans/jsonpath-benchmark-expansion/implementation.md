# Implementation — JSONPath Benchmark Expansion (Exhaustive Multi‑Library Comparison)

**Plan source:** `plans/jsonpath-benchmark-expansion/plan.md`

## Objective

Create comprehensive, reproducible benchmarks comparing `@jsonpath/*` against:

- JSONPath: `jsonpath`, `jsonpath-plus`, `json-p3`
- JSON Pointer (RFC 6901): `@jsonpath/pointer`, `json-pointer`, (optionally) `rfc6902` Pointer
- JSON Patch (RFC 6902): `@jsonpath/patch`, `fast-json-patch`, `rfc6902`
- JSON Merge Patch (RFC 7386): `@jsonpath/merge-patch`, `json-merge-patch`

Benchmarks are authored as `vitest bench` suites in `packages/jsonpath/benchmarks/src/*.bench.ts`.

## Constraints & Repo Conventions

- **Never `cd` into subdirectories**. Run commands from repo root using `pnpm --filter ...`.
- Benchmarks package is ESM (`"type": "module"`). Use ESM imports.
- Prefer **granular workspace scripts** and repo patterns.
- **TDD framing (Red → Green → Refactor)** is applied via:
  - “Red”: add a new `*.spec.ts` smoke/unit test (import + basic behavior) that fails until implementation exists.
  - “Green”: implement the fixtures/adapters/bench module.
  - “Refactor”: remove duplication, normalize outputs, keep adapters small.

---

## Execution Plan (10 commits)

> Matches the plan’s “Summary Table”. Each commit has a message and a verification checklist.

1. deps: add external benchmark deps
2. fixtures: add generators/datasets/queries
3. adapters: add normalized adapters
4. bench: query fundamentals + filters
5. bench: scale + compilation/caching
6. bench: output formats + pointer
7. bench: patch + merge patch
8. bench: streaming + advanced @jsonpath features
9. bench: browser subset
10. infra/docs: reporting + scripts + README

---

## Step 1 — Add External Library Dependencies

### Goal

Add all external libs required for comparison to `@jsonpath/benchmarks`.

### Red (smoke test first)

Create a failing smoke test that imports all external libraries.

**Add file:** `packages/jsonpath/benchmarks/src/external-imports.smoke.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

// JSONPath
import { jsonpath } from 'json-p3';
// @ts-expect-error jsonpath has no bundled types
import jsonpathLegacy from 'jsonpath';
import { JSONPath as jsonpathPlus } from 'jsonpath-plus';

// JSON Patch
import * as fastJsonPatch from 'fast-json-patch';
import { applyPatch as applyPatchRfc6902 } from 'rfc6902';

// JSON Pointer
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import jsonPointer from 'json-pointer';

// JSON Merge Patch
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import jsonMergePatch from 'json-merge-patch';

describe('external imports smoke', () => {
	it('imports load expected entrypoints', () => {
		expect(typeof jsonpath.query).toBe('function');
		expect(typeof jsonpathLegacy.query).toBe('function');
		expect(typeof jsonpathPlus).toBe('function');

		expect(typeof fastJsonPatch.applyPatch).toBe('function');
		expect(typeof applyPatchRfc6902).toBe('function');

		expect(typeof jsonPointer.get).toBe('function');
		expect(typeof jsonPointer.set).toBe('function');

		expect(typeof jsonMergePatch.apply).toBe('function');
		expect(typeof jsonMergePatch.generate).toBe('function');
	});
});
```

Run (expected failing until deps are installed):

```bash
pnpm --filter @jsonpath/benchmarks exec vitest run
```

### Green (add deps)

Update `packages/jsonpath/benchmarks/package.json` dependencies.

**Edit file:** `packages/jsonpath/benchmarks/package.json`

Add these dependencies:

- `json-p3`
- `fast-json-patch`
- `json-pointer`
- `rfc6902`
- `json-merge-patch`

Command (recommended):

```bash
pnpm --filter @jsonpath/benchmarks add json-p3 fast-json-patch json-pointer rfc6902 json-merge-patch
pnpm install
```

Re-run smoke test:

```bash
pnpm --filter @jsonpath/benchmarks exec vitest run
```

### Refactor

If TypeScript complains about missing types:

- keep `@ts-expect-error` for `jsonpath`
- keep the `eslint-disable` for default-imported CJS modules

### Commit

`benchmarks: add external deps + import smoke test`

### Verify

- `pnpm --filter @jsonpath/benchmarks exec vitest run` passes
- `pnpm --filter @jsonpath/benchmarks bench` still runs

---

## Step 2 — Create Benchmark Fixtures & Data Generators

### Goal

Provide standardized datasets and query catalogs for fair comparisons.

### Red

Add generator unit tests before implementation.

**Add file:** `packages/jsonpath/benchmarks/src/fixtures/data-generators.spec.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
	generateDeepObject,
	generateLargeArray,
	generateWideObject,
	generateMixedData,
} from './data-generators.js';

describe('fixtures generators', () => {
	it('generateLargeArray creates correct length', () => {
		const arr = generateLargeArray(1000);
		expect(arr).toHaveLength(1000);
		expect(arr[0]).toHaveProperty('id');
	});

	it('generateDeepObject creates nested structure', () => {
		const obj = generateDeepObject(5);
		let cur: any = obj;
		for (let i = 0; i < 5; i++) {
			expect(cur).toHaveProperty('next');
			cur = cur.next;
		}
	});

	it('generateWideObject creates width keys', () => {
		const obj = generateWideObject(100);
		expect(Object.keys(obj)).toHaveLength(100);
	});

	it('generateMixedData is JSON-serializable', () => {
		const data = generateMixedData();
		expect(() => JSON.stringify(data)).not.toThrow();
	});
});
```

### Green

Create the fixtures modules.

#### Add file: `packages/jsonpath/benchmarks/src/fixtures/data-generators.ts`

```ts
export type LargeArrayItem = {
	id: number;
	value: number;
	active: boolean;
	group: string;
	tags: string[];
};

export function generateLargeArray(size: number): LargeArrayItem[] {
	const out: LargeArrayItem[] = [];
	for (let i = 0; i < size; i++) {
		out.push({
			id: i,
			value: i % 10,
			active: i % 3 === 0,
			group: `g${i % 10}`,
			tags: [i % 2 === 0 ? 'even' : 'odd', `mod${i % 5}`],
		});
	}
	return out;
}

export type DeepNode = {
	level: number;
	value: string;
	next?: DeepNode;
};

export function generateDeepObject(depth: number): DeepNode {
	let node: DeepNode = { level: depth, value: `v${depth}` };
	for (let d = depth - 1; d >= 0; d--) {
		node = { level: d, value: `v${d}`, next: node };
	}
	return node;
}

export function generateWideObject(width: number): Record<string, number> {
	const obj: Record<string, number> = {};
	for (let i = 0; i < width; i++) {
		obj[`prop${i}`] = i;
	}
	return obj;
}

export function generateMixedData(): unknown {
	return {
		store: {
			book: [
				{
					category: 'reference',
					author: 'Nigel Rees',
					title: 'Sayings',
					price: 8.95,
				},
				{
					category: 'fiction',
					author: 'Evelyn Waugh',
					title: 'Sword',
					price: 12.99,
				},
				{
					category: 'fiction',
					author: 'Herman Melville',
					title: 'Moby Dick',
					isbn: '0-553',
					price: 8.99,
				},
				{
					category: 'fiction',
					author: 'J. R. R. Tolkien',
					title: 'The Lord',
					isbn: '0-395',
					price: 22.99,
				},
			],
			bicycle: { color: 'red', price: 19.95 },
		},
		users: [
			{ name: 'Sue', score: 100, active: true },
			{ name: 'John', score: 86, active: true },
			{ name: 'Sally', score: 84, active: false },
			{ name: 'Jane', score: 55, active: false },
		],
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/fixtures/datasets.ts`

```ts
import {
	generateDeepObject,
	generateLargeArray,
	generateMixedData,
	generateWideObject,
} from './data-generators.js';

export const STORE_DATA = generateMixedData();

export const LARGE_ARRAY_100 = generateLargeArray(100);
export const LARGE_ARRAY_1K = generateLargeArray(1_000);
export const LARGE_ARRAY_10K = generateLargeArray(10_000);
export const LARGE_ARRAY_100K = generateLargeArray(100_000);

export const DEEP_OBJECT_5 = generateDeepObject(5);
export const DEEP_OBJECT_10 = generateDeepObject(10);
export const DEEP_OBJECT_20 = generateDeepObject(20);

export const WIDE_OBJECT_10 = generateWideObject(10);
export const WIDE_OBJECT_100 = generateWideObject(100);
export const WIDE_OBJECT_1000 = generateWideObject(1000);
```

#### Add file: `packages/jsonpath/benchmarks/src/fixtures/queries.ts`

```ts
export const QUERY_CATEGORIES = {
	basic: {
		singleValue: ['$.store.bicycle.color', '$.store.book[0].title'],
		wildcards: ['$.store.book[*].title', '$.store.*'],
		recursive: ['$..author', '$..price'],
	},
	indexing: {
		indices: ['$.store.book[0]', '$.store.book[-1]'],
		unions: ['$.store.book[0,1,2].title'],
		slices: ['$.store.book[0:3].title'],
	},
	filters: {
		simple: [
			'$.store.book[?(@.price < 10)].title',
			'$.users[?(@.active == true)].name',
		],
		logical: ['$.users[?(@.score >= 80 && @.active == true)].name'],
		arithmetic: ['$.users[?(@.score + 10 > 90)].name'],
	},
} as const;
```

#### Add file: `packages/jsonpath/benchmarks/src/fixtures/index.ts`

```ts
export * from './data-generators.js';
export * from './datasets.js';
export * from './queries.js';
```

Run unit tests:

```bash
pnpm --filter @jsonpath/benchmarks exec vitest run
```

### Refactor

If any generator becomes hot-path for benches, keep it precomputed in `datasets.ts` and avoid recomputing inside `bench()`.

### Commit

`benchmarks: add fixtures generators + datasets + query catalogs`

### Verify

- `pnpm --filter @jsonpath/benchmarks exec vitest run` passes

---

## Step 3 — Create Library Wrapper Abstractions (Adapters)

### Goal

Normalize API differences between libraries for fair comparison.

### Red

Create adapter smoke tests first.

**Add file:** `packages/jsonpath/benchmarks/src/adapters/adapters.smoke.spec.ts`

```ts
import { describe, expect, it } from 'vitest';
import { STORE_DATA } from '../fixtures/index.js';
import {
	getQueryAdapters,
	getPointerAdapters,
	getPatchAdapters,
	getMergePatchAdapters,
} from './index.js';

describe('adapters smoke', () => {
	it('query adapters return arrays of values', () => {
		for (const adapter of getQueryAdapters()) {
			const res = adapter.query('$.store.book[*].title', STORE_DATA);
			expect(Array.isArray(res)).toBe(true);
		}
	});

	it('pointer adapters resolve shallow paths', () => {
		for (const adapter of getPointerAdapters()) {
			const res = adapter.get('/store/bicycle/color', STORE_DATA as any);
			expect(res).toBe('red');
		}
	});

	it('patch adapters apply simple replace', () => {
		const patch = [
			{ op: 'replace', path: '/store/bicycle/color', value: 'blue' },
		] as any;
		for (const adapter of getPatchAdapters()) {
			const out = adapter.apply(patch, structuredClone(STORE_DATA) as any);
			expect((out as any).store.bicycle.color).toBe('blue');
		}
	});

	it('merge patch adapters apply null delete semantics', () => {
		const patch = { store: { bicycle: { color: null } } };
		for (const adapter of getMergePatchAdapters()) {
			const out = adapter.apply(patch, structuredClone(STORE_DATA) as any);
			expect((out as any).store.bicycle.color).toBeUndefined();
		}
	});
});
```

### Green

Create adapter modules.

#### Add file: `packages/jsonpath/benchmarks/src/adapters/index.ts`

```ts
import { createJsonpathAdapter } from './jsonpath-adapter.js';
import { createJsonpathPlusAdapter } from './jsonpath-plus-adapter.js';
import { createJsonP3Adapter } from './json-p3-adapter.js';
import { createLellimecnarAdapter } from './lellimecnar-adapter.js';
import {
	createJsonPointerAdapter,
	createLellimecnarPointerAdapter,
} from './pointer-adapters.js';
import {
	createFastJsonPatchAdapter,
	createLellimecnarPatchAdapter,
	createRfc6902PatchAdapter,
} from './patch-adapters.js';
import {
	createJsonMergePatchAdapter,
	createLellimecnarMergePatchAdapter,
} from './merge-patch-adapters.js';

export type Feature =
	| 'jsonpath.basic'
	| 'jsonpath.filters'
	| 'jsonpath.slices'
	| 'jsonpath.unions'
	| 'jsonpath.recursive'
	| 'output.paths'
	| 'pointer.set'
	| 'patch.diff'
	| 'mergePatch.generate'
	| 'streaming';

export interface QueryAdapter {
	name: string;
	query(path: string, data: unknown): unknown[];
	paths?: (path: string, data: unknown) => string[];
	supportsFeature(feature: Feature): boolean;
}

export interface PointerAdapter {
	name: string;
	get(pointer: string, data: unknown): unknown;
	set?: (pointer: string, data: unknown, value: unknown) => unknown;
	remove?: (pointer: string, data: unknown) => unknown;
	supportsFeature(feature: Feature): boolean;
}

export type PatchOperation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

export interface PatchAdapter {
	name: string;
	apply(patch: PatchOperation[], data: unknown): unknown;
	diff?: (source: unknown, target: unknown) => PatchOperation[];
	supportsFeature(feature: Feature): boolean;
}

export interface MergePatchAdapter {
	name: string;
	apply(patch: unknown, data: unknown): unknown;
	generate?: (source: unknown, target: unknown) => unknown;
	supportsFeature(feature: Feature): boolean;
}

export function getQueryAdapters(): QueryAdapter[] {
	return [
		createLellimecnarAdapter(),
		createJsonpathAdapter(),
		createJsonpathPlusAdapter(),
		createJsonP3Adapter(),
	];
}

export function getPointerAdapters(): PointerAdapter[] {
	return [createLellimecnarPointerAdapter(), createJsonPointerAdapter()];
}

export function getPatchAdapters(): PatchAdapter[] {
	return [
		createLellimecnarPatchAdapter(),
		createFastJsonPatchAdapter(),
		createRfc6902PatchAdapter(),
	];
}

export function getMergePatchAdapters(): MergePatchAdapter[] {
	return [createLellimecnarMergePatchAdapter(), createJsonMergePatchAdapter()];
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/lellimecnar-adapter.ts`

```ts
import { queryValues, queryPaths } from '@jsonpath/jsonpath';
import type { Feature, QueryAdapter } from './index.js';

export function createLellimecnarAdapter(): QueryAdapter {
	return {
		name: '@jsonpath/jsonpath',
		query(path, data) {
			return queryValues(data as any, path) as unknown[];
		},
		paths(path, data) {
			return queryPaths(data as any, path) as string[];
		},
		supportsFeature(feature: Feature) {
			return (
				feature === 'jsonpath.basic' ||
				feature === 'jsonpath.filters' ||
				feature === 'jsonpath.slices' ||
				feature === 'jsonpath.unions' ||
				feature === 'jsonpath.recursive' ||
				feature === 'output.paths'
			);
		},
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/jsonpath-adapter.ts`

```ts
import type { Feature, QueryAdapter } from './index.js';
// @ts-expect-error jsonpath has no bundled types
import jsonpath from 'jsonpath';

export function createJsonpathAdapter(): QueryAdapter {
	return {
		name: 'jsonpath',
		query(path, data) {
			return jsonpath.query(data, path) as unknown[];
		},
		supportsFeature(feature: Feature) {
			return (
				feature === 'jsonpath.basic' ||
				feature === 'jsonpath.filters' ||
				feature === 'jsonpath.recursive'
			);
		},
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/jsonpath-plus-adapter.ts`

```ts
import type { Feature, QueryAdapter } from './index.js';
import { JSONPath } from 'jsonpath-plus';

export function createJsonpathPlusAdapter(): QueryAdapter {
	return {
		name: 'jsonpath-plus',
		query(path, data) {
			return JSONPath({ path, json: data, resultType: 'value' }) as unknown[];
		},
		paths(path, data) {
			return JSONPath({ path, json: data, resultType: 'path' }) as string[];
		},
		supportsFeature(feature: Feature) {
			return (
				feature === 'jsonpath.basic' ||
				feature === 'jsonpath.filters' ||
				feature === 'jsonpath.slices' ||
				feature === 'jsonpath.unions' ||
				feature === 'jsonpath.recursive' ||
				feature === 'output.paths'
			);
		},
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/json-p3-adapter.ts`

```ts
import type { Feature, QueryAdapter } from './index.js';
import { jsonpath } from 'json-p3';

export function createJsonP3Adapter(): QueryAdapter {
	return {
		name: 'json-p3',
		query(path, data) {
			// Verified usage from npm README:
			// const nodes = jsonpath.query(expr, data); nodes.values();
			const nodes = jsonpath.query(path, data as any);
			return nodes.values() as unknown[];
		},
		supportsFeature(feature: Feature) {
			return (
				feature === 'jsonpath.basic' ||
				feature === 'jsonpath.filters' ||
				feature === 'jsonpath.recursive'
			);
		},
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/pointer-adapters.ts`

```ts
import type { Feature, PointerAdapter } from './index.js';
import { JSONPointer } from '@jsonpath/pointer';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import jsonPointer from 'json-pointer';

export function createLellimecnarPointerAdapter(): PointerAdapter {
	return {
		name: '@jsonpath/pointer',
		get(pointer, data) {
			return JSONPointer.parse(pointer).resolve(data as any);
		},
		set(pointer, data, value) {
			const cloned: any = structuredClone(data);
			JSONPointer.parse(pointer).set(cloned, value);
			return cloned;
		},
		remove(pointer, data) {
			const cloned: any = structuredClone(data);
			JSONPointer.parse(pointer).remove(cloned);
			return cloned;
		},
		supportsFeature(feature: Feature) {
			return feature === 'pointer.set';
		},
	};
}

export function createJsonPointerAdapter(): PointerAdapter {
	return {
		name: 'json-pointer',
		get(pointer, data) {
			return (jsonPointer as any).get(data as any, pointer);
		},
		set(pointerPath, data, value) {
			const cloned: any = structuredClone(data);
			(jsonPointer as any).set(cloned, pointerPath, value);
			return cloned;
		},
		remove(pointerPath, data) {
			const cloned: any = structuredClone(data);
			(jsonPointer as any).remove(cloned, pointerPath);
			return cloned;
		},
		supportsFeature(feature: Feature) {
			return feature === 'pointer.set';
		},
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/patch-adapters.ts`

```ts
import type { Feature, PatchAdapter, PatchOperation } from './index.js';
import { applyPatch as lellimecnarApplyPatch } from '@jsonpath/patch';
import * as fastJsonPatch from 'fast-json-patch';
import { applyPatch as rfc6902ApplyPatch } from 'rfc6902';

export function createLellimecnarPatchAdapter(): PatchAdapter {
	return {
		name: '@jsonpath/patch',
		apply(patch, data) {
			return lellimecnarApplyPatch(data as any, patch as any);
		},
		supportsFeature(feature: Feature) {
			return feature !== 'patch.diff';
		},
	};
}

export function createFastJsonPatchAdapter(): PatchAdapter {
	return {
		name: 'fast-json-patch',
		apply(patch, data) {
			const doc: any = structuredClone(data);
			return fastJsonPatch.applyPatch(doc, patch as any, false, true)
				.newDocument;
		},
		supportsFeature(feature: Feature) {
			return feature !== 'patch.diff';
		},
	};
}

export function createRfc6902PatchAdapter(): PatchAdapter {
	return {
		name: 'rfc6902',
		apply(patch, data) {
			const doc: any = structuredClone(data);
			const results = rfc6902ApplyPatch(doc, patch as any);
			for (const r of results) {
				if (r) throw r;
			}
			return doc;
		},
		diff(source, target) {
			// rfc6902.createPatch exists, but diff is optional in plan
			return [] as PatchOperation[];
		},
		supportsFeature(feature: Feature) {
			return feature !== 'patch.diff';
		},
	};
}
```

#### Add file: `packages/jsonpath/benchmarks/src/adapters/merge-patch-adapters.ts`

```ts
import type { Feature, MergePatchAdapter } from './index.js';
import { mergePatch } from '@jsonpath/jsonpath';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import jsonMergePatch from 'json-merge-patch';

export function createLellimecnarMergePatchAdapter(): MergePatchAdapter {
	return {
		name: '@jsonpath/merge-patch',
		apply(patch, data) {
			return mergePatch.apply(data as any, patch as any);
		},
		generate(source, target) {
			return mergePatch.generate(source as any, target as any);
		},
		supportsFeature(feature: Feature) {
			return feature === 'mergePatch.generate' || feature === 'jsonpath.basic';
		},
	};
}

export function createJsonMergePatchAdapter(): MergePatchAdapter {
	return {
		name: 'json-merge-patch',
		apply(patch, data) {
			return (jsonMergePatch as any).apply(data as any, patch as any);
		},
		generate(source, target) {
			return (jsonMergePatch as any).generate(source as any, target as any);
		},
		supportsFeature(feature: Feature) {
			return feature === 'mergePatch.generate' || feature === 'jsonpath.basic';
		},
	};
}
```

Run:

```bash
pnpm --filter @jsonpath/benchmarks exec vitest run
```

### Refactor

- Keep adapters tiny and pure.
- Prefer `structuredClone()` to avoid cross-benchmark mutation.

### Commit

`benchmarks: add normalized adapters for query/pointer/patch/merge-patch`

### Verify

- `pnpm --filter @jsonpath/benchmarks exec vitest run` passes

---

## Step 4 — JSONPath Query Benchmarks (Fundamentals) + Step 5 Filters

### Goal

Benchmark core JSONPath features and filter expressions.

### Green (bench files)

#### Add file: `packages/jsonpath/benchmarks/src/query-fundamentals.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from './fixtures/index.js';
import { getQueryAdapters } from './adapters/index.js';

describe('JSONPath: Fundamentals', () => {
	const adapters = getQueryAdapters();

	describe('Basic Path Access', () => {
		const queries = [
			'$.store.bicycle.color',
			'$.store.book[0].title',
			'$.store.book[*].title',
		];
		for (const q of queries) {
			describe(q, () => {
				for (const adapter of adapters) {
					bench(adapter.name, () => {
						adapter.query(q, STORE_DATA);
					});
				}
			});
		}
	});

	describe('Recursive Descent', () => {
		const q = '$..author';
		for (const adapter of adapters) {
			if (!adapter.supportsFeature('jsonpath.recursive')) continue;
			bench(adapter.name, () => adapter.query(q, STORE_DATA));
		}
	});
});
```

#### Add file: `packages/jsonpath/benchmarks/src/filter-expressions.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from './fixtures/index.js';
import { getQueryAdapters } from './adapters/index.js';

describe('JSONPath: Filter Expressions', () => {
	const adapters = getQueryAdapters();

	const suites: Array<{ name: string; query: string }> = [
		{ name: 'simple comparison', query: '$.store.book[?(@.price < 10)].title' },
		{ name: 'boolean check', query: '$.users[?(@.active == true)].name' },
		{
			name: 'logical &&',
			query: '$.users[?(@.score >= 80 && @.active == true)].name',
		},
		{ name: 'arithmetic', query: '$.users[?(@.score + 10 > 90)].name' },
	];

	for (const suite of suites) {
		describe(suite.name, () => {
			for (const adapter of adapters) {
				if (!adapter.supportsFeature('jsonpath.filters')) continue;
				bench(adapter.name, () => adapter.query(suite.query, STORE_DATA));
			}
		});
	}
});
```

Run:

```bash
pnpm --filter @jsonpath/benchmarks bench
```

### Commit

`benchmarks: add fundamentals + filter expression benches`

### Verify

- `pnpm --filter @jsonpath/benchmarks bench` runs with no runtime errors

---

## Step 6 — Scale Testing + Step 7 Compilation/Caching

### Goal

Measure performance at different dataset scales and compiled vs interpreted modes.

#### Add file: `packages/jsonpath/benchmarks/src/scale-testing.bench.ts`

```ts
import { bench, describe } from 'vitest';
import {
	LARGE_ARRAY_100,
	LARGE_ARRAY_1K,
	LARGE_ARRAY_10K,
	DEEP_OBJECT_10,
	WIDE_OBJECT_1000,
} from './fixtures/index.js';
import { getQueryAdapters } from './adapters/index.js';

describe('Scale Testing', () => {
	const adapters = getQueryAdapters();

	describe('Large Arrays: $[*].value', () => {
		const datasets = [
			{ name: '100', data: LARGE_ARRAY_100 },
			{ name: '1K', data: LARGE_ARRAY_1K },
			{ name: '10K', data: LARGE_ARRAY_10K },
		];

		for (const ds of datasets) {
			describe(ds.name, () => {
				for (const adapter of adapters) {
					bench(adapter.name, () => adapter.query('$[*].value', ds.data));
				}
			});
		}
	});

	describe('Deep Nesting: $.next.next.next.value', () => {
		const q = '$.next.next.next.next.next.value';
		for (const adapter of adapters) {
			bench(adapter.name, () => adapter.query(q, DEEP_OBJECT_10));
		}
	});

	describe('Wide Objects: $.prop999', () => {
		for (const adapter of adapters) {
			bench(adapter.name, () => adapter.query('$.prop999', WIDE_OBJECT_1000));
		}
	});
});
```

#### Add file: `packages/jsonpath/benchmarks/src/compilation-caching.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { compileQuery, queryValues } from '@jsonpath/jsonpath';
import { STORE_DATA } from './fixtures/index.js';

describe('Compilation & Caching (@jsonpath/jsonpath)', () => {
	const path = '$.store.book[?(@.price < 10)].title';

	describe('Cold: interpreted', () => {
		bench('queryValues', () => {
			queryValues(STORE_DATA as any, path);
		});
	});

	describe('Warm: compiled reuse', () => {
		const compiled = compileQuery(path);
		bench('compileQuery() once, execute', () => {
			compiled.values(STORE_DATA as any);
		});
	});
});
```

### Commit

`benchmarks: add scale testing + compilation/caching benches`

### Verify

- `pnpm --filter @jsonpath/benchmarks bench` runs

---

## Step 8 — Output Format Benchmarks + Step 9 Pointer Benchmarks

### Goal

Compare value/path output behavior and pointer performance.

#### Add file: `packages/jsonpath/benchmarks/src/output-formats.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from './fixtures/index.js';
import { getQueryAdapters } from './adapters/index.js';

describe('Output Formats', () => {
	const adapters = getQueryAdapters();
	const q = '$.store.book[*].title';

	describe('Values', () => {
		for (const adapter of adapters) {
			bench(adapter.name, () => adapter.query(q, STORE_DATA));
		}
	});

	describe('Paths', () => {
		for (const adapter of adapters) {
			if (!adapter.paths || !adapter.supportsFeature('output.paths')) continue;
			bench(adapter.name, () => adapter.paths!(q, STORE_DATA));
		}
	});
});
```

#### Add file: `packages/jsonpath/benchmarks/src/pointer-rfc6901.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from './fixtures/index.js';
import { getPointerAdapters } from './adapters/index.js';

describe('JSON Pointer (RFC 6901)', () => {
	const adapters = getPointerAdapters();

	describe('Resolution', () => {
		const pointers = ['/store/bicycle/color', '/store/book/0/title'];
		for (const p of pointers) {
			describe(p, () => {
				for (const adapter of adapters) {
					bench(adapter.name, () => adapter.get(p, STORE_DATA));
				}
			});
		}
	});
});
```

### Commit

`benchmarks: add output-format + pointer benches`

### Verify

- `pnpm --filter @jsonpath/benchmarks bench`

---

## Step 10 — Patch Benchmarks (RFC 6902) + Step 11 Merge Patch (RFC 7386)

### Goal

Benchmark patch application and merge patch operations.

#### Add file: `packages/jsonpath/benchmarks/src/patch-rfc6902.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from './fixtures/index.js';
import { getPatchAdapters } from './adapters/index.js';

describe('JSON Patch (RFC 6902)', () => {
	const adapters = getPatchAdapters();

	describe('Single: replace', () => {
		const patch = [
			{ op: 'replace', path: '/store/bicycle/color', value: 'blue' },
		] as any;
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.apply(patch, STORE_DATA);
			});
		}
	});

	describe('Batch: 100 replaces', () => {
		const patch = Array.from({ length: 100 }, (_, i) => ({
			op: 'add',
			path: `/tmp/${i}`,
			value: i,
		})) as any;
		for (const adapter of adapters) {
			bench(adapter.name, () => adapter.apply(patch, STORE_DATA));
		}
	});
});
```

#### Add file: `packages/jsonpath/benchmarks/src/merge-patch-rfc7386.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from './fixtures/index.js';
import { getMergePatchAdapters } from './adapters/index.js';

describe('JSON Merge Patch (RFC 7386)', () => {
	const adapters = getMergePatchAdapters();

	describe('Apply: nested merge + delete', () => {
		const patch = { store: { bicycle: { color: null, price: 25.0 } } };
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.apply(patch, STORE_DATA);
			});
		}
	});

	describe('Generate: source->target', () => {
		const source = STORE_DATA;
		const target = { ...(STORE_DATA as any), newKey: true };
		for (const adapter of adapters) {
			if (!adapter.generate) continue;
			bench(adapter.name, () => adapter.generate!(source, target));
		}
	});
});
```

### Commit

`benchmarks: add patch + merge patch benches`

### Verify

- `pnpm --filter @jsonpath/benchmarks bench`

---

## Step 12 — Streaming & Memory Benchmarks

### Goal

Measure streaming benefits and approximate memory pressure.

#### Add file: `packages/jsonpath/benchmarks/src/streaming-memory.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { stream, queryValues } from '@jsonpath/jsonpath';
import { LARGE_ARRAY_10K } from './fixtures/index.js';

describe('Streaming & Memory', () => {
	const q = '$[*].value';

	describe('Streaming vs eager (first 10 results)', () => {
		bench('stream() early break', () => {
			const it = stream(LARGE_ARRAY_10K as any, q);
			let count = 0;
			for (const _ of it) {
				count++;
				if (count >= 10) break;
			}
		});

		bench('queryValues() eager', () => {
			const values = queryValues(LARGE_ARRAY_10K as any, q);
			void values.slice(0, 10);
		});
	});

	describe('Memory snapshot', () => {
		bench('process.memoryUsage after eager', () => {
			queryValues(LARGE_ARRAY_10K as any, q);
			process.memoryUsage();
		});
	});
});
```

### Commit

`benchmarks: add streaming + memory benches`

---

## Step 13 — Advanced @jsonpath Features Benchmarks

### Goal

Benchmark suite-specific features: `transform`, `transformAll`, `QuerySet`, plugins, `secureQuery`.

#### Add file: `packages/jsonpath/benchmarks/src/advanced-features.bench.ts`

```ts
import { bench, describe } from 'vitest';
import {
	QuerySet,
	secureQuery,
	transform,
	transformAll,
} from '@jsonpath/jsonpath';
import { STORE_DATA } from './fixtures/index.js';

describe('Advanced @jsonpath/jsonpath Features', () => {
	describe('transform()', () => {
		bench('increment ages', () => {
			transform(
				STORE_DATA as any,
				'$.users[*].score',
				(score: any) => score + 1,
			);
		});
	});

	describe('transformAll()', () => {
		bench('multiple transforms', () => {
			transformAll(STORE_DATA as any, [
				{ path: '$.users[*].score', transform: (v: any) => v + 1 },
				{ path: '$.store.book[*].price', transform: (v: any) => v * 1.1 },
			]);
		});
	});

	describe('QuerySet', () => {
		bench('5 queries', () => {
			const qs = new QuerySet({
				titles: '$.store.book[*].title',
				prices: '$.store.book[*].price',
				authors: '$.store.book[*].author',
				cheap: '$.store.book[?(@.price < 10)].title',
				activeUsers: '$.users[?(@.active == true)].name',
			});
			qs.query(STORE_DATA as any);
		});
	});

	describe('secureQuery()', () => {
		bench('allowed query', () => {
			secureQuery(STORE_DATA as any, '$.users[*].name', {
				allowedRootPaths: ['$.users'],
			});
		});
	});
});
```

### Commit

`benchmarks: add advanced @jsonpath feature benches`

---

## Step 14 — Browser Environment Benchmarks

> The plan jumps Step 14 → Step 16. Treat this as Step 14/9th commit.

### Goal

Run a subset of critical benches in a real browser to compare runtime environments.

### Dependencies

Add dev deps to `@jsonpath/benchmarks`:

- `@vitest/browser`
- `playwright`

Commands:

```bash
pnpm --filter @jsonpath/benchmarks add -D @vitest/browser playwright
pnpm install
```

### Files

#### Add file: `packages/jsonpath/benchmarks/vitest.config.browser.ts`

```ts
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default defineConfig({
	...(baseConfig as any),
	test: {
		...(baseConfig as any).test,
		browser: {
			enabled: true,
			name: 'chromium',
			provider: 'playwright',
		},
	},
});
```

#### Add file: `packages/jsonpath/benchmarks/playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		headless: true,
	},
});
```

#### Add file: `packages/jsonpath/benchmarks/src/browser/setup.ts`

```ts
// Browser setup placeholder (kept minimal)
export {};
```

#### Add file: `packages/jsonpath/benchmarks/src/browser/index.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { STORE_DATA } from '../fixtures/index.js';
import { getQueryAdapters } from '../adapters/index.js';

describe('Browser: Query Performance (subset)', () => {
	const adapters = getQueryAdapters();
	const q = '$.store.book[*].title';
	for (const adapter of adapters) {
		bench(adapter.name, () => adapter.query(q, STORE_DATA));
	}
});
```

### Scripts (wired in Step 17)

Run manually first:

```bash
pnpm --filter @jsonpath/benchmarks exec vitest bench --config vitest.config.browser.ts
```

### Commit

`benchmarks: add browser benchmark config + subset benches`

---

## Step 16 — Benchmark Reporting Infrastructure

### Goal

Produce machine-readable JSON output and a simple Markdown summary.

#### Add file: `packages/jsonpath/benchmarks/src/utils/comparisons.ts`

```ts
export type BenchRow = {
	name: string;
	hz?: number;
	mean?: number;
	rme?: number;
};

export function toMarkdownTable(rows: BenchRow[]): string {
	const header = ['Benchmark', 'Hz', 'Mean (ms)', 'RME (%)'];
	const lines = [
		`| ${header.join(' | ')} |`,
		`| ${header.map(() => '---').join(' | ')} |`,
	];
	for (const r of rows) {
		lines.push(
			`| ${r.name} | ${r.hz ?? ''} | ${r.mean ?? ''} | ${r.rme ?? ''} |`,
		);
	}
	return lines.join('\n');
}
```

#### Add file: `packages/jsonpath/benchmarks/src/utils/reporter.ts`

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { toMarkdownTable, type BenchRow } from './comparisons.js';

// This expects Vitest JSON reporter output.
export function generateMarkdownFromVitestJson(
	jsonPath: string,
	mdPath: string,
) {
	const raw = readFileSync(jsonPath, 'utf8');
	const parsed = JSON.parse(raw) as any;

	const rows: BenchRow[] = [];
	const suites = parsed?.testResults ?? [];
	for (const suite of suites) {
		for (const t of suite?.assertionResults ?? []) {
			// Bench JSON shape varies by Vitest version; keep best-effort parsing.
			rows.push({ name: t.fullName ?? t.title ?? 'unknown' });
		}
	}

	const md = [
		'# Benchmark Results (generated)',
		'',
		toMarkdownTable(rows),
		'',
	].join('\n');

	writeFileSync(mdPath, md);
}
```

---

## Step 17 — Scripts & Documentation

### Goal

Add benchmark scripts and docs to run/compare results.

### Update scripts

Edit `packages/jsonpath/benchmarks/package.json` scripts to include:

```json
{
	"scripts": {
		"bench": "vitest bench",
		"bench:query": "vitest bench --testNamePattern='JSONPath'",
		"bench:pointer": "vitest bench --testNamePattern='Pointer'",
		"bench:patch": "vitest bench --testNamePattern='Patch'",
		"bench:browser": "vitest bench --config vitest.config.browser.ts",
		"bench:browser:chromium": "vitest bench --config vitest.config.browser.ts --browser.name=chromium",
		"bench:browser:firefox": "vitest bench --config vitest.config.browser.ts --browser.name=firefox",
		"bench:browser:webkit": "vitest bench --config vitest.config.browser.ts --browser.name=webkit",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"bench:compare": "node scripts/compare-results.js",
		"type-check": "tsgo --noEmit"
	}
}
```

### Add compare script

Add file: `packages/jsonpath/benchmarks/scripts/compare-results.js`

```js
import { existsSync } from 'node:fs';
import { generateMarkdownFromVitestJson } from '../dist/utils/reporter.js';

const jsonPath = new URL('../results.json', import.meta.url).pathname;
const mdPath = new URL('../RESULTS.md', import.meta.url).pathname;

if (!existsSync(jsonPath)) {
	throw new Error(
		'Missing results.json. Run: pnpm --filter @jsonpath/benchmarks bench:full',
	);
}

generateMarkdownFromVitestJson(jsonPath, mdPath);
console.log('Wrote RESULTS.md');
```

> NOTE: If you prefer not to build TS → dist for the script, change the import to point at TS via tsx, or make `reporter.ts` a JS file. Keep this minimal for the first iteration.

### Add README

Add file: `packages/jsonpath/benchmarks/README.md`

```md
# @jsonpath/benchmarks

Benchmarks for JSONPath + JSON Pointer + JSON Patch + JSON Merge Patch libraries.

## Run

From repo root:

- `pnpm --filter @jsonpath/benchmarks bench`
- `pnpm --filter @jsonpath/benchmarks bench:full`

## Notes

- Benchmarks are authored with `vitest bench`.
- Adapter layer normalizes API differences.
```

### Commit

`benchmarks: add reporting + scripts + docs`

---

## Validation Checklist (end-to-end)

- Unit/smoke tests: `pnpm --filter @jsonpath/benchmarks exec vitest run`
- Bench run: `pnpm --filter @jsonpath/benchmarks bench`
- Full JSON output: `pnpm --filter @jsonpath/benchmarks bench:full`

## Known Follow-ups / Gaps (explicit)

- Feature matrix: for adapters, `supportsFeature()` is intentionally conservative; expand as confirmed.
- `json-p3` paths/pointers APIs are not assumed; only `.values()` is used.
- Results parsing for `vitest` JSON reporter is best-effort; tighten once final JSON schema is confirmed.
