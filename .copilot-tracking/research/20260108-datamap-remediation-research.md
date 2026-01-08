<!-- markdownlint-disable-file -->

# Task Research Notes: plans/data-map-remediation/implementation.md prerequisites

## Research Executed

### File Analysis

- ../../package.json
  - Verified toolchain versions and root scripts (Node engines, pnpm, turbo, vitest)
- ../../turbo.json
  - Verified `bench`, `bench:full`, and `report` tasks exist at the Turborepo layer
- ../../vitest.config.ts
  - Verified monorepo test orchestration uses per-package `vitest.config.ts`

- ../../packages/jsonpath/benchmarks/package.json
  - Verified `vitest bench` scripts (`bench`, `bench:browser`, `bench:full`, `bench:compare`)
- ../../packages/jsonpath/benchmarks/vitest.config.ts
- ../../packages/jsonpath/benchmarks/vitest.config.browser.ts
  - Verified `@lellimecnar/vitest-config` base + explicit source-aliasing for workspace packages
- ../../packages/jsonpath/benchmarks/baseline.json
  - Verified baseline schema is a plain object keyed by benchmark name with `{ opsPerSec: number }`
- ../../packages/jsonpath/benchmarks/scripts/compare-results.js
- ../../packages/jsonpath/benchmarks/src/utils/reporter.ts
- ../../packages/jsonpath/benchmarks/src/utils/comparisons.ts
  - Verified report generation is done via a built JS entry in `dist/utils/reporter.js`

- ../../packages/data-map/benchmarks/\*
  - Verified this package is currently a placeholder (no Vitest bench infra, no baseline, no fixtures)

- ../../packages/data-map/\* (signals/storage/path/subscriptions/arrays/computed/core)
  - Verified current exported APIs and where the behavior lives

### Code Search Results

- `@jsonpath/benchmarks` baseline usage
  - Found in `packages/jsonpath/benchmarks/src/performance-regression.spec.ts` (warn-only regression checks)
- `@data-map/*` internal dependency graph
  - Found only inside `packages/data-map/**` today (no external consumers in-repo beyond tests)
- `mnemonist` usage in data-map
  - Dependency exists in `packages/data-map/path/package.json` and `packages/data-map/subscriptions/package.json` but no code imports found

### External Research

- (No external `#fetch:` or `#githubRepo:` calls were used in this pass.)

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo, Vite library builds, Vitest (including `vitest bench`), `tsgo --noEmit`
- Instructions followed: ../../AGENTS.md (workspace commands), ../../.github/copilot-instructions.md (pnpm filters, Next transpile guidance), `@lellimecnar/ui` granular export rule (not used here)

## Key Discoveries

### Repo-wide: versions, commands, test conventions

- Stack versions (from ../../package.json)
  - Node: `^24.12.0`
  - pnpm: `9.12.2`
  - turbo: `^2.3.3`
  - vitest: `^4.0.16`
  - typescript: `~5.5`
  - tsgo: `@typescript/native-preview@7.0.0-dev.20251228.1`

- Repo conventions (verified)
  - Tests run per-package via `vitest.config.ts` files discovered by ../../vitest.config.ts.
  - Co-located test files under `src/__tests__/*.spec.ts` in the `@data-map/*` packages.
  - Build pipeline is `vite build` with `.d.ts` generation via `vite-plugin-dts` (consistent across `@data-map/*`).

- Commands you can use in implementation docs
  - Run a single workspace script: `pnpm --filter @data-map/signals test`
  - Run a package build: `pnpm --filter @data-map/core build`
  - Run all tests via turbo: `pnpm test`
  - Root convenience runner for DataMap core: `pnpm data-map` (runs `turbo run -F @data-map/core`)

### Benchmark infra reference: packages/jsonpath/benchmarks

**Structure inventory (verified):**

- Package root: `packages/jsonpath/benchmarks/`
  - package.json
    - `bench`: `vitest bench`
    - `bench:browser`: `vitest bench --config vitest.config.browser.ts`
    - `bench:full`: `vitest bench --reporter=json --outputFile=results.json`
    - `bench:compare`: `node scripts/compare-results.js`
  - vitest.config.ts
    - Uses `vitestBaseConfig()` and aliases workspace packages to source TS paths
  - vitest.config.browser.ts
    - Adds `test.browser` with provider `playwright` and default browser `chromium`
  - baseline.json
    - Schema (observed keys):
      - `simpleQuery.opsPerSec`
      - `filterQuery.opsPerSec`
      - `recursiveQuery.opsPerSec`
      - `patchSingleReplace.opsPerSec`
      - `patchBatch10Adds.opsPerSec`
      - `mergePatchGenerate.opsPerSec`
      - `wildcardFastPath.opsPerSec`
      - `deepPathAccess.opsPerSec`
  - scripts/compare-results.js
    - Reads `results.json` and writes `RESULTS.md`
    - Calls `generateMarkdownFromVitestJson()` from `../dist/utils/reporter.js` (requires the package to be built first)

