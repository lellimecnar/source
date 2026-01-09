# Interpreting Benchmark Results

This guide helps you understand and act on benchmark results from the @data-map suite.

## Quick Reference

### Read Operations Per Second (hz)

The main metric. Higher is faster.

```
MyLib: 10,000 hz  = 10,000 operations per second = 0.1 ms per operation
```

### Check Reliability (rme)

Look for `rme < 1%`. If rme is high (> 5%), results are unreliable.

```
✅ MyLib: 10,000 hz (rme: ±0.5%)  ← Reliable
❌ MyLib: 10,000 hz (rme: ±8.0%)  ← Unreliable, run again
```

### Look for Consistency (p99, p999)

Do all operations complete quickly, or are some slow?

```
✅ mean: 0.1ms, p99: 0.15ms, p999: 0.20ms    ← Consistent
❌ mean: 0.1ms, p99: 1.0ms, p999: 5.0ms      ← Occasional slow operations
```

## Detailed Metrics

### Operations Per Second (hz)

How many times per second can the operation complete?

```
signals.signalRead.data-map: 11,978,989.98 hz
```

**Interpretation**:

- The operation completes ~12 million times per second
- Or: ~0.000083 milliseconds per operation
- Or: ~83 nanoseconds per operation

**Translation to milliseconds**:

```
ms_per_op = 1000 / hz = 1000 / 11,978,989.98 ≈ 0.0000835 ms
```

### Mean (Median) Time

Average execution time per operation.

```
signals.signalRead.data-map: mean: 0.0001 ms (or 0.1 microseconds)
```

**Usage**: General sense of how long each operation takes.

### Percentiles

Distribution of operation times:

```
min:   0.0000 ms  (fastest operation)
p75:   0.0001 ms  (75% of ops are this fast or faster)
p99:   0.0001 ms  (99% of ops are this fast or faster)
p995:  0.0002 ms  (99.5% of ops are this fast or faster)
p999:  0.0002 ms  (99.9% of ops are this fast or faster)
max:   0.1493 ms  (slowest operation)
```

**When to worry**:

- If p99 is much larger than mean, some operations are very slow
- Example: mean=0.1ms, p99=1.0ms → 1% of operations are 10x slower (possibly GC)

### Relative Margin of Error (rme)

Statistical confidence in the result:

```
signals.signalRead.data-map: 11,978,989.98 hz ±0.12%
```

**Interpretation**:

- True value is between: 11,978,989.98 × (1 - 0.0012) and 11,978,989.98 × (1 + 0.0012)
- Or: between 11,963,649.18 and 11,994,330.78 hz
- Very narrow range = reliable result

**Reliability guide**:

```
rme ±0.5% = Excellent, very confident
rme ±1.0% = Good, confident
rme ±2.0% = OK, probably reliable
rme ±5.0% = Questionable, run again
rme ±10%  = Unreliable, system was too loaded
```

## Comparing Benchmarks

### Same Library, Different Sizes

```
scale.storage_get_small:  30,351,274.91 hz  (100 items)
scale.storage_get_medium:    3,549.44 hz   (1K items)
scale.storage_get_large:       247.56 hz   (10K items)
scale.storage_get_xlarge:        19.2 hz   (100K items)
```

**Scaling factor**: ~9x slower per 10x increase in size

**Interpretation**: O(n) or O(n log n) complexity

**Decision**: For large datasets, consider sharding or pagination.

### Different Libraries, Same Operation

```
signals.write.data-map:       8,712,236.62 hz  (mean: 0.000114 ms)
signals.write.preact:         7,934,832.52 hz  (mean: 0.000126 ms)
signals.write.vue:            2,401,298.49 hz  (mean: 0.000417 ms)
```

**Ranking**: data-map (fastest) → preact → vue (slowest)

**Interpretation**:

- data-map is 1.1x faster than preact (difference within 5%)
- data-map is 3.6x faster than vue (significant difference)

**When difference matters**:

- For reactive applications with frequent updates, choose data-map/preact
- For applications with < 100 updates/sec, difference is negligible

### Percentile Comparison

```
Library A: mean: 0.10ms, p99: 0.15ms, rme: ±0.5%
Library B: mean: 0.10ms, p99: 0.80ms, rme: ±0.5%
```

**Analysis**:

- Both have same average performance
- Library A is more consistent (p99 = 1.5x mean)
- Library B has expensive tail operations (p99 = 8x mean)

**Recommendation**:

- For UI/latency-sensitive: Library A
- For batch processing: Either is fine
- For streaming: Library A (more predictable)

## Common Scenarios

### Scenario 1: My Library Is Slower

