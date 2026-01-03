# Architecture Overview

High-level design and architecture of `@data-map/core`.

## Design Philosophy

DataMap is built on three core principles:

1. **Patch-First Mutations**: All writes are expressed as RFC 6902 JSON Patch operations
2. **Path Interoperability**: Seamless use of JSON Pointer (RFC 6901) and JSONPath (RFC 9535)
3. **Reactive Subscriptions**: Fine-grained change notifications with pattern matching

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DataMap<T, Ctx>                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  Read API   │   │  Write API  │   │    Array API        │   │
│  │ get/getAll  │   │ set/setAll  │   │ push/pop/splice/... │   │
│  │   resolve   │   │  map/patch  │   │                     │   │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘   │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Path Resolution Layer                   │   │
│  │          (JSON Pointer ↔ JSONPath detection)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │ Definition  │   │   Patch     │   │   Batch Manager     │   │
│  │  Registry   │   │   Builder   │   │                     │   │
│  │  (getters/  │   │   (RFC      │   │  (groups ops,       │   │
│  │   setters)  │   │    6902)    │   │   defers notify)    │   │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘   │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Data Store (T)                        │   │
│  │              (immutable reference, deep clone)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Subscription Manager                       │   │
│  │         (BloomFilter + pattern matching)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### DataMap Class

The central facade that coordinates all subsystems:

```typescript
class DataMap<T, Ctx> {
	private _data: T;
	private _subscriptionManager: SubscriptionManagerImpl<T, Ctx>;
	private _batchManager: BatchManager;
	private _definitionRegistry: DefinitionRegistry<T, Ctx>;
}
```

**Responsibilities:**

- Maintain the data store
- Route read/write calls through appropriate subsystems
- Coordinate batching and notification lifecycle

### Definition Registry

Manages computed properties and value transformations:

```typescript
class DefinitionRegistry<T, Ctx> {
	private _definitions: Map<string, Definition<T, Ctx>>;

	applyGetter(pointer: string, value: unknown): unknown;
	applySetter(pointer: string, value: unknown): unknown;
	isReadOnly(pointer: string): boolean;
}
```

**Resolution Order:**

1. Check for exact pointer match
2. Expand JSONPath patterns and match
3. Apply most specific matching definition

### Subscription Manager

Handles subscription registration and notification dispatch:

```typescript
class SubscriptionManagerImpl<T, Ctx> {
	private _subscriptions: Map<string, Set<SubscriptionEntry>>;
	private _bloomFilter: BloomFilter;

	subscribe(config: SubscriptionConfig): Subscription;
	notify(pointer: string, event: SubscriptionEvent, info: EventInfo): void;
}
```

**Optimizations:**

- **Bloom Filter**: Fast negative lookup for paths with no subscriptions
- **Pattern Compilation**: Precompiled patterns for efficient matching
- **Dynamic Re-expansion**: Updates pattern matches when structure changes

### Batch Manager

Coordinates batched operations and transactions:

```typescript
class BatchManager {
	private _depth: number;
	private _pendingOps: Operation[];

	begin(): void;
	end(): void;
	rollback(): void;
	isActive(): boolean;
}
```

**Features:**

- Nested batch support (reference counting)
- Operation collection during batch
- Atomic rollback for transactions

### Path System

Handles path detection, compilation, and matching:

```typescript
// Detection
detectPathType(path: string): PathType;

// Compilation
compilePathPattern(path: string): CompiledPattern;

// Matching
matchPath(pattern: CompiledPattern, pointer: string): boolean;
expandPattern(pattern: CompiledPattern, data: T): string[];
```

See [Path System](./path-system.md) for details.

### Patch System

Builds and applies RFC 6902 operations:

```typescript
// Building
buildSetPatch(pointer: string, value: unknown, data: T): Operation[];

// Application
applyOperations(data: T, ops: Operation[]): T;
```

See [Patch System](./patch-system.md) for details.

## Data Flow

### Read Flow

