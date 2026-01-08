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
