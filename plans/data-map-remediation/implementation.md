# DataMap Full Remediation Plan

## Goal

Bring the `@data-map/*` package suite to 100% spec compliance per [plans/data-map-remediation/plan.md](plan.md) and [specs/data-map.md](../../specs/data-map.md), starting with benchmark infrastructure to establish performance baselines.

## Prerequisites

- You are on the `feature/data-map-complete-remediation` branch.
- Tooling assumptions:
  - ESM packages (`"type": "module"`).
  - TS source uses `.js` in internal import specifiers (to match emitted JS), consistent with this repo’s conventions.

---

## Step 1: Benchmark Infrastructure Foundation

### Step 1 Checklist

- [ ] Update `packages/data-map/benchmarks/package.json` to match the `@jsonpath/benchmarks` script and dependency patterns.
- [ ] Add `packages/data-map/benchmarks/vitest.config.ts` with workspace source aliasing.
- [ ] Add `packages/data-map/benchmarks/vitest.config.browser.ts` for Playwright browser benchmarks.
- [ ] Add `packages/data-map/benchmarks/baseline.json` (initial structure).
- [ ] Add `packages/data-map/benchmarks/scripts/compare-results.js` in the same style as `@jsonpath/benchmarks`.
- [ ] Add fixtures under `packages/data-map/benchmarks/src/fixtures/`:
  - [ ] `generate.ts`
  - [ ] `small.ts`
  - [ ] `medium.ts`
  - [ ] `large.ts`
  - [ ] `index.ts`
- [ ] Add utilities under `packages/data-map/benchmarks/src/utils/`:
  - [ ] `measure.ts`
  - [ ] `compare.ts`
  - [ ] `reporter.ts`
  - [ ] `comparisons.ts`
- [ ] Update `packages/data-map/benchmarks/src/index.ts` to export fixtures + utils (so `vite build` produces `dist/utils/*` for the compare script).

### Step 1 Files

#### packages/data-map/benchmarks/package.json

- [ ] Replace the entire contents of `packages/data-map/benchmarks/package.json` with:

```json
{
	"name": "@data-map/benchmarks",
	"version": "0.1.0",
	"private": true,
	"description": "DataMap performance benchmarks",
	"license": "MIT",
	"type": "module",
	"scripts": {
		"bench": "vitest bench",
		"bench:browser": "vitest bench --config vitest.config.browser.ts",
		"bench:browser:chromium": "vitest bench --config vitest.config.browser.ts --browser.name=chromium",
		"bench:browser:firefox": "vitest bench --config vitest.config.browser.ts --browser.name=firefox",
		"bench:browser:webkit": "vitest bench --config vitest.config.browser.ts --browser.name=webkit",
		"bench:compare": "node scripts/compare-results.js",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"build": "vite build",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/arrays": "workspace:*",
		"@data-map/core": "workspace:*",
		"@data-map/path": "workspace:*",
		"@data-map/signals": "workspace:*",
		"@data-map/storage": "workspace:*",
		"@data-map/subscriptions": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/browser": "^4.0.16",
		"playwright": "^1.48.2",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

#### packages/data-map/benchmarks/vitest.config.ts

- [ ] Create `packages/data-map/benchmarks/vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@data-map/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@data-map/storage': path.resolve(__dirname, '../storage/src/index.ts'),
			'@data-map/signals': path.resolve(__dirname, '../signals/src/index.ts'),
			'@data-map/subscriptions': path.resolve(
				__dirname,
				'../subscriptions/src/index.ts',
			),
			'@data-map/arrays': path.resolve(__dirname, '../arrays/src/index.ts'),
			'@data-map/path': path.resolve(__dirname, '../path/src/index.ts'),
			'@data-map/computed': path.resolve(__dirname, '../computed/src/index.ts'),
		},
	},
});
```

#### packages/data-map/benchmarks/vitest.config.browser.ts

- [ ] Create `packages/data-map/benchmarks/vitest.config.browser.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseConfig = vitestBaseConfig();

export default defineConfig({
	...baseConfig,
	resolve: {
		alias: {
			'@data-map/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@data-map/storage': path.resolve(__dirname, '../storage/src/index.ts'),
			'@data-map/signals': path.resolve(__dirname, '../signals/src/index.ts'),
			'@data-map/subscriptions': path.resolve(
				__dirname,
				'../subscriptions/src/index.ts',
			),
			'@data-map/arrays': path.resolve(__dirname, '../arrays/src/index.ts'),
			'@data-map/path': path.resolve(__dirname, '../path/src/index.ts'),
			'@data-map/computed': path.resolve(__dirname, '../computed/src/index.ts'),
		},
	},
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

#### packages/data-map/benchmarks/baseline.json

- [ ] Create `packages/data-map/benchmarks/baseline.json` with:

```json
{
	"storage.getSmall": { "opsPerSec": 0 },
	"storage.setSmall": { "opsPerSec": 0 },
	"storage.hasSmall": { "opsPerSec": 0 },
	"storage.deleteSmall": { "opsPerSec": 0 },
	"storage.toObjectSmall": { "opsPerSec": 0 },

	"signals.signalRead": { "opsPerSec": 0 },
	"signals.signalWrite": { "opsPerSec": 0 },
	"signals.computedReadCached": { "opsPerSec": 0 },
	"signals.computedReadDirty": { "opsPerSec": 0 },
	"signals.batch100Writes": { "opsPerSec": 0 },

	"subscriptions.subscribePointer": { "opsPerSec": 0 },
	"subscriptions.subscribePattern": { "opsPerSec": 0 },
	"subscriptions.notifyExact100": { "opsPerSec": 0 },
	"subscriptions.notifyPattern10": { "opsPerSec": 0 },

	"arrays.smartArrayPush": { "opsPerSec": 0 },
	"arrays.smartArraySpliceMiddle": { "opsPerSec": 0 },
	"arrays.gapBufferInsertMiddle": { "opsPerSec": 0 },
	"arrays.gapBufferDeleteMiddle": { "opsPerSec": 0 },
	"arrays.persistentVectorPush": { "opsPerSec": 0 },
	"arrays.persistentVectorSetMiddle": { "opsPerSec": 0 },

	"scale.flatStoreGetMedium": { "opsPerSec": 0 },
	"scale.flatStoreSetMedium": { "opsPerSec": 0 },
	"scale.dataMapSetMedium": { "opsPerSec": 0 },
	"scale.dataMapSubscribeMedium": { "opsPerSec": 0 },

	"memory.processMemoryUsage": { "opsPerSec": 0 }
}
```

#### packages/data-map/benchmarks/scripts/compare-results.js

- [ ] Create `packages/data-map/benchmarks/scripts/compare-results.js` with:

```js
import { existsSync } from 'node:fs';
import { generateMarkdownFromVitestJson } from '../dist/utils/reporter.js';

const jsonPath = new URL('../results.json', import.meta.url).pathname;
const mdPath = new URL('../RESULTS.md', import.meta.url).pathname;

if (!existsSync(jsonPath)) {
	throw new Error(
		'Missing results.json. Run: pnpm --filter @data-map/benchmarks bench:full',
	);
}

generateMarkdownFromVitestJson(jsonPath, mdPath);
console.log('Wrote RESULTS.md');
```

#### packages/data-map/benchmarks/src/fixtures/generate.ts

- [ ] Create `packages/data-map/benchmarks/src/fixtures/generate.ts` with:

```ts
export interface KeyDataset {
	root: unknown;
	pointers: string[];
	values: unknown[];
}

export function generateKeyDataset(size: number): KeyDataset {
	const data: Record<string, unknown> = {};
	const pointers: string[] = [];
	const values: unknown[] = [];

	for (let i = 0; i < size; i++) {
		const k = `k${String(i)}`;
		const pointer = `/data/${k}`;
		const value = i;

		data[k] = value;
		pointers.push(pointer);
		values.push(value);
	}

	return {
		root: { data },
		pointers,
		values,
	};
}

export function generateNumberArray(size: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < size; i++) out.push(i);
	return out;
}
```

#### packages/data-map/benchmarks/src/fixtures/small.ts

- [ ] Create `packages/data-map/benchmarks/src/fixtures/small.ts` with:

```ts
import { generateKeyDataset, generateNumberArray } from './generate.js';

export const SMALL = generateKeyDataset(1_000);
export const SMALL_ARRAY_1K = generateNumberArray(1_000);
```

#### packages/data-map/benchmarks/src/fixtures/medium.ts

- [ ] Create `packages/data-map/benchmarks/src/fixtures/medium.ts` with:

```ts
import { generateKeyDataset, generateNumberArray } from './generate.js';

export const MEDIUM = generateKeyDataset(10_000);
export const MEDIUM_ARRAY_10K = generateNumberArray(10_000);
```

#### packages/data-map/benchmarks/src/fixtures/large.ts

- [ ] Create `packages/data-map/benchmarks/src/fixtures/large.ts` with:

```ts
import { generateKeyDataset, generateNumberArray } from './generate.js';

export const LARGE = generateKeyDataset(100_000);
export const LARGE_ARRAY_100K = generateNumberArray(100_000);
```

#### packages/data-map/benchmarks/src/fixtures/index.ts

- [ ] Create `packages/data-map/benchmarks/src/fixtures/index.ts` with:

```ts
export * from './generate.js';
export * from './small.js';
export * from './medium.js';
export * from './large.js';
```

#### packages/data-map/benchmarks/src/utils/measure.ts

- [ ] Create `packages/data-map/benchmarks/src/utils/measure.ts` with:

```ts
export interface MemorySnapshot {
	rss: number;
	heapTotal: number;
	heapUsed: number;
	external: number;
	arrayBuffers?: number;
}

export function memorySnapshot(): MemorySnapshot | null {
	if (
		typeof process === 'undefined' ||
		typeof process.memoryUsage !== 'function'
	) {
		return null;
	}
	const m = process.memoryUsage();
	return {
		rss: m.rss,
		heapTotal: m.heapTotal,
		heapUsed: m.heapUsed,
		external: m.external,
		arrayBuffers: (m as any).arrayBuffers,
	};
}

export function formatBytes(bytes: number): string {
	const abs = Math.abs(bytes);
	if (abs < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (Math.abs(kb) < 1024) return `${kb.toFixed(2)} KiB`;
	const mb = kb / 1024;
	if (Math.abs(mb) < 1024) return `${mb.toFixed(2)} MiB`;
	const gb = mb / 1024;
	return `${gb.toFixed(2)} GiB`;
}

export function diffMemory(a: MemorySnapshot, b: MemorySnapshot) {
	return {
		rss: b.rss - a.rss,
		heapTotal: b.heapTotal - a.heapTotal,
		heapUsed: b.heapUsed - a.heapUsed,
		external: b.external - a.external,
		arrayBuffers:
			typeof a.arrayBuffers === 'number' && typeof b.arrayBuffers === 'number'
				? b.arrayBuffers - a.arrayBuffers
				: undefined,
	};
}
```

#### packages/data-map/benchmarks/src/utils/compare.ts

- [ ] Create `packages/data-map/benchmarks/src/utils/compare.ts` with:

```ts
export interface BaselineEntry {
	opsPerSec: number;
}

export type Baseline = Record<string, BaselineEntry>;

export interface ComparisonResult {
	key: string;
	baselineOpsPerSec: number;
	currentOpsPerSec: number;
	deltaPct: number;
	isRegression: boolean;
}

export function compareAgainstBaseline(params: {
	baseline: Baseline;
	currentOpsPerSec: Record<string, number>;
	regressionThresholdPct?: number;
}): ComparisonResult[] {
	const threshold = params.regressionThresholdPct ?? 10;
	const out: ComparisonResult[] = [];

	for (const [key, current] of Object.entries(params.currentOpsPerSec)) {
		const baseline = params.baseline[key]?.opsPerSec ?? 0;

		// Treat baseline=0 as “unset”: do not flag regressions.
		if (baseline <= 0 || current <= 0) {
			out.push({
				key,
				baselineOpsPerSec: baseline,
				currentOpsPerSec: current,
				deltaPct: baseline > 0 ? ((current - baseline) / baseline) * 100 : 0,
				isRegression: false,
			});
			continue;
		}

		const deltaPct = ((current - baseline) / baseline) * 100;
		out.push({
			key,
			baselineOpsPerSec: baseline,
			currentOpsPerSec: current,
			deltaPct,
			isRegression: deltaPct < -threshold,
		});
	}

	out.sort((a, b) => a.key.localeCompare(b.key));
	return out;
}
```

#### packages/data-map/benchmarks/src/utils/comparisons.ts

- [ ] Create `packages/data-map/benchmarks/src/utils/comparisons.ts` with:

```ts
export interface BenchRow {
	name: string;
	hz?: number;
	mean?: number;
	rme?: number;
}

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

#### packages/data-map/benchmarks/src/utils/reporter.ts

- [ ] Create `packages/data-map/benchmarks/src/utils/reporter.ts` with:

```ts
import { readFileSync, writeFileSync } from 'node:fs';

import { toMarkdownTable, type BenchRow } from './comparisons.js';
import { compareAgainstBaseline, type Baseline } from './compare.js';

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value)
		? value
		: undefined;
}

