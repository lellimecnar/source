# DataMap API Reference

The `@data-map/*` suite provides a flat, pointer-addressable data store with reactive signals, subscriptions, and computed helpers.

## Packages

- `@data-map/core`: High-level `DataMap` facade
- `@data-map/storage`: Flat pointer store (`FlatStore`)
- `@data-map/signals`: Reactive primitives (`signal`, `computed`, `effect`, `batch`)
- `@data-map/subscriptions`: Pointer + pattern subscription engine
- `@data-map/path`: Flat-store JSONPath querying (`queryFlat`)
- `@data-map/arrays`: Store-backed array helpers (`SmartArray`)
- `@data-map/computed`: Pointer/query computed helpers

## `@data-map/core`

### `DataMap`

High-level facade for flat store with reactive subscriptions.

#### Constructor

```ts
constructor(initial?: T)
```

Creates a new DataMap, optionally populated from a nested object.

#### Data Access

- `get(pointer: Pointer): unknown` - Get value at pointer
- `set(pointer: Pointer, value: unknown): void` - Set value at pointer
- `delete(pointer: Pointer): boolean` - Delete pointer
- `has(pointer: Pointer): boolean` - Check if pointer exists
- `fromObject(obj: T): void` - Replace store with new object
- `keys(prefixOrPath?: string): string[]` - List keys (with optional prefix or JSONPath)

#### Subscriptions

- `subscribe(pathOrPointer: string, cb: (event: SubscribeEvent) => void, options?: SubscribeOptions): Unsubscribe`
  - Auto-detects pointer (starts with `/`) vs JSONPath pattern (starts with `$`)
  - Options: `immediate`, `deep`, `debounce`, `stages`

#### Querying

- `query(path: string): { values: unknown[]; pointers: string[] }` - Execute JSONPath query
- `queryPointers(path: string): string[]` - Get pointers matching JSONPath

#### Computed Values

- `computedPointer<V>(pointer: Pointer)` - Computed based on single pointer
- `computedQuery<V>(path: string)` - Computed based on query results
- `computed<V>(pointers: Pointer[], compute: (...values: unknown[]) => V)` - Computed from multiple pointers

#### Batching & Transactions

- `batch(fn: () => void): void` - Coalesce notifications during batch
- `transaction<R>(fn: () => R): R` - Atomicity with rollback on error

#### Array Helpers

- `push(arrayPointer: Pointer, ...values: unknown[]): number` - Push items
- `pop(arrayPointer: Pointer): unknown` - Remove and return last item
- `shift(arrayPointer: Pointer): unknown` - Remove and return first item
- `unshift(arrayPointer: Pointer, ...values: unknown[]): number` - Add items at start
- `splice(arrayPointer: Pointer, index: number, deleteCount: number, ...items: unknown[]): unknown[]` - Splice array
- `sort(arrayPointer: Pointer, compareFn?: (a: any, b: any) => number): void` - Sort array in-place
- `reverse(arrayPointer: Pointer): void` - Reverse array in-place
- `shuffle(arrayPointer: Pointer): void` - Shuffle array in-place

#### Snapshots

- `snapshot(): Map<string, unknown>` - Get pointer → value snapshot
- `toObject(): unknown` - Reconstruct nested object

## `@data-map/storage`

### `FlatStore`

Flat pointer-addressed store with versioning support.

#### Constructor

```ts
constructor(initial?: unknown)
```

Creates a store, optionally populated from a nested object.

#### Properties

- `size: number` - Number of pointers
- `version: number` - Global change counter
- `globalVersion: number` - Alias for `version` (back-compat)

#### Data Access

- `get(pointer: Pointer): unknown`
- `set(pointer: Pointer, value: unknown): void`
- `delete(pointer: Pointer): boolean`
- `has(pointer: Pointer): boolean`

#### Versioning

- `getVersion(pointer: Pointer): number` - Get version counter for pointer

#### Iteration

- `keys(prefix?: Pointer): IterableIterator<Pointer>` - List pointers (with optional prefix)
- `entries(prefix?: Pointer): IterableIterator<[Pointer, unknown]>` - Iterate pointer/value pairs

#### Bulk Operations

- `setDeep(pointer: Pointer, value: unknown): void` - Set subtree, removing stale keys
- `getObject(pointer: Pointer): unknown` - Reconstruct nested object at pointer

#### Snapshots

- `toObject(): unknown` - Reconstruct entire nested object
- `snapshot(): FlatSnapshot` - Get { data: Map<Pointer, unknown>, arrays: Map<Pointer, ArrayMetadata> }

## `@data-map/signals`

Reactive primitives for dependency tracking and computed values.

### `signal<T>(initial: T): Signal<T>`

Create a reactive signal.

#### Methods

- `value: T` - Get/set signal value (triggers tracking and notifications)
- `peek(): T` - Get value without tracking
- `subscribe(subscriber: (value: T) => void): Unsubscribe` - Subscribe to changes

### `computed<T>(fn: () => T): Computed<T>`

Create a computed value that auto-updates when dependencies change.

#### Methods

- `value: T` - Get computed value (recomputes if dirty)
- `invalidate(): void` - Mark as dirty
- `subscribe(subscriber: (value: T) => void): Unsubscribe` - Subscribe to changes

