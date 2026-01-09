# @data-map/\* Performance

This document summarizes the benchmark methodology and current performance characteristics for the `@data-map/*` packages.

## How to run benchmarks

- Full suite (JSON output):

```bash
pnpm --filter @data-map/benchmarks bench:full
```

- Focused suites:

```bash
pnpm --filter @data-map/benchmarks bench:signals
pnpm --filter @data-map/benchmarks bench:subscriptions
pnpm --filter @data-map/benchmarks bench:path
pnpm --filter @data-map/benchmarks bench:arrays
pnpm --filter @data-map/benchmarks bench src/baselines/bottlenecks.baseline.bench.ts
pnpm --filter @data-map/benchmarks bench src/final-validation.bench.ts
```

## Baselines

The file `baseline.json` tracks benchmark keys we care about over time. Populate it by running benches and recording the reported ops/sec.

## Notes

- Benchmarks are executed via `vitest bench`.
- Most microbench numbers are sensitive to CPU scaling, background load, and Node versions.