function pickBenchStats(assertion: any): {
	hz?: number;
	mean?: number;
	rme?: number;
} {
	// Vitest bench JSON has varied across versions; this is best-effort.
	const candidates = [
		assertion?.benchmark,
		assertion?.bench,
		assertion?.result,
		assertion?.results,
		assertion?.meta,
		assertion?.stats,
		assertion?.benchmarkResult,
		assertion?.benchmark?.stats,
		assertion?.benchmark?.result,
		assertion?.benchmark?.results,
	];

	for (const c of candidates) {
		if (!c || typeof c !== 'object') continue;
		const hz =
			asNumber((c as any).hz) ??
			asNumber((c as any).ops) ??
			asNumber((c as any).opsPerSec);
		const mean =
			asNumber((c as any).mean) ??
			asNumber((c as any).avg) ??
			asNumber((c as any).time);
		const rme =
			asNumber((c as any).rme) ?? asNumber((c as any).relativeMarginOfError);

		if (
			typeof hz !== 'undefined' ||
			typeof mean !== 'undefined' ||
			typeof rme !== 'undefined'
		) {
			return { hz, mean, rme };
		}
	}

	return {};
}

function extractRowsFromVitestJson(parsed: any): BenchRow[] {
	const rows: BenchRow[] = [];
	const suites = parsed?.testResults ?? [];

	for (const suite of suites) {
		for (const t of suite?.assertionResults ?? []) {
			const name = t.title ?? t.fullName ?? 'unknown';
			const stats = pickBenchStats(t);
			rows.push({ name, ...stats });
		}
	}

	return rows;
}

function loadBaseline(): Baseline | null {
	try {
		const baselinePath = new URL('../../baseline.json', import.meta.url)
			.pathname;
		const raw = readFileSync(baselinePath, 'utf8');
		return JSON.parse(raw) as Baseline;
	} catch {
		return null;
	}
}

// This expects Vitest JSON reporter output.
export function generateMarkdownFromVitestJson(
	jsonPath: string,
	mdPath: string,
) {
	const raw = readFileSync(jsonPath, 'utf8');
	const parsed = JSON.parse(raw);
	const rows = extractRowsFromVitestJson(parsed);

	const baseline = loadBaseline();
	const currentOpsPerSec: Record<string, number> = {};
	for (const r of rows) {
		if (typeof r.hz === 'number') currentOpsPerSec[r.name] = r.hz;
	}

	const comparisons = baseline
		? compareAgainstBaseline({
				baseline,
				currentOpsPerSec,
				regressionThresholdPct: 10,
			})
		: [];

	const regressions = comparisons.filter((c) => c.isRegression);

	const md = [
		'# Benchmark Results (generated)',
		'',
		toMarkdownTable(rows),
		'',
		baseline
			? `Baseline comparisons: ${String(comparisons.length)} (regressions: ${String(regressions.length)})`
			: 'Baseline comparisons: skipped (baseline.json not found or unreadable)',
		'',
		regressions.length
			? [
					'## Regressions (>10% slower than baseline)',
					'',
					...regressions.map(
						(r) =>
							`- ${r.key}: ${r.currentOpsPerSec.toFixed(2)} ops/s vs ${r.baselineOpsPerSec.toFixed(2)} ops/s (${r.deltaPct.toFixed(2)}%)`,
					),
					'',
				].join('\n')
			: '',
	]
		.filter(Boolean)
		.join('\n');

	writeFileSync(mdPath, md);
}
```

#### packages/data-map/benchmarks/src/index.ts

- [ ] Replace the entire contents of `packages/data-map/benchmarks/src/index.ts` with:

```ts
export * from './fixtures/index.js';

export * from './utils/measure.js';
export * from './utils/compare.js';
export * from './utils/reporter.js';
export * from './utils/comparisons.js';
```

### Step 1 Verification Checklist

- [ ] `pnpm --filter @data-map/benchmarks type-check`
- [ ] `pnpm --filter @data-map/benchmarks build`
- [ ] `node -e "import('./packages/data-map/benchmarks/dist/index.js').then((m)=>console.log(Object.keys(m)))"`

### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(data-map): add benchmark infrastructure foundation

- Add Vitest bench configs (node + browser) with workspace aliasing
- Add baseline.json scaffolding + compare-results script
- Add fixtures + utils for results reporting

completes: data-map remediation step 1 of 12 (bench infra)
```

---

## Step 2: Core Operation Benchmarks

### Step 2 Checklist

- [ ] Create core benchmark files:
  - [ ] `packages/data-map/benchmarks/src/storage.bench.ts`
  - [ ] `packages/data-map/benchmarks/src/signals.bench.ts`
  - [ ] `packages/data-map/benchmarks/src/subscriptions.bench.ts`

### Step 2 Files

#### packages/data-map/benchmarks/src/storage.bench.ts

- [ ] Create `packages/data-map/benchmarks/src/storage.bench.ts` with:

```ts
import { bench, describe } from 'vitest';

import { FlatStore } from '@data-map/storage';

import { SMALL } from './fixtures/index.js';

describe('Storage', () => {
	const pointers = SMALL.pointers;
	const values = SMALL.values;
	const store = new FlatStore(SMALL.root);
	let i = 0;

	bench('storage.getSmall', () => {
		const idx = i++ % pointers.length;
		store.get(pointers[idx]);
	});

	bench('storage.setSmall', () => {
		const idx = i++ % pointers.length;
		store.set(pointers[idx], values[idx]);
	});

	bench('storage.hasSmall', () => {
		const idx = i++ % pointers.length;
		store.has(pointers[idx]);
	});

	bench('storage.deleteSmall', () => {
		const idx = i++ % pointers.length;
		const p = pointers[idx];
		store.delete(p);
		store.set(p, values[idx]);
	});

	bench('storage.toObjectSmall', () => {
		store.toObject();
	});
});
```

#### packages/data-map/benchmarks/src/signals.bench.ts

- [ ] Create `packages/data-map/benchmarks/src/signals.bench.ts` with:

```ts
import { bench, describe } from 'vitest';

import { batch, computed, effect, signal } from '@data-map/signals';

describe('Signals', () => {
	const s = signal(0);
	const c = computed(() => s.value + 1);

	// Keep an effect around to ensure dependency graphs are exercised.
	const handle = effect(() => {
		void c.value;
	});

	let i = 0;

	bench('signals.signalRead', () => {
		void s.value;
	});

	bench('signals.signalWrite', () => {
		s.value = i++;
	});

	bench('signals.computedReadCached', () => {
		void c.value;
	});

	bench('signals.computedReadDirty', () => {
		s.value = i++;
		void c.value;
	});

	bench('signals.batch100Writes', () => {
		batch(() => {
			for (let j = 0; j < 100; j++) s.value = i++;
		});
	});

	// Prevent tree-shaking / ensure the effect is not considered unused.
	bench('signals.effectDispose', () => {
		handle.dispose();
	});
});
```

#### packages/data-map/benchmarks/src/subscriptions.bench.ts

- [ ] Create `packages/data-map/benchmarks/src/subscriptions.bench.ts` with:

```ts
import { bench, describe } from 'vitest';

import { SubscriptionEngine } from '@data-map/subscriptions';

import { SMALL } from './fixtures/index.js';

describe('Subscriptions', () => {
	const engine = new SubscriptionEngine();
	const pointer = SMALL.pointers[0];

	bench('subscriptions.subscribePointer', () => {
		const unsub = engine.subscribePointer(pointer, () => {});
		unsub();
	});

	bench('subscriptions.subscribePattern', () => {
		const unsub = engine.subscribePattern('$.data.*', () => {});
		unsub();
	});

	// Pre-wire 100 exact subscriptions once.
	const unsubs100: Array<() => void> = [];
	for (let i = 0; i < 100; i++) {
		unsubs100.push(engine.subscribePointer(pointer, () => {}));
	}

	bench('subscriptions.notifyExact100', () => {
		engine.notify(pointer, 1);
	});

	// Pre-wire 10 pattern subscriptions once.
	const unsubs10: Array<() => void> = [];
	for (let i = 0; i < 10; i++) {
		unsubs10.push(engine.subscribePattern('$.data.*', () => {}));
	}

	bench('subscriptions.notifyPattern10', () => {
		engine.notify(pointer, 1);
	});

	// Cleanup bench (ensures unsub fns are exercised)
	bench('subscriptions.cleanup', () => {
		for (const u of unsubs100) u();
		for (const u of unsubs10) u();
	});
});
```

### Step 2 Verification Checklist

- [ ] `pnpm --filter @data-map/benchmarks bench`
- [ ] `pnpm --filter @data-map/benchmarks bench:full`
- [ ] `pnpm --filter @data-map/benchmarks build`
- [ ] `pnpm --filter @data-map/benchmarks bench:compare` (expects `RESULTS.md` to be created)

### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add core operation benchmarks

- Add FlatStore micro-benchmarks for get/set/has/delete/toObject
- Add signals benchmarks for read/write/computed/batching
- Add subscription engine benchmarks for subscribe + notify

completes: data-map remediation step 2 of 12 (core benches)
```

---

## Step 3: Array and Scale Benchmarks

### Step 3 Checklist

- [ ] Create array + scale + memory benchmark files:
  - [ ] `packages/data-map/benchmarks/src/arrays.bench.ts`
  - [ ] `packages/data-map/benchmarks/src/scale.bench.ts`
  - [ ] `packages/data-map/benchmarks/src/memory.bench.ts`

### Step 3 Files

#### packages/data-map/benchmarks/src/arrays.bench.ts

- [ ] Create `packages/data-map/benchmarks/src/arrays.bench.ts` with:

```ts
import { bench, describe } from 'vitest';

import { FlatStore } from '@data-map/storage';
import { GapBuffer, PersistentVector, SmartArray } from '@data-map/arrays';

describe('Arrays', () => {
	describe('SmartArray', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/arr');

		bench('arrays.smartArrayPush', () => {
			arr.push(1);
		});

		bench('arrays.smartArraySpliceMiddle', () => {
			arr.splice(0, 0, 1);
			arr.splice(0, 1);
		});
	});

	describe('GapBuffer', () => {
		const gb = new GapBuffer<number>(256);
		for (let i = 0; i < 200; i++) gb.insert(gb.length, i);

		bench('arrays.gapBufferInsertMiddle', () => {
			gb.insert(Math.floor(gb.length / 2), 1);
		});

		bench('arrays.gapBufferDeleteMiddle', () => {
			gb.delete(Math.floor(gb.length / 2));
		});
	});

	describe('PersistentVector', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 1_000; i++) v = v.push(i);

		bench('arrays.persistentVectorPush', () => {
			v = v.push(1);
		});

		bench('arrays.persistentVectorSetMiddle', () => {
			v = v.set(Math.floor(v.length / 2), 123);
		});
	});
});
```

#### packages/data-map/benchmarks/src/scale.bench.ts

- [ ] Create `packages/data-map/benchmarks/src/scale.bench.ts` with:

```ts
import { bench, describe } from 'vitest';

