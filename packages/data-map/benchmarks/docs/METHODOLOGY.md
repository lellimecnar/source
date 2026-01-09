# Benchmark Methodology

This document describes how the @data-map benchmarks are designed, executed, and interpreted.

## Design Principles

### 1. Comparable Operations

Benchmarks test **comparable operations** across different libraries using normalized adapters. For example:

- **Signal libraries**: All test reading, writing, computed values, effects, and batching
- **State management**: All test store creation, get/set operations, and snapshots
- **Path access**: All test shallow/deep gets, sets, and wide object operations

The adapter pattern ensures we're comparing apples to apples, not implementation details.

### 2. Realistic Scenarios

Benchmarks test scenarios that reflect real application usage:

- **Baseline benchmarks**: Isolated operations (reading a signal, setting a value)
- **Comparative benchmarks**: Multiple adapters doing the same task
- **Scale benchmarks**: Same operations on 100, 1K, 10K, 100K items
- **Real-world patterns**: Batch updates, subscriptions with multiple listeners, etc.

### 3. Representative Data

Test data is designed to be representative:

- **SMALL fixture** (100 items): Typical application state
- **MEDIUM fixture** (1K items): Larger collections (e.g., lists, trees)
- **LARGE/XLARGE fixtures** (10K-100K items): Stress tests and edge cases

### 4. Multiple Runs

Vitest's `bench` runs each benchmark **many times** in a tight loop to gather statistics:

```
1. Warm-up phase (JIT compilation)
2. Timed measurement phase (thousands of iterations)
3. Statistical analysis (hz, mean, p75, p99, etc.)
```

This ensures results are stable and not affected by:

- CPU frequency scaling
- Garbage collection pauses
- Operating system scheduling

## Benchmark Categories

### Baseline Benchmarks

Isolated, atomic operations:

```typescript
bench('signals.signalRead', () => {
	void s.value; // Just read the value
});
```

**Purpose**: Establish a performance floor for each library.

### Comparative Benchmarks

Same operation across multiple adapters:

```typescript
for (const adapter of SIGNAL_ADAPTERS) {
	bench(`signals.write.${adapter.name}`, () => {
		const sig = adapter.createSignal(0);
		sig.set(1);
	});
}
```

**Purpose**: Compare libraries fairly and identify best performers.

### Scale Benchmarks

Operations at different data sizes:

```typescript
for (const size of ['small', 'medium', 'large', 'xlarge']) {
	bench(`scale.storage_get_${size}`, () => {
		const store = new FlatStore(makeData(size));
		store.get(pointer);
	});
}
```

**Purpose**: Understand how performance degrades with data size.

### Browser Benchmarks

Real-world browser environment:

```typescript
describe('Browser / Signals');
// Same tests but running in a browser (not Node.js)
```

**Purpose**: Measure true web application performance.

## Metrics Collected

### Operations Per Second (hz)

The primary metric: how many times per second can an operation complete?

```
Higher hz = faster library
```

**Example**: 10,000 hz means 10,000 operations per second = 0.1 ms per operation.

### Mean Time (mean)

Average time per operation in milliseconds.

```
mean = 1000 / hz
```

**Example**: If hz = 10,000, then mean = 0.1 ms.

### Percentiles (p75, p99, p995, p999)

How consistent is the library?

```
p75  = 75th percentile (75% of operations are faster than this)
p99  = 99th percentile (99% of operations are faster than this)
p999 = 99.9th percentile (99.9% of operations are faster than this)
```

**Example**: If p99 = 1.0 ms, then 99% of operations complete in under 1ms, but 1% might take longer (GC pauses, context switches, etc.).

### Relative Margin of Error (rme)

Statistical confidence in the result:

```
Lower rme = more reliable result
rme < 1% = high confidence
rme > 5% = consider suspicious (possibly high system variance)
```

**Example**: If hz = 10,000 ± 0.5%, then true value is somewhere between 9,950 and 10,050 hz.

## Interpreting Results

### Comparing Two Libraries

```
Library A: 10,000 hz (mean: 0.10 ms)
Library B: 9,000 hz  (mean: 0.11 ms)
Difference: 1,000 hz (10% faster)
```

