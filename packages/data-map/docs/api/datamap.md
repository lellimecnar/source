# DataMap API Reference

Complete API documentation for the `DataMap` class.

## Constructor

```typescript
new DataMap<T = unknown, Ctx = unknown>(
  initialValue: T,
  options?: DataMapOptions<T, Ctx>
)
```

### Parameters

| Parameter      | Type                     | Description                                |
| -------------- | ------------------------ | ------------------------------------------ |
| `initialValue` | `T`                      | Initial data. Deep cloned on construction. |
| `options`      | `DataMapOptions<T, Ctx>` | Optional configuration.                    |

### Options

```typescript
interface DataMapOptions<T, Ctx> {
	strict?: boolean; // Throw on invalid operations (default: false)
	context?: Ctx; // Context passed to handlers
	define?: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[];
	subscribe?: SubscriptionConfig<T, Ctx>[];
}
```

### Example

```typescript
const store = new DataMap(
	{ user: { name: 'Alice' } },
	{
		strict: true,
		context: { apiUrl: 'https://api.example.com' },
	},
);
```

---

## Properties

### `context`

```typescript
get context(): Ctx | undefined
```

Returns the context object passed at construction.

```typescript
const store = new DataMap(data, { context: { key: 'value' } });
store.context; // { key: 'value' }
```

---

## Read Methods

### `get(pathOrPointer, options?)`

```typescript
get(pathOrPointer: string, options?: CallOptions): unknown
```

Returns a single value at the specified path.

| Parameter        | Type      | Description                                       |
| ---------------- | --------- | ------------------------------------------------- |
| `pathOrPointer`  | `string`  | JSON Pointer or JSONPath                          |
| `options.strict` | `boolean` | Override strict mode                              |
| `options.clone`  | `boolean` | (default: `false`) Return deep clone of the value |

**Returns:** The value, or `undefined` if not found (non-strict mode).

**Throws:** In strict mode when path not found.

**Performance Note:** By default (`clone: false`), returns a direct reference into the current state. Do not mutate returned values unless you clone them first or set `clone: true`.

```typescript
store.get('/user/name'); // 'Alice' (reference)
store.get('$.user.name'); // 'Alice' (reference)
store.get('/missing'); // undefined
store.get('/missing', { strict: true }); // throws
store.get('/user', { clone: true }); // Deep cloned { name: 'Alice' }
```

---

### `getAll(pathOrPointer, options?)`

```typescript
getAll(pathOrPointer: string, options?: CallOptions): unknown[]
```

Returns all values matching the path.

```typescript
store.getAll('$.users[*].name'); // ['Alice', 'Bob']
store.getAll('/user/name'); // ['Alice']
store.getAll('$.missing'); // []
```

---

### `resolve(pathOrPointer, options?)`

```typescript
resolve(pathOrPointer: string, options?: CallOptions): ResolvedMatch[]
```

Returns detailed match information.

```typescript
interface ResolvedMatch {
	readonly pointer: string;
	readonly value: unknown;
	readonly readOnly?: boolean;
	readonly lastUpdated?: number;
	readonly previousValue?: unknown;
	readonly type?: string;
}
```

```typescript
const matches = store.resolve('$.users[*].name');
// [
//   { pointer: '/users/0/name', value: 'Alice' },
//   { pointer: '/users/1/name', value: 'Bob' }
// ]
```

---

### `getSnapshot()`

```typescript
getSnapshot(): T
```

Returns a deep clone of the entire data structure.

```typescript
const snapshot = store.getSnapshot();
// Safe to modify - won't affect store
```

---

### `toJSON()`

```typescript
toJSON(): T
```

Equivalent to `getSnapshot()`. Used by `JSON.stringify()`.

```typescript
JSON.stringify(store); // Works via toJSON()
```

---

### `peek(pointer)`

```typescript
peek(pointer: string): unknown
```

Internal read without triggering any subscriptions. Bypasses all notification stages and definition getters.

| Parameter | Type     | Description                       |
| --------- | -------- | --------------------------------- |
| `pointer` | `string` | JSON Pointer only (not JSONPath). |

**Returns:** The raw value at the pointer, or `undefined` if not found.

**Use case:** When you need to read data inside a subscription handler without triggering infinite loops.

```typescript
// Inside a subscription handler
const rawValue = store.peek('/user/name');
```

> **Note:** `peek()` does not apply definition getters - it returns the raw stored value.

---

## Write Methods

### `set(pathOrPointer, value, options?)`

```typescript
set(
  pathOrPointer: string,
  value: unknown | ((current: unknown) => unknown),
  options?: CallOptions
): this
```

Sets a value at the specified path. Returns `this` for chaining.

```typescript
store.set('/name', 'Bob');
store.set('/count', (n) => n + 1);
store.set('/deep/nested/path', 'value'); // Creates intermediates
```

#### `set.toPatch()`

```typescript
set.toPatch(pathOrPointer: string, value: unknown, options?: CallOptions): Operation[]
```

Returns patch operations without applying.

```typescript
const ops = store.set.toPatch('/name', 'Bob');
// [{ op: 'replace', path: '/name', value: 'Bob' }]
```

---

### `setAll(pathOrPointer, value, options?)`

```typescript
setAll(
  pathOrPointer: string,
  value: unknown | ((current: unknown) => unknown),
  options?: CallOptions
): this
```

Sets value at all matching paths.

```typescript
store.setAll('$.users[*].active', true);
store.setAll('$.items[*].price', (p) => p * 1.1);
```

#### `setAll.toPatch()`

```typescript
setAll.toPatch(pathOrPointer: string, value: unknown, options?: CallOptions): Operation[]
```

---

### `map(pathOrPointer, mapperFn, options?)`

