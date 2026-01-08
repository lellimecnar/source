# Types & Interfaces

Core TypeScript types and interfaces for `@data-map/core`.

## Core Types

### `DataMapOptions<T, Ctx>`

Configuration options for DataMap construction.

```typescript
interface DataMapOptions<T, Ctx> {
	/**
	 * When true, throws errors for invalid operations.
	 * When false, invalid operations are silently ignored.
	 * @default false
	 */
	strict?: boolean;

	/**
	 * Context object available to subscribers and definitions.
	 */
	context?: Ctx;

	/**
	 * Initial definitions to register.
	 */
	define?: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[];

	/**
	 * Initial subscriptions to register.
	 */
	subscribe?: SubscriptionConfig<T, Ctx>[];
}
```

**Example:**

```typescript
interface AppContext {
	userId: string;
	apiClient: ApiClient;
}

const store = new DataMap<UserData, AppContext>(initialData, {
	strict: true,
	context: { userId: '123', apiClient: new ApiClient() },
	define: [{ path: '/fullName', get: (data) => `${data.first} ${data.last}` }],
	subscribe: [
		{ path: '/user', on: 'patch', fn: (value) => console.log(value) },
	],
});
```

---

### `CallOptions`

Options that can be passed to individual method calls.

```typescript
interface CallOptions {
	/**
	 * Override the instance's strict mode for this call.
	 */
	strict?: boolean;
}
```

**Example:**

```typescript
// Instance is non-strict, but this call throws on missing
const value = store.get('/required/value', { strict: true });

// Instance is strict, but this call returns undefined
const optional = store.get('/maybe/exists', { strict: false });
```

---

### `ResolvedMatch`

Detailed information about a matched path.

```typescript
interface ResolvedMatch {
	/**
	 * JSON Pointer to the matched value.
	 */
	readonly pointer: string;

	/**
	 * The matched value.
	 */
	readonly value: unknown;

	/**
	 * True if the path is defined as read-only.
	 */
	readonly readOnly?: boolean;

	/**
	 * Timestamp of last update (if tracked).
	 */
	readonly lastUpdated?: number;

	/**
	 * Previous value before the current one.
	 */
	readonly previousValue?: unknown;

	/**
	 * Custom type identifier from definitions.
	 */
	readonly type?: string;
}
```

**Example:**

```typescript
const matches = store.resolve('$.users[*]');

matches.forEach((match) => {
	console.log(`Path: ${match.pointer}`);
	console.log(`Value: ${JSON.stringify(match.value)}`);
	console.log(`Read-only: ${match.readOnly}`);
});
```

---

### `PathType`

Identifies the type of path syntax used.

```typescript
type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';
```

| Type               | Description               | Example           |
| ------------------ | ------------------------- | ----------------- |
| `pointer`          | RFC 6901 JSON Pointer     | `/users/0/name`   |
| `relative-pointer` | RFC 6901 Relative Pointer | `0/name`          |
| `jsonpath`         | RFC 9535 JSONPath         | `$.users[0].name` |

---

## Operation Types

### `Operation`

RFC 6902 JSON Patch operation.

```typescript
type Operation =
	| AddOperation
	| RemoveOperation
	| ReplaceOperation
	| MoveOperation
	| CopyOperation
	| TestOperation;
```

### `AddOperation`

```typescript
interface AddOperation {
	op: 'add';
	path: string;
	value: unknown;
}
```

Adds a value at the target path. If the path points to an array index, inserts at that position.

```typescript
{ op: 'add', path: '/users/-', value: { name: 'New' } }  // Append
{ op: 'add', path: '/users/0', value: { name: 'First' } }  // Insert
```

### `RemoveOperation`

```typescript
interface RemoveOperation {
	op: 'remove';
	path: string;
}
```

Removes the value at the target path.

```typescript
{ op: 'remove', path: '/users/0' }
```

### `ReplaceOperation`

```typescript
interface ReplaceOperation {
	op: 'replace';
	path: string;
	value: unknown;
}
```

Replaces the value at the target path. Path must exist.

```typescript
{ op: 'replace', path: '/users/0/name', value: 'Updated' }
```

### `MoveOperation`

```typescript
interface MoveOperation {
	op: 'move';
	from: string;
	path: string;
}
```

Moves a value from one location to another.

```typescript
{ op: 'move', from: '/temp', path: '/permanent' }
```

### `CopyOperation`

```typescript
interface CopyOperation {
	op: 'copy';
	from: string;
	path: string;
}
```

Copies a value from one location to another.

```typescript
{ op: 'copy', from: '/template', path: '/instance' }
```

### `TestOperation`

```typescript
interface TestOperation {
	op: 'test';
	path: string;
	value: unknown;
}
```

Tests that a value equals the expected. Patch fails if test fails.

```typescript
{ op: 'test', path: '/version', value: 1 }
```

---

## Utility Types

### `DeepPartial<T>`

Recursively makes all properties optional.

```typescript
type DeepPartial<T> = T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T;
```

Used with `extends()` for structural comparison.

```typescript
store.extends({ user: { name: 'Alice' } });
```

---

## Generic Parameters

### `T` - Data Type

The shape of the data stored in the DataMap.

```typescript
interface UserData {
	users: User[];
	settings: Settings;
}

const store = new DataMap<UserData>({
	users: [],
	settings: { theme: 'dark' },
});
```

### `Ctx` - Context Type

Type of the context object available to subscribers and definitions.

```typescript
interface AppContext {
	apiUrl: string;
	currentUser: User;
}

const store = new DataMap<UserData, AppContext>(data, {
	context: { apiUrl: 'https://api.example.com', currentUser: admin },
});
```

---

## Type Inference

DataMap infers types from initial data when not explicitly specified:

```typescript
// Type is DataMap<{ users: { name: string }[] }, unknown>
const store = new DataMap({
  users: [{ name: 'Alice' }]
});

// Explicit typing for better IDE support
const store = new DataMap<UserData>({ ... });
```

---

## See Also

- [DataMap API](./datamap.md)
- [Subscription Types](./subscriptions.md)
- [Definition Types](./definitions.md)