### `effect(fn: (cleanup?: () => void) => void | (() => void)): EffectHandle`

Create a reactive effect that runs when dependencies change.

#### Returns

- `dispose(): void` - Stop the effect

### `batch(fn: () => void): void`

Coalesce notifications: effects only run once after batch completes.

### Integration APIs

- `getCurrentEffect(): Observer | null` - Get current effect context
- `track(source: DependencySource): void` - Manually track dependency
- `trigger(source: DependencySource): void` - Manually trigger observers
- `untracked<T>(fn: () => T): T` - Run code without tracking

## `@data-map/subscriptions`

Subscription engine with pointer and pattern matching.

### `SubscriptionEngine`

#### Methods

- `subscribePointer(pointer: Pointer, subscriber: Subscriber, options?: SubscriptionOptions): Unsubscribe`
- `subscribePattern(path: string, subscriber: Subscriber, options?: SubscriptionOptions): Unsubscribe`
- `notify(pointer: Pointer, value: unknown, previousValue?: unknown): void` - Notify subscribers
- `getAffected(pointer: Pointer): SubscriptionEvent[]` - Get subscriptions for pointer
- `clear(): void` - Remove all subscriptions
- `size: number` - Number of subscriptions

### `SubscriptionOptions`

```ts
interface SubscriptionOptions {
	immediate?: boolean; // Invoke immediately on subscribe
	deep?: boolean; // Receive descendant pointers (prefix match)
	debounce?: number; // Debounce time (ms) for 'on' stage
	stages?: SubscriptionStage[]; // Defaults to ['on']
}
```

### `SubscriptionEvent`

```ts
interface SubscriptionEvent {
	pointer: Pointer;
	value: unknown;
	previousValue: unknown;
	stage: 'before' | 'on' | 'after';
	cancel: () => void;
}
```

## `@data-map/path`

### `queryFlat(store: FlatStore, path: string): { values: unknown[]; pointers: string[] }`

Execute JSONPath query on flat store with pointer-iterator fast-path for simple queries.

## `@data-map/arrays`

### `SmartArray`

Store-backed array with indirection layer for efficient splicing.

#### Constructor

```ts
constructor(store: ArrayStore, pointer: Pointer)
```

#### Methods

- `length: number` - Array length
- `get(index: number): unknown`
- `push(...values: unknown[]): number` - Return new length
- `pop(): unknown` - Return removed value
- `shift(): unknown` - Return removed value
- `unshift(...values: unknown[]): number` - Return new length
- `splice(index: number, deleteCount: number, ...items: unknown[]): unknown[]` - Return removed items
- `sort(compareFn?: (a: any, b: any) => number): void`
- `reverse(): void`
- `shuffle(rng?: () => number): void`
- `toArray(): unknown[]` - Reconstruct array
- `toPointerMap(): Map<string, unknown>` - Get logical pointer mapping

## `@data-map/computed`

Helper modules for computed values and caching.

### `pointerComputed<T>(host, pointer): { computed: Computed<T>; dispose: () => void }`

Create computed value tracking a single pointer.

### `queryComputed<T>(host, path): { computed: Computed<T>; dispose: () => void }`

Create computed value tracking a query result.

### `multiPointerComputed<T>(host, pointers, compute): { computed: Computed<T>; dispose: () => void }`

Create computed value combining multiple pointers.

### `SignalCache`

Cache for signal-per-pointer mapping.

#### Methods

- `signalFor(pointer: Pointer): Signal<unknown>` - Get/create signal for pointer
- `clearCache(): void` - Dispose all cached signals

---

## Usage Examples

### Basic Store

```ts
import { createDataMap } from '@data-map/core';

const dm = createDataMap({ users: [{ name: 'Alice' }] });

dm.set('/users/0/name', 'Bob');
console.log(dm.get('/users/0/name')); // 'Bob'

dm.subscribe('/users/0/name', (event) => {
	console.log('Changed to:', event.value);
});

dm.set('/users/0/name', 'Charlie'); // Triggers subscription
```

### Computed Values

```ts
const dm = createDataMap({ x: 1, y: 2 });

const { computed: sum } = dm.computed(
	['/x', '/y'],
	(x, y) => Number(x) + Number(y),
);
console.log(sum.value); // 3

dm.set('/x', 10);
console.log(sum.value); // 12 (auto-updated)
```

### Batching

```ts
const dm = createDataMap({});
let notifyCount = 0;

dm.subscribe('/x', () => notifyCount++);

dm.batch(() => {
	dm.set('/x', 1);
	dm.set('/x', 2);
	dm.set('/x', 3);
});

console.log(notifyCount); // 1 (coalesced)
```

### Transactions

```ts
const dm = createDataMap({ x: 1 });

try {
	dm.transaction(() => {
		dm.set('/x', 2);
		throw new Error('failed');
	});
} catch (e) {
	console.log(dm.get('/x')); // 1 (rolled back)
}
```

### JSONPath Queries

```ts
const dm = createDataMap({
	users: [
		{ name: 'Alice', age: 30 },
		{ name: 'Bob', age: 25 },
	],
});

const result = dm.query('$.users[*].name');
console.log(result.pointers); // ['/users/0/name', '/users/1/name']
console.log(result.values); // ['Alice', 'Bob']
```
