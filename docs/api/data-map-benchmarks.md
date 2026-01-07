---
post_title: Data Map Benchmarks
author1: lmiller
post_slug: data-map-benchmarks-api
microsoft_alias: lmiller
featured_image: null
categories: ['API Documentation']
tags: ['data-map', 'benchmarks', 'performance']
ai_note: false
summary: Benchmark suite for @data-map/core comparing performance across 14+ adapters and data structures.
post_date: 2024-01-01
---

# Data Map Benchmarks

Comprehensive benchmark suite for [`@data-map/core`](../../packages/data-map/core) comparing performance across 14 different library adapters and use cases.

## Run Locally

### All benchmarks

```bash
pnpm --filter @data-map/benchmarks bench:full
```

Output: `results.json` and `REPORT.md`

### Specific suite

```bash
pnpm --filter @data-map/benchmarks bench -- --run src/path-access.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/mutations.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/json-patch.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/array-operations.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/batch-operations.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/subscriptions.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/computed.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/scale.bench.ts
```

## What's Measured

### Path Access (`src/path-access.bench.ts`)

Compares `.get()` performance:

- **Small object**: 10-key object, 2-level nesting
- **Medium nested**: 20-key object, 3-level nesting
- **Deep chain**: 10-level nested structure
- **Array index**: Accessing array element by index

Adapters: DataMap, lodash-es, dot-prop, dlv/dset, @jsonpath/raw

### Mutations (`src/mutations.bench.ts`)

Compares `.set()` and immutable update performance:

- **Shallow mutable**: Set single property, return object
- **Shallow immutable**: Set with structural cloning
- **Deep mutable**: Nested set operation
- **Deep immutable**: Nested set with full cloning

Adapters: DataMap, lodash-es, dot-prop, dlv/dset, mutative, immer

### JSON Patch (`src/json-patch.bench.ts`)

Applies 10 JSON Patch (RFC 6902) operations:

- `add`, `replace`, `remove`, `move`, `copy`

Adapters: fast-json-patch, rfc6902, immutable-json-patch

### Array Operations (`src/array-operations.bench.ts`)

DataMap-specific array mutations:

- **Push**: Add item to array
- **Set Index**: Update array element
- **Pop**: Remove last item

Adapter: DataMap only (method availability)

### Batch Operations (`src/batch-operations.bench.ts`)

Multi-item updates:

- **100 sequential sets**: Loop calling `.set()` 100 times
- **setAll**: Batch update entire object/array with wildcard path

Adapter: DataMap only

### Subscriptions (`src/subscriptions.bench.ts`)

Listener performance with state changes:

- **Single subscriber**: One listener, 100 updates
- **Multiple subscribers**: 10 listeners, 10 updates each

Adapters: DataMap, valtio, zustand

### Computed/Definitions (`src/computed.bench.ts`)

Dependent value computation:

- **Define 50 computed**: Create 50 dependent definitions
- **Multiple dependent**: Chain of dependent definitions with updates

Adapter: DataMap only (feature availability)

### Scale (`src/scale.bench.ts`)

Large dataset operations with memory deltas:

- **Large object set**: Set value on 1000-key object
- **Large array push**: Push to array with 10,000 items
- **Large JSONPath query**: Complex JSONPath on deep structure

Adapters: DataMap, @jsonpath/\*, klona, rfdc (cloning baselines)

## Data Generation

All benchmarks use **seeded deterministic RNG** (xorshift32) for reproducibility:

- **Small datasets**: 10-20 keys, 2-3 nesting levels
- **Medium datasets**: 50 keys, 4 nesting levels
- **Large datasets**: 1000+ keys, deep nesting

Fixture generation options: `createSeededRng()`, `generateWideObject()`, `generateDeepObject()`, `generateWideArray()`, `generateMixedData()`

## Memory Reporting

Scale benchmarks include heap delta measurement (`performance.memory`):

- Memory snapshot before operation
- Memory snapshot after operation
- Delta calculation for GC-adjusted comparison

Note: Heap values vary by runtime; focus on relative deltas across adapters.

## CI Integration

Benchmarks run automatically:

- **On demand**: GitHub Actions workflow dispatch (Actions tab)
- **On master push**: Automatically triggered on main branch updates

Results uploaded as artifacts with 7-day retention.

See: [Workflow configuration](../../.github/workflows/benchmarks-data-map.yml)

## Adapter Coverage

Supported adapters (14 total):

| Category        | Adapters                                       |
| --------------- | ---------------------------------------------- |
| **Data Map**    | DataMap (primary subject)                      |
| **Path Access** | lodash-es, dot-prop, dlv/dset, @jsonpath/raw   |
| **Mutations**   | mutative, immer                                |
| **JSON Patch**  | fast-json-patch, rfc6902, immutable-json-patch |
| **Reactive**    | valtio, zustand                                |
| **Cloning**     | klona, rfdc                                    |

Access via `getAllAdapters()` in `src/adapters/index.ts`