import { DataMap } from '@data-map/core';
import { FlatStore } from '@data-map/storage';

import { MEDIUM } from './fixtures/index.js';

describe('Scale', () => {
	const pointers = MEDIUM.pointers;
	const values = MEDIUM.values;

	describe('FlatStore (medium)', () => {
		const store = new FlatStore(MEDIUM.root);
		let i = 0;

		bench('scale.flatStoreGetMedium', () => {
			const idx = i++ % pointers.length;
			store.get(pointers[idx]);
		});

		bench('scale.flatStoreSetMedium', () => {
			const idx = i++ % pointers.length;
			store.set(pointers[idx], values[idx]);
		});
	});

	describe('DataMap (medium)', () => {
		const dm = new DataMap(MEDIUM.root as any);
		let i = 0;

		bench('scale.dataMapSetMedium', () => {
			const idx = i++ % pointers.length;
			dm.set(pointers[idx], values[idx]);
		});

		bench('scale.dataMapSubscribeMedium', () => {
			const idx = i++ % pointers.length;
			const unsub = dm.subscribe(pointers[idx], () => {});
			unsub();
		});
	});
});
```

#### packages/data-map/benchmarks/src/memory.bench.ts

- [ ] Create `packages/data-map/benchmarks/src/memory.bench.ts` with:

```ts
import { bench, describe } from 'vitest';

import { FlatStore } from '@data-map/storage';

import { MEDIUM } from './fixtures/index.js';
import { diffMemory, memorySnapshot } from './utils/measure.js';

describe('Memory', () => {
	bench('memory.processMemoryUsage', () => {
		const before = memorySnapshot();
		const store = new FlatStore(MEDIUM.root);
		void store.snapshot();
		const after = memorySnapshot();

		if (before && after) {
			diffMemory(before, after);
		}
	});
});
```

### Step 3 Verification Checklist

- [ ] `pnpm --filter @data-map/benchmarks bench`
- [ ] `pnpm --filter @data-map/benchmarks bench:full`
- [ ] `pnpm --filter @data-map/benchmarks build`
- [ ] `pnpm --filter @data-map/benchmarks bench:compare`

### Step 3 STOP & COMMIT

Multiline conventional commit message:

````txt
feat(data-map): add array, scale, and memory benchmarks

- Add SmartArray/GapBuffer/PersistentVector benchmarks
- Add medium-scale FlatStore vs DataMap benchmarks
- Add memory snapshot benchmark

completes: data-map remediation step 3 of 12 (arrays + scale)

---

## Step 4: Signals Package Completion

### Step 4 Checklist

- [ ] Add `peek()` method to `Signal<T>` (read without tracking)
- [ ] Add `untracked<T>(fn)` utility
- [ ] Export `getCurrentEffect()`, `track()`, and `trigger()` integration APIs
- [ ] Ensure public `Computed<T>` interface includes `invalidate()`
- [ ] Add tests for `peek()`, `untracked()`, nested effects, and computed cycle detection

### Step 4 Files

#### [packages/data-map/signals/src/internal.ts](../../packages/data-map/signals/src/internal.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/internal.ts](../../packages/data-map/signals/src/internal.ts) with:

```ts
export interface DependencySource {
	addObserver(observer: Observer): void;
	removeObserver(observer: Observer): void;

	/**
	 * Optional hook for external integrations to trigger downstream observers
	 * without requiring a value write (used by exported `trigger()`).
	 */
	triggerObservers?(): void;
}

export interface Observer {
	onDependencyRead(source: DependencySource): void;
	onDependencyChanged(): void;
}
````

#### [packages/data-map/signals/src/context.ts](../../packages/data-map/signals/src/context.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/context.ts](../../packages/data-map/signals/src/context.ts) with:

```ts
import type { DependencySource, Observer } from './internal.js';

const observerStack: Observer[] = [];

const NOOP_OBSERVER: Observer = {
	onDependencyRead(): void {
		// intentionally empty (disables tracking)
	},
	onDependencyChanged(): void {
		// intentionally empty
	},
};

export function pushObserver(observer: Observer): void {
	observerStack.push(observer);
}

export function popObserver(): void {
	observerStack.pop();
}

export function currentObserver(): Observer | undefined {
	return observerStack[observerStack.length - 1];
}

export function getCurrentEffect(): Observer | null {
	return currentObserver() ?? null;
}

export function trackRead(source: DependencySource): void {
	const obs = currentObserver();
	if (!obs) return;
	obs.onDependencyRead(source);
}

export function untracked<T>(fn: () => T): T {
	pushObserver(NOOP_OBSERVER);
	try {
		return fn();
	} finally {
		popObserver();
	}
}

export function track(source: DependencySource): void {
	trackRead(source);
}

export function trigger(source: DependencySource): void {
	source.triggerObservers?.();
}
```

#### [packages/data-map/signals/src/types.ts](../../packages/data-map/signals/src/types.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/types.ts](../../packages/data-map/signals/src/types.ts) with:

```ts
export type CleanupFn = () => void;

export type Subscriber<T> = (value: T) => void;

export type Unsubscribe = () => void;

export interface ReadonlySignal<T> {
	readonly value: T;
	subscribe(subscriber: Subscriber<T>): Unsubscribe;
}

export interface Signal<T> extends ReadonlySignal<T> {
	value: T;
	peek(): T;
}

export interface Computed<T> extends ReadonlySignal<T> {
	invalidate(): void;
}

export interface EffectHandle {
	dispose(): void;
}
```

#### [packages/data-map/signals/src/signal.ts](../../packages/data-map/signals/src/signal.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/signal.ts](../../packages/data-map/signals/src/signal.ts) with:

```ts
import { isBatching, queueObserver } from './batch.js';
import { trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Signal as SignalType, Subscriber, Unsubscribe } from './types.js';

class SignalImpl<T> implements SignalType<T>, DependencySource {
	private _value: T;
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	constructor(initial: T) {
		this._value = initial;
	}

	get value(): T {
		trackRead(this);
		return this._value;
	}

	set value(next: T) {
		if (Object.is(this._value, next)) return;
		this._value = next;
		this.notify();
	}

	peek(): T {
		return this._value;
	}

	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		this.observers.delete(observer);
	}

	triggerObservers(): void {
		this.notify();
	}

	private notify(): void {
		// Snapshot iteration prevents pathological re-entrancy when callbacks
		// subscribe/unsubscribe or (re)track dependencies during notification.
		const subs = Array.from(this.subscribers);
		for (const sub of subs) sub(this._value);
		const observers = Array.from(this.observers);
		for (const obs of observers) {
			if (isBatching()) queueObserver(obs);
			else obs.onDependencyChanged();
		}
	}
}

export function signal<T>(initial: T): SignalType<T> {
	return new SignalImpl(initial);
}
```

#### [packages/data-map/signals/src/computed.ts](../../packages/data-map/signals/src/computed.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/computed.ts](../../packages/data-map/signals/src/computed.ts) with:

```ts
import { isBatching, queueObserver } from './batch.js';
import { popObserver, pushObserver, trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Computed, Subscriber, Unsubscribe } from './types.js';

class ComputedImpl<T> implements Computed<T>, DependencySource, Observer {
	private compute: () => T;
	private _value!: T;
	private dirty = true;
	private computing = false;

	private sources = new Set<DependencySource>();
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	constructor(compute: () => T) {
		this.compute = compute;
	}

	get value(): T {
		trackRead(this);
		if (this.dirty) this.recompute();
		return this._value;
	}

	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		this.observers.delete(observer);
	}

	onDependencyRead(source: DependencySource): void {
		if (this.sources.has(source)) return;
		this.sources.add(source);
		source.addObserver(this);
	}

	onDependencyChanged(): void {
		if (this.dirty) return;
		this.dirty = true;
		const observers = Array.from(this.observers);
		for (const obs of observers) {
			if (isBatching()) queueObserver(obs);
			else obs.onDependencyChanged();
		}
		const subs = Array.from(this.subscribers);
		for (const sub of subs) sub(this._value);
	}

	invalidate(): void {
		this.onDependencyChanged();
	}

	triggerObservers(): void {
		this.onDependencyChanged();
	}

	private recompute(): void {
		if (this.computing) {
			throw new Error('Circular computed dependency detected');
		}

		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();

		this.computing = true;
		pushObserver(this);
		try {
			const next = this.compute();
			this._value = next;
			this.dirty = false;
		} finally {
			popObserver();
			this.computing = false;
		}
	}
}

export function computed<T>(fn: () => T): Computed<T> {
	return new ComputedImpl(fn);
}
```

#### [packages/data-map/signals/src/index.ts](../../packages/data-map/signals/src/index.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/index.ts](../../packages/data-map/signals/src/index.ts) with:

```ts
export type {
	CleanupFn,
	Subscriber,
	Unsubscribe,
	ReadonlySignal,
	Signal,
	Computed,
	EffectHandle,
} from './types.js';

export { signal } from './signal.js';
export { computed } from './computed.js';
export { effect } from './effect.js';
export { batch } from './batch.js';

export { getCurrentEffect, track, trigger, untracked } from './context.js';
```

#### [packages/data-map/signals/src/**tests**/signals.spec.ts](../../packages/data-map/signals/src/__tests__/signals.spec.ts)

- [ ] Replace the entire contents of [packages/data-map/signals/src/**tests**/signals.spec.ts](../../packages/data-map/signals/src/__tests__/signals.spec.ts) with:

```ts
import { describe, expect, it, vi } from 'vitest';
import { batch, computed, effect, signal, untracked } from '../index.js';

describe('signals', () => {
	it('signal read/write and subscribe', () => {
		const s = signal(1);
		const seen: number[] = [];
		const unsub = s.subscribe((v) => seen.push(v));
		expect(s.value).toBe(1);
		s.value = 2;
		s.value = 3;
		unsub();
		s.value = 4;
		expect(seen).toEqual([2, 3]);
	});

	it('signal.peek does not track effects', () => {
		const s = signal(1);
		const fn = vi.fn(() => {
			s.peek();
		});

		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);

		s.value = 2;
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('signal.peek does not track computed dependencies', () => {
		const s = signal(1);
		let runs = 0;

		const c = computed(() => {
			runs++;
			return s.peek() + 1;
		});

		expect(c.value).toBe(2);
		expect(runs).toBe(1);

		s.value = 2;
		expect(c.value).toBe(2);
		expect(runs).toBe(1);
	});

	it('computed tracks dependencies lazily', () => {
		const a = signal(1);
		const b = signal(2);
		let runs = 0;
		const c = computed(() => {
			runs++;
			return a.value + b.value;
		});

		expect(runs).toBe(0);
		expect(c.value).toBe(3);
		expect(runs).toBe(1);

		a.value = 2;
		expect(runs).toBe(1);
		expect(c.value).toBe(4);
		expect(runs).toBe(2);
	});

	it('untracked prevents dependency tracking', () => {
		const s = signal(0);
		const fn = vi.fn(() => {
			untracked(() => {
				s.value;
			});
		});

		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);

		s.value = 1;
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('effect re-runs on dependency changes and runs cleanup', () => {
		const s = signal(0);
		const cleanup = vi.fn();
		const fn = vi.fn(() => {
			s.value;
			return cleanup;
		});
		const e = effect(fn);

		expect(fn).toHaveBeenCalledTimes(1);
		s.value = 1;
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledTimes(2);

		e.dispose();
		s.value = 2;
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('nested effects: inner tracks separately from outer', () => {
		const a = signal(0);
		const b = signal(0);

		const innerFn = vi.fn(() => {
			b.value;
		});

		const outerFn = vi.fn(() => {
			a.value;

			const inner = effect(innerFn);
			return () => {
				inner.dispose();
			};
		});

		const outer = effect(outerFn);

		expect(outerFn).toHaveBeenCalledTimes(1);
		expect(innerFn).toHaveBeenCalledTimes(1);

		b.value = 1;
		expect(innerFn).toHaveBeenCalledTimes(2);
		expect(outerFn).toHaveBeenCalledTimes(1);

		a.value = 1;
		expect(outerFn).toHaveBeenCalledTimes(2);
		expect(innerFn).toHaveBeenCalledTimes(3);

		outer.dispose();
		b.value = 2;
		expect(innerFn).toHaveBeenCalledTimes(3);
	});

	it('batch coalesces effect notifications', () => {
		const a = signal(1);
		const b = signal(2);
		const fn = vi.fn(() => {
			a.value;
			b.value;
		});
		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);
		batch(() => {
			a.value = 2;
			b.value = 3;
		});
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('diamond dependencies do not glitch (single recompute on read)', () => {
		const s = signal(1);
		let bRuns = 0;
		let cRuns = 0;
		let dRuns = 0;
		const b = computed(() => {
			bRuns++;
			return s.value + 1;
		});
		const c = computed(() => {
			cRuns++;
			return s.value + 2;
		});
		const d = computed(() => {
			dRuns++;
			return b.value + c.value;
		});

		expect(d.value).toBe(1 + 1 + 1 + 2);
		expect([bRuns, cRuns, dRuns]).toEqual([1, 1, 1]);

		s.value = 2;
		expect(d.value).toBe(2 + 1 + 2 + 2);
		expect([bRuns, cRuns, dRuns]).toEqual([2, 2, 2]);
	});

	it('computed circular dependency detection', () => {
		let a: any;
		let b: any;

		a = computed(() => b.value + 1);
		b = computed(() => a.value + 1);

		expect(() => a.value).toThrow(/Circular computed dependency detected/);
	});
});
```

