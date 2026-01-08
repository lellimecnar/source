<!-- markdownlint-disable-file -->

# Task Research Notes: DataMap Benchmarks Expansion (repo research)

## Research Executed

### File Analysis

- packages/data-map/benchmarks/package.json
  - Scripts: `bench` (`vitest bench`), `bench:full` (JSON reporter -> `results.json`), `bench:compare` (Node script), `bench:browser*` (Playwright via Vitest browser config)
  - Has `build` via Vite (used to emit `dist/` ESM files consumed by compare script)
- packages/data-map/benchmarks/vitest.config.ts
  - Uses `vitestBaseConfig()` from `@lellimecnar/vitest-config`
  - Overrides `resolve.alias` to point `@data-map/*` packages at local `../*/src/index.ts` sources
- packages/data-map/benchmarks/vitest.config.browser.ts
  - Same aliases as node config
  - Adds `test.browser` with `{ enabled: true, provider: 'playwright', name: 'chromium' }`
- packages/data-map/benchmarks/vite.config.ts
  - Builds `dist/` with `preserveModules` and ESM output (so scripts can import `dist/utils/*.js`)
- packages/data-map/benchmarks/src/\*.bench.ts
  - Benchmarks are authored with `vitest`’s `bench()` API and use explicit benchmark keys like `storage.getSmall` (these keys are reused in `baseline.json`)
- packages/data-map/benchmarks/src/fixtures/\*
  - Data generators produce consistent pointer/value datasets for SMALL/MEDIUM/LARGE and arrays of fixed size
- packages/data-map/benchmarks/src/utils/measure.ts
  - Node-only `process.memoryUsage()` snapshot/diff helper used by `memory.bench.ts`
- packages/data-map/benchmarks/src/utils/reporter.ts
  - Parses Vitest JSON reporter output (best-effort stats extraction across Vitest versions)
  - Loads `baseline.json` and flags regressions (>10% slower) when baseline entries are non-zero
- packages/data-map/benchmarks/baseline.json
  - Baseline schema: `{ [benchKey: string]: { opsPerSec: number } }`
  - Current entries are all `0` (treated as “unset” in baseline comparisons)

- packages/jsonpath/benchmarks/package.json
  - Same baseline Vitest bench scripts as DataMap benchmarks, plus convenience scripts:
    - `bench:query`, `bench:pointer`, `bench:patch` using `--testNamePattern`
- packages/jsonpath/benchmarks/src/adapters/types.ts
  - Normalized adapter interfaces per kind (`jsonpath`, `pointer`, `patch`, `merge-patch`)
  - Each adapter includes `features` metadata and a required `smokeTest()`
- packages/jsonpath/benchmarks/src/query-fundamentals.bench.ts
  - Pattern: `bench(adapter.name, () => adapter.queryValues(...))` and nested `describe()` blocks per query
