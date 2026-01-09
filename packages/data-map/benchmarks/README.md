# @data-map/benchmarks

Comprehensive performance benchmarks for the @data-map ecosystem, featuring:

- **Baseline benchmarks** for core operations (signals, storage, subscriptions, arrays, path, core)
- **Comparative benchmarks** across multiple adapter libraries (data-map, preact signals, solid, vue, maverick, etc.)
- **Scale testing** to understand performance at various data sizes (100 to 100K+ entries)
- **Regression detection** to warn about performance degradation
- **Browser benchmarks** for real-world performance in web environments
- **Memory profiling** to track heap usage patterns

## Quick Start

### Run All Benchmarks

```bash
pnpm --filter @data-map/benchmarks bench
```

### Run Specific Category

```bash
# Signals benchmarks
pnpm --filter @data-map/benchmarks bench:signals

# Storage benchmarks
pnpm --filter @data-map/benchmarks bench:storage

# Subscriptions benchmarks
pnpm --filter @data-map/benchmarks bench:subscriptions

# Path access benchmarks
pnpm --filter @data-map/benchmarks bench:path

# Scale testing
pnpm --filter @data-map/benchmarks bench:scale

# Browser benchmarks
pnpm --filter @data-map/benchmarks bench:browser
```

### Generate Full Report

```bash
pnpm --filter @data-map/benchmarks bench:full
pnpm --filter @data-map/benchmarks generate-report
```

## Structure

```
src/
├── baselines/              # Core operation baselines
│   ├── signals.baseline.bench.ts
│   ├── storage.baseline.bench.ts
│   ├── subscriptions.baseline.bench.ts
│   ├── arrays.baseline.bench.ts
│   ├── path.baseline.bench.ts
│   └── core.baseline.bench.ts
├── adapters/              # Normalized adapter interfaces
│   ├── types.ts           # BaseAdapter, SignalAdapter, StateAdapter, etc.
│   ├── index.ts           # Registry exports
│   ├── signals.*ts        # Signal library adapters
│   ├── state.*ts          # State management adapters
│   ├── immutable.*ts      # Immutable update adapters
│   ├── path.*ts           # Path access adapters
│   └── pubsub.*ts         # Event bus adapters
├── signals-comparative.bench.ts
├── state-management.bench.ts
├── immutable-updates.bench.ts
├── path-access.bench.ts
├── subscriptions-comparative.bench.ts
├── arrays-comparative.bench.ts
├── scale-comprehensive.bench.ts
├── browser/               # Browser-specific benchmarks
│   ├── index.bench.ts
│   ├── signals.bench.ts
│   └── storage.bench.ts
├── fixtures/              # Test data generators
│   ├── index.ts
│   └── scale-generators.ts
├── utils/
│   ├── adapter-helpers.ts
│   ├── memory-profiler.ts
│   ├── reporter.ts
│   └── compare.ts
└── performance-regression.spec.ts
```

## Adapters

The benchmark suite uses normalized "adapters" to test different libraries with the same interface:

- **SignalAdapter**: Reactive primitive libraries (data-map signals, preact, solid, vue, maverick, nanostores)
- **StateAdapter**: State management libraries (data-map, zustand, jotai, valtio)
- **ImmutableAdapter**: Immutable update libraries (data-map, immer, mutative)
- **PathAdapter**: Path-based access libraries (data-map, lodash, dot-prop, object-path, dlv+dset)
- **PubSubAdapter**: Event bus libraries (data-map, mitt, eventemitter3, nanoevents)

Each adapter implements a common interface for fair comparison.

## Baseline & Regression Testing

Baselines are stored in `baseline.json` and capture the expected performance of each operation.

Run benchmarks with:

```bash
pnpm --filter @data-map/benchmarks bench
```

This updates `baseline.json` with current performance metrics.

To check for regressions:

```bash
pnpm --filter @data-map/benchmarks exec vitest run src/performance-regression.spec.ts
```

Regressions emit warnings but do not block CI.

## Scale Testing

Scale tests evaluate performance across different data sizes:

- **tiny**: 10 items
- **small**: 100 items
- **medium**: 1K items
- **large**: 10K items
- **xlarge**: 100K items

Run scale tests with:

```bash
pnpm --filter @data-map/benchmarks bench:scale
```

## Browser Benchmarks

Browser-specific benchmarks measure real-world performance in web environments:

```bash
pnpm --filter @data-map/benchmarks exec vitest bench src/browser
```

Or for full browser testing (requires playwright):

```bash
pnpm --filter @data-map/benchmarks bench:browser
```

## Results & Reporting

Benchmark results are saved to `results.json` and can be converted to markdown:

```bash
pnpm --filter @data-map/benchmarks bench:full
pnpm --filter @data-map/benchmarks generate-report
```

This generates `BENCHMARK_RESULTS.md` with:

- Summary tables of operations per second
- Comparisons across adapters
- Regression analysis
- Performance trends

## Adding New Adapters

To add a new adapter:

1. Create `src/adapters/category.newlibrary.ts`
2. Implement the appropriate adapter interface (SignalAdapter, StateAdapter, etc.)
3. Include a `smokeTest()` function for validation
4. Create `src/adapters/category.newlibrary.spec.ts` with unit tests
5. Register the adapter in `src/adapters/index.ts`

Example:

```typescript
import type { SignalAdapter } from './types.js';

export const newlibSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'newlib',
	features: {
		/* ... */
	},
	createSignal: (initial) => {
		/* ... */
	},
	createComputed: (fn) => {
		/* ... */
	},
	createEffect: (fn) => {
		/* ... */
	},
	batch: (fn) => {
		/* ... */
	},
	smokeTest: () => {
		/* ... */
	},
};
```

## Methodology

See [docs/METHODOLOGY.md](./docs/METHODOLOGY.md) for detailed information on:

- How benchmarks are designed
- What metrics are collected
- How results are interpreted
- Common pitfalls and how to avoid them

## Interpreting Results

See [docs/INTERPRETING_RESULTS.md](./docs/INTERPRETING_RESULTS.md) for guidance on:

- Understanding operations per second (hz)
- Mean time interpretation
- Margin of error (rme)
- When to trust results
- How to identify real performance differences vs. noise

## Configuration

### package.json Scripts

```json
{
	"scripts": {
		"bench": "vitest bench",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"bench:signals": "vitest bench --grep 'Signals|signals'",
		"bench:storage": "vitest bench --grep 'Storage|storage'",
		"bench:subscriptions": "vitest bench --grep 'Subscriptions|subscriptions'",
		"bench:path": "vitest bench --grep 'Path|path'",
		"bench:scale": "vitest bench --grep 'Scale|scale'",
		"bench:browser": "vitest bench --config vitest.config.browser.ts"
	}
}
```

### vitest.config.ts

Default Node.js benchmarks with proper path aliases for workspace packages.

### vitest.config.browser.ts

Browser-specific configuration (when @vitest/browser-playwright is installed).

## Performance Tips

- Run benchmarks on isolated hardware for consistent results
- Close other applications to reduce noise
- Run multiple times to account for system variance
- Use the same Node.js version across comparison runs
- Consider using `pnpm bench:full` for final validation

## Resources

- [Vitest Benchmarking](https://vitest.dev/guide/features#benchmarking)
- [Benchmark.js](https://github.com/bestiejs/benchmark.js)
- [Performance Testing Guide](https://github.com/v8/v8/wiki/Using-V8-in-Node.js)