### Step 4 Verification Checklist

- [ ] `pnpm --filter @data-map/signals type-check`
- [ ] `pnpm --filter @data-map/signals test`

### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): complete signals package compliance

- Add Signal.peek() for non-tracking reads
- Add untracked() and export tracking integration APIs (getCurrentEffect/track/trigger)
- Ensure Computed.invalidate() is part of the public interface
- Add tests for peek/untracked, nested effects, and computed cycle detection

completes: data-map remediation step 4 of 12 (signals)
```

---

## Step 5: Storage Package Completion

### Step 5 Checklist

- [x] Add `readonly size` property
- [x] Add `readonly version` counter (global change counter; keep `globalVersion` as a back-compat alias)
- [x] Add `setDeep(pointer, value)` and `getObject(pointer)`
- [x] Add `keys(prefix?)` and `entries(prefix?)`
- [x] Add `getVersion(pointer)`

### Step 5 Files

#### [packages/data-map/storage/src/flat-store.ts](../../packages/data-map/storage/src/flat-store.ts)

- [ ] Replace the entire contents of [packages/data-map/storage/src/flat-store.ts](../../packages/data-map/storage/src/flat-store.ts) with:

```ts
import type { ArrayMetadata, FlatSnapshot, Pointer } from './types.js';
import { bumpVersion } from './versioning.js';
import { ingestNested, materializeNested } from './nested-converter.js';
import { pointerToSegments } from './pointer-utils.js';

export class FlatStore {
	private data = new Map<Pointer, unknown>();
	private versions = new Map<Pointer, number>();
	private arrays = new Map<Pointer, ArrayMetadata>();
	private _version = 0;

	constructor(initial?: unknown) {
		if (typeof initial !== 'undefined') {
			ingestNested(this.data, this.versions, this.arrays, initial, '');
			this._version++;
		}
	}

	get size(): number {
		return this.data.size;
	}

	get version(): number {
		return this._version;
	}

	// Back-compat alias for earlier drafts.
	get globalVersion(): number {
		return this._version;
	}

	get(pointer: Pointer): unknown {
		return this.data.get(pointer);
	}

	has(pointer: Pointer): boolean {
		return this.data.has(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		this.data.set(pointer, value);
		bumpVersion(this.versions, pointer);
		this._version++;
	}

	delete(pointer: Pointer): boolean {
		const existed = this.data.delete(pointer);
		if (existed) {
			bumpVersion(this.versions, pointer);
			this._version++;
		}
		return existed;
	}

	getVersion(pointer: Pointer): number {
		return this.versions.get(pointer) ?? 0;
	}

	snapshot(): FlatSnapshot {
		return {
			data: new Map(this.data),
			versions: new Map(this.versions),
			arrays: new Map(this.arrays),
		};
	}

	toObject(): unknown {
		return materializeNested(this.data);
	}

	getObject(pointer: Pointer): unknown {
		if (pointer === '') return materializeNested(this.data);

		const exactExists = this.data.has(pointer);
		const exactValue = this.data.get(pointer);

		const prefix = `${pointer}/`;
		let hasDescendants = false;
		for (const key of this.data.keys()) {
			if (key.startsWith(prefix)) {
				hasDescendants = true;
				break;
			}
		}

		if (!hasDescendants) {
			return exactExists ? exactValue : undefined;
		}

		const baseSegs = pointerToSegments(pointer);
		let root: any | undefined;

		for (const [ptr, value] of this.data.entries()) {
			if (!ptr.startsWith(prefix)) continue;
			const segs = pointerToSegments(ptr);
			const rel = segs.slice(baseSegs.length);
			if (rel.length === 0) continue;

			if (typeof root === 'undefined') {
				root = /^\d+$/.test(rel[0] ?? '') ? [] : {};
			}

			let cur: any = root;
			let parent: any | undefined;
			let parentKey: string | number | undefined;

			for (let i = 0; i < rel.length; i++) {
				const seg = rel[i] ?? '';
				const isLast = i === rel.length - 1;
				const nextSeg = rel[i + 1];
				const nextIsIndex =
					typeof nextSeg === 'string' && /^\d+$/.test(nextSeg);
				const isIndex = /^\d+$/.test(seg);

				if (isIndex) {
					const idx = Number(seg);
					if (!Array.isArray(cur)) {
						const nextArr: any[] = [];
						if (typeof parent === 'undefined') {
							root = nextArr;
						} else if (typeof parentKey === 'number') {
							(parent as any[])[parentKey] = nextArr;
						} else {
							(parent as any)[parentKey as string] = nextArr;
						}
						cur = nextArr;
					}

					if (isLast) {
						(cur as unknown[])[idx] = value;
						break;
					}

					(cur as any[])[idx] ??= nextIsIndex ? [] : {};
					parent = cur;
					parentKey = idx;
					cur = (cur as any[])[idx];
					continue;
				}

				// object key
				if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) {
					const nextObj: any = {};
					if (typeof parent === 'undefined') {
						root = nextObj;
					} else if (typeof parentKey === 'number') {
						(parent as any[])[parentKey] = nextObj;
					} else {
						(parent as any)[parentKey as string] = nextObj;
					}
					cur = nextObj;
				}

				if (isLast) {
					(cur as any)[seg] = value;
					break;
				}
				(cur as any)[seg] ??= nextIsIndex ? [] : {};
				parent = cur;
				parentKey = seg;
				cur = (cur as any)[seg];
			}
		}

		return typeof root === 'undefined' ? undefined : root;
	}

	*keys(prefix?: Pointer): IterableIterator<Pointer> {
		const base = prefix ?? '';
		const basePrefix = base === '' ? '' : `${base}/`;
		const all = Array.from(this.data.keys()).sort();
		for (const key of all) {
			if (base === '') {
				yield key;
				continue;
			}
			if (key === base || key.startsWith(basePrefix)) yield key;
		}
	}

	*entries(prefix?: Pointer): IterableIterator<[Pointer, unknown]> {
		for (const key of this.keys(prefix)) {
			yield [key, this.data.get(key)];
		}
	}

	setDeep(pointer: Pointer, value: unknown): void {
		const base = pointer;
		const basePrefix = base === '' ? '' : `${base}/`;

		// Remove stale leaf keys under subtree.
		const toDelete: Pointer[] = [];
		for (const key of this.data.keys()) {
			if (base === '') {
				toDelete.push(key);
			} else if (key === base || key.startsWith(basePrefix)) {
				toDelete.push(key);
			}
		}
		for (const key of toDelete) {
			const existed = this.data.delete(key);
			if (existed) bumpVersion(this.versions, key);
		}

		// Remove stale array metadata under subtree.
		const arraysToDelete: Pointer[] = [];
		for (const key of this.arrays.keys()) {
			if (base === '') {
				arraysToDelete.push(key);
			} else if (key === base || key.startsWith(basePrefix)) {
				arraysToDelete.push(key);
			}
		}
		for (const key of arraysToDelete) this.arrays.delete(key);

		// Ingest new subtree at pointer.
		ingestNested(this.data, this.versions, this.arrays, value, base);
		this._version++;
	}

	ingest(root: unknown): void {
		ingestNested(this.data, this.versions, this.arrays, root, '');
		this._version++;
	}
}
```

#### [packages/data-map/storage/src/types.ts](../../packages/data-map/storage/src/types.ts)

- [ ] Replace the entire contents of [packages/data-map/storage/src/types.ts](../../packages/data-map/storage/src/types.ts) with:

```ts
export type Pointer = string;

export interface ArrayMetadata {
	length: number;
	indices: number[] | Uint32Array;
	freeSlots: number[];
	physicalPrefix: Pointer;
}

export interface FlatSnapshot {
	data: Map<Pointer, unknown>;
	versions: Map<Pointer, number>;
	arrays: Map<Pointer, ArrayMetadata>;
}
```

#### [packages/data-map/storage/src/index.ts](../../packages/data-map/storage/src/index.ts)

- [ ] Replace the entire contents of [packages/data-map/storage/src/index.ts](../../packages/data-map/storage/src/index.ts) with:

```ts
export type { Pointer, ArrayMetadata, FlatSnapshot } from './types.js';
export { FlatStore } from './flat-store.js';
export {
	pointerToSegments,
	segmentsToPointer,
	parentPointer,
} from './pointer-utils.js';
```

#### [packages/data-map/storage/src/**tests**/flat-store.spec.ts](../../packages/data-map/storage/src/__tests__/flat-store.spec.ts)

- [ ] Replace the entire contents of [packages/data-map/storage/src/**tests**/flat-store.spec.ts](../../packages/data-map/storage/src/__tests__/flat-store.spec.ts) with:

```ts
import { describe, expect, it } from 'vitest';
import { FlatStore } from '../flat-store.js';

describe('FlatStore', () => {
	it('set/get/delete at depth', () => {
		const s = new FlatStore();
		expect(s.size).toBe(0);
		expect(s.version).toBe(0);
		s.set('/users/0/name', 'Alice');
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.has('/users/0/name')).toBe(true);
		expect(s.size).toBe(1);
		expect(s.version).toBe(1);
		expect(s.delete('/users/0/name')).toBe(true);
		expect(s.get('/users/0/name')).toBeUndefined();
		expect(s.size).toBe(0);
		expect(s.version).toBe(2);
	});

	it('ingest and toObject round-trip', () => {
		const s = new FlatStore({ users: [{ name: 'Alice' }, { name: 'Bob' }] });
		const obj = s.toObject() as any;
		expect(obj.users[0].name).toBe('Alice');
		expect(obj.users[1].name).toBe('Bob');
	});

	it('versions bump on changes', () => {
		const s = new FlatStore();
		expect(s.getVersion('/x')).toBe(0);
		s.set('/x', 1);
		expect(s.getVersion('/x')).toBe(1);
		s.set('/x', 2);
		expect(s.getVersion('/x')).toBe(2);
		s.delete('/x');
		expect(s.getVersion('/x')).toBe(3);
	});

	it('setDeep writes subtree and removes stale keys', () => {
		const s = new FlatStore();
		s.setDeep('/users', [{ name: 'Alice' }, { name: 'Bob' }]);
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.get('/users/1/name')).toBe('Bob');
		expect(s.getObject('/users')).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);

		s.setDeep('/users', [{ name: 'Alice' }]);
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.get('/users/1/name')).toBeUndefined();
		expect(s.getObject('/users')).toEqual([{ name: 'Alice' }]);
	});

	it('keys/entries can be iterated with optional prefix', () => {
		const s = new FlatStore({ users: [{ name: 'Alice' }, { name: 'Bob' }] });
		expect(Array.from(s.keys('/users')).sort()).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
		expect(Array.from(s.entries('/users')).sort()).toEqual([
			['/users/0/name', 'Alice'],
			['/users/1/name', 'Bob'],
		]);
	});
});
```

### Step 5 Verification Checklist

- [x] `pnpm --filter @data-map/storage type-check`
- [x] `pnpm --filter @data-map/storage test`

### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): complete storage package compliance

- Add size and version counters (keep globalVersion alias)
- Add setDeep/getObject for subtree operations
- Add keys/entries iterators and pointer-level getVersion

completes: data-map remediation step 5 of 12 (storage)
```

