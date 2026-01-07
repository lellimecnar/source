# Implementation — @data-map/core Benchmarking Suite

**Plan source:** `plans/data-map-benchmarks/plan.md`
**Branch:** `feat/data-map-benchmarks`

## Objective

Create a dedicated benchmark workspace (`@data-map/benchmarks`) that compares `@data-map/core` against baseline path libs, immutable update libs, JSON Patch libs, and reactive state libs.

Benchmarks are authored as `vitest bench` suites (`src/*.bench.ts`) and are runnable from repo root via `pnpm --filter @data-map/benchmarks ...`.

## Constraints & Repo Conventions

- **Never `cd` into subdirectories**. Run commands from repo root using `pnpm --filter ...`.
- Use ESM (`"type": "module"`) and ESM imports.
- All workspace dependencies use `workspace:*`.
- Follow existing benchmark package patterns from `@jsonpath/benchmarks`.
- Prefer **reproducibility**:
  - datasets and patches are generated outside the benchmark loop
  - benchmarks avoid hidden allocations inside the measured function
  - each bench case does its own local setup so it measures the intended thing

## Notes / Clarifications

### Memory profiling

The plan references `bench.memory()`. Vitest benchmark mode (Tinybench-backed) **does not currently expose a documented `bench.memory()` API** in this repo’s existing patterns.

Implementation approach used here:

- Primary metrics: Vitest bench timing/statistics (mean, p50, p99, hz, etc) via `vitest bench`.
- Memory signal:
  - provide a dedicated **scale bench** that additionally records `process.memoryUsage()` deltas in `teardown`/per-cycle hooks where meaningful
  - optionally run selected smoke tests with `vitest run --logHeapUsage` if you want per-test heap attribution (not per-benchmark)

This stays aligned with the “no heap snapshots” constraint while still giving a practical memory signal.

If Vitest adds (or already has) per-benchmark memory reporting in your exact version, prefer that. Otherwise, treat the scale suite’s `process.memoryUsage()` deltas as the replacement for the plan’s memory requirement.

---

## Execution Plan (17 commits)

> Matches the plan’s step breakdown (including 13a and 15a). Each step includes Red → Green → Refactor guidance, verification commands, and a commit message.

1. scaffolding: add `@data-map/benchmarks` workspace + turbo tasks
2. fixtures: add datasets + generators + unit tests
3. adapters: add adapter interface + data-map adapter + smoke tests
4. adapters: add baseline path adapters (lodash-es / dot-prop / dlv+dset)
5. adapters: add immutable update adapters (mutative / immer)
6. adapters: add JSON Patch adapters (fast-json-patch / rfc6902 / immutable-json-patch)
7. adapters: add raw `@jsonpath/*` adapter
8. bench: path access suite
9. bench: mutation suite
10. bench: JSON patch suite
11. bench: array operations suite
12. bench: batch + transaction suite
13. bench: subscriptions suite
    13a. adapters: reactive state adapters (valtio / zustand)
14. bench: computed/definitions suite
15. bench: scale (+ memory signal)
    15a. adapters: cloning baselines (klona / rfdc)
16. reporting: results aggregation runner + README updates
17. ci/docs: workflow + docs/api page

---

## Step 1 — Package Scaffolding & Infrastructure

### Goal

Create `packages/data-map/benchmarks` following the patterns of `packages/jsonpath/benchmarks`, and wire a `bench` task into Turborepo.

### Red

Add a minimal smoke test that imports the benchmark package entrypoints and verifies Vitest runs.

**Add file:** `packages/data-map/benchmarks/src/smoke.spec.ts`

```ts
import { describe, expect, it } from 'vitest';

describe('benchmarks smoke', () => {
	it('runs vitest in this workspace', () => {
		expect(true).toBe(true);
	});
});
```

Run (expected to fail until package exists):

```bash
pnpm --filter @data-map/benchmarks exec vitest run
```

### Green

Create the workspace.

**Add file:** `packages/data-map/benchmarks/package.json`

```json
{
	"name": "@data-map/benchmarks",
	"version": "0.1.0",
	"private": true,
	"description": "Benchmarks for @data-map/core",
	"type": "module",
	"scripts": {
		"bench": "vitest bench",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"bench:path": "vitest bench --testNamePattern='Path Access'",
		"bench:mutations": "vitest bench --testNamePattern='Mutations'",
		"bench:patch": "vitest bench --testNamePattern='JSON Patch'",
		"bench:arrays": "vitest bench --testNamePattern='Array Operations'",
		"bench:batch": "vitest bench --testNamePattern='Batch'",
		"bench:subs": "vitest bench --testNamePattern='Subscriptions'",
		"bench:computed": "vitest bench --testNamePattern='Computed'",
		"bench:scale": "vitest bench --testNamePattern='Scale'",
		"build": "tsc -p tsconfig.scripts.json",
		"report": "tsc -p tsconfig.scripts.json && node dist/report.js",
		"run-all": "tsc -p tsconfig.scripts.json && node dist/run-all.js",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/core": "workspace:*",
		"@jsonpath/compiler": "workspace:*",
		"@jsonpath/evaluator": "workspace:*",
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/patch": "workspace:*",

		"dlv": "^1.1.3",
		"dset": "^3.1.4",
		"dot-prop": "^10.1.0",
		"fast-json-patch": "^3.1.1",
		"immutable-json-patch": "^6.0.2",
		"immer": "^11.1.3",
		"klona": "^2.0.6",
		"lodash-es": "^4.17.21",
		"mutative": "^1.3.0",
		"rfc6902": "^5.1.2",
		"rfdc": "^1.4.1",
		"valtio": "^2.3.0",
		"zustand": "^5.0.9"
	},
	"devDependencies": {
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/dlv": "^1.1.4",
		"@types/lodash-es": "^4.17.12",
		"typescript": "~5.5",
		"vitest": "^4.0.16"
	}
}
```