**Bench/test patterns (verified):**

- Bench files use Vitest’s `bench()` API.
  - Example: `packages/jsonpath/benchmarks/src/basic.bench.ts`
- Fixtures are real TS generators and exported datasets.
  - Generators: `packages/jsonpath/benchmarks/src/fixtures/data-generators.ts`
  - Exported datasets: `packages/jsonpath/benchmarks/src/fixtures/datasets.ts`
  - Query sets: `packages/jsonpath/benchmarks/src/fixtures/queries.ts`
- Regression checks are implemented as warn-only Vitest tests.
  - `packages/jsonpath/benchmarks/src/performance-regression.spec.ts` imports baseline via `assert { type: 'json' }` and logs warnings when `current < baseline * 0.9`.

**Helper utilities (verified):**

- `packages/jsonpath/benchmarks/src/utils/comparisons.ts`
  - `toMarkdownTable(rows: BenchRow[]): string`
- `packages/jsonpath/benchmarks/src/utils/reporter.ts`
  - `generateMarkdownFromVitestJson(jsonPath: string, mdPath: string): void`

### Current state of packages/data-map/benchmarks

**Existing files (verified):**

- packages/data-map/benchmarks/package.json
  - Scripts:
    - `bench`: placeholder `node -e "console.log('benchmarks placeholder package: add runners in later step')"`
    - `build`: `vite build`
    - `type-check`: `tsgo --noEmit`
  - Dependencies:
    - `@data-map/core` only
  - No `vitest`/`@vitest/browser` devDependencies

- packages/data-map/benchmarks/src/index.ts
  - Placeholder export: `export const benchmarks = [];`

- packages/data-map/benchmarks/vite.config.ts
- packages/data-map/benchmarks/tsconfig.json

**Gaps vs @jsonpath/benchmarks (verified):**

- No `vitest.config.ts` / `vitest.config.browser.ts`
- No `.bench.ts` suites
- No `baseline.json`
- No `scripts/compare-results.*`
- No `src/utils/*` report generation
- No `src/fixtures/*` datasets for scale testing

### @data-map/\* packages: key files, current exports, test setup, gotchas

#### @data-map/core

- Exports (packages/data-map/core/src/index.ts)
  - `DataMap` (class) from `./data-map.ts`
  - `createDataMap` (function) from `./create.ts`
  - Types: `Pointer`, `SubscribeEvent`, `Unsubscribe` from `./types.ts`
- Key files
  - `packages/data-map/core/src/data-map.ts`: `class DataMap<T>`
  - `packages/data-map/core/src/create.ts`: `createDataMap<T>(initial: T): DataMap<T>`
  - `packages/data-map/core/src/types.ts`: pointer + subscription types
- Tests
  - `packages/data-map/core/src/__tests__/core.spec.ts`
- Gotchas relevant to replacement edits
  - `DataMap.query()` delegates to `@data-map/path` `queryFlat()` which currently calls `store.toObject()` (full materialization cost).
  - `subscribePattern()` uses `@data-map/subscriptions` pattern matching (microtask-batched/coalesced events).

#### @data-map/signals

- Exports (packages/data-map/signals/src/index.ts)
  - `signal`, `computed`, `effect`, `batch`
  - Types: `Signal`, `ReadonlySignal`, `EffectHandle`, etc. from `./types.ts`
- Key files
  - `signal.ts`: `SignalImpl<T>`
  - `computed.ts`: `ComputedImpl<T>` (lazy recompute on `.value`)
  - `effect.ts`: `EffectImpl`
  - `batch.ts`: `batch(fn)` + queueing for observers
- Tests
  - `packages/data-map/signals/src/__tests__/signals.spec.ts`
- Gotchas
  - `ComputedImpl.onDependencyChanged()` notifies subscribers using the existing `_value` (it does not recompute before notifying).

#### @data-map/storage

- Exports (packages/data-map/storage/src/index.ts)
  - `FlatStore`
  - Pointer helpers: `pointerToSegments`, `segmentsToPointer`, `parentPointer`
  - Types: `Pointer`, `ArrayMetadata`, `FlatSnapshot`