---

## Step 6: Path Package Critical Fix

This step updates `queryFlat()` to avoid `store.toObject()` for simple JSONPath patterns by iterating flat pointers directly. If your workspace already contains these exact files, the step is a no-op.

### Step 6 Checklist

- [x] Ensure `queryFlat()` uses the pointer-iterator fast-path
- [x] Ensure the complex path fallback uses `store.getObject('')`

### Step 6 Files

#### [packages/data-map/path/src/query.ts](../../packages/data-map/path/src/query.ts)

- [ ] Ensure [packages/data-map/path/src/query.ts](../../packages/data-map/path/src/query.ts) matches:

```ts
import { query as runQuery } from '@jsonpath/jsonpath';

import type { QueryResult } from './types.js';
import {
	iteratePointersForSimpleJsonPath,
	parseSimpleJsonPath,
} from './pointer-iterator.js';

export interface FlatStoreQueryable {
	get: (pointer: string) => unknown;
	has: (pointer: string) => boolean;
	keys: (prefix?: string) => IterableIterator<string>;
	getObject: (pointer: string) => unknown;
}

export function queryFlat(
	store: FlatStoreQueryable,
	path: string,
): QueryResult {
	const tokens = parseSimpleJsonPath(path);
	if (tokens) {
		const pointers = Array.from(
			iteratePointersForSimpleJsonPath(store, tokens),
		);
		const values = pointers.map((p) => {
			if (store.has(p)) return store.get(p);
			return store.getObject(p);
		});
		return { values, pointers };
	}

	const root = store.getObject('') as Record<string, unknown>;
	const res = runQuery(root, path);
	return {
		values: res.values(),
		pointers: res.pointers().map((p) => p.toString()),
	};
}
```

#### [packages/data-map/path/src/pointer-iterator.ts](../../packages/data-map/path/src/pointer-iterator.ts)

- [ ] Ensure [packages/data-map/path/src/pointer-iterator.ts](../../packages/data-map/path/src/pointer-iterator.ts) matches the version in the repository.

#### [packages/data-map/path/src/**tests**/query-flat.spec.ts](../../packages/data-map/path/src/__tests__/query-flat.spec.ts)

- [ ] Ensure [packages/data-map/path/src/**tests**/query-flat.spec.ts](../../packages/data-map/path/src/__tests__/query-flat.spec.ts) matches the version in the repository.

### Step 6 Verification Checklist

- [x] `pnpm --filter @data-map/path test`

### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
fix(data-map): make queryFlat fast-path flat-store aware

- Avoid store.toObject() for simple JSONPath patterns
- Use pointer iteration and store.get/store.keys for O(k) behavior

completes: data-map remediation step 6 of 12 (path)
```

````

---

## Step 7: @data-map/subscriptions - Subscription Options + Lifecycle Events

Enhance the subscription engine to support the full event model required by the remediation plan:

- Options: `immediate`, `deep`, `debounce`, `stages`
- Event payload: `previousValue`, `stage`, `cancel()`
- Engine capabilities: `getAffected(pointer)`, `clear()`, `size` getter, before/on/after stages, cancellation, debounce timers

### Step 7 Checklist

- [x] Add `SubscriptionOptions` and `SubscriptionStage` types.
- [x] Extend `SubscriptionEvent` to include `previousValue`, `stage`, and `cancel()`.
- [x] Add options support to `SubscriptionEngine.subscribePointer` and `SubscriptionEngine.subscribePattern`.
- [x] Implement `SubscriptionEngine.getAffected(pointer)`.
- [x] Implement lifecycle stage notification (`before` → `on` → `after`) with cancel support.
- [x] Implement `debounce` timers (applies to the `on` stage).
- [x] Implement `immediate` support for pointer subscriptions.
- [x] Add/expand tests for the new behaviors.

### Step 7 Files

#### [packages/data-map/subscriptions/src/types.ts](../../packages/data-map/subscriptions/src/types.ts)

- [ ] Replace the entire contents of [packages/data-map/subscriptions/src/types.ts](../../packages/data-map/subscriptions/src/types.ts) with:

```ts
export type Pointer = string;

export type SubscriptionKind = 'exact' | 'pattern' | 'query';

export type SubscriptionStage = 'before' | 'on' | 'after';

export interface SubscriptionOptions {
	/** Invoke the callback immediately on subscribe (best-effort; value is unknown). */
	immediate?: boolean;
	/** Receive notifications for descendant pointers (prefix match). */
	deep?: boolean;
	/** Debounce notifications (ms). Applied to the 'on' stage. */
	debounce?: number;
	/** Stages to receive notifications for. Defaults to ['on']. */
	stages?: SubscriptionStage[];
}

export interface SubscriptionEvent {
	pointer: Pointer;
	value: unknown;
	previousValue: unknown;
	stage: SubscriptionStage;
	cancel(): void;
}

export type Unsubscribe = () => void;

export type Subscriber = (event: SubscriptionEvent) => void;

export interface Subscription {
	id: symbol;
	kind: SubscriptionKind;
	pattern: string;
	subscriber: Subscriber;
	options?: SubscriptionOptions;
}

export interface CompiledPattern {
	pattern: string;
	kind: 'pattern' | 'query';
	matchesPointer(pointer: Pointer): boolean;
}
````

#### [packages/data-map/subscriptions/src/subscription-engine.ts](../../packages/data-map/subscriptions/src/subscription-engine.ts)

- [ ] Replace the entire contents of [packages/data-map/subscriptions/src/subscription-engine.ts](../../packages/data-map/subscriptions/src/subscription-engine.ts) with:

```ts
import type {
	Pointer,
	Subscriber,
	Subscription,
	SubscriptionEvent,
	SubscriptionOptions,
	SubscriptionStage,
	Unsubscribe,
} from './types.js';
import { ExactIndex } from './exact-index.js';
import { PatternIndex } from './pattern-index.js';
import { NotificationBatcher } from './notification-batcher.js';

export class SubscriptionEngine {
	private exact = new ExactIndex();
	private patterns = new PatternIndex();
	private batcher = new NotificationBatcher();
	private active = new Set<symbol>();
	private debounceTimers = new Map<symbol, ReturnType<typeof setTimeout>>();
	private debounceEvents = new Map<symbol, SubscriptionEvent>();

	get size(): number {
		return this.active.size;
	}

	clear(): void {
		for (const t of this.debounceTimers.values()) clearTimeout(t);
		this.debounceTimers.clear();
		this.debounceEvents.clear();
		this.active.clear();
		this.exact.clear();
		this.patterns = new PatternIndex();
		this.batcher = new NotificationBatcher();
	}

	subscribePointer(
		pointer: Pointer,
		subscriber: Subscriber,
		options?: SubscriptionOptions,
	): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'exact',
			pattern: pointer,
			subscriber,
			options,
		};
		this.active.add(sub.id);
		this.exact.add(pointer, sub);

		if (options?.immediate) {
			const stage = (options.stages?.[0] ?? 'on') satisfies SubscriptionStage;
			const event: SubscriptionEvent = {
				pointer,
				value: undefined,
				previousValue: undefined,
				stage,
				cancel() {
					// no-op for immediate notifications
				},
			};
			this.deliver(sub, event, { allowBatch: false });
		}

		return () => {
			if (!this.active.delete(sub.id)) return;
			this.clearDebounce(sub.id);
			this.exact.delete(pointer, sub);
		};
	}

	subscribePattern(
		pathPattern: string,
		subscriber: Subscriber,
		options?: SubscriptionOptions,
	): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'pattern',
			pattern: pathPattern,
			subscriber,
			options,
		};
		this.active.add(sub.id);
		this.patterns.add(sub);
		return () => {
			if (!this.active.delete(sub.id)) return;
			this.clearDebounce(sub.id);
			this.patterns.delete(sub);
		};
	}

	getAffected(pointer: Pointer): Set<Subscription> {
		const out = new Set<Subscription>();

		for (const sub of this.exact.get(pointer)) out.add(sub);
		for (const [prefix, set] of this.exact.prefixMatches(pointer)) {
			for (const sub of set) {
				if (prefix === pointer || sub.options?.deep) out.add(sub);
			}
		}
		for (const sub of this.patterns.match(pointer)) out.add(sub);

		return out;
	}

	notify(pointer: Pointer, value: unknown, previousValue?: unknown): void {
		const stages: SubscriptionStage[] = ['before', 'on', 'after'];
		let canceled = false;
		const cancel = () => {
			canceled = true;
		};

		const affected = this.getAffected(pointer);
		for (const stage of stages) {
			if (canceled) return;

			const event: SubscriptionEvent = {
				pointer,
				value,
				previousValue,
				stage,
				cancel,
			};

			for (const sub of affected) {
				if (canceled) return;
				this.deliver(sub, event, { allowBatch: stage === 'on' });
			}
		}
	}

	private deliver(
		sub: Subscription,
		event: SubscriptionEvent,
		options: { allowBatch: boolean },
	): void {
		const stages = sub.options?.stages ?? ['on'];
		if (!stages.includes(event.stage)) return;

		// Debounce applies to 'on' stage only.
		const debounceMs = sub.options?.debounce;
		if (
			event.stage === 'on' &&
			typeof debounceMs === 'number' &&
			debounceMs > 0
		) {
			this.debounceEvents.set(sub.id, event);
			const existing = this.debounceTimers.get(sub.id);
			if (existing) clearTimeout(existing);
			this.debounceTimers.set(
				sub.id,
				setTimeout(() => {
					this.debounceTimers.delete(sub.id);
					const e = this.debounceEvents.get(sub.id);
					if (!e) return;
					this.debounceEvents.delete(sub.id);
					sub.subscriber(e);
				}, debounceMs),
			);
			return;
		}

		if (options.allowBatch) {
			this.batcher.queue(sub, event);
			return;
		}

		sub.subscriber(event);
	}

	private clearDebounce(id: symbol): void {
		const t = this.debounceTimers.get(id);
		if (t) clearTimeout(t);
		this.debounceTimers.delete(id);
		this.debounceEvents.delete(id);
	}
}
```

#### [packages/data-map/subscriptions/src/**tests**/subscriptions.spec.ts](../../packages/data-map/subscriptions/src/__tests__/subscriptions.spec.ts)

- [ ] Replace the entire contents of [packages/data-map/subscriptions/src/**tests**/subscriptions.spec.ts](../../packages/data-map/subscriptions/src/__tests__/subscriptions.spec.ts) with:

```ts
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionEngine } from '../subscription-engine.js';

describe('SubscriptionEngine', () => {
	it('notifies exact pointer subscribers', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/a/b', fn);
		engine.notify('/a/b', 123);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/a/b',
				value: 123,
				previousValue: undefined,
				stage: 'on',
				cancel: expect.any(Function),
			}),
		);
	});

	it('supports previousValue', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/x', fn);
		engine.notify('/x', 2, 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/x',
				value: 2,
				previousValue: 1,
				stage: 'on',
			}),
		);
	});

	it('supports immediate option for pointer subscriptions', () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/immediate', fn, { immediate: true });
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/immediate',
				value: undefined,
				previousValue: undefined,
				stage: 'on',
			}),
		);
	});

	it('supports deep option (prefix match with pointer boundaries)', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/a', fn, { deep: true });
		engine.notify('/a/b', 1);
		engine.notify('/a2', 2);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({ pointer: '/a/b', value: 1, stage: 'on' }),
		);
	});

	it('supports debounce option (on stage)', async () => {
		vi.useFakeTimers();
		try {
			const engine = new SubscriptionEngine();
			const fn = vi.fn();
			engine.subscribePointer('/d', fn, { debounce: 10 });
			engine.notify('/d', 1);
			engine.notify('/d', 2);
			engine.notify('/d', 3);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(0);

			vi.advanceTimersByTime(10);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn.mock.calls[0][0]).toEqual(
				expect.objectContaining({ pointer: '/d', value: 3, stage: 'on' }),
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('supports stages and cancel()', async () => {
		const engine = new SubscriptionEngine();
		const calls: string[] = [];
		engine.subscribePointer(
			'/staged',
			(e) => {
				calls.push(e.stage);
				if (e.stage === 'before') e.cancel();
			},
			{ stages: ['before', 'on', 'after'] },
		);
		engine.notify('/staged', 1);
		await Promise.resolve();
		// Cancel in before prevents on/after.
		expect(calls).toEqual(['before']);
	});

	it('matches wildcard patterns like $.users[*].name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$.users[*].name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/users/1/name', 'Bob');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		// Pattern subscriptions are microtask-batched and coalesced per subscriber.
		// With two matching updates in the same tick, the subscriber sees the last one.
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/users/1/name',
				value: 'Bob',
				previousValue: undefined,
				stage: 'on',
				cancel: expect.any(Function),
			}),
		);
	});

	it('matches recursive descent like $..name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$..name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/org/name', 'ACME');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		// Same batching/coalescing behavior as other pattern subscriptions.
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/org/name',
				value: 'ACME',
				previousValue: undefined,
				stage: 'on',
				cancel: expect.any(Function),
			}),
		);
	});
});
```

### Step 7 Verification Checklist

- [x] `pnpm --filter @data-map/subscriptions type-check`
- [x] `pnpm --filter @data-map/subscriptions test`

### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): expand subscription engine options and lifecycle

- Add options (immediate/deep/debounce/stages)
- Add event model (previousValue/stage/cancel)
- Add engine utilities (getAffected/clear/size)

completes: data-map remediation step 7 of 12 (subscriptions engine)
```

---

## Step 8: @data-map/subscriptions - TrieMap Index Integration

Integrate a TrieMap-backed index for exact pointer subscriptions, and implement efficient prefix matching for deep subscriptions.

### Step 8 Checklist

- [x] Add a TrieMap-backed index wrapper with prefix iteration.
- [x] Refactor the exact pointer index to use the trie wrapper.
- [x] Ensure the `mnemonist` dependency is present.

### Step 8 Files

#### [packages/data-map/subscriptions/package.json](../../packages/data-map/subscriptions/package.json)

- [ ] Update [packages/data-map/subscriptions/package.json](../../packages/data-map/subscriptions/package.json) to ensure `mnemonist` is present:

```json
{
	"name": "@data-map/subscriptions",
	"version": "0.1.0",
	"description": "DataMap subscription engine",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
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
		"@jsonpath/jsonpath": "workspace:*",
		"mnemonist": "^0.39.0"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

#### [packages/data-map/subscriptions/src/trie-index.ts](../../packages/data-map/subscriptions/src/trie-index.ts)

- [ ] Create [packages/data-map/subscriptions/src/trie-index.ts](../../packages/data-map/subscriptions/src/trie-index.ts) with:

```ts
import TrieMapCjs from 'mnemonist/trie-map.js';

const SENTINEL = String.fromCharCode(0);

type TrieRoot = Record<string, unknown>;

interface TrieMapLike<K extends string, V> {
	size: number;
	clear: () => void;
	set: (prefix: K, value: V) => unknown;
	update: (
		prefix: K,
		updateFunction: (oldValue: V | undefined) => V,
	) => unknown;
	get: (prefix: K) => V | undefined;
	delete: (prefix: K) => boolean;
	has: (prefix: K) => boolean;
	root: TrieRoot;
}

type TrieMapCtor = new <K extends string, V>() => TrieMapLike<K, V>;

const TrieMap = TrieMapCjs as unknown as TrieMapCtor;

export class TrieIndex<V> {
	private trie: TrieMapLike<string, V> = new TrieMap();

	clear(): void {
		this.trie.clear();
	}

	get size(): number {
		return this.trie.size;
	}

	has(key: string): boolean {
		return this.trie.has(key);
	}

	get(key: string): V | undefined {
		return this.trie.get(key);
	}

	set(key: string, value: V): void {
		this.trie.set(key, value);
	}

	delete(key: string): boolean {
		return this.trie.delete(key);
	}

	update(key: string, updateFn: (oldValue: V | undefined) => V): void {
		this.trie.update(key, updateFn);
	}

	/**
	 * Returns values whose key is a prefix of the given key.
	 *
	 * If `boundary` is provided, only prefixes ending at a boundary position are
	 * yielded (useful for JSON Pointer segment boundaries).
	 */
	prefixMatches(
		key: string,
		options?: {
			boundary?: (key: string, prefixEndIndexInclusive: number) => boolean;
		},
	): [string, V][] {
		const boundary = options?.boundary;
		const out: [string, V][] = [];

		let node: TrieRoot = this.trie.root;

		for (let i = 0; i < key.length; i++) {
			const token = key[i];
			if (token === undefined) break;
			const next = node[token];
			if (!next || typeof next !== 'object') break;
			node = next as TrieRoot;

			if (Object.prototype.hasOwnProperty.call(node, SENTINEL)) {
				if (!boundary || boundary(key, i)) {
					out.push([key.slice(0, i + 1), node[SENTINEL] as V]);
				}
			}
		}

		return out;
	}
}
```

#### [packages/data-map/subscriptions/src/exact-index.ts](../../packages/data-map/subscriptions/src/exact-index.ts)

- [ ] Replace the entire contents of [packages/data-map/subscriptions/src/exact-index.ts](../../packages/data-map/subscriptions/src/exact-index.ts) with:

```ts
import type { Pointer, Subscription } from './types.js';
import { TrieIndex } from './trie-index.js';

export class ExactIndex {
	private subscriptions = new TrieIndex<Set<Subscription>>();

	clear(): void {
		this.subscriptions.clear();
	}

	get size(): number {
		return this.subscriptions.size;
	}

	add(pointer: Pointer, sub: Subscription): void {
		const set = this.subscriptions.get(pointer) ?? new Set<Subscription>();
		set.add(sub);
		this.subscriptions.set(pointer, set);
	}

	delete(pointer: Pointer, sub: Subscription): void {
		const set = this.subscriptions.get(pointer);
		if (!set) return;
		set.delete(sub);
		if (set.size === 0) this.subscriptions.delete(pointer);
	}

	get(pointer: Pointer): Set<Subscription> {
		return this.subscriptions.get(pointer) ?? new Set();
	}

	/**
	 * Returns matching prefix entries, respecting JSON Pointer boundaries.
	 * E.g. subscribing to `/a` deep should not match `/a2`.
	 */
	prefixMatches(pointer: Pointer): [Pointer, Set<Subscription>][] {
		return this.subscriptions.prefixMatches(pointer, {
			boundary: (key, endIdx) =>
				endIdx === key.length - 1 || key[endIdx + 1] === '/',
		});
	}
}
```

### Step 8 Verification Checklist

- [x] `pnpm --filter @data-map/subscriptions type-check`
- [x] `pnpm --filter @data-map/subscriptions test`

### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(data-map): use trie index for subscriptions

- Add TrieMap-backed prefix index wrapper
- Refactor exact pointer index to use trie prefixMatches

completes: data-map remediation step 8 of 12 (subscriptions trie index)
```

---

## Step 9: Arrays Package Completion

### Step 9 Checklist

- [x] Add missing array operations: `pop`, `shift`, `unshift`, `sort`, `reverse`, `shuffle`
- [x] Add conversions: `toArray()` and `toPointerMap()`
- [x] Ensure `splice()` returns removed items and maintains a consistent logical view
- [x] Expand tests to cover the full public surface

### Step 9 Files

#### [packages/data-map/arrays/src/array-operations.ts](../../packages/data-map/arrays/src/array-operations.ts)

- [ ] Replace the entire contents of [packages/data-map/arrays/src/array-operations.ts](../../packages/data-map/arrays/src/array-operations.ts) with:

```ts
import { IndirectionLayer } from './indirection-layer.js';

export interface ArrayStore {
	get(pointer: string): unknown;
	set(pointer: string, value: unknown): void;
	delete(pointer: string): boolean;
}

export type CompareFn<T = unknown> = (a: T, b: T) => number;

export type ShuffleRng = () => number;

export class SmartArray {
	private store: ArrayStore;
	private pointer: string;
	private indirection: IndirectionLayer;

	constructor(store: ArrayStore, pointer: string) {
		this.store = store;
		this.pointer = pointer;
		this.indirection = new IndirectionLayer(0);
	}

	get length(): number {
		return this.indirection.length;
	}

	push(value: unknown): number {
		const oldLength = this.indirection.length;
		const physical = this.indirection.pushPhysical();
		this.store.set(`${this.pointer}/_p/${physical}`, value);
		this.store.set(`${this.pointer}/${this.indirection.length - 1}`, value);
		this.deleteTrailingLogical(oldLength);
		return this.indirection.length;
	}

	get(index: number): unknown {
		return this.store.get(`${this.pointer}/${index}`);
	}

	pop(): unknown {
		if (this.indirection.length === 0) return undefined;
		const idx = this.indirection.length - 1;
		const v = this.get(idx);
		this.splice(idx, 1);
		return v;
	}

	shift(): unknown {
		if (this.indirection.length === 0) return undefined;
		const v = this.get(0);
		this.splice(0, 1);
		return v;
	}

	unshift(...values: unknown[]): number {
		this.splice(0, 0, ...values);
		return this.indirection.length;
	}

	splice(index: number, deleteCount: number, ...items: unknown[]): unknown[] {
		const oldLength = this.indirection.length;
		if (oldLength === 0) {
			if (items.length > 0) {
				for (const it of items) this.push(it);
			}
			return [];
		}

		// Normalize index
		if (index < 0) index = Math.max(0, oldLength + index);
		if (index > oldLength) index = oldLength;

		// Normalize deleteCount
		deleteCount = Math.max(0, Math.min(deleteCount, oldLength - index));

		const removed: unknown[] = [];

		// Capture removed values from logical view
		for (let i = 0; i < deleteCount; i++) {
			removed.push(this.get(index + i));
		}

		// Delete physical slots
		for (let i = 0; i < deleteCount; i++) {
			const phys = this.indirection.removeAt(index);
			this.store.delete(`${this.pointer}/_p/${phys}`);
		}

		// Insert physical slots
		for (let i = 0; i < items.length; i++) {
			const phys = this.indirection.insertAt(index + i);
			this.store.set(`${this.pointer}/_p/${phys}`, items[i]);
		}

		this.syncLogical(oldLength);
		return removed;
	}

	sort(compareFn?: CompareFn): void {
		const values = this.toArray();
		values.sort(compareFn as any);
		this.writeFromArray(values);
	}

	reverse(): void {
		const values = this.toArray().reverse();
		this.writeFromArray(values);
	}

	shuffle(rng: ShuffleRng = Math.random): void {
		const values = this.toArray();
		for (let i = values.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			const tmp = values[i];
			values[i] = values[j];
			values[j] = tmp;
		}
		this.writeFromArray(values);
	}

	toArray(): unknown[] {
		const out: unknown[] = [];
		for (let i = 0; i < this.indirection.length; i++) out.push(this.get(i));
		return out;
	}

	toPointerMap(): Map<string, unknown> {
		const map = new Map<string, unknown>();
		for (let i = 0; i < this.indirection.length; i++) {
			map.set(`${this.pointer}/${i}`, this.get(i));
		}
		return map;
	}

	private writeFromArray(values: unknown[]): void {
		const oldLength = this.indirection.length;
		const len = values.length;

		// If lengths differ, use splice to keep physical storage consistent.
		if (len !== oldLength) {
			this.splice(0, oldLength, ...values);
			return;
		}

		for (let i = 0; i < len; i++) {
			const phys = this.indirection.getPhysical(i);
			this.store.set(`${this.pointer}/_p/${phys}`, values[i]);
			this.store.set(`${this.pointer}/${i}`, values[i]);
		}
	}

	private syncLogical(oldLength: number): void {
		// Rewrite logical projection (keeps physical slots stable; logical pointers updated)
		for (let i = 0; i < this.indirection.length; i++) {
			const phys = this.indirection.getPhysical(i);
			const v = this.store.get(`${this.pointer}/_p/${phys}`);
			this.store.set(`${this.pointer}/${i}`, v);
		}
		this.deleteTrailingLogical(oldLength);
	}

	private deleteTrailingLogical(oldLength: number): void {
		for (let i = this.indirection.length; i < oldLength; i++) {
			this.store.delete(`${this.pointer}/${i}`);
		}
	}
}
```

#### [packages/data-map/arrays/src/**tests**/arrays.spec.ts](../../packages/data-map/arrays/src/__tests__/arrays.spec.ts)

- [ ] Replace the entire contents of [packages/data-map/arrays/src/**tests**/arrays.spec.ts](../../packages/data-map/arrays/src/__tests__/arrays.spec.ts) with:

```ts
import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';
import { SmartArray } from '../smart-array.js';

describe('SmartArray', () => {
	it('push/get', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/users');
		arr.push('A');
		arr.push('B');
		expect(arr.length).toBe(2);
		expect(arr.get(0)).toBe('A');
		expect(arr.get(1)).toBe('B');
	});

	it('splice maintains logical view and returns removed items', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/items');
		arr.push('A');
		arr.push('B');
		arr.push('C');
		const removed = arr.splice(1, 1, 'X');
		expect(removed).toEqual(['B']);
		expect(arr.toArray()).toEqual(['A', 'X', 'C']);
	});

	it('pop returns last element', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/p');
		arr.push('A');
		arr.push('B');
		expect(arr.pop()).toBe('B');
		expect(arr.toArray()).toEqual(['A']);
		expect(arr.pop()).toBe('A');
		expect(arr.pop()).toBeUndefined();
	});

	it('shift/unshift', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/s');
		arr.unshift('B');
		arr.unshift('A');
		arr.push('C');
		expect(arr.toArray()).toEqual(['A', 'B', 'C']);
		expect(arr.shift()).toBe('A');
		expect(arr.toArray()).toEqual(['B', 'C']);
	});

	it('sort/reverse', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/sort');
		arr.push(3);
		arr.push(1);
		arr.push(2);
		arr.sort((a: any, b: any) => a - b);
		expect(arr.toArray()).toEqual([1, 2, 3]);
		arr.reverse();
		expect(arr.toArray()).toEqual([3, 2, 1]);
	});

	it('shuffle can be deterministic with a stub rng', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/shuffle');
		arr.push('A');
		arr.push('B');
		arr.push('C');
		let i = 0;
		const rng = () => [0.9, 0.1, 0.5][i++] ?? 0;
		arr.shuffle(rng);
		expect(arr.toArray()).toHaveLength(3);
		// Contents preserved
		expect(new Set(arr.toArray() as string[])).toEqual(
			new Set(['A', 'B', 'C']),
		);
	});

	it('toPointerMap returns logical pointer mapping', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/m');
		arr.push('A');
		arr.push('B');
		const map = arr.toPointerMap();
		expect(map.get('/m/0')).toBe('A');
		expect(map.get('/m/1')).toBe('B');
	});
});
```

### Step 9 Verification Checklist

- [x] `pnpm --filter @data-map/arrays type-check`
- [x] `pnpm --filter @data-map/arrays test`

### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): complete arrays package operations

- Add pop/shift/unshift/sort/reverse/shuffle
- Add toArray and toPointerMap conversions
- Expand tests to cover full SmartArray surface

completes: data-map remediation step 9 of 12 (arrays)
```

