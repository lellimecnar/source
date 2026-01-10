## @data-map Performance Audit 2026 — Resolution

### Summary

This document tracks the concrete code changes applied to address the January 2026 performance audit findings for `@data-map/*`.

### Completed Fixes

- wideGet catastrophe: batch materialization in `@data-map/path` (`queryFlat` simple-path expansion)
- toObject memoization: version-based caching in `@data-map/storage` (`FlatStore.toObject`)
- signal read overhead: inline observer tracking in `@data-map/signals` (`Signal.value`)
- subscription batching overhead: swap-buffer drain to avoid snapshot allocation (`NotificationBatcher`)
- descendant checks: prefix-index-based subtree sizing to avoid linear scans (`PrefixIndex.subtreeSize`)

### Validation

Run:

```bash
pnpm --filter @data-map/benchmarks bench
```

Compare these files:

- `packages/data-map/benchmarks/baseline-pre-optimization.json`
- `packages/data-map/benchmarks/baseline-post-optimization.json`

### Notes

Benchmarks are sensitive to CPU frequency scaling and background load; compare multiple runs and focus on order-of-magnitude deltas.