**Add file:** `packages/data-map/benchmarks/tsconfig.json`

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"rootDir": "src",
		"module": "ESNext",
		"moduleResolution": "Bundler",
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "build", "node_modules"],
}
```

**Add file:** `packages/data-map/benchmarks/tsconfig.scripts.json`

```jsonc
{
	"extends": "./tsconfig.json",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "src",
		"declaration": false,
		"sourceMap": false,
	},
	"include": ["src/reporter.ts", "src/report.ts", "src/run-all.ts"],
}
```

**Add file:** `packages/data-map/benchmarks/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@data-map/core': path.resolve(__dirname, '../core/src/index.ts'),

			'@jsonpath/core': path.resolve(
				__dirname,
				'../../jsonpath/core/src/index.ts',
			),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../../jsonpath/evaluator/src/index.ts',
			),
			'@jsonpath/compiler': path.resolve(
				__dirname,
				'../../jsonpath/compiler/src/index.ts',
			),
			'@jsonpath/jsonpath': path.resolve(
				__dirname,
				'../../jsonpath/jsonpath/src/index.ts',
			),
			'@jsonpath/pointer': path.resolve(
				__dirname,
				'../../jsonpath/pointer/src/index.ts',
			),
			'@jsonpath/patch': path.resolve(
				__dirname,
				'../../jsonpath/patch/src/index.ts',
			),
		},
	},
});
```

**Add file:** `packages/data-map/benchmarks/AGENTS.md`

```md
# AGENTS.md - @data-map/benchmarks

Benchmark suite for `@data-map/core`.

- Install: `pnpm install`
- Run all benches: `pnpm --filter @data-map/benchmarks bench`
- Run full benches + JSON output: `pnpm --filter @data-map/benchmarks bench:full`
- Generate markdown report: `pnpm --filter @data-map/benchmarks report`
- Run benches + generate report: `pnpm --filter @data-map/benchmarks run-all`
- Unit tests: `pnpm --filter @data-map/benchmarks exec vitest run`
- Type-check: `pnpm --filter @data-map/benchmarks type-check`

Never `cd` into package directories. Run from repo root.
```

**Add file:** `packages/data-map/benchmarks/README.md`

```md
# @data-map/benchmarks

Benchmarks for `@data-map/core` using `vitest bench`.

## Run

From repo root:

- `pnpm --filter @data-map/benchmarks bench`
- `pnpm --filter @data-map/benchmarks bench:full` (writes `results.json`)
- `pnpm --filter @data-map/benchmarks report` (reads `results.json` and writes `REPORT.md`)
- `pnpm --filter @data-map/benchmarks run-all` (runs benches, then writes `REPORT.md`)

## Notes

- Datasets and patch operations are pre-generated outside the measured benchmark callback.
- Benchmarks are primarily time-based; memory is captured as an auxiliary signal using `process.memoryUsage()` deltas in the scale suite.
```

**Add file:** `packages/data-map/benchmarks/src/index.ts`

```ts
export {};
```

Add the `src/smoke.spec.ts` from the Red step.

### Turborepo integration

**Edit file:** `turbo.json`

Add `bench`, `bench:full`, and `report` tasks.

```jsonc
{
	"tasks": {
		"bench": {
			"dependsOn": ["^build"],
			"cache": false,
		},
		"bench:full": {
			"dependsOn": ["^build"],
			"cache": false,
			"outputs": ["results.json"],
		},
		"report": {
			"dependsOn": ["bench:full"],
			"cache": false,
			"outputs": ["REPORT.md"],
		},
	},
}
```

(Keep existing tasks. This is a merge into the existing JSON.)

### Verification

```bash
pnpm install
pnpm --filter @data-map/benchmarks exec vitest run
pnpm --filter @data-map/benchmarks bench -- --help
```

### Commit

`benchmarks(data-map): scaffold @data-map/benchmarks workspace`

### Refactor

- If the repo’s base Vitest config emits `test-output.json`, prefer `bench:full` for a deterministic bench-only result file (`results.json`).

---

## Step 2 — Fixture Generators & Test Data

### Goal

Provide standardized datasets for small/medium/large object graphs, deep nesting, wide arrays, and mixed structures.

### Red

Add unit tests that assert:

- shape of datasets
- sizing invariants
- deterministic generation given seed

**Add file:** `packages/data-map/benchmarks/src/fixtures/generators.spec.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
	createSeededRng,
	generateDeepObject,
	generateMixedData,
	generateWideObject,
	generateWideArray,
} from './generators.js';

describe('fixtures generators', () => {
	it('createSeededRng is deterministic', () => {
		const r1 = createSeededRng(123);
		const r2 = createSeededRng(123);
		for (let i = 0; i < 10; i++) {
			expect(r1()).toBe(r2());
		}
	});

	it('generateWideObject width', () => {
		const obj = generateWideObject({ width: 100, depth: 3, seed: 1 });
		expect(Object.keys(obj)).toHaveLength(100);
	});

	it('generateWideArray length', () => {
		const arr = generateWideArray({ length: 1000, seed: 1 });
		expect(arr).toHaveLength(1000);
	});

	it('generateDeepObject depth', () => {
		const obj = generateDeepObject({ depth: 10, seed: 1 });
		let cur: any = obj;
		for (let i = 0; i < 10; i++) {
			expect(cur).toHaveProperty('next');
			cur = cur.next;
		}
	});

	it('generateMixedData is JSON-serializable', () => {
		const data = generateMixedData({ seed: 1 });
		expect(() => JSON.stringify(data)).not.toThrow();
	});
});
```

### Green

**Add file:** `packages/data-map/benchmarks/src/fixtures/types.ts`

```ts
export type FixtureScale = 'small' | 'medium' | 'large' | 'xlarge';

export type GeneratorSeeded = {
	seed: number;
};

export type WideObjectOptions = GeneratorSeeded & {
	width: number;
	depth: number;
};

export type DeepObjectOptions = GeneratorSeeded & {
	depth: number;
};

export type WideArrayOptions = GeneratorSeeded & {
	length: number;
};

