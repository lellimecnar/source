# Building a High-Performance Reactive DataMap Library

A reactive data store combining **O(m) trie-based storage**, **json-p3 for JSONPath**, and an **elegant subscription system** for both static pointers and dynamic paths requires carefully balancing multiple architectural patterns. This specification synthesizes research from major reactive libraries (MobX, Zustand, Jotai, Valtio), database systems (IVM, change streams), and high-performance JavaScript patterns to recommend an optimal design.

The core architecture should use a **segment-based TrieMap** for path storage, a **reverse-index subscription system** with Bloom filters for quick rejection, **Immer-style structural sharing** for atomic batches, and **JIT-compiled JSONPath queries** with incremental evaluation. This combination achieves O(m) path operations, O(1) subscription lookup, and 7-14x faster query execution than interpreted approaches.

## Trie-based storage with JSON Pointer semantics

The foundation uses **path-segment tries** rather than character-based tries. JSON Pointers (RFC 6901) serve as the canonical storage key format because they reference single values and support JSON Patch operations, while JSONPath (RFC 9535) handles query subscriptions that return multiple matches.

**Key semantic differences** drive this dual approach:

| Aspect      | JSON Pointer            | JSONPath               |
| ----------- | ----------------------- | ---------------------- |
| Return type | Single value            | Nodelist (multiple)    |
| Syntax      | `/users/0/name`         | `$.users[*].name`      |
| Wildcards   | None                    | `[*]`, `..`, filters   |
| Best for    | Storage keys, mutations | Subscriptions, queries |

The recommended trie implementation adapts **mnemonist TrieMap** or **ptrie** for path-segment keys. Each JSON Pointer like `/users/123/name` is split into segments `['users', '123', 'name']`, enabling **O(m)** lookups where m equals path depth rather than character count:

```typescript
class SegmentTrie<T> {
	set(segments: string[], value: T): void;
	get(segments: string[]): T | undefined;
	findByPrefix(prefix: string[]): [string[], T][]; // Subtree query
	deleteSubtree(segments: string[]): void;
	*iterateSubtree(segments: string[]): Generator<[string[], T]>;
}
```

**Memory optimization** relies on three strategies. First, **path segment interning** deduplicates common segments like `"users"` or `"profile"` that appear across thousands of paths—Elasticsearch reports "hundreds of GBs of heap savings" from similar interning. Second, **structural sharing** via Immer ensures updates copy only the path from root to modified leaf, achieving O(depth) memory per update rather than O(n) full clones. Third, **radix trie compression** merges single-child nodes, dramatically reducing overhead for sparse trees with long common prefixes.

## Reactive subscription system design

The subscription architecture combines lessons from **MobX** (automatic dependency tracking), **Zustand** (explicit selectors with equality functions), and **Firebase/Firestore** (reverse query matching at scale).

**Two subscription types** require different handling:

1. **Static pointer subscriptions** (`/users/123/name`) use direct registration in a path→subscribers Map with O(1) lookup and notification
2. **Dynamic JSONPath subscriptions** (`$.users[*].name`) require expansion, reverse indexing, and structural change tracking

The **reverse index pattern** from Firebase provides O(1) subscriber lookup on change:

```typescript
// Reverse index: pointer → Set<Subscription>
const reverseIndex = new Map<string, Set<Subscription>>();

// For $.users[*].name, register all expanded paths:
// /users/0/name → [subscription1]
// /users/1/name → [subscription1]
// Plus structural watchers:
// /users → [subscription1]  // For array mutations
```

**Notification batching** follows the pattern proven in MobX and Vue: collect all changes within a synchronous execution block, then notify subscribers once via **microtask scheduling** (queueMicrotask). For visual updates requiring frame synchronization, optionally batch to requestAnimationFrame. React 18 automatic batching demonstrates **40% reduction in render counts** from this approach.

The subscription lifecycle uses explicit cleanup functions (Zustand pattern) rather than relying solely on WeakRefs:

```typescript
interface Subscription {
	id: string;
	query: string | JSONPath;
	compiled: CompiledQuery; // JIT-compiled function
	expandedPaths: Set<string>; // Current matching pointers
	bloom: BloomFilter; // Quick rejection
	callback: (change: ChangeEvent) => void;
	unsubscribe: () => void;
}
```

## Handling wildcard and filter subscriptions

Dynamic subscriptions with wildcards like `$.users[*].name` or filters like `[?(@.active == true)]` present the primary architectural challenge. The solution combines **eager expansion** with **structural change tracking**.

At subscription time, evaluate the JSONPath against current data to produce a **subscription manifest**:

```typescript
{
  query: "$.users[*].name",
  expandedPaths: ["/users/0/name", "/users/1/name", "/users/2/name"],
  structuralDependencies: ["/users"],  // Watch for array mutations
  filterCache: null  // For filter expressions: { "/users/0": true, "/users/1": false }
}
```

When data changes, the **change processor** follows this algorithm:

1. **Quick rejection via Bloom filter**: Test `bloom.mightContain(changedPath)` for O(k) membership check where k equals hash function count
2. **Reverse index lookup**: Get candidate subscriptions in O(1) from `reverseIndex.get(changedPath)`
3. **Structural change detection**: If the change modifies array length or adds/removes object keys at a watched structural path, trigger **re-expansion** of affected wildcard queries
4. **Incremental evaluation**: For filter expressions, only re-evaluate the filter predicate for the specific changed item, not all items

**Filter expression optimization** caches predicate results per-item. For `[?(@.active == true)]`, maintain a Map of `/users/0` → `true`, `/users/1` → `false`. When `/users/0/active` changes, only re-evaluate that one predicate and update the cached result.

Re-expansion on structural changes follows the Firebase "reverse query matcher" pattern: when `/users` changes structurally (array push/pop/splice), find all subscriptions with `/users` in their structuralDependencies, re-run their JSONPath queries to get new expanded paths, diff against previous expansions, and emit appropriate added/removed notifications.

## Atomic batch operations and structural sharing

Transactions require **snapshot isolation** with automatic rollback on failure. The recommended approach combines Immer's structural sharing with the TanStack Query optimistic update pattern:

```typescript
interface Transaction {
	snapshot: State; // COW snapshot for rollback
	pendingPatches: Patch[]; // JSON Patch operations
	inversePatches: Patch[]; // For undo capability
	commit(): void;
	rollback(): void;
}

function transaction<T>(store: DataMap, fn: (draft: Draft) => T): T {
	const snapshot = store.getSnapshot();
	try {
		const [result, patches, inversePatches] = produce(store.state, fn);
		store.applyPatches(patches);
		store.notifySubscribers(patches);
		return result;
	} catch (error) {
		store.restoreSnapshot(snapshot);
		throw error;
	}
}
```

**Immer integration** provides the optimal balance: **2-3x slower** than hand-written reducers but with dramatically better developer experience and automatic structural sharing. For hot paths requiring maximum performance, the **Mutative** library offers **10-17x faster** performance than Immer with a compatible API.

The **setAll/getAll atomic operations** leverage Immer's batch capability:

```typescript
setAll(entries: [string, unknown][]): void {
  this.transaction(draft => {
    for (const [pointer, value] of entries) {
      setValueAtPointer(draft, pointer, value);
    }
  });
  // Single notification after all updates
}
```

For undo/redo capability, the **command pattern with inverse patches** is more memory-efficient than full snapshots. Immer's `enablePatches()` provides inverse patches automatically, enabling O(operation-size) memory per undo step rather than O(state-size).

## JSONPath query optimization strategies

Query performance depends critically on **JIT compilation**. The @jsonjoy.com/json-path library demonstrates the impact:

| Approach              | Performance            |
| --------------------- | ---------------------- |
| JIT-compiled query    | **14,514,444 ops/sec** |
| Pre-parsed evaluation | 3,702,448 ops/sec      |
| Parse each time       | 2,147,839 ops/sec      |
| jsonpath-plus         | 1,916,578 ops/sec      |

**Pre-compilation** should happen at subscription registration, amortizing parse cost across potentially millions of evaluations:

```typescript
import { JsonPathCodegen } from '@jsonjoy.com/json-path';

function subscribe(jsonPath: string, callback: Callback): Subscription {
	const compiled = JsonPathCodegen.compile(jsonPath); // Once
	// Use compiled(data) for all future evaluations
}
```

**Incremental evaluation** borrows from database Incremental View Maintenance (IVM). Rather than re-running full queries on every change, compute deltas:

1. For simple wildcard queries like `$.users[*].name`, track expanded paths and only check if the changed path matches the pattern
2. For filter queries, cache filter results per-item and only re-evaluate affected items
3. Use **partial tree traversal** to skip subtrees that cannot possibly match—if a query targets `/users`, skip changes under `/settings` entirely

The **json-p3 library** is recommended for its RFC 9535 compliance, zero dependencies, and crucial `node.toPointer()` method that converts JSONPath results to JSON Pointers for storage indexing:

```typescript
import { query } from 'json-p3';

const nodes = query('$.users[?@.active == true].name', data);
for (const node of nodes) {
	const pointer = node.toPointer(); // Convert to /users/0/name
	reverseIndex.get(pointer).add(subscription);
}
```

## Cross-platform architecture and build configuration

The library should follow the **TanStack Query pattern**: a platform-agnostic core package with optional framework adapters.