- Key files
  - `flat-store.ts`: `class FlatStore` with `data: Map<Pointer, unknown>` + `versions: Map<Pointer, number>`
  - `nested-converter.ts`
    - `ingestNested(...)`: flattens nested input to leaf pointers; increments version at leaf pointers
    - `materializeNested(...)`: rebuilds nested object by splitting pointers and guessing arrays via numeric segments
  - `pointer-utils.ts`: uses `JSONPointer` from `@jsonpath/pointer` (`JSONPointer.parse/format`)
- Tests
  - `packages/data-map/storage/src/__tests__/flat-store.spec.ts`
- Gotchas
  - `materializeNested()` uses a minimal `forceArray()` which returns `[]` on ambiguity; this can silently drop structure if object/array inference is wrong.
  - `FlatStore` increments versions per pointer only (no global version counter today).

#### @data-map/path

- Exports (packages/data-map/path/src/index.ts)
  - `compile(path: string)` (cached compiler) from `./compiler.ts`
  - `queryFlat(store, path)` from `./query.ts`
  - `pointerToJsonPath(pointer)` from `./pointer-bridge.ts`
  - Types: `Pointer`, `QueryResult`
- Key files
  - `cache.ts`: `class QueryCache<T>` (custom LRU via `accessOrder: string[]`)
  - `compiler.ts`: caches `compileQuery()` from `@jsonpath/jsonpath`
  - `query.ts`: calls `store.toObject()` then runs `@jsonpath/jsonpath` `query()` and converts pointers to strings
  - `pointer-bridge.ts`: `pointerToJsonPath()` (naive dot-join conversion, does not quote special segments)
- Tests
  - `packages/data-map/path/src/__tests__/path.spec.ts`
- Gotchas
  - Current implementation is not “flat-store-aware”; it materializes the entire object on every query.
  - `pointerToJsonPath()` is lossy for pointer segments that require JSONPath bracket notation.
  - `mnemonist` is a dependency but unused (no imports in code).

#### @data-map/subscriptions

- Exports (packages/data-map/subscriptions/src/index.ts)
  - `SubscriptionEngine`
  - Types: `Pointer`, `SubscriptionEvent`, `Subscriber`, `Unsubscribe`
- Key files
  - `subscription-engine.ts`: owns `ExactIndex`, `PatternIndex`, `NotificationBatcher`
  - `notification-batcher.ts`: microtask batching + coalescing by `sub.id`
  - `pattern-compiler.ts`: `compilePattern(path: string)`
    - Uses `validateQuery()` from `@jsonpath/jsonpath` then compiles to a RegExp matcher
  - `pattern-index.ts`: stores compiled matchers in a `Map<symbol, ...>`
- Tests
  - `packages/data-map/subscriptions/src/__tests__/subscriptions.spec.ts`
- Gotchas
  - Microtask batching is observable: multiple `notify()` calls in a tick coalesce to the last event per subscriber.
  - `mnemonist` is a dependency but unused (no imports in code).

#### @data-map/arrays

- Exports (packages/data-map/arrays/src/index.ts)
  - `SmartArray` (class) from `./array-operations.ts` (re-exported via `smart-array.ts`)
  - `IndirectionLayer`, `GapBuffer`, `PersistentVector` (classes)
  - Types: `IndirectionState`
- Key files
  - `array-operations.ts`: `class SmartArray` stores both physical values under `/_p/` and logical projection under `/<index>`
  - `indirection-layer.ts`: logical↔physical mapping with a free-slot stack
  - `gap-buffer.ts`: classic gap buffer implementation
  - `smart-array.ts`: re-export only (not the actual class implementation)
- Tests
  - `packages/data-map/arrays/src/__tests__/arrays.spec.ts`
- Gotchas
  - `SmartArray.splice()` rewrites the entire logical projection after updates (O(n)).
  - `IndirectionLayer.nextPhysicalIndex()` rebuilds a Set of used indices and scans from 0 (O(n) per allocation).

#### @data-map/computed

- Exports (packages/data-map/computed/src/index.ts)
  - `DependencyTracker`
  - `pointerComputed(host, pointer)`
  - `queryComputed(host, path)`
  - Types: `DataMapComputeHost`, `Pointer`
- Key files
  - `dependency-tracker.ts`: `trackPointers()` and `trackQuery()` always call `dispose()` first (single active tracking set)
  - `query-computed.ts`: subscribes to current query pointers and also to `subscribePattern(path, ...)` to refresh membership
