# @jsonpath/benchmarks

Benchmarks for JSONPath + JSON Pointer + JSON Patch + JSON Merge Patch libraries.

## Overview

This package provides comprehensive, reproducible benchmarks comparing `@jsonpath/*` against:

- **JSONPath**: `jsonpath`, `jsonpath-plus`, `json-p3`
- **JSON Pointer (RFC 6901)**: `@jsonpath/pointer`, `json-pointer`
- **JSON Patch (RFC 6902)**: `@jsonpath/patch`, `fast-json-patch`, `rfc6902`
- **JSON Merge Patch (RFC 7386)**: `@jsonpath/merge-patch`, `json-merge-patch`

## Benchmarks Included

- **query-fundamentals.bench.ts** - Basic path access, wildcards, recursive descent
- **filter-expressions.bench.ts** - Comparison, boolean, logical, and arithmetic filters
- **scale-testing.bench.ts** - Performance at various dataset sizes
- **compilation-caching.bench.ts** - Compiled vs interpreted query execution
- **output-formats.bench.ts** - Value vs path output performance
- **pointer-rfc6901.bench.ts** - JSON Pointer resolution performance
- **patch-rfc6902.bench.ts** - JSON Patch application performance
- **merge-patch-rfc7386.bench.ts** - JSON Merge Patch apply/generate performance
- **streaming-memory.bench.ts** - Streaming benefits and memory usage
- **advanced-features.bench.ts** - Suite-specific features: transform, QuerySet, secureQuery
- **browser/index.bench.ts** - Subset of critical benchmarks for browser environments

## Run

From repo root:

- `pnpm --filter @jsonpath/benchmarks bench` - Run all benchmarks
- `pnpm --filter @jsonpath/benchmarks bench:query` - Query benchmarks only
- `pnpm --filter @jsonpath/benchmarks bench:pointer` - Pointer benchmarks only
- `pnpm --filter @jsonpath/benchmarks bench:patch` - Patch benchmarks only
- `pnpm --filter @jsonpath/benchmarks bench:full` - Generate JSON output
- `pnpm --filter @jsonpath/benchmarks bench:browser` - Browser benchmarks (Chromium)
- `pnpm --filter @jsonpath/benchmarks bench:browser:chromium` - Browser (Chromium)
- `pnpm --filter @jsonpath/benchmarks bench:browser:firefox` - Browser (Firefox)
- `pnpm --filter @jsonpath/benchmarks bench:browser:webkit` - Browser (WebKit)
- `pnpm --filter @jsonpath/benchmarks exec vitest run src/performance-regression.spec.ts` - Run performance regression checks

## Performance Regression Testing

A dedicated Vitest spec (`src/performance-regression.spec.ts`) provides **warn-only** performance regression detection:

- **Baselines**: Defined in `baseline.json` with target ops/sec for key operations
- **Checks**: Simple query (300k), filter query (80k), recursive query (50k)
- **Warnings**: Emitted when actual performance drops >10% below baseline
- **CI Behavior**: Tests always pass (never block CI), warnings visible in logs

This allows tracking performance trends without CI failures while optimizations are ongoing.

## Architecture

### Adapters

All libraries are wrapped in a normalized adapter layer (`src/adapters/`) to handle API differences:

- `QueryAdapter` - JSONPath query engines
- `PointerAdapter` - JSON Pointer implementations
- `PatchAdapter` - JSON Patch implementations
- `MergePatchAdapter` - JSON Merge Patch implementations

Each adapter has a smoke test to verify correct operation.

### Fixtures

Standardized datasets and query catalogs in `src/fixtures/`:

- Data generators for various sizes/shapes (arrays, deep nesting, wide objects)
- Pre-generated datasets for consistent comparisons
- Query catalogs organized by feature category

## Notes

- Benchmarks are authored with `vitest bench`
- Adapter layer normalizes API differences for fair comparison
- Feature matrices track which adapters support specific capabilities
- Browser tests use Playwright for real browser environments

## Follow-ups & Gaps

- Feature matrix refinement based on confirmed adapter capabilities
- Results parsing automation for Vitest JSON reporter output
- Performance regression tracking integration