```
datamap/
├── packages/
│   ├── core/           # Pure TypeScript, no platform dependencies
│   ├── react/          # React hooks adapter
│   └── worker/         # Web Worker / worker_threads adapter
├── package.json
├── tsup.config.ts
└── turbo.json
```

The **package.json exports** configuration ensures correct resolution across environments:

```json
{
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"import": "./dist/index.js",
			"require": "./dist/index.cjs"
		},
		"./worker": {
			"types": "./dist/worker.d.ts",
			"node": "./dist/worker-node.js",
			"browser": "./dist/worker-browser.js",
			"default": "./dist/worker-browser.js"
		}
	},
	"sideEffects": false
}
```

**tsup** provides the optimal build configuration for libraries—simpler than Vite library mode with excellent defaults:

```typescript
export default defineConfig({
	entry: ['src/index.ts', 'src/worker.ts'],
	format: ['cjs', 'esm'],
	dts: true,
	splitting: true,
	treeshake: true,
	target: 'es2020',
});
```

For **worker thread support**, the observable-webworker pattern enables offloading expensive JSONPath evaluations:

```typescript
// Main thread
const result = await fromWorkerPool<QueryInput, QueryResult>(
	() => new Worker(new URL('./query.worker', import.meta.url)),
	[{ query: '$.users[*]', data }],
);
```

Environment detection uses package.json **#imports** for clean platform-specific code:

```json
{
	"imports": {
		"#platform": {
			"node": "./src/platform-node.js",
			"browser": "./src/platform-browser.js"
		}
	}
}
```

## Performance characteristics and benchmarks

Based on benchmark data, expect these performance characteristics:

**Data structure selection** significantly impacts performance:

| Structure    | Insert | Lookup | Delete | Best for            |
| ------------ | ------ | ------ | ------ | ------------------- |
| Segment Trie | O(m)   | O(m)   | O(m)   | Path-based storage  |
| Map          | O(1)   | O(1)   | O(1)   | Reverse index       |
| Object       | O(1)\* | O(1)   | Slow   | Static schemas only |

\*Map is **1.7x faster** for string key lookup and **3x faster** for writes than Object with dynamic keys. Object's `delete` operator is notoriously slow—avoid for dynamic collections.

**Subscription notification strategies**:

| Strategy              | Latency      | Rendering impact       |
| --------------------- | ------------ | ---------------------- |
| Synchronous           | Immediate    | Blocks paint           |
| queueMicrotask        | Same turn    | May block if excessive |
| requestAnimationFrame | ~16ms        | Frame-synchronized     |
| setTimeout            | ~4ms minimum | Spread across turns    |

Recommend **queueMicrotask** for data notifications (high priority, non-blocking) and optional **RAF** batching for UI-bound subscribers.

**Immutable update overhead**:

| Approach      | Relative speed           | Recommendation             |
| ------------- | ------------------------ | -------------------------- |
| Manual spread | 1x baseline              | Error-prone                |
| Immer         | 2-3x slower              | Default choice             |
| Mutative      | 10-17x faster than Immer | Performance-critical paths |

For a store with **50,000 items** updating **5,000**, Immer adds measurable overhead but provides no-op detection that can actually be faster than manual reducers by avoiding unnecessary re-renders.

## Recommended architecture summary

```
┌────────────────────────────────────────────────────────────────┐
│                         DataMap API                             │
│  get(pointer), set(pointer, value), subscribe(path, callback)  │
└────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│ SegmentTrie   │    │ Subscription        │    │ Transaction     │
│ (Path Storage)│    │ Manager             │    │ Manager         │
│               │    │                     │    │                 │
│ • O(m) CRUD   │    │ • JIT compilation   │    │ • COW snapshots │
│ • Prefix query│    │ • Reverse index     │    │ • Immer patches │
│ • Subtree ops │    │ • Bloom filters     │    │ • Auto-rollback │
└───────────────┘    │ • Microtask batch   │    └─────────────────┘
                     └─────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│ json-p3       │    │ Path Intern Pool    │    │ Result Cache    │
│ (JSONPath)    │    │ (Memory opt)        │    │ (Query results) │
└───────────────┘    └─────────────────────┘    └─────────────────┘
```

This architecture achieves:

- **O(m)** path operations via segment trie
- **O(1)** subscription lookup via reverse index
- **7-14x** faster queries via JIT compilation
- **Automatic structural sharing** via Immer
- **Elegant API** supporting both pointers (`/users/0/name`) and paths (`$.users[*].name`)

The key insight is treating JSON Pointer as the canonical storage format while JSONPath serves as the query/subscription DSL, with bidirectional conversion via json-p3's `toPointer()` method enabling efficient subscription expansion and reverse indexing.