- Tests
  - `packages/data-map/computed/src/__tests__/computed.spec.ts` (only covers `pointerComputed`)
- Gotchas
  - `DependencyTracker.trackQuery()` disposes and re-subscribes; if you expected multi-tracking it does not support it.
  - `queryComputed()` returns `pointers.map(host.get)` and casts to `T` (currently typed as “array of values”).

### Existing internal utilities to reuse (verified)

- JSON Pointer parsing/formatting
  - `@jsonpath/pointer`: `JSONPointer.parse(pointer: string): string[]` and `JSONPointer.format(tokens: string[]): string`
  - Already used by `packages/data-map/storage/src/pointer-utils.ts`

- JSONPath compile/validate/query
  - `@jsonpath/jsonpath`: `validateQuery()`, `compileQuery()`, `query()`
  - Used by `packages/data-map/subscriptions/src/pattern-compiler.ts` and `packages/data-map/path/src/{compiler,query}.ts`

- Cache primitives
  - `packages/data-map/path/src/cache.ts`: `class QueryCache<T>` (custom LRU)
  - `packages/jsonpath/jsonpath/src/cache.ts`: parsed query Map cache + compiled query cache backed by `@jsonpath/compiler` LRU

- Benchmark report generation helpers
  - `packages/jsonpath/benchmarks/src/utils/reporter.ts`: `generateMarkdownFromVitestJson()`
  - `packages/jsonpath/benchmarks/src/utils/comparisons.ts`: `toMarkdownTable()`

### Complete Examples

```json
// packages/data-map/benchmarks/package.json (RECOMMENDED replacement, mirrors @jsonpath/benchmarks patterns)
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
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"bench:compare": "node scripts/compare-results.js",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/core": "workspace:*",
		"@data-map/signals": "workspace:*",
		"@data-map/storage": "workspace:*",
		"@data-map/path": "workspace:*",
		"@data-map/subscriptions": "workspace:*",
		"@data-map/arrays": "workspace:*",
		"@data-map/computed": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@vitest/browser": "^4.0.16",
		"playwright": "^1.48.2",
		"typescript": "~5.5",
		"vitest": "^4.0.16"
	}
}
```

```ts
// packages/data-map/benchmarks/vitest.config.ts (RECOMMENDED new file)
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
			'@data-map/signals': path.resolve(__dirname, '../signals/src/index.ts'),
			'@data-map/storage': path.resolve(__dirname, '../storage/src/index.ts'),
			'@data-map/path': path.resolve(__dirname, '../path/src/index.ts'),
			'@data-map/subscriptions': path.resolve(
				__dirname,
				'../subscriptions/src/index.ts',
			),
			'@data-map/arrays': path.resolve(__dirname, '../arrays/src/index.ts'),
			'@data-map/computed': path.resolve(__dirname, '../computed/src/index.ts'),
		},
	},
});
```

```ts
// packages/data-map/benchmarks/vitest.config.browser.ts (RECOMMENDED new file)
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
			'@data-map/signals': path.resolve(__dirname, '../signals/src/index.ts'),
			'@data-map/storage': path.resolve(__dirname, '../storage/src/index.ts'),
			'@data-map/path': path.resolve(__dirname, '../path/src/index.ts'),
			'@data-map/subscriptions': path.resolve(
				__dirname,
				'../subscriptions/src/index.ts',
			),
			'@data-map/arrays': path.resolve(__dirname, '../arrays/src/index.ts'),
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

```js
// packages/data-map/benchmarks/scripts/compare-results.js (RECOMMENDED new file)
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

```ts
// packages/data-map/benchmarks/src/utils/comparisons.ts (RECOMMENDED new file)
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

```ts
// packages/data-map/benchmarks/src/utils/reporter.ts (RECOMMENDED new file)
import { readFileSync, writeFileSync } from 'node:fs';

import { toMarkdownTable, type BenchRow } from './comparisons.js';