```typescript
map(
  pathOrPointer: string,
  mapperFn: (value: unknown, pointer: string) => unknown,
  options?: CallOptions
): this
```

Transforms all matching values with the mapper function.

```typescript
store.map('$.users[*].name', (name) => name.toUpperCase());
```

#### `map.toPatch()`

```typescript
map.toPatch(
  pathOrPointer: string,
  mapperFn: (value: unknown, pointer: string) => unknown,
  options?: CallOptions
): Operation[]
```

---

### `patch(ops, options?)`

```typescript
patch(ops: Operation[], options?: CallOptions): this
```

Applies RFC 6902 patch operations.

```typescript
store.patch([
	{ op: 'replace', path: '/name', value: 'Bob' },
	{ op: 'add', path: '/age', value: 30 },
]);
```

#### `patch.toPatch()`

```typescript
patch.toPatch(ops: Operation[]): Operation[]
```

Returns the ops unchanged (identity function).

---

## Array Methods

### `push(pathOrPointer, ...items)`

```typescript
push(pathOrPointer: string, ...items: unknown[]): this
```

Appends items to array. Creates array if missing.

```typescript
store.push('/items', 4, 5, 6);
```

#### `push.toPatch()`

```typescript
push.toPatch(pathOrPointer: string, ...items: unknown[]): Operation[]
```

---

### `pop(pathOrPointer)`

```typescript
pop(pathOrPointer: string): unknown
```

Removes and returns the last item.

```typescript
const last = store.pop('/items');
```

#### `pop.toPatch()`

```typescript
pop.toPatch(pathOrPointer: string): Operation[]
```

Returns the remove operation without applying.

---

### `shift(pathOrPointer)`

```typescript
shift(pathOrPointer: string): unknown
```

Removes and returns the first item.

```typescript
const first = store.shift('/items');
```

#### `shift.toPatch()`

```typescript
shift.toPatch(pathOrPointer: string): Operation[]
```

Returns the remove operation without applying.

---

### `unshift(pathOrPointer, ...items)`

```typescript
unshift(pathOrPointer: string, ...items: unknown[]): this
```

Inserts items at the beginning.

```typescript
store.unshift('/items', 0, 1);
```

#### `unshift.toPatch()`

```typescript
unshift.toPatch(pathOrPointer: string, ...items: unknown[]): Operation[]
```

---

### `splice(pathOrPointer, start, deleteCount?, ...items)`

```typescript
splice(
  pathOrPointer: string,
  start: number,
  deleteCount?: number,
  ...items: unknown[]
): unknown[]
```

Removes and/or inserts items. Returns removed items.

```typescript
const removed = store.splice('/items', 1, 2, 'a', 'b');
```

#### `splice.toPatch()`

```typescript
splice.toPatch(
  pathOrPointer: string,
  start: number,
  deleteCount?: number,
  ...items: unknown[]
): Operation[]
```

---

### `sort(pathOrPointer, compareFn?)`

```typescript
sort(
  pathOrPointer: string,
  compareFn?: (a: unknown, b: unknown) => number
): this
```

Sorts the array.

```typescript
store.sort('/numbers');
store.sort('/users', (a, b) => a.age - b.age);
```

#### `sort.toPatch()`

```typescript
sort.toPatch(pathOrPointer: string, compareFn?: (a: unknown, b: unknown) => number): Operation[]
```

---

### `shuffle(pathOrPointer)`

```typescript
shuffle(pathOrPointer: string): this
```

Randomly reorders the array.

```typescript
store.shuffle('/deck');
```

#### `shuffle.toPatch()`

```typescript
shuffle.toPatch(pathOrPointer: string): Operation[]
```

---

## Subscription Methods

### `subscribe(config)`

```typescript
subscribe(config: SubscriptionConfig<T, Ctx>): Subscription
```

Registers a subscription. See [Subscription Types](./subscriptions.md) for details.

```typescript
const sub = store.subscribe({
	path: '/user/name',
	on: 'patch',
	fn: (value, event) => console.log(value),
});

sub.unsubscribe(); // Cleanup
```

---

## Batch Methods

### `batch(fn)`

```typescript
batch<R>(fn: (dm: this) => R): R
```

Groups operations. Notifications fire after batch completes.

```typescript
const result = store.batch((dm) => {
	dm.set('/a', 1);
	dm.set('/b', 2);
	return 'done';
});
```

---

### `transaction(fn)`

```typescript
transaction<R>(fn: (dm: this) => R): R
```

Like `batch()` but rolls back on error.

```typescript
try {
	store.transaction((dm) => {
		dm.set('/value', 10);
		throw new Error('Rollback!');
	});
} catch {
	// Data unchanged
}
```

---

## Comparison Methods

### `equals(other)`

```typescript
equals(other: DataMap<T, Ctx> | T): boolean
```

Deep equality comparison.

```typescript
store.equals(otherStore); // true/false
store.equals({ a: 1 }); // Compare with plain object
```

---

### `extends(partial)`

```typescript
extends(other: Partial<T>): boolean
```

Check if data contains the partial structure.

```typescript
store.extends({ user: { name: 'Alice' } }); // true if matches
```

---

## Utility Methods

### `clone(options?)`

```typescript
clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx>
```

Creates an independent copy with optionally different options.

```typescript
const copy = store.clone();
const strictCopy = store.clone({ strict: true });
```

---

## Types

### `CallOptions`

```typescript
interface CallOptions {
	strict?: boolean;
}
```

### `Operation`

RFC 6902 patch operation:

```typescript
type Operation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };
```

### `PathType`

```typescript
type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';
```

---

## See Also

- [Types & Interfaces](./types.md)
- [Subscription Types](./subscriptions.md)
- [Definition Types](./definitions.md)