---

## Step 10: Computed Package Completion

### Step 10 Checklist

- [x] Add multi-pointer computed helper
- [x] Add `SignalCache` for `signalFor(pointer)` caching
- [x] Add tests for multi-pointer reactivity and cache behavior

### Step 10 Files

#### [packages/data-map/computed/src/multi-pointer-computed.ts](../../packages/data-map/computed/src/multi-pointer-computed.ts)

- [ ] Create [packages/data-map/computed/src/multi-pointer-computed.ts](../../packages/data-map/computed/src/multi-pointer-computed.ts) with:

```ts
import { computed } from '@data-map/signals';

import { DependencyTracker } from './dependency-tracker.js';
import type { DataMapComputeHost, Pointer } from './types.js';

export function multiPointerComputed<T>(
	host: DataMapComputeHost,
	pointers: Pointer[],
	compute: (...values: unknown[]) => T,
) {
	const tracker = new DependencyTracker(host);
	const c = computed(() => {
		const values = pointers.map((p) => host.get(p));
		return compute(...values);
	});
	tracker.trackPointers(pointers, () => {
		c.invalidate();
	});
	return {
		computed: c,
		dispose: () => {
			tracker.dispose();
		},
	};
}
```

#### [packages/data-map/computed/src/signal-cache.ts](../../packages/data-map/computed/src/signal-cache.ts)

- [ ] Create [packages/data-map/computed/src/signal-cache.ts](../../packages/data-map/computed/src/signal-cache.ts) with:

```ts
import { signal, type Signal } from '@data-map/signals';

import type { DataMapComputeHost, Pointer } from './types.js';

type CacheEntry = { sig: Signal<unknown>; unsub: () => void };

export class SignalCache {
	private host: DataMapComputeHost;
	private cache = new Map<Pointer, CacheEntry>();

	constructor(host: DataMapComputeHost) {
		this.host = host;
	}

	signalFor(pointer: Pointer): Signal<unknown> {
		const existing = this.cache.get(pointer);
		if (existing) return existing.sig;

		const sig = signal(this.host.get(pointer));
		const unsub = this.host.subscribePointer(pointer, () => {
			sig.value = this.host.get(pointer);
		});

		this.cache.set(pointer, { sig, unsub });
		return sig;
	}

	clearCache(): void {
		for (const { unsub } of this.cache.values()) unsub();
		this.cache.clear();
	}
}
```

#### [packages/data-map/computed/src/index.ts](../../packages/data-map/computed/src/index.ts)

- [ ] Replace the entire contents of [packages/data-map/computed/src/index.ts](../../packages/data-map/computed/src/index.ts) with:

```ts
export type { Pointer, DataMapComputeHost } from './types.js';
export { DependencyTracker } from './dependency-tracker.js';
export { pointerComputed } from './pointer-computed.js';
export { queryComputed } from './query-computed.js';
export { multiPointerComputed } from './multi-pointer-computed.js';
export { SignalCache } from './signal-cache.js';
```

#### [packages/data-map/computed/src/**tests**/computed.spec.ts](../../packages/data-map/computed/src/__tests__/computed.spec.ts)

- [ ] Replace the entire contents of [packages/data-map/computed/src/**tests**/computed.spec.ts](../../packages/data-map/computed/src/__tests__/computed.spec.ts) with:

```ts
import { describe, expect, it } from 'vitest';
import { multiPointerComputed } from '../multi-pointer-computed.js';
import { pointerComputed } from '../pointer-computed.js';
import { SignalCache } from '../signal-cache.js';

describe('@data-map/computed', () => {
	it('pointerComputed invalidates on dependency callback', () => {
		let value = 1;
		let invalidate: (() => void) | undefined;
		const host = {
			get: () => value,
			subscribePointer: (_p: string, cb: () => void) => {
				invalidate = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const { computed: c } = pointerComputed<number>(host, '/x');
		expect(c.value).toBe(1);
		value = 2;
		invalidate?.();
		expect(c.value).toBe(2);
	});

	it('multiPointerComputed combines multiple pointers', () => {
		let a = 1;
		let b = 2;
		const invalidates: Record<string, () => void> = {};

		const host = {
			get: (p: string) => (p === '/a' ? a : b),
			subscribePointer: (p: string, cb: () => void) => {
				invalidates[p] = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const { computed: c } = multiPointerComputed(
			host,
			['/a', '/b'],
			(av, bv) => {
				return Number(av) + Number(bv);
			},
		);
		expect(c.value).toBe(3);
		a = 10;
		invalidates['/a']?.();
		expect(c.value).toBe(12);
	});

	it('SignalCache caches signalFor(pointer)', () => {
		let x = 1;
		let invalidate: (() => void) | undefined;
		const host = {
			get: (_p: string) => x,
			subscribePointer: (_p: string, cb: () => void) => {
				invalidate = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const cache = new SignalCache(host);
		const s1 = cache.signalFor('/x');
		const s2 = cache.signalFor('/x');
		expect(s1).toBe(s2);
		expect(s1.value).toBe(1);
		x = 2;
		invalidate?.();
		expect(s1.value).toBe(2);
		cache.clearCache();
	});
});
```

### Step 10 Verification Checklist

- [x] `pnpm --filter @data-map/computed type-check`
- [x] `pnpm --filter @data-map/computed test`

### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): complete computed package helpers

- Add multi-pointer computed helper
- Add SignalCache for signalFor(pointer)
- Expand tests for cache and multi-pointer behavior

completes: data-map remediation step 10 of 12 (computed)
```

---

## Step 11: Core Package API Completion

### Step 11 Checklist

- [x] Add `has(pointer)`
- [x] Add `batch(fn)` that coalesces notifications
- [x] Add `transaction<R>(fn)` with rollback semantics
- [x] Add `keys(prefixOrPath?)` and `fromObject(obj)`
- [x] Add unified `subscribe(pathOrPointer, cb, options?)`
- [x] Add core array helpers: `push/pop/shift/unshift/splice/sort/reverse/shuffle`
- [x] Add multi-pointer `computed(pointers, compute)` facade

### Step 11 Files

#### [packages/data-map/core/src/types.ts](../../packages/data-map/core/src/types.ts)

- [ ] Replace the entire contents of [packages/data-map/core/src/types.ts](../../packages/data-map/core/src/types.ts) with:

```ts
export type Pointer = string;

export type Unsubscribe = () => void;

export type { SubscriptionEvent as SubscribeEvent } from '@data-map/subscriptions';
export type { SubscriptionOptions as SubscribeOptions } from '@data-map/subscriptions';
```

#### [packages/data-map/core/src/data-map.ts](../../packages/data-map/core/src/data-map.ts)

- [ ] Replace the entire contents of [packages/data-map/core/src/data-map.ts](../../packages/data-map/core/src/data-map.ts) with:

```ts
import type { DataMapComputeHost } from '@data-map/computed';
import {
	multiPointerComputed,
	pointerComputed,
	queryComputed,
} from '@data-map/computed';
import { SmartArray } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { batch as signalBatch } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import type {
	SubscriptionEvent,
	SubscriptionOptions,
} from '@data-map/subscriptions';
import { SubscriptionEngine } from '@data-map/subscriptions';

import type {
	Pointer,
	SubscribeEvent,
	SubscribeOptions,
	Unsubscribe,
} from './types.js';

function isPointer(input: string): boolean {
	return input === '' || input.startsWith('/');
}

export class DataMap<T = unknown> {
	private store: FlatStore;
	private subs: SubscriptionEngine;
	private arrays = new Map<Pointer, SmartArray>();
	private batching = 0;
	private pending = new Map<
		Pointer,
		{ value: unknown; previousValue: unknown }
	>();

	constructor(initial?: T) {
		this.store = new FlatStore(initial);
		this.subs = new SubscriptionEngine();
	}

