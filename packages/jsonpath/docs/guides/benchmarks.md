# Benchmarks

The `@jsonpath/benchmarks` package provides a suite of performance tests using `vitest bench`.

## Running Benchmarks

From the repository root:

```bash
pnpm --filter @jsonpath/benchmarks bench
```

## Structure

Benchmarks are located in `packages/jsonpath/benchmarks/src/*.bench.ts`. They cover:

- Basic query evaluation
- Complex filter expressions
- Large dataset processing

## Results

Benchmark results are output to the console and can be used to track performance regressions or compare different implementation strategies.