export function generateMarkdownFromVitestJson(
	jsonPath: string,
	mdPath: string,
) {
	const raw = readFileSync(jsonPath, 'utf8');
	const parsed = JSON.parse(raw);

	const rows: BenchRow[] = [];
	const suites = parsed?.testResults ?? [];
	for (const suite of suites) {
		for (const t of suite?.assertionResults ?? []) {
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

```json
// packages/data-map/benchmarks/baseline.json (RECOMMENDED initial structure)
{
	"flatStore_get": { "opsPerSec": 0 },
	"flatStore_set": { "opsPerSec": 0 },
	"flatStore_delete": { "opsPerSec": 0 },
	"signals_read": { "opsPerSec": 0 },
	"signals_write": { "opsPerSec": 0 },
	"subscriptions_exact": { "opsPerSec": 0 },
	"subscriptions_pattern": { "opsPerSec": 0 }
}
```

```ts
// packages/data-map/benchmarks/src/fixtures/data-generators.ts (RECOMMENDED new file; mirrors jsonpath benchmarks fixture style)
export function generateFlatKeyDataset(size: number): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (let i = 0; i < size; i++) {
		out[`k${String(i)}`] = i;
	}
	return out;
}

export function generateNestedUsers(count: number): unknown {
	return {
		users: Array.from({ length: count }, (_, i) => ({
			id: i,
			name: `User ${i}`,
			active: i % 2 === 0,
			score: i % 100,
		})),
	};
}
```

### API and Schema Documentation

- @jsonpath/benchmarks baseline schema is a map `{ [name: string]: { opsPerSec: number } }`.
- @data-map currently exports only the identifiers listed above; any “full remediation” should preserve these exports and add new ones without breaking them.

### Configuration Examples

```ts
// packages/config-vitest/base.ts
export function vitestBaseConfig(): ViteUserConfig {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			watch: false,
			passWithNoTests: true,
			reporters: ['json', 'default'],
			outputFile: 'test-output.json',
			coverage: {
				provider: 'v8',
				reportsDirectory: 'coverage',
				reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
			},
			setupFiles: [resolveLocalFile('./setup/reflect-metadata.ts')],
		},
	};
}
```

### Technical Requirements

- Implementation docs should prefer source-aliasing in benchmark configs (mirrors `@jsonpath/benchmarks`) so benches test in-workspace TS implementations (not built `dist`).
- Any data-map benchmark report generation that imports from `dist/*` requires `pnpm --filter @data-map/benchmarks build` before `bench:compare`.

## Recommended Approach

Follow the exact `@jsonpath/benchmarks` structure for `@data-map/benchmarks` (Vitest bench + browser config + baseline.json + compare-results.js + minimal reporter utils + fixtures). This aligns with existing repo conventions, keeps tooling consistent, and provides a known-good template for baseline tracking + regression warnings.

## Implementation Guidance

- **Objectives**: Establish `@data-map/benchmarks` infra first (Step 1 in plans/data-map-remediation/plan.md), then add core `.bench.ts` suites and warn-only regression tests.
- **Key Tasks**: Update benchmark package scripts/deps, add Vitest bench configs, create `src/fixtures/*`, create `src/utils/*`, add `baseline.json`, wire `bench:full` → `results.json` → `bench:compare`.
- **Dependencies**: `vitest`, `@vitest/browser`, `playwright`, `@lellimecnar/vitest-config`, and workspace deps `@data-map/*`.
- **Success Criteria**: `pnpm --filter @data-map/benchmarks bench` runs benches; `bench:full` writes `results.json`; `bench:compare` writes `RESULTS.md`; browser benches run via `bench:browser`.
  'array splice middle': 100_000,
  'reconstruct 1k keys': 10_000,
  };

````

### Existing Code Patterns

#### Signal Implementation Pattern
```typescript
// packages/data-map/signals/src/signal.ts
class SignalImpl<T> implements SignalType<T>, DependencySource {
  private _value: T;
  private observers = new Set<Observer>();
  private subscribers = new Set<Subscriber<T>>();

  get value(): T {
    trackRead(this);  // Dependency tracking
    return this._value;
  }

  set value(next: T) {
    if (Object.is(this._value, next)) return;
    this._value = next;
    this.notify();
  }

  // Missing: peek() method for reading without tracking
}
````

#### Flat Storage Pattern

```typescript
// packages/data-map/storage/src/flat-store.ts
export class FlatStore {
	private data = new Map<Pointer, unknown>();
	private versions = new Map<Pointer, number>();
	private arrays = new Map<Pointer, ArrayMetadata>();

	get(pointer: Pointer): unknown {
		return this.data.get(pointer); // O(1)
	}

	set(pointer: Pointer, value: unknown): void {
		this.data.set(pointer, value);
		bumpVersion(this.versions, pointer);
	}

	// Missing: keys(), entries(), size, setDeep(), getObject()
}
```

#### Subscription Engine Pattern

```typescript
// packages/data-map/subscriptions/src/subscription-engine.ts
export class SubscriptionEngine {
  private exact = new ExactIndex();      // Map<Set> NOT TrieMap
  private patterns = new PatternIndex();
  private batcher = new NotificationBatcher();

  subscribePointer(pointer: Pointer, subscriber: Subscriber): Unsubscribe {
    const sub: Subscription = { id: Symbol('sub'), kind: 'exact', ... };
    this.exact.add(pointer, sub);
    return () => this.exact.delete(pointer, sub);
  }

  // Missing: options (immediate, deep, debounce), getAffected(), clear()
}
```

#### Query Pattern (PROBLEMATIC)

```typescript
// packages/data-map/path/src/query.ts - DEFEATS O(1) ACCESS!
export function queryFlat(
	store: FlatStoreQueryable,
	path: string,
): QueryResult {
	const root = store.toObject(); // ❌ O(n) reconstruction!
	const res = runQuery(root, path);
	return {
		values: res.values(),
		pointers: res.pointers().map((p) => p.toString()),
	};
}
```

#### Array Operations Pattern

```typescript
// packages/data-map/arrays/src/smart-array.ts
export class SmartArray {
	private indirection: IndirectionLayer; // Always uses indirection, no strategy selection

	push(value: unknown): void {
		const physical = this.indirection.pushPhysical();
		this.store.set(`${this.pointer}/_p/${physical}`, value);
	}

	// Missing: pop(), shift(), unshift(), sort(), reverse(), toArray(), toPointerMap()
}
```

### External Dependencies

**Required (from spec §9.2):**

- `@jsonpath/pointer` - JSON Pointer utilities (✅ used)
- `@jsonpath/jsonpath` - JSONPath queries (✅ used)
- `mnemonist` - TrieMap, LRUCache (❌ NOT installed, spec recommends)

**Optional:**

- `immutable` - For persistent data structures (not used yet)

## Recommended Implementation Order

### Phase 1: Foundation Fixes (P0)

1. **Fix `queryFlat` to iterate flat store directly** - Critical performance issue
2. **Add `peek()` to signals** - Required for debugging
3. **Add missing FlatStore APIs**: `keys()`, `entries()`, `size`
4. **Add missing DataMap APIs**: `has()`, `keys()`, rename `batchUpdate` → `batch`

### Phase 2: Core Completion (P0)

1. **Add multi-pointer computed**: `computed(['/a', '/b'], fn)`
2. **Expose array operations on DataMap**: `push()`, `pop()`, `splice()`, `sort()`
3. **Add transaction support with rollback**
4. **Install and integrate mnemonist TrieMap** for subscriptions

### Phase 3: Subscription Enhancement (P1)

1. **Add subscription options**: `immediate`, `deep`, `debounce`
2. **Add `getAffected(pointer)` API**
3. **Add filter expression support**: `[?(@.active)]`
4. **Add lifecycle stages**: `before`, `on`, `after`

### Phase 4: Array Strategy (P1)

1. **Implement strategy auto-selection** based on size thresholds
2. **Add missing array methods**: `shift()`, `unshift()`, `reverse()`, `shuffle()`
3. **Add `toArray()` and `toPointerMap()`**
4. **Use `Uint32Array` for indices** (performance)

### Phase 5: Benchmarks (P0)

1. **Create benchmark suite** following @jsonpath/benchmarks pattern
2. **Add get/set benchmarks** (target: 10M/5M ops/sec)
3. **Add subscription benchmarks** (target: 1M ops/sec)
4. **Add array operation benchmarks**
5. **Add regression testing scripts**

### Phase 6: Test Coverage (P1)

1. **Add edge case tests**: Special characters, large datasets
2. **Add integration tests in core**
3. **Add performance regression tests**
4. **Target 90% coverage**

### Phase 7: Framework Integrations (P2)

1. **Create @data-map/react** with hooks
2. **Create @data-map/vue** with composables
3. **Create @data-map/solid** with signals bridge
4. **Create @data-map/devtools**

## Implementation Guidance

- **Objectives**: Achieve spec parity for core packages, validate O(1) claims with benchmarks
- **Key Tasks**:
  1. Fix queryFlat O(n) issue first (blocking)
  2. Complete missing APIs in dependency order
  3. Create benchmark suite to validate performance
- **Dependencies**:
  - mnemonist needs to be added: `pnpm add mnemonist -F @data-map/subscriptions`
  - @jsonpath/\* packages already available
- **Success Criteria**:
  - All spec'd APIs implemented
  - 90%+ test coverage
  - Benchmarks meeting target ops/sec
  - Zero O(n) operations in hot paths