export type DatasetCatalog = {
	smallObject: unknown;
	mediumObject: unknown;
	largeObject: unknown;
	deepObject: unknown;
	wideArray10k: unknown;
	wideArray100k: unknown;
	mixed: unknown;
};
```

**Add file:** `packages/data-map/benchmarks/src/fixtures/generators.ts`

```ts
import type {
	DeepObjectOptions,
	WideArrayOptions,
	WideObjectOptions,
} from './types.js';

export function createSeededRng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		// xorshift32
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) / 0xffffffff;
	};
}

function randomInt(rng: () => number, min: number, max: number): number {
	return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateWideObject(
	options: WideObjectOptions,
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const out: Record<string, any> = {};
	for (let i = 0; i < options.width; i++) {
		let cur: any = out;
		for (let d = 0; d < options.depth; d++) {
			const key = d === 0 ? `k${i}` : `d${d}`;
			if (d === options.depth - 1) {
				cur[key] = {
					id: i,
					value: randomInt(rng, 0, 1_000_000),
					active: rng() > 0.5,
				};
			} else {
				cur[key] ??= {};
				cur = cur[key];
			}
		}
	}
	return out;
}

export function generateDeepObject(options: DeepObjectOptions): any {
	const rng = createSeededRng(options.seed);
	let root: any = { id: 0, value: randomInt(rng, 0, 1_000_000) };
	let cur = root;
	for (let i = 0; i < options.depth; i++) {
		cur.next = { id: i + 1, value: randomInt(rng, 0, 1_000_000) };
		cur = cur.next;
	}
	return root;
}

export function generateWideArray(options: WideArrayOptions): Array<any> {
	const rng = createSeededRng(options.seed);
	const out: Array<any> = [];
	for (let i = 0; i < options.length; i++) {
		out.push({
			id: i,
			value: randomInt(rng, 0, 1_000_000),
			group: `g${i % 32}`,
			tags: [i % 2 === 0 ? 'even' : 'odd', `m${i % 8}`],
		});
	}
	return out;
}

export function generateMixedData(options: { seed: number }): any {
	const rng = createSeededRng(options.seed);
	return {
		user: {
			id: 1,
			name: 'user',
			flags: {
				beta: rng() > 0.5,
				darkMode: rng() > 0.5,
			},
		},
		items: generateWideArray({ length: 1000, seed: options.seed + 1 }),
		deep: generateDeepObject({ depth: 25, seed: options.seed + 2 }),
	};
}
```

**Add file:** `packages/data-map/benchmarks/src/fixtures/datasets.ts`

```ts
import type { DatasetCatalog } from './types.js';
import {
	generateDeepObject,
	generateMixedData,
	generateWideArray,
	generateWideObject,
} from './generators.js';

export const DATASETS: DatasetCatalog = {
	smallObject: generateWideObject({ width: 10, depth: 2, seed: 1 }),
	mediumObject: generateWideObject({ width: 100, depth: 5, seed: 2 }),
	largeObject: generateWideObject({ width: 1000, depth: 10, seed: 3 }),
	deepObject: generateDeepObject({ depth: 50, seed: 4 }),
	wideArray10k: generateWideArray({ length: 10_000, seed: 5 }),
	wideArray100k: generateWideArray({ length: 100_000, seed: 6 }),
	mixed: generateMixedData({ seed: 7 }),
};
```

**Add file:** `packages/data-map/benchmarks/src/fixtures/index.ts`

```ts
export * from './datasets.js';
export * from './generators.js';
export * from './types.js';
```

### Verification

```bash
pnpm --filter @data-map/benchmarks exec vitest run src/fixtures/generators.spec.ts
```

### Commit

`benchmarks(data-map): add fixture generators + datasets`

---

## Step 3 — Adapter Interface & Core Adapter

### Goal

Define a stable adapter surface so benchmarks can be authored once and run against many libraries.

### Red

Add adapter smoke tests that validate feature flags and basic semantics.

**Add file:** `packages/data-map/benchmarks/src/adapters/adapter.spec.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DATASETS } from '../fixtures/index.js';
import { getAllAdapters } from './index.js';

describe('benchmark adapters smoke', () => {
	it('each adapter declares a unique name', () => {
		const names = getAllAdapters().map((a) => a.name);
		const unique = new Set(names);
		expect(unique.size).toBe(names.length);
	});

	it('adapters honor declared feature flags', () => {
		for (const adapter of getAllAdapters()) {
			if (adapter.features.get) {
				expect(typeof adapter.get).toBe('function');
				const value = adapter.get!(DATASETS.mixed, '/user/name');
				expect(value).toBe('user');
			}

			if (adapter.features.set) {
				expect(typeof adapter.set).toBe('function');
				const data: any = structuredClone(DATASETS.mixed);
				adapter.set!(data, '/user/name', 'next');

				// Prefer adapter.get for cross-lib verification when available
				if (adapter.features.get) {
					expect(adapter.get!(data, '/user/name')).toBe('next');
				} else {
					expect((data as any).user.name).toBe('next');
				}
			}

			if (adapter.features.immutableSet) {
				expect(typeof adapter.immutableSet).toBe('function');
				const data: any = structuredClone(DATASETS.mixed);
				const next = adapter.immutableSet!(data, '/user/name', 'next');
				expect(next).not.toBe(data);
				expect((data as any).user.name).toBe('user');
				expect((next as any).user.name).toBe('next');
			}

			if (adapter.features.jsonPatch) {
				expect(typeof adapter.applyPatch).toBe('function');
				const data: any = structuredClone(DATASETS.mixed);
				const next = adapter.applyPatch!(data, [
					{ op: 'replace', path: '/user/name', value: 'next' },
				] as any);
				expect((next as any).user.name).toBe('next');
			}

			if (adapter.features.batchPatch) {
				expect(typeof adapter.applyPatchBatch).toBe('function');
				const data: any = structuredClone(DATASETS.mixed);
				const next = adapter.applyPatchBatch!(data, [
					[{ op: 'replace', path: '/user/name', value: 'a' } as any],
					[{ op: 'replace', path: '/user/name', value: 'b' } as any],
				]);
				expect((next as any).user.name).toBe('b');
			}

			if (adapter.features.jsonPath) {
				expect(typeof adapter.queryJsonPath).toBe('function');
				const out = adapter.queryJsonPath!(DATASETS.mixed, '$.user.name');
				expect(out).toBeTruthy();
			}

			if (adapter.features.computed) {
				expect(typeof adapter.compute).toBe('function');
				const out = adapter.compute!(DATASETS.mixed, {
					name: 'x',
					deps: ['/user/name'],
				});
				expect(out).toBe('user');
			}

			if (adapter.features.subscriptions) {
				expect(typeof adapter.subscribe).toBe('function');
				const handle = adapter.subscribe!(
					DATASETS.mixed,
					'/user/name',
					() => {},
				);
				expect(typeof handle.unsubscribe).toBe('function');
				expect(() => handle.unsubscribe()).not.toThrow();
			}

			if (adapter.features.clone) {
				expect(typeof adapter.clone).toBe('function');
				const data: any = structuredClone(DATASETS.mixed);
				const cloned = adapter.clone!(data);
				expect(cloned).not.toBe(data);
				expect(JSON.stringify(cloned)).toBe(JSON.stringify(data));
			}
		}
	});
});
```

### Green

**Add file:** `packages/data-map/benchmarks/src/adapters/types.ts`

```ts
export type AdapterFeatures = {
	get: boolean;
	set: boolean;
	immutableSet: boolean;
	jsonPatch: boolean;
	batchPatch: boolean;
	subscriptions: boolean;
	jsonPath: boolean;
	computed: boolean;
	clone: boolean;
};