```
signals.write.mylib: 1,234,567 hz
signals.write.data-map: 8,712,236 hz
Difference: 7x slower
```

**Questions to ask**:

1. **Is rme < 1%?** If rme > 5%, run again with less system load.
2. **Is it significant?** If both are > 1 million hz, the difference might not matter in practice.
3. **Where's the time spent?**
   - Profile your library: `node --inspect app.js`
   - Check if GC is the issue: high p999 suggests GC pauses
   - Check if object allocation is the issue: use memory profiler

4. **What's your use case?**
   - If < 1000 updates/sec needed: probably fine
   - If > 100,000 updates/sec needed: optimize or use another library

### Scenario 2: Some Operations Are Much Slower

```
signal.effectCreate: mean: 0.0003ms, p99: 0.0004ms  ← Fast, consistent
signal.dispose: mean: 0.0005ms, p99: 0.5ms          ← Slow and unpredictable!
```

**Interpretation**: Dispose includes some expensive operation (possibly GC, cleanup, etc.)

**Action**:

- Check what `dispose` does: might involve global state cleanup
- If dispose is rarely called: not a problem
- If dispose is called frequently: might be a bottleneck

### Scenario 3: High rme / Inconsistent Results

```
signals.write.mylib: 8,712,236.62 hz ±8.5%
```

**Interpretation**:

- Results are unreliable
- True value could be anywhere from 7,980,000 to 9,440,000 hz

**Causes**:

- System was busy during benchmark
- OS scheduled other processes
- Garbage collection ran during measurement
- CPU frequency scaling

**Solution**:

1. Close IDE, browser, background apps
2. Run benchmarks again
3. Use `pnpm bench:scale` for repeated runs to identify pattern

### Scenario 4: Comparison Across Versions

```
Version 1.0.0: storage.get: 30,351,274.91 hz
Version 1.1.0: storage.get: 28,601,087.77 hz
Difference: 5.8% slower
```

**Is this a regression?**

1. **Check rme**: If both have rme < 1%, this is a real regression
2. **Check use case**: If you only do 10,000 gets/sec, who cares?
3. **Check if it matters**: 30M → 28M hz is negligible for most apps

**Action**:

- If rme < 1% AND you do high-frequency gets: investigate
- Otherwise: acceptable trade-off for features added

## Performance Expectations

### Atomic Operations (ns range)

```
signal.read:         ~0.08 microseconds (80 nanoseconds)
signal.write:        ~0.11 microseconds (110 nanoseconds)
storage.get:         ~0.03 microseconds (30 nanoseconds)
storage.set:         ~0.09 microseconds (90 nanoseconds)
```

These are extremely fast. Even millions of operations per second are practical.

### Complex Operations (µs range)

```
effect.create:       ~0.25 microseconds (250 nanoseconds)
subscription:        ~0.30 milliseconds (300 microseconds)
datamap.batch 10:    ~0.019 milliseconds (19 microseconds)
```

Still fast, suitable for high-frequency operations.

### Expensive Operations (ms range)

```
storage.toObject:    ~0.53 milliseconds (serialization)
effect.dispose:      ~0.50 milliseconds (cleanup)
subscription.notify: ~0.19 milliseconds (event distribution)
```

These are slower. Calling thousands of times per second might add up.

## What To Optimize

### Before Optimizing

Ask these questions:

1. **Is it actually slow?**
   - Measure with profiler: `node --inspect app.js`
   - Check if function is in flame graph hot path
   - Measure real application latency, not just benchmarks

2. **Does it matter for my use case?**
   - If operation takes 0.1ms and you do 100/sec: 10ms overhead (acceptable)
   - If operation takes 0.1ms and you do 100,000/sec: 10,000ms overhead (problematic)

3. **Is there a simpler fix?**
   - Batch operations: do 100 at once instead of 100 times
   - Cache results: don't recompute if unchanged
   - Use workers: offload to background thread

### After Profiling

If it's really a bottleneck:

1. **Identify the actual bottleneck** in the library code
2. **Check if it's algorithmic** (O(n²) vs O(n log n))
3. **Optimize the bottleneck** (reduce allocations, improve algorithm, use WASM)
4. **Measure again** to confirm improvement

## References

- [Vitest Benchmarking Documentation](https://vitest.dev/guide/features#benchmarking)
- [Interpreting Benchmark Results](https://easyperf.net/blog/)
- [Percentiles in Performance Testing](https://highscalability.com/blog/2017/2/15/four-tips-for-high-performance-socket-io.html)
- [Statistical Significance](https://en.wikipedia.org/wiki/Statistical_significance)