```
get('/user/name')
    │
    ▼
detectPathType() → 'pointer'
    │
    ▼
DefinitionRegistry.applyGetter()
    │
    ├── Has getter? → Execute, return computed value
    │
    └── No getter? → Return raw value from json-p3
    │
    ▼
SubscriptionManager.notify('read')
    │
    ▼
Return value
```

### Write Flow

```
set('/user/name', 'Alice')
    │
    ▼
BatchManager.isActive()?
    │
    ├── Yes → Collect operation, defer
    │
    └── No → Continue
    │
    ▼
DefinitionRegistry.isReadOnly()? → Yes: throw
    │
    ▼
DefinitionRegistry.applySetter()
    │
    ▼
buildSetPatch() → [{ op: 'replace', path: '/user/name', value: 'Alice' }]
    │
    ▼
applyOperations() → new data state
    │
    ▼
SubscriptionManager.notify('patch')
    │
    ▼
Return this (for chaining)
```

### Batch Flow

```
batch((dm) => {
  dm.set('/a', 1);
  dm.set('/b', 2);
})
    │
    ▼
BatchManager.begin() → depth++
    │
    ▼
Execute callback
    │
    ├── set('/a', 1) → collect op, no notify
    │
    └── set('/b', 2) → collect op, no notify
    │
    ▼
BatchManager.end() → depth--
    │
    ├── depth > 0? → Still nested, wait
    │
    └── depth === 0? → Apply all ops, notify once
```

## Immutability Strategy

DataMap maintains immutability through:

1. **Deep Clone on Construction**: Initial data is cloned
2. **Patch Application**: Creates new object references on mutation
3. **Snapshot Cloning**: `getSnapshot()` returns a fresh clone

```typescript
const data = { user: { name: 'Alice' } };
const store = new DataMap(data);

data.user.name = 'Bob';
store.get('/user/name'); // Still 'Alice'
```

## Error Handling

### Strict Mode

```typescript
// Construction
new DataMap(data, { strict: true });

// Per-call override
store.get('/missing', { strict: true }); // throws
store.get('/missing', { strict: false }); // undefined
```

### Error Propagation

| Scenario          | Strict Mode | Non-Strict Mode   |
| ----------------- | ----------- | ----------------- |
| Path not found    | Throws      | Returns undefined |
| Invalid patch     | Throws      | Throws            |
| ReadOnly write    | Throws      | Throws            |
| Setter validation | Throws      | Throws            |

## Performance Considerations

### Path Compilation Caching

Compiled patterns are cached to avoid repeated parsing:

```typescript
const cache = new Map<string, CompiledPattern>();

function compilePathPattern(path: string): CompiledPattern {
	if (!cache.has(path)) {
		cache.set(path, parseAndCompile(path));
	}
	return cache.get(path)!;
}
```

### Bloom Filter for Subscriptions

Fast rejection of paths with no subscribers:

```typescript
if (!bloomFilter.mightContain(pointer)) {
	return; // No possible subscribers
}
// Continue with full pattern matching
```

### Minimal Patch Generation

Patches are optimized to avoid redundant operations:

```typescript
// Setting nested value
store.set('/a/b/c', 1);

// If /a/b exists:
// [{ op: 'add', path: '/a/b/c', value: 1 }]

// If /a doesn't exist:
// [{ op: 'add', path: '/a', value: { b: { c: 1 } } }]
```

## Extension Points

### Custom Definitions

```typescript
const store = new DataMap(data, {
	define: [{ path: '/custom', get: customGetter, set: customSetter }],
});
```

### Subscription Lifecycle

```typescript
store.subscribe({
	path: '$.items[*]',
	on: 'patch',
	priority: -100, // Run early
	filter: (e) => e.previousValue !== e.value,
	fn: handler,
});
```

### Factory Patterns

```typescript
const store = new DataMap(data, {
	define: [(dm) => createDynamicDefinitions(dm)],
});
```

## See Also

- [Path System](./path-system.md)
- [Patch System](./patch-system.md)
- [Subscription System](./subscription-system.md)