Is this real or noise?

**Check the rme**:

- Both have rme < 1% → High confidence, real difference
- One has rme > 5% → Unreliable, run again
- Difference is small but both have low rme → Probably noise (1-5% differences are often within measurement variance)

### Understanding Percentiles

```
Library A: hz=10,000, mean=0.10, p99=0.25, p999=0.50
Library B: hz=9,000,  mean=0.11, p99=0.40, p999=1.00
```

**Interpretation**:

- Library A is faster on average (0.10 vs 0.11 ms)
- Library A is more consistent (p99=0.25 vs 0.40, p999=0.50 vs 1.00)
- Library A is better for latency-sensitive applications
- Library B has occasional expensive operations (GC pauses, etc.)

### Considering Scale

```
Storage get at small (100 items):  30,000 hz (mean: 0.033 ms)
Storage get at large (10K items):    250 hz (mean: 4.0 ms)
```

**Interpretation**:

- Operations degrade ~120x when data size increases 100x
- This is likely O(n) or worse complexity
- Consider if this matters for your use case

## Common Pitfalls

### 1. Single Run Results Are Unreliable

```
Run 1: 10,000 hz
Run 2: 9,500 hz
Run 3: 10,500 hz
```

Vitest runs each benchmark **thousands of times**, not once. Single runs are noise.

**Solution**: Always use Vitest's statistical output, not eyeball impressions.

### 2. System Load Affects Results

Running on a loaded system (IDE, browser, other apps):

```
Isolated: 10,000 hz
Loaded:   8,000 hz (20% slower due to OS scheduling)
```

**Solution**: Close other applications and run benchmarks on isolated hardware.

### 3. Garbage Collection Pauses

Long percentiles (p99, p999) might indicate GC:

```
hz=10,000, mean=0.1, p999=2.0
```

The 0.1 ms mean is fast, but some operations take 2.0 ms (20x slower).

**Interpretation**: Occasional expensive operations, possibly GC.

### 4. Comparing Different Node/Browser Versions

```
Node 20: 10,000 hz
Node 18: 9,000 hz
```

Node.js JIT and optimizations vary. Use **same version** for fair comparison.

### 5. Ignoring rme

```
A: hz=10,000 ± 2%  (true range: 9,800–10,200)
B: hz=9,500  ± 3%  (true range: 9,215–9,785)
```

Ranges overlap! Difference is not statistically significant.

**Solution**: Always check rme < 1% for reliable comparisons.

## Running Benchmarks Correctly

### 1. Baseline Run (Initial)

```bash
pnpm --filter @data-map/benchmarks bench
```

This runs all benchmarks and outputs `baseline.json`.

### 2. Focused Run (Development)

```bash
pnpm --filter @data-map/benchmarks bench --grep "signals"
```

Test a specific category without running everything.

### 3. Full Report (CI/Before Merge)

```bash
pnpm --filter @data-map/benchmarks bench:full
pnpm --filter @data-map/benchmarks generate-report
```

This produces `BENCHMARK_RESULTS.md` with full analysis.

### 4. Regression Check

```bash
pnpm --filter @data-map/benchmarks exec vitest run src/performance-regression.spec.ts
```

Warns about regressions against `baseline.json` (never blocks).

## Tips for Reliable Benchmarks

1. **Use consistent hardware**: Same machine for comparison runs
2. **Use consistent environment**: Same Node/browser version
3. **Minimize system load**: Close IDE, browser, other apps
4. **Check rme**: Ensure statistical significance (rme < 1%)
5. **Watch percentiles**: High p99/p999 indicates variability
6. **Run multiple times**: Occasional variance is normal
7. **Test on representative data**: Use SMALL/MEDIUM/LARGE fixtures
8. **Consider your use case**: 10% faster doesn't always matter if operations take <0.1ms

## References

- [Vitest Benchmarking](https://vitest.dev/guide/features#benchmarking)
- [Benchmark.js Guide](https://github.com/bestiejs/benchmark.js)
- [Statistical Confidence in Performance Testing](https://easyperf.net/blog/)
- [Understanding JIT Compilation](https://v8.dev/docs/profile)
