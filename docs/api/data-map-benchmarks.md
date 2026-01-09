---
post_title: Data Map Benchmarks
author1: lmiller
post_slug: data-map-benchmarks-api
microsoft_alias: lmiller
featured_image: null
categories: ['API Documentation']
tags: ['data-map', 'benchmarks', 'performance']
ai_note: false
summary: Exhaustive benchmark suite for @data-map/* comparing performance across 25+ adapters and data structures.
post_date: 2024-01-01
---

# Data Map Benchmarks

Exhaustive benchmark suite for [`@data-map/core`](../../packages/data-map/core) and related packages, comparing performance across 25+ library adapters across 8 different categories.

## Run Locally

### All benchmarks

```bash
pnpm --filter @data-map/benchmarks bench:full
```

Output: `results.json` and `REPORT.md`

### Specific suite

```bash
# Comparative suites
pnpm --filter @data-map/benchmarks bench:path           # Path access comparisons
pnpm --filter @data-map/benchmarks bench:signals        # Reactive signals comparisons
pnpm --filter @data-map/benchmarks bench:subscriptions  # PubSub/event emitter comparisons
pnpm --filter @data-map/benchmarks bench:immutable      # Immutable update comparisons
pnpm --filter @data-map/benchmarks bench:state          # State management comparisons

# Run specific benchmark files
pnpm --filter @data-map/benchmarks bench -- --run src/jsonpatch-comparative.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/cloning-comparative.bench.ts
pnpm --filter @data-map/benchmarks bench -- --run src/scale-comprehensive.bench.ts
```

## Benchmark Categories

### 1. Path Access (`src/path-access.bench.ts`)

Compares path-based property access libraries:

**Adapters:** data-map, lodash, dot-prop, dlv+dset, object-path, json-pointer

**Test Scenarios:**

- **Get Operations**: Shallow, deep (5 levels), wide object access
- **Set Operations**: Shallow, deep, creating new paths
- **Has Operations**: Existence checks at various depths
- **Delete Operations**: Removing properties at shallow and deep paths
- **Array Access**: Index-based access and nested array objects
- **Deep Nesting**: 20-level deep path operations
- **Repeated Access**: Cache behavior with 100 repeated operations
- **Mixed Objects**: Complex array+object structures

### 2. Signals (`src/signals-comparative.bench.ts`)

Compares reactive signal library performance:

**Adapters:** data-map, @preact/signals-core, @maverick-js/signals, @vue/reactivity, nanostores, solid-js

**Test Scenarios:**

- **Basic Operations**: Create, read, write, read-write cycle
- **Create Scale**: Creating 100 and 1000 signals
- **Read/Write Scale**: 1000 reads, 1000 writes, 500 read-write cycles
- **Batching**: Batch 100 and 1000 writes, multi-signal batching
- **Computed Values**: Creation, cached reads, dirty recalculation, chaining
- **Diamond Graphs**: Small and medium diamond dependency patterns
- **Deep Chains**: 10, 25, and 50-level computed chains
- **Effects**: Creation, 100 triggers, multiple effects
- **Object Values**: Object and array signal updates

### 3. Subscriptions / PubSub (`src/subscriptions-comparative.bench.ts`)

Compares event emitter and pubsub libraries:

**Adapters:** data-map, mitt, eventemitter3, nanoevents

**Test Scenarios:**

- **Basic Operations**: Bus creation, subscribe/unsubscribe, single emit
- **Listener Scaling**: Emit to 1, 10, 100, 1000 listeners
- **Repeated Emit**: 100x and 1000x emit operations
- **Multiple Events**: 10 and 100 different event types
- **Dynamic Subscription**: Add/remove listeners dynamically
- **Wildcard Support**: Wildcard listeners and mixed patterns
- **Large Payloads**: Emitting large object payloads

### 4. Immutable Updates (`src/immutable-updates.bench.ts`)

Compares immutable update libraries:

**Adapters:** data-map, immer, mutative

**Test Scenarios:**

- **Basic Operations**: Shallow update, deep update (5 levels), array updates, multiple updates
- **Medium Scale**: 100-property objects with single, deep, and multiple updates
- **Large Scale**: 1000-property objects with updates
- **Deep Nesting**: 20-level deep updates
- **Delete Operations**: Shallow, deep, and array element deletion
- **Mixed Operations**: Read-then-write, conditional updates

### 5. State Management (`src/state-management.bench.ts`)

Compares state management libraries:

**Adapters:** data-map, valtio, zustand, jotai

**Test Scenarios:**

- **Basic Operations**: Store creation, get, set, update
- **Subscriptions**: Subscribe, subscribe-unsubscribe, notification
- **Scale**: Batched updates, large state operations, many properties
- **Rapid Updates**: 100 and 1000 rapid updates, interleaved reads
- **Snapshots**: Snapshot creation and serialization

### 6. JSON Patch (`src/jsonpatch-comparative.bench.ts`)

Compares RFC 6902 JSON Patch implementations:

**Adapters:** data-map, fast-json-patch, rfc6902, immutable-json-patch

**Test Scenarios:**

- **Apply Operations**: Simple replace, add, remove, deep patch, mixed operations
- **Scale**: Medium documents (100 properties), large documents (1000 properties)
- **Batch**: Applying 100 operations in sequence
- **Generate Patch**: Diff generation between documents
- **Move and Copy**: Object relocation operations
- **Test Operations**: Conditional patch application

### 7. Cloning (`src/cloning-comparative.bench.ts`)

Compares deep cloning libraries:

**Adapters:** klona, rfdc, structuredClone (native)

**Test Scenarios:**

- **Small Objects**: Flat and nested 5-key objects
- **Medium Objects**: 100-key flat, 50-key nested (3 levels)
- **Large Objects**: 1000-key flat and deeply nested
- **Deep Nesting**: 20-level deep structures
- **Arrays**: Wide arrays (10k elements), arrays of objects (1k)
- **Mixed Types**: Objects with dates, regexes, arrays, nested objects
- **Circular References**: Objects with circular references
- **Repeated Clones**: 100 consecutive clone operations

### 8. Scale & Memory (`src/scale-comprehensive.bench.ts`)

Large dataset operations with memory tracking:

- **Large Object Operations**: Operations on 1000+ key objects
- **Large Array Operations**: Operations on 10000+ element arrays
- **Complex Queries**: JSONPath queries on deep structures
- **Memory Deltas**: Heap usage tracking

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

| Category       | Adapter              | Package / Source          | Status   |
| -------------- | -------------------- | ------------------------- | -------- |
| **Path**       | data-map             | `@data-map/core`          | ✅ Ready |
|                | lodash               | `lodash-es`               | ✅ Ready |
|                | dot-prop             | `dot-prop`                | ✅ Ready |
|                | dlv+dset             | `dlv` + `dset`            | ✅ Ready |
|                | object-path          | `object-path`             | ✅ Ready |
|                | json-pointer         | `json-pointer`            | ✅ Ready |
| **Signals**    | data-map             | `@data-map/core`          | ✅ Ready |
|                | preact               | `@preact/signals-core`    | ✅ Ready |
|                | maverick             | `@maverick-js/signals`    | ✅ Ready |
|                | vue                  | `@vue/reactivity`         | ✅ Ready |
|                | nanostores           | `nanostores`              | ✅ Ready |
|                | solid                | `solid-js`                | ✅ Ready |
| **PubSub**     | data-map             | `@data-map/core`          | ✅ Ready |
|                | mitt                 | `mitt`                    | ✅ Ready |
|                | eventemitter3        | `eventemitter3`           | ✅ Ready |
|                | nanoevents           | `nanoevents`              | ✅ Ready |
| **Immutable**  | data-map             | `@data-map/core`          | ✅ Ready |
|                | immer                | `immer`                   | ✅ Ready |
|                | mutative             | `mutative`                | ✅ Ready |
| **State**      | data-map             | `@data-map/core`          | ✅ Ready |
|                | valtio               | `valtio`                  | ✅ Ready |
|                | zustand              | `zustand`                 | ✅ Ready |
|                | jotai                | `jotai`                   | ✅ Ready |
| **JSON Patch** | data-map             | `@data-map/core`          | ✅ Ready |
|                | fast-json-patch      | `fast-json-patch`         | ✅ Ready |
|                | rfc6902              | `rfc6902`                 | ✅ Ready |
|                | immutable-json-patch | `immutable-json-patch`    | ✅ Ready |
| **Cloning**    | klona                | `klona`                   | ✅ Ready |
|                | rfdc                 | `rfdc`                    | ✅ Ready |
|                | structuredClone      | Native (Node.js built-in) | ✅ Ready |

Total: **28 adapters** across **7 categories**

## Adapter Architecture

All adapters follow a consistent pattern per category for fair benchmarking:

```typescript
// Example: SignalAdapter interface
interface SignalAdapter {
	name: string;
	createSignal<T>(initial: T): unknown;
	read<T>(signal: unknown): T;
	write<T>(signal: unknown, value: T): void;
	createComputed?<T>(fn: () => T): unknown;
	batch?(fn: () => void): void;
	smokeTest(): void; // Validates adapter correctness
}

// Example: PathAdapter interface
interface PathAdapter {
	name: string;
	get<T>(obj: object, path: string): T;
	set<T>(obj: object, path: string, value: T): void;
	has?(obj: object, path: string): boolean;
	delete?(obj: object, path: string): void;
	smokeTest(): void;
}
```

Adapter files are located in `src/adapters/` with the naming convention:
`{category}.{library}.ts` (e.g., `signals.preact.ts`, `path.lodash.ts`)

## Adding New Adapters

1. Create adapter file: `src/adapters/{category}.{library}.ts`
2. Implement the category interface
3. Add smoke test validation
4. Create spec file: `src/adapters/{category}.{library}.spec.ts`
5. Import and register in the benchmark file

Example structure:

```typescript
// src/adapters/signals.example.ts
import type { SignalAdapter } from './signals.types';
import { signal, computed } from 'example-lib';

export const exampleAdapter: SignalAdapter = {
	name: 'example-lib',
	createSignal: (v) => signal(v),
	read: (s) => s.value,
	write: (s, v) => {
		s.value = v;
	},
	createComputed: (fn) => computed(fn),
	smokeTest() {
		const s = this.createSignal(1);
		this.write(s, 2);
		if (this.read(s) !== 2) throw new Error('Smoke test failed');
	},
};
```

## Interpreting Results

Each benchmark reports:

- **ops/sec**: Operations per second (higher is better)
- **mean**: Average time per operation
- **stddev**: Standard deviation (lower = more consistent)
- **samples**: Number of iterations run

Example output:

```
✓ Path Access > Get Operations > shallow (6) 2315ms
   name                  hz      min      max     mean  p75     p99    p995    p999   samples
 · data-map     2,847,203.24  0.0003   0.9012   0.0004  0.0003  0.0005  0.0006  0.0019   1423602
 · lodash       1,523,847.12  0.0005   1.2341   0.0007  0.0006  0.0009  0.0011  0.0025    761924
 · dot-prop     2,103,456.78  0.0004   0.8745   0.0005  0.0004  0.0007  0.0008  0.0020   1051729
```

## Related Documentation

- [@data-map/core API](./data-map.md)
- [JSONPath API](./jsonpath.md)
- [Performance Optimization](../../CONTRIBUTING.md#performance)