	get(pointer: Pointer): unknown {
		return this.store.get(pointer);
	}

	has(pointer: Pointer): boolean {
		return this.store.has(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		const previousValue = this.store.get(pointer);
		this.store.set(pointer, value);
		this.enqueueNotify(pointer, value, previousValue);
	}

	delete(pointer: Pointer): boolean {
		const previousValue = this.store.get(pointer);
		const existed = this.store.delete(pointer);
		if (existed) this.enqueueNotify(pointer, undefined, previousValue);
		return existed;
	}

	fromObject(obj: T): void {
		this.store = new FlatStore(obj);
		this.arrays.clear();
		this.pending.clear();
	}

	keys(prefixOrPath?: string): string[] {
		if (!prefixOrPath) return Array.from(this.store.keys());
		if (prefixOrPath.startsWith('$')) return this.queryPointers(prefixOrPath);
		return Array.from(this.store.keys(prefixOrPath));
	}

	subscribe(
		pathOrPointer: string,
		cb: (event: SubscribeEvent) => void,
		options?: SubscribeOptions,
	): Unsubscribe {
		if (isPointer(pathOrPointer)) {
			return this.subs.subscribePointer(
				pathOrPointer,
				(e) => cb(e as unknown as SubscribeEvent),
				options as unknown as SubscriptionOptions,
			);
		}
		return this.subs.subscribePattern(
			pathOrPointer,
			(e) => cb(e as unknown as SubscribeEvent),
			options as unknown as SubscriptionOptions,
		);
	}

	query(path: string): { values: unknown[]; pointers: string[] } {
		return queryFlat(this.store, path);
	}

	queryPointers(path: string): string[] {
		return this.query(path).pointers;
	}

	computedPointer<V = unknown>(pointer: Pointer) {
		return pointerComputed<V>(this.computeHost(), pointer);
	}

	computedQuery<V = unknown>(path: string) {
		return queryComputed<V>(this.computeHost(), path);
	}

	computed<V>(pointers: Pointer[], compute: (...values: unknown[]) => V) {
		return multiPointerComputed<V>(this.computeHost(), pointers, compute);
	}

	batch(fn: () => void): void {
		this.batching++;
		signalBatch(() => {
			try {
				fn();
			} finally {
				this.batching--;
				if (this.batching === 0) this.flushPending();
			}
		});
	}

	transaction<R>(fn: () => R): R {
		// Snapshot via toObject() ensures rollback without requiring store internals.
		const before = this.store.toObject() as T;
		this.batching++;
		try {
			const result = fn();
			return result;
		} catch (err) {
			this.store = new FlatStore(before);
			this.arrays.clear();
			this.pending.clear();
			throw err;
		} finally {
			this.batching--;
			if (this.batching === 0) this.flushPending();
		}
	}

	push(arrayPointer: Pointer, ...values: unknown[]): number {
		const arr = this.getArray(arrayPointer);
		for (const v of values) arr.push(v);
		return arr.length;
	}

	pop(arrayPointer: Pointer): unknown {
		return this.getArray(arrayPointer).pop();
	}

	shift(arrayPointer: Pointer): unknown {
		return this.getArray(arrayPointer).shift();
	}

	unshift(arrayPointer: Pointer, ...values: unknown[]): number {
		return this.getArray(arrayPointer).unshift(...values);
	}

	splice(
		arrayPointer: Pointer,
		index: number,
		deleteCount: number,
		...items: unknown[]
	): unknown[] {
		return this.getArray(arrayPointer).splice(index, deleteCount, ...items);
	}

	sort(arrayPointer: Pointer, compareFn?: (a: any, b: any) => number): void {
		this.getArray(arrayPointer).sort(compareFn);
	}

	reverse(arrayPointer: Pointer): void {
		this.getArray(arrayPointer).reverse();
	}

	shuffle(arrayPointer: Pointer): void {
		this.getArray(arrayPointer).shuffle();
	}

	snapshot(): Map<string, unknown> {
		return this.store.snapshot().data;
	}

	toObject(): unknown {
		return this.store.toObject();
	}

	private computeHost(): DataMapComputeHost {
		return {
			get: (p: Pointer) => this.get(p),
			subscribePointer: (p: Pointer, cb: () => void) =>
				this.subscribe(p, () => {
					cb();
				}),
			queryPointers: (p: Pointer) => this.queryPointers(p),
			subscribePattern: (p: Pointer, cb: () => void) =>
				this.subscribe(p, () => {
					cb();
				}),
		};
	}

	private getArray(pointer: Pointer): SmartArray {
		const existing = this.arrays.get(pointer);
		if (existing) return existing;
		const arr = new SmartArray(
			{
				get: (p) => this.get(p),
				set: (p, v) => this.set(p, v),
				delete: (p) => this.delete(p),
			},
			pointer,
		);
		this.arrays.set(pointer, arr);
		return arr;
	}

	private enqueueNotify(
		pointer: Pointer,
		value: unknown,
		previousValue: unknown,
	): void {
		this.pending.set(pointer, { value, previousValue });
		if (this.batching > 0) return;
		this.flushPending();
	}

	private flushPending(): void {
		if (this.pending.size === 0) return;
		const items = Array.from(this.pending.entries());
		this.pending.clear();
		for (const [pointer, { value, previousValue }] of items) {
			this.subs.notify(pointer, value, previousValue);
		}
	}
}
```

#### [packages/data-map/core/src/**tests**/core.spec.ts](../../packages/data-map/core/src/__tests__/core.spec.ts)

- [ ] Replace the entire contents of [packages/data-map/core/src/**tests**/core.spec.ts](../../packages/data-map/core/src/__tests__/core.spec.ts) with:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createDataMap } from '../create.js';

describe('@data-map/core', () => {
	it('get/set/has via pointers', () => {
		const store = createDataMap({ users: [{ name: 'Alice' }] });
		expect(store.has('/users/0/name')).toBe(true);
		store.set('/users/0/name', 'Bob');
		expect(store.get('/users/0/name')).toBe('Bob');
	});

	it('subscribe auto-detects pointer vs pattern', async () => {
		const store = createDataMap({ users: [{ name: 'Alice' }] });
		const exact = vi.fn();
		const pattern = vi.fn();
		store.subscribe('/users/0/name', exact);
		store.subscribe('$.users[*].name', pattern);
		store.set('/users/0/name', 'Bob');
		await Promise.resolve();
		expect(exact).toHaveBeenCalledTimes(1);
		expect(pattern).toHaveBeenCalledTimes(1);
	});

	it('batch coalesces notifications', async () => {
		const store = createDataMap({});
		const fn = vi.fn();
		store.subscribe('/x', fn);
		store.batch(() => {
			store.set('/x', 1);
			store.set('/x', 2);
		});
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('transaction rolls back store state on error', () => {
		const store = createDataMap({ x: 1 });
		expect(store.get('/x')).toBe(1);
		expect(() =>
			store.transaction(() => {
				store.set('/x', 2);
				throw new Error('fail');
			}),
		).toThrow(/fail/);
		expect(store.get('/x')).toBe(1);
	});

	it('computedPointer updates after mutation', async () => {
		const store = createDataMap({});
		store.set('/x', 1);
		const { computed: c } = store.computedPointer<number>('/x');
		expect(c.value).toBe(1);
		store.set('/x', 2);
		await Promise.resolve();
		expect(c.value).toBe(2);
	});

	it('computed([...]) combines multiple pointers', async () => {
		const store = createDataMap({});
		store.set('/a', 1);
		store.set('/b', 2);
		const { computed: c } = store.computed<number>(['/a', '/b'], (a, b) => {
			return Number(a) + Number(b);
		});
		expect(c.value).toBe(3);
		store.set('/a', 10);
		await Promise.resolve();
		expect(c.value).toBe(12);
	});

	it('query returns pointers', () => {
		const store = createDataMap({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const res = store.query('$.users[*].name');
		expect(res.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});

	it('array facade methods work', () => {
		const store = createDataMap({});
		store.push('/arr', 'A');
		store.push('/arr', 'B');
		expect(store.get('/arr/0')).toBe('A');
		expect(store.pop('/arr')).toBe('B');
		expect(store.get('/arr/1')).toBeUndefined();
	});
});
```

### Step 11 Verification Checklist

- [x] `pnpm --filter @data-map/core type-check`
- [x] `pnpm --filter @data-map/core test`

### Step 11 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): complete core facade API

- Add has/keys/fromObject
- Add batch and transaction
- Add unified subscribe(pathOrPointer)
- Add array and multi-pointer computed facades

completes: data-map remediation step 11 of 12 (core)
```

---

## Step 12: Final Validation and Documentation

### Step 12 Checklist

- [x] Run full benchmark suite and update `baseline.json`
- [x] Run all `@data-map/*` tests and type-checks
- [x] Update [docs/audit/data-map-implementation-audit.md](../../docs/audit/data-map-implementation-audit.md) to reflect 100% completion
- [x] Add API reference doc: [docs/api/data-map.md](../../docs/api/data-map.md)

### Step 12 Documentation Files

#### [docs/api/data-map.md](../../docs/api/data-map.md)

- [ ] Create [docs/api/data-map.md](../../docs/api/data-map.md) with:

```md
# DataMap API Reference

The `@data-map/*` suite provides a flat, pointer-addressable data store with reactive signals, subscriptions, and computed helpers.

## Packages

- `@data-map/core`: High-level `DataMap` facade
- `@data-map/storage`: Flat pointer store (`FlatStore`)
- `@data-map/signals`: Reactive primitives (`signal`, `computed`, `effect`, `batch`)
- `@data-map/subscriptions`: Pointer + pattern subscription engine
- `@data-map/path`: Flat-store JSONPath querying (`queryFlat`)
- `@data-map/arrays`: Store-backed array helpers (`SmartArray`)
- `@data-map/computed`: Pointer/query computed helpers

## `@data-map/core`

### `createDataMap(initial)`

Creates a new `DataMap` instance.

### `DataMap`

- `get(pointer)` / `set(pointer, value)` / `delete(pointer)` / `has(pointer)`
- `keys(prefixOrPath?)`
- `subscribe(pathOrPointer, cb, options?)`
- `query(path)` / `queryPointers(path)`
- `computedPointer(pointer)` / `computedQuery(path)` / `computed(pointers, compute)`
- `batch(fn)` / `transaction(fn)`
- Array helpers: `push/pop/shift/unshift/splice/sort/reverse/shuffle`

## `@data-map/storage`

### `FlatStore`

- `get(pointer)` / `set(pointer, value)` / `delete(pointer)` / `has(pointer)`
- `size` / `version`
- `getVersion(pointer)`
- `keys(prefix?)` / `entries(prefix?)`
- `setDeep(pointer, value)` / `getObject(pointer)`
- `toObject()` / `snapshot()`

## `@data-map/signals`

- `signal(initial)` returns `Signal<T>`
- `computed(fn)` returns `Computed<T>`
- `effect(fn)` returns handle with `dispose()`
- `batch(fn)`
- Integration: `getCurrentEffect()` / `track()` / `trigger()` / `untracked(fn)`

## `@data-map/subscriptions`

### `SubscriptionEngine`

- `subscribePointer(pointer, subscriber, options?)`
- `subscribePattern(path, subscriber, options?)`
- `notify(pointer, value, previousValue?)`

### Options

- `immediate`, `deep`, `debounce`, `stages`

### Event

The subscriber receives a `SubscriptionEvent` with `{ pointer, value, previousValue, stage, cancel() }`.
```

### Step 12 Validation Commands

- [ ] Benchmarks: `pnpm --filter @data-map/benchmarks bench:full`
- [ ] Tests: `pnpm --filter "@data-map/*" test`
- [ ] Type-check: `pnpm --filter "@data-map/*" type-check`

### Step 12 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(data-map): final validation and documentation

- Update baselines and verify benchmarks
- Run full @data-map/* test + type-check suite
- Update audit + add API reference doc

completes: data-map remediation step 12 of 12 (final)
```