export type PatchOp = {
	op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
	path: string;
	from?: string;
	value?: unknown;
};

export type SubscriptionHandle = {
	unsubscribe: () => void;
};

export type BenchmarkAdapter = {
	name: string;
	features: AdapterFeatures;

	get?: (data: unknown, path: string) => unknown;
	set?: (data: unknown, path: string, value: unknown) => unknown;
	immutableSet?: (data: unknown, path: string, value: unknown) => unknown;

	applyPatch?: (data: unknown, ops: PatchOp[]) => unknown;
	applyPatchBatch?: (data: unknown, ops: PatchOp[][]) => unknown;

	subscribe?: (
		data: unknown,
		path: string,
		onChange: () => void,
	) => SubscriptionHandle;

	queryJsonPath?: (data: unknown, expr: string) => unknown;

	compute?: (data: unknown, spec: { name: string; deps: string[] }) => unknown;

	clone?: (data: unknown) => unknown;
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`

```ts
import { DataMap } from '@data-map/core';
import type { BenchmarkAdapter, PatchOp, SubscriptionHandle } from './types.js';

export const dataMapAdapter: BenchmarkAdapter = {
	name: '@data-map/core',
	features: {
		get: true,
		set: true,
		immutableSet: false,
		jsonPatch: true,
		batchPatch: true,
		subscriptions: true,
		jsonPath: true,
		computed: true,
		clone: false,
	},

	get(data, path) {
		const dm = new DataMap({ data });
		return dm.get(path);
	},

	set(data, path, value) {
		const dm = new DataMap({ data });
		dm.set(path, value);
		return dm.peek();
	},

	applyPatch(data, ops: PatchOp[]) {
		const dm = new DataMap({ data });
		dm.patch(ops as any);
		return dm.peek();
	},

	applyPatchBatch(data, batches: PatchOp[][]) {
		const dm = new DataMap({ data });
		dm.batch(() => {
			for (const ops of batches) dm.patch(ops as any);
		});
		return dm.peek();
	},

	subscribe(data, path, onChange): SubscriptionHandle {
		const dm = new DataMap({ data });
		const unsubscribe = dm.subscribe(path, { on: onChange });
		return { unsubscribe };
	},

	queryJsonPath(data, expr) {
		const dm = new DataMap({ data });
		return dm.resolve(expr);
	},

	compute(data, spec) {
		const dm = new DataMap({
			data,
			define: {
				[spec.name]: {
					deps: spec.deps,
					get: (ctx) => {
						const values = spec.deps.map((d) => ctx.get(d));
						return values.length === 1 ? values[0] : values;
					},
				},
			},
		});
		return dm.get(`$defs/${spec.name}`);
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/index.ts`

```ts
import type { BenchmarkAdapter } from './types.js';
import { dataMapAdapter } from './data-map.adapter.js';

// step 4+ will add more adapters and include them here

export function getAllAdapters(): BenchmarkAdapter[] {
	return [dataMapAdapter];
}
```

### Verification

```bash
pnpm --filter @data-map/benchmarks exec vitest run src/adapters/adapter.spec.ts
```

### Commit

`benchmarks(data-map): add adapter interface + @data-map/core adapter`

---

## Step 4 — Baseline Comparison Adapters (lodash-es, dot-prop, dlv+dset)

### Red

Extend `adapter.spec.ts` expectations to ensure these adapters are present.

### Green

**Add file:** `packages/data-map/benchmarks/src/adapters/lodash.adapter.ts`

```ts
import get from 'lodash-es/get';
import set from 'lodash-es/set';
import cloneDeep from 'lodash-es/cloneDeep';
import type { BenchmarkAdapter } from './types.js';

export const lodashAdapter: BenchmarkAdapter = {
	name: 'lodash-es',
	features: {
		get: true,
		set: true,
		immutableSet: true,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: true,
	},
	get(data, path) {
		// normalize: accept pointer-ish (/a/b) and dot (a.b)
		const p = path.startsWith('/') ? path.slice(1).split('/').join('.') : path;
		return get(data as any, p);
	},
	set(data, path, value) {
		const p = path.startsWith('/') ? path.slice(1).split('/').join('.') : path;
		set(data as any, p, value);
		return data;
	},
	immutableSet(data, path, value) {
		const next = cloneDeep(data);
		const p = path.startsWith('/') ? path.slice(1).split('/').join('.') : path;
		set(next as any, p, value);
		return next;
	},
	clone(data) {
		return cloneDeep(data);
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/dot-prop.adapter.ts`

```ts
import { getProperty, setProperty, deleteProperty } from 'dot-prop';
import type { BenchmarkAdapter } from './types.js';

export const dotPropAdapter: BenchmarkAdapter = {
	name: 'dot-prop',
	features: {
		get: true,
		set: true,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	get(data, path) {
		const p = path.startsWith('/') ? path.slice(1).split('/').join('.') : path;
		return getProperty(data as any, p);
	},
	set(data, path, value) {
		const p = path.startsWith('/') ? path.slice(1).split('/').join('.') : path;
		setProperty(data as any, p, value);
		return data;
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/dlv-dset.adapter.ts`

```ts
import dlv from 'dlv';
import dset from 'dset';
import type { BenchmarkAdapter } from './types.js';

export const dlvDsetAdapter: BenchmarkAdapter = {
	name: 'dlv+dset',
	features: {
		get: true,
		set: true,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	get(data, path) {
		const p = path.startsWith('/') ? path.slice(1).split('/') : path.split('.');
		return dlv(data as any, p as any);
	},
	set(data, path, value) {
		const p = path.startsWith('/') ? path.slice(1).split('/') : path.split('.');
		dset(data as any, p as any, value);
		return data;
	},
};
```

Update `packages/data-map/benchmarks/src/adapters/index.ts`:

```ts
import type { BenchmarkAdapter } from './types.js';
import { dataMapAdapter } from './data-map.adapter.js';
import { lodashAdapter } from './lodash.adapter.js';
import { dotPropAdapter } from './dot-prop.adapter.js';
import { dlvDsetAdapter } from './dlv-dset.adapter.js';

export function getAllAdapters(): BenchmarkAdapter[] {
	return [dataMapAdapter, lodashAdapter, dotPropAdapter, dlvDsetAdapter];
}
```

### Verification

```bash
pnpm --filter @data-map/benchmarks exec vitest run src/adapters/adapter.spec.ts
```

### Commit

`benchmarks(data-map): add baseline get/set adapters`

---

## Step 5 — Immutable Update Adapters (Mutative, Immer)

### Red

Add smoke assertions for immutable semantics (original unchanged; new reference returned).

### Green

**Add file:** `packages/data-map/benchmarks/src/adapters/mutative.adapter.ts`

```ts
import { create } from 'mutative';
import type { BenchmarkAdapter } from './types.js';
import { dlvDsetAdapter } from './dlv-dset.adapter.js';

export const mutativeAdapter: BenchmarkAdapter = {
	name: 'mutative',
	features: {
		get: true,
		set: false,
		immutableSet: true,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	get: dlvDsetAdapter.get,
	immutableSet(data, path, value) {
		return create(data as any, (draft: any) => {
			// use dset semantics on draft
			(dlvDsetAdapter.set as any)(draft, path, value);
		});
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/immer.adapter.ts`

```ts
import { produce } from 'immer';
import type { BenchmarkAdapter } from './types.js';
import { dlvDsetAdapter } from './dlv-dset.adapter.js';

export const immerAdapter: BenchmarkAdapter = {
	name: 'immer',
	features: {
		get: true,
		set: false,
		immutableSet: true,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	get: dlvDsetAdapter.get,
	immutableSet(data, path, value) {
		return produce(data as any, (draft: any) => {
			(dlvDsetAdapter.set as any)(draft, path, value);
		});
	},
};
```

Add these adapters to `getAllAdapters()`.

### Verification

```bash
pnpm --filter @data-map/benchmarks exec vitest run src/adapters/adapter.spec.ts
```

### Commit

`benchmarks(data-map): add mutative + immer adapters`

---

## Step 6 — JSON Patch Adapters (fast-json-patch, rfc6902, immutable-json-patch)

### Red

Add a shared JSON Patch fixture test case (apply add/replace/remove) and validate equivalence.

### Green

**Add file:** `packages/data-map/benchmarks/src/adapters/fast-json-patch.adapter.ts`

```ts
import * as fastJsonPatch from 'fast-json-patch';
import type { BenchmarkAdapter, PatchOp } from './types.js';

export const fastJsonPatchAdapter: BenchmarkAdapter = {
	name: 'fast-json-patch',
	features: {
		get: false,
		set: false,
		immutableSet: false,
		jsonPatch: true,
		batchPatch: true,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	applyPatch(data, ops: PatchOp[]) {
		// fast-json-patch mutates by default; clone first for consistency
		const clone = structuredClone(data as any);
		fastJsonPatch.applyPatch(clone, ops as any, true, false);
		return clone;
	},
	applyPatchBatch(data, batches: PatchOp[][]) {
		let cur: any = structuredClone(data as any);
		for (const ops of batches) {
			fastJsonPatch.applyPatch(cur, ops as any, true, false);
		}
		return cur;
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/rfc6902.adapter.ts`

```ts
import { applyPatch } from 'rfc6902';
import type { BenchmarkAdapter, PatchOp } from './types.js';

export const rfc6902Adapter: BenchmarkAdapter = {
	name: 'rfc6902',
	features: {
		get: false,
		set: false,
		immutableSet: false,
		jsonPatch: true,
		batchPatch: true,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	applyPatch(data, ops: PatchOp[]) {
		const clone = structuredClone(data as any);
		applyPatch(clone as any, ops as any);
		return clone;
	},
	applyPatchBatch(data, batches: PatchOp[][]) {
		let cur: any = structuredClone(data as any);
		for (const ops of batches) {
			applyPatch(cur as any, ops as any);
		}
		return cur;
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/immutable-json-patch.adapter.ts`

```ts
import { applyPatch } from 'immutable-json-patch';
import type { BenchmarkAdapter, PatchOp } from './types.js';

export const immutableJsonPatchAdapter: BenchmarkAdapter = {
	name: 'immutable-json-patch',
	features: {
		get: false,
		set: false,
		immutableSet: false,
		jsonPatch: true,
		batchPatch: true,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	applyPatch(data, ops: PatchOp[]) {
		return applyPatch(data as any, ops as any).newDocument;
	},
	applyPatchBatch(data, batches: PatchOp[][]) {
		let cur: any = data;
		for (const ops of batches) {
			cur = applyPatch(cur, ops as any).newDocument;
		}
		return cur;
	},
};
```

Add these adapters to `getAllAdapters()`.

### Verification

```bash
pnpm --filter @data-map/benchmarks exec vitest run
```

### Commit

`benchmarks(data-map): add JSON Patch adapters`

---

## Step 7 — JSONPath Adapter (@jsonpath/\* raw)

### Goal

Measure overhead: raw `@jsonpath/*` calls vs `@data-map/core` integrated `resolve()`.

### Green

**Add file:** `packages/data-map/benchmarks/src/adapters/jsonpath-raw.adapter.ts`

```ts
import { compile } from '@jsonpath/compiler';
import { evaluate } from '@jsonpath/evaluator';
import type { BenchmarkAdapter } from './types.js';

export const jsonpathRawAdapter: BenchmarkAdapter = {
	name: '@jsonpath/* (raw)',
	features: {
		get: false,
		set: false,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: true,
		computed: false,
		clone: false,
	},
	queryJsonPath(data, expr) {
		// compile each time for baseline; bench suite will compare compiled vs not
		const program = compile(expr);
		return evaluate(program, data as any);
	},
};
```

Add to `getAllAdapters()`.

### Commit

`benchmarks(data-map): add raw @jsonpath adapter`

---

## Step 8 — Path Access Benchmarks

**Add file:** `packages/data-map/benchmarks/src/path-access.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DATASETS } from './fixtures/index.js';
import { getAllAdapters } from './adapters/index.js';

describe('Path Access', () => {
	const adapters = getAllAdapters().filter((a) => a.features.get && a.get);

	bench('Path Access /user/name (small mixed)', () => {
		for (const a of adapters) a.get!(DATASETS.mixed, '/user/name');
	});

	bench('Path Access deep chain (deepObject)', () => {
		for (const a of adapters)
			a.get!(DATASETS.deepObject, '/next/next/next/value');
	});
});
```

Verification:

```bash
pnpm --filter @data-map/benchmarks bench -- path-access.bench.ts
```

Commit:

`benchmarks(data-map): add path access bench suite`

---

## Step 9 — Mutation Benchmarks

**Add file:** `packages/data-map/benchmarks/src/mutations.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DATASETS } from './fixtures/index.js';
import { getAllAdapters } from './adapters/index.js';

describe('Mutations', () => {
	const setAdapters = getAllAdapters().filter((a) => a.features.set && a.set);
	const immAdapters = getAllAdapters().filter(
		(a) => a.features.immutableSet && a.immutableSet,
	);

	bench('Mutations set shallow', () => {
		for (const a of setAdapters) {
			const data: any = structuredClone(DATASETS.mixed);
			a.set!(data, '/user/name', 'x');
		}
	});

	bench('Mutations immutableSet shallow', () => {
		for (const a of immAdapters) {
			const data: any = structuredClone(DATASETS.mixed);
			a.immutableSet!(data, '/user/name', 'x');
		}
	});
});
```

Commit:

`benchmarks(data-map): add mutations bench suite`

---

## Step 10 — JSON Patch Benchmarks

**Add file:** `packages/data-map/benchmarks/src/json-patch.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DATASETS } from './fixtures/index.js';
import { getAllAdapters } from './adapters/index.js';

const patch10 = Array.from({ length: 10 }, (_, i) => ({
	op: 'replace' as const,
	path: `/items/${i}/value`,
	value: i,
}));

describe('JSON Patch', () => {
	const patchAdapters = getAllAdapters().filter(
		(a) => a.features.jsonPatch && a.applyPatch,
	);

	bench('JSON Patch apply 10 ops (mixed)', () => {
		for (const a of patchAdapters) {
			const data: any = structuredClone(DATASETS.mixed);
			a.applyPatch!(data, patch10 as any);
		}
	});
});
```

Commit:

`benchmarks(data-map): add JSON patch bench suite`

---

## Step 11 — Array Operation Benchmarks

**Add file:** `packages/data-map/benchmarks/src/array-operations.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DataMap } from '@data-map/core';
import { DATASETS } from './fixtures/index.js';

describe('Array Operations', () => {
	bench('Array push via DataMap', () => {
		const dm = new DataMap({
			data: { arr: structuredClone(DATASETS.wideArray10k) },
		});
		dm.push('/arr', { id: 10_001, value: 1, group: 'g0', tags: ['x'] });
	});

	bench('Array splice via DataMap', () => {
		const dm = new DataMap({
			data: { arr: structuredClone(DATASETS.wideArray10k) },
		});
		dm.splice('/arr', 100, 5, { id: 999, value: 1, group: 'g0', tags: ['x'] });
	});
});
```

Commit:

`benchmarks(data-map): add array operations bench suite`

---

## Step 12 — Batch & Transaction Benchmarks

**Add file:** `packages/data-map/benchmarks/src/batch-operations.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DataMap } from '@data-map/core';
import { DATASETS } from './fixtures/index.js';

describe('Batch', () => {
	bench('Batch 100 sets', () => {
		const dm = new DataMap({ data: structuredClone(DATASETS.mixed) });
		dm.batch(() => {
			for (let i = 0; i < 100; i++) dm.set(`/items/${i}/value`, i);
		});
	});

	bench('Transaction rollback (throws)', () => {
		const dm = new DataMap({ data: structuredClone(DATASETS.mixed) });
		try {
			dm.transaction(() => {
				dm.set('/user/name', 'x');
				throw new Error('rollback');
			});
		} catch {
			// expected
		}
	});
});
```

Commit:

`benchmarks(data-map): add batch + transaction bench suite`

---

## Step 13 — Subscription & Reactivity Benchmarks

**Add file:** `packages/data-map/benchmarks/src/subscriptions.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DataMap } from '@data-map/core';
import { DATASETS } from './fixtures/index.js';

describe('Subscriptions', () => {
	bench('subscribe + 100 updates', () => {
		const dm = new DataMap({ data: structuredClone(DATASETS.mixed) });
		let hits = 0;
		const unsubscribe = dm.subscribe('/user/name', {
			on: () => {
				hits++;
			},
		});

		for (let i = 0; i < 100; i++) dm.set('/user/name', `u${i}`);

		unsubscribe();
		if (hits === 0) throw new Error('no hits');
	});
});
```

Commit:

`benchmarks(data-map): add subscriptions bench suite`

---

## Step 13a — Reactive State Adapters (Valtio, Zustand)

**Add file:** `packages/data-map/benchmarks/src/adapters/valtio.adapter.ts`

```ts
import { proxy, subscribe } from 'valtio/vanilla';
import type { BenchmarkAdapter, SubscriptionHandle } from './types.js';

export const valtioAdapter: BenchmarkAdapter = {
	name: 'valtio',
	features: {
		get: true,
		set: true,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: true,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	get(data, path) {
		const state: any = proxy(structuredClone(data as any));
		// minimal pointer support for /a/b
		const keys = path.startsWith('/')
			? path.slice(1).split('/')
			: path.split('.');
		let cur = state;
		for (const k of keys) cur = cur?.[k];
		return cur;
	},
	set(data, path, value) {
		const state: any = proxy(structuredClone(data as any));
		const keys = path.startsWith('/')
			? path.slice(1).split('/')
			: path.split('.');
		let cur = state;
		for (let i = 0; i < keys.length - 1; i++) {
			cur[keys[i]] ??= {};
			cur = cur[keys[i]];
		}
		cur[keys[keys.length - 1]] = value;
		return state;
	},
	subscribe(data, _path, onChange): SubscriptionHandle {
		const state: any = proxy(structuredClone(data as any));
		const unsub = subscribe(state, onChange);
		return { unsubscribe: unsub };
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/zustand.adapter.ts`

```ts
import { createStore } from 'zustand/vanilla';
import type { BenchmarkAdapter, SubscriptionHandle } from './types.js';

export const zustandAdapter: BenchmarkAdapter = {
	name: 'zustand',
	features: {
		get: true,
		set: true,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: true,
		jsonPath: false,
		computed: false,
		clone: false,
	},
	get(data, path) {
		const store = createStore<any>(() => structuredClone(data as any));
		const keys = path.startsWith('/')
			? path.slice(1).split('/')
			: path.split('.');
		let cur: any = store.getState();
		for (const k of keys) cur = cur?.[k];
		return cur;
	},
	set(data, path, value) {
		const store = createStore<any>(() => structuredClone(data as any));
		const keys = path.startsWith('/')
			? path.slice(1).split('/')
			: path.split('.');
		store.setState((s: any) => {
			const next = structuredClone(s);
			let cur = next;
			for (let i = 0; i < keys.length - 1; i++) {
				cur[keys[i]] ??= {};
				cur = cur[keys[i]];
			}
			cur[keys[keys.length - 1]] = value;
			return next;
		});
		return store.getState();
	},
	subscribe(data, _path, onChange): SubscriptionHandle {
		const store = createStore<any>(() => structuredClone(data as any));
		const unsubscribe = store.subscribe(onChange);
		return { unsubscribe };
	},
};
```

Update `getAllAdapters()` to include these.

Commit:

`benchmarks(data-map): add valtio + zustand adapters`

---

## Step 14 — Computed/Definition Benchmarks

**Add file:** `packages/data-map/benchmarks/src/computed.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DataMap } from '@data-map/core';
import { DATASETS } from './fixtures/index.js';

describe('Computed', () => {
	bench('define 100 computed values', () => {
		const define: any = {};
		for (let i = 0; i < 100; i++) {
			define[`c${i}`] = {
				deps: ['/user/name'],
				get: (ctx: any) => `${ctx.get('/user/name')}:${i}`,
			};
		}
		const dm = new DataMap({ data: structuredClone(DATASETS.mixed), define });
		// force reads to measure caching behavior
		for (let i = 0; i < 100; i++) dm.get(`$defs/c${i}`);
	});

	bench('recompute after dependency change', () => {
		const dm = new DataMap({
			data: structuredClone(DATASETS.mixed),
			define: {
				nameUpper: {
					deps: ['/user/name'],
					get: (ctx: any) => String(ctx.get('/user/name')).toUpperCase(),
				},
			},
		});
		dm.get('$defs/nameUpper');
		dm.set('/user/name', 'next');
		dm.get('$defs/nameUpper');
	});
});
```

Commit:

`benchmarks(data-map): add computed/definitions bench suite`

---

## Step 15 — Scale & Memory Benchmarks

**Add file:** `packages/data-map/benchmarks/src/scale.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { DataMap } from '@data-map/core';
import {
	generateWideObject,
	generateWideArray,
} from './fixtures/generators.js';

function heapUsed(): number {
	return process.memoryUsage().heapUsed;
}

describe('Scale', () => {
	bench('set on 10k-key object', () => {
		const big = generateWideObject({ width: 10_000, depth: 2, seed: 1 });
		const dm = new DataMap({ data: big });
		dm.set('/k9999/d1/value', 123);
	});

	bench('push on 100k array (memory signal)', () => {
		const arr = generateWideArray({ length: 100_000, seed: 2 });
		const before = heapUsed();
		const dm = new DataMap({ data: { arr } });
		dm.push('/arr', { id: 100_001, value: 1, group: 'g0', tags: ['x'] });
		const after = heapUsed();
		// keep side-effect so optimizer cannot drop it
		if (after < before) throw new Error('unexpected heap delta');
	});
});
```

Commit:

`benchmarks(data-map): add scale bench suite`

---

## Step 15a — Cloning Baseline Adapters (klona, rfdc)

**Add file:** `packages/data-map/benchmarks/src/adapters/klona.adapter.ts`

```ts
import { klona } from 'klona';
import type { BenchmarkAdapter } from './types.js';

export const klonaAdapter: BenchmarkAdapter = {
	name: 'klona',
	features: {
		get: false,
		set: false,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: true,
	},
	clone(data) {
		return klona(data as any);
	},
};
```

**Add file:** `packages/data-map/benchmarks/src/adapters/rfdc.adapter.ts`

```ts
import rfdc from 'rfdc';
import type { BenchmarkAdapter } from './types.js';

const clone = rfdc();

export const rfdcAdapter: BenchmarkAdapter = {
	name: 'rfdc',
	features: {
		get: false,
		set: false,
		immutableSet: false,
		jsonPatch: false,
		batchPatch: false,
		subscriptions: false,
		jsonPath: false,
		computed: false,
		clone: true,
	},
	clone(data) {
		return clone(data as any);
	},
};
```

Commit:

`benchmarks(data-map): add cloning baseline adapters`

---

## Step 16 — Results Aggregation & Reporting

### Goal

Produce a deterministic `REPORT.md` from `results.json`.

**Add file:** `packages/data-map/benchmarks/src/reporter.ts`

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function generateReport(resultsPath: string, outPath: string): void {
	if (!existsSync(resultsPath)) {
		throw new Error(
			`Missing ${resultsPath}. Run: pnpm --filter @data-map/benchmarks bench:full`,
		);
	}

	const raw = readFileSync(resultsPath, 'utf-8');
	const parsed: any = JSON.parse(raw);

	// Note: Vitest JSON reporter output shape can vary by version.
	// We keep this intentionally conservative and only extract benchmark names.
	const suites: any[] = parsed?.testResults ?? [];
	const names: string[] = [];

	for (const suite of suites) {
		for (const t of suite?.assertionResults ?? []) {
			names.push(t.fullName ?? t.title ?? 'unknown');
		}
	}

	const md = [
		'# @data-map/benchmarks Report',
		'',
		`Source: \`${resultsPath}\``,
		'',
		'## Benchmarks',
		...(names.length
			? names.map((n) => `- ${n}`)
			: ['- (No benchmarks found in JSON output)']),
		'',
	].join('\n');

	writeFileSync(outPath, md);
}
```

**Add file:** `packages/data-map/benchmarks/src/report.ts`

```ts
import { generateReport } from './reporter.js';

generateReport('results.json', 'REPORT.md');
console.log('Wrote REPORT.md');
```

**Add file:** `packages/data-map/benchmarks/src/run-all.ts`

```ts
import { execSync } from 'node:child_process';
import { generateReport } from './reporter.js';

const RESULTS = 'results.json';
const REPORT = 'REPORT.md';

execSync('vitest bench --reporter=json --outputFile=results.json', {
	stdio: 'inherit',
});

generateReport(RESULTS, REPORT);
console.log(`Wrote ${REPORT}`);
```

Update README with `report` usage (already included in Step 1).

Verification:

```bash
pnpm --filter @data-map/benchmarks bench:full
pnpm --filter @data-map/benchmarks report
```

Commit:

`benchmarks(data-map): add report generator`

---

## Step 17 — CI Integration & Documentation

### GitHub Actions

Add a workflow that runs benchmarks on demand (manual) and on main branch pushes.

**Add file:** `.github/workflows/benchmarks-data-map.yml`

```yml
name: Benchmarks (data-map)

on:
  workflow_dispatch: {}
  push:
    branches:
      - master

jobs:
  benchmarks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: package.json

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.2

      - name: Install dependencies
        run: pnpm install

      - name: Build deps
				run: pnpm turbo build --filter=@data-map/benchmarks...

      - name: Run benchmarks
        run: pnpm --filter @data-map/benchmarks bench:full

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: data-map-benchmarks
          path: |
            packages/data-map/benchmarks/results.json
            packages/data-map/benchmarks/REPORT.md
          retention-days: 7
```

### Docs

**Add file:** `docs/api/data-map-benchmarks.md`

```md
# DataMap Benchmarks

This repo includes a benchmark suite for `@data-map/core` at:

- `packages/data-map/benchmarks`

## Run locally

From repo root:

- `pnpm --filter @data-map/benchmarks bench`
- `pnpm --filter @data-map/benchmarks bench:full` (writes `results.json`)
- `pnpm --filter @data-map/benchmarks report` (writes `REPORT.md`)

## What’s measured

- Path access (`get`) across multiple libraries
- Mutation patterns (mutable and immutable variants)
- JSON Patch application
- Array operations on DataMap
- Batch and transaction behavior
- Subscription overhead
- Definitions/computed caching & recomputation

## Notes

- Benchmarks prioritize repeatability. Datasets are seeded.
- Memory reporting is treated as a signal (via `process.memoryUsage()` deltas), not a precise allocator profile.
```

Commit:

`benchmarks(data-map): add CI workflow + docs page`

---

## Final Verification Checklist

- `pnpm --filter @data-map/benchmarks exec vitest run`
- `pnpm --filter @data-map/benchmarks bench`
- `pnpm --filter @data-map/benchmarks bench:full`
- `pnpm --filter @data-map/benchmarks report`

## Success Criteria Mapping

- Adapters have smoke tests: `src/adapters/adapter.spec.ts`
- Bench suites exist for all major `@data-map/core` features:
  - path access, mutations, patch, arrays, batch/tx, subscriptions, computed, scale
- Raw JSONPath adapter exists: `@jsonpath/* (raw)`
- CI workflow publishes artifacts
- Documentation exists under `docs/api/data-map-benchmarks.md`