- packages/jsonpath/benchmarks/src/*smoke.spec.ts / src/*regression.spec.ts / src/adapters/\*.spec.ts
  - “Smoke” specs ensure adapter dependencies load and adapters behave correctly
  - Regression spec is warn-only (does not fail CI) and compares to `baseline.json`
- packages/jsonpath/benchmarks/baseline.json
  - Stores numeric ops/sec baselines for targeted operations used by regression spec
- packages/config-vitest/base.ts
  - Defines `vitestBaseConfig()` used by both benchmark packages
- vitest.config.ts
  - Root test config uses `projects` pointing at each workspace `vitest.config.ts` (benchmarks packages have their own configs as well)

### Code Search Results

- Search: `vitestBaseConfig` (packages/config-vitest/\*\*)
  - Matches:
    - packages/config-vitest/base.ts
    - packages/config-vitest/browser.ts

- Search: `external-imports.smoke.spec.ts`
  - Files discovered:
    - packages/jsonpath/benchmarks/src/external-imports.smoke.spec.ts

### External Research

- #githubRepo:"N/A"
  - Not executed (request focuses on repo-local benchmark patterns).
- #fetch:N/A
  - Not executed.

### Project Conventions

- Standards referenced: `@lellimecnar/vitest-config` base config usage + `@jsonpath/benchmarks` adapter + smoke spec patterns
- Instructions followed: workspace-only changes (research notes only)

## Key Discoveries

### Project Structure

- `@data-map/benchmarks` is a small internal-only suite today:
  - Source: packages/data-map/benchmarks/src
  - Utilities/fixtures are already present and reusable for expansion
  - No adapter layer and no `.spec.ts` smoke tests

- `@jsonpath/benchmarks` is already “comparative”:
  - Source: packages/jsonpath/benchmarks/src
  - Normalized adapters in `src/adapters/` enable multi-library fair comparisons
  - Multiple test layers exist: bench suites, smoke specs, warn-only regression spec, fixture unit tests

### Implementation Patterns

#### 1) Vitest bench organization patterns

- DataMap style: explicit benchmark keys (stable IDs)
  - Example (from packages/data-map/benchmarks/src/storage.bench.ts):
    - `bench('storage.getSmall', () => { ... })`

- JSONPath style: adapter-driven benches (bench name = adapter name)
  - Example (from packages/jsonpath/benchmarks/src/query-fundamentals.bench.ts):
    - Loop adapters → `bench(adapter.name, () => adapter.queryValues(data, q))`
  - Nested `describe(q, ...)` groups results by query category and input string

#### 2) Adapter interface patterns (JSONPath benchmarks)

- Adapters implement:
  - `kind` discriminator
  - `name` used in bench output
  - `features` metadata to track capability differences
  - Required `smokeTest()` and separate `.spec.ts` tests for correctness

#### 3) Baseline & regression patterns

- DataMap benchmarks: baseline comparison is inside the Markdown report generator
  - `generateMarkdownFromVitestJson()` loads `baseline.json` and flags regressions when baseline ops/sec > 0
  - Treats `0` baseline entries as “unset” (never flags regressions)

- JSONPath benchmarks: warn-only regression spec
  - packages/jsonpath/benchmarks/src/performance-regression.spec.ts
  - Runs tight loops using `performance.now()` and compares computed ops/sec to `baseline.json * 0.9`
  - Always passes: `expect(true).toBe(true)` after `console.warn(...)`

#### 4) Report generation scripts

- Both packages provide `scripts/compare-results.js` that expects `results.json` from `bench:full`.
- DataMap benchmarks have an explicit Vite `build` script which produces `dist/utils/reporter.js` for the compare script import.
- JSONPath benchmarks’ compare script also imports `../dist/utils/reporter.js`, but `dist/` is not present in the package directory (as observed via directory listing).
  - Implication: report generation may rely on an external build step not declared in `@jsonpath/benchmarks` scripts.

### Complete Examples

```ts
// Adapter contract excerpt (packages/jsonpath/benchmarks/src/adapters/types.ts)
export interface JsonPathAdapter {
	kind: 'jsonpath';
	name: string;
	features: { supportsFilter: true | false | 'unknown' /* ... */ };
	queryValues: <T = unknown>(data: unknown, expression: string) => T[];
	smokeTest: () => boolean;
}
```

```ts
// Benchmark loop pattern (packages/jsonpath/benchmarks/src/query-fundamentals.bench.ts)
for (const adapter of adapters) {
	bench(adapter.name, () => {
		void adapter.queryValues(STORE_DATA, q);
	});
}
```

### API and Schema Documentation

- Baseline JSON shape (both packages):
  - `Record<string, { opsPerSec: number }>`
- DataMap baseline keys correspond to explicit `bench('...')` titles (e.g. `storage.getSmall`).
- JSONPath regression spec baseline keys are semantic operation names (e.g. `simpleQuery`, `filterQuery`).

### Configuration Examples

```ts
// Shared base config pattern (packages/config-vitest/base.ts)
export function vitestBaseConfig() {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			reporters: ['json', 'default'],
			outputFile: 'test-output.json',
			passWithNoTests: true,
		},
	};
}
```

### Technical Requirements

- Both benchmark packages rely on `vitest bench` and (optionally) Playwright-backed browser benches.
- Both benchmark packages pin internal workspace imports via `resolve.alias` to local `src/index.ts` to avoid needing builds during bench runs.
- `@data-map/benchmarks` already has fixture + memory helpers suitable for scaling out.
- `@jsonpath/benchmarks` provides the reference adapter + smoke/regression testing architecture the expansion plan wants to emulate.

## Recommended Approach

Adopt the `@jsonpath/benchmarks` architecture patterns for `@data-map/benchmarks` expansion:

- Add a normalized adapter layer under `packages/data-map/benchmarks/src/adapters/` with:
  - per-category `kind` discriminators, `name`, `features`, and required `smokeTest()`
  - adapter-specific `.spec.ts` tests to validate correctness and dependency loading
- Structure comparative benches as adapter loops (bench name = adapter name) grouped by `describe()` categories, matching JSONPath’s discoverable output.
- For regression tracking, pick one consistent mechanism:
  - Either (A) keep DataMap’s “baseline compare in Markdown report generator”, or
  - (B) add a JSONPath-style warn-only `performance-regression.spec.ts` that checks a small set of critical operations against `baseline.json`.
  - (A) is aligned with current DataMap benchmarks code; (B) is already proven in JSONPath benchmarks.

## Implementation Guidance

- **Objectives**: Expand DataMap benchmarks into a comparative suite with adapters, smoke tests, baselines, and report generation consistent with existing monorepo patterns.
- **Key Tasks**:
  - Mirror adapter folder structure and smoke spec patterns from `packages/jsonpath/benchmarks/src/adapters/`
  - Standardize baseline key naming strategy (explicit operation IDs vs semantic names) and align reporting/regression checks
  - Ensure report generation has a declared build step (DataMap already does; JSONPath currently appears inconsistent)
- **Dependencies**:
  - `@lellimecnar/vitest-config` (`vitestBaseConfig`) conventions
  - Playwright/Vitest browser mode if browser benches are required
- **Success Criteria**:
  - New adapters have passing `.spec.ts` smoke tests
  - `vitest bench` runs in node + browser configs without requiring upstream package builds
  - `bench:full` → `results.json` → `bench:compare` reliably produces `RESULTS.md`

---

## Implementation Guidance

### Phase 1: Add Competitor Dependencies

```json
{
	"dependencies": {
		"@preact/signals-core": "^1.8.0",
		"nanostores": "^0.11.0",
		"@maverick-js/signals": "^6.0.0",
		"zustand": "^5.0.0",
		"jotai": "^2.10.0",
		"valtio": "^2.1.0",
		"immer": "^10.1.0",
		"mutative": "^1.0.0",
		"lodash.get": "^4.4.2",
		"lodash.set": "^4.3.2",
		"dot-prop": "^9.0.0",
		"dlv": "^1.1.3",
		"dset": "^3.1.4"
	}
}
```

### Phase 2: Create Adapter Layer

```
src/adapters/
├── index.ts
├── types.ts
├── signals.data-map.ts
├── signals.preact.ts
├── signals.nanostores.ts
├── signals.maverick.ts
├── state.zustand.ts
├── state.jotai.ts
├── state.valtio.ts
├── immutable.immer.ts
├── immutable.mutative.ts
├── path.data-map.ts
├── path.lodash.ts
├── path.dot-prop.ts
├── path.dlv-dset.ts
└── *.spec.ts (smoke tests)
```

### Phase 3: Benchmark Suites

```
src/
├── signals-fundamentals.bench.ts    # signal/computed/effect basics
├── signals-scale.bench.ts           # dependency chains, fan-out
├── state-management.bench.ts        # get/set/subscribe patterns
├── immutable-updates.bench.ts       # produce, nested updates
├── path-access.bench.ts             # get/set by path
├── data-map-integration.bench.ts    # full DataMap vs alternatives
├── memory-profiling.bench.ts        # heap snapshots
└── browser/                         # Browser-specific benchmarks
```

### Phase 4: Fixtures Enhancement

```
src/fixtures/
├── index.ts
├── generate.ts
├── sizes.ts                         # SMALL, MEDIUM, LARGE, XLARGE
├── shapes.ts                        # flat, nested, wide, deep
├── realistic.ts                     # user data, e-commerce, etc.
└── stress.ts                        # 1M keys, 1000 subscribers
```

### Phase 5: CI/Regression Infrastructure

Based on `@jsonpath/benchmarks/src/performance-regression.spec.ts`:

1. Create `baseline.json` with target ops/sec
2. Implement warn-only regression tests
3. Add GitHub Actions workflow for benchmark runs
4. Publish results to GitHub Pages or artifact

---

## Benchmark Best Practices

### Statistical Rigor (from Vitest bench)

- **Warmup**: Default 100ms, increase for JIT-heavy code
- **Iterations**: Auto-determined by Vitest for stable results
- **Time budget**: 1s per benchmark by default
- **Variance reporting**: RME (relative margin of error)

### Configuration Options

```typescript
// vitest.config.ts
export default defineConfig({
	test: {
		benchmark: {
			reporters: ['default', 'json'],
			outputJson: 'results.json',
			include: ['**/*.bench.ts'],
		},
	},
});
```

### Reporting Formats

- Markdown tables for README
- JSON for CI comparison
- Console output with color coding
- Historical tracking via baseline.json

---

## Recommended Approach

**Single Solution: Adapter-Based Comparative Benchmarks**

Expand `@data-map/benchmarks` following the proven `@jsonpath/benchmarks` pattern:

1. **Adapter Layer**: Normalize all library APIs for fair comparison
2. **Smoke Tests**: Verify correct operation before benchmarking
3. **Feature Matrices**: Track which adapters support which capabilities
4. **Scale Variations**: Test at 1K, 10K, 100K, 1M data points
5. **Regression Testing**: Warn-only CI checks against baseline
6. **Browser Testing**: Playwright-based benchmarks for real environments

Key advantages:

- Consistent with existing monorepo patterns
- Reusable adapter code from @jsonpath/benchmarks
- Enables easy addition of new competitors
- Provides actionable competitive intelligence

---

## Success Criteria

- [ ] All competitor adapters have smoke tests passing
- [ ] Benchmarks cover all @data-map package key operations
- [ ] Results exportable to Markdown and JSON
- [ ] CI integration with regression warnings
- [ ] Documentation with interpretation guidelines
- [ ] At least 5 competitor libraries per category benchmarked
