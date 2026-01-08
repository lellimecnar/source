# Core Concepts

Understanding these core concepts will help you use `@data-map/core` effectively.

## Path Types

DataMap supports three types of path expressions, automatically detecting which one you're using:

### JSON Pointer (RFC 6901)

JSON Pointer is the simplest and most direct way to access data:

```typescript
// Starts with / or is empty string
'/user/profile/name'; // Access user.profile.name
'/items/0'; // Access first item in array
''; // Access root object
'#'; // Also access root (URI fragment form)
'#/user/name'; // URI fragment pointer
```

**When to use**: Direct, known paths. Fastest resolution.

### JSONPath (RFC 9535)

JSONPath provides query-like access with wildcards and filters:

```typescript
// Starts with $
'$.user.profile.name'; // Same as /user/profile/name
'$.items[*].name'; // All name fields in items array
'$.users[?(@.active)]'; // Filter: only active users
'$..name'; // Recursive: all name fields at any depth
'$.items[0:5]'; // Slice: first 5 items
```

**When to use**: Queries that match multiple values, filtering, wildcards.

### Relative JSON Pointer

Relative pointers start with a number and are relative to a context pointer:

```typescript
// Starts with digit(s)
'0'; // Current location
'1/name'; // Parent's name field
'2#'; // Grandparent's key
```

**Note**: Relative pointers require a context pointer and are not commonly used in the public API. In strict mode, using them without context throws an error.

### Path Detection Logic

```typescript
function detectPathType(
	input: string,
): 'pointer' | 'relative-pointer' | 'jsonpath' {
	if (
		input === '' ||
		input.startsWith('/') ||
		input.startsWith('#/') ||
		input === '#'
	) {
		return 'pointer';
	}
	if (/^\d+(#|\/|$)/.test(input)) {
		return 'relative-pointer';
	}
	return 'jsonpath';
}
```

## JSON Patch (RFC 6902)

All mutations in DataMap are internally represented as RFC 6902 JSON Patch operations:

### Supported Operations

| Operation | Description                           | Example                                          |
| --------- | ------------------------------------- | ------------------------------------------------ |
| `add`     | Add a value at a path                 | `{ op: 'add', path: '/items/-', value: 4 }`      |
| `remove`  | Remove a value at a path              | `{ op: 'remove', path: '/items/0' }`             |
| `replace` | Replace a value at a path             | `{ op: 'replace', path: '/name', value: 'Bob' }` |
| `move`    | Move a value from one path to another | `{ op: 'move', from: '/old', path: '/new' }`     |
| `copy`    | Copy a value from one path to another | `{ op: 'copy', from: '/source', path: '/dest' }` |
| `test`    | Test that a value equals expected     | `{ op: 'test', path: '/name', value: 'Alice' }`  |

### Why Patches?

1. **Predictability**: Every change is explicit and inspectable
2. **Serializable**: Patches can be sent over the network
3. **Reversible**: Operations can be inverted for undo
4. **Auditable**: Changes can be logged and replayed

### Generating Patches Without Applying

Every mutation method has a `.toPatch()` variant:

```typescript
const store = new DataMap({ a: 1 });

// Get the patch without applying it
const ops = store.set.toPatch('/a', 2);
// ops = [{ op: 'replace', path: '/a', value: 2 }]

// Original value unchanged
store.get('/a'); // 1

// Apply later if desired
store.patch(ops);
store.get('/a'); // 2
```

## Subscriptions

Subscriptions let you react to changes in the data:

### Lifecycle Stages

Each subscription can hook into three stages:

```typescript
store.subscribe({
	path: '/user/name',
	before: 'patch', // Before the change is applied
	on: 'patch', // When the change is being applied
	after: 'patch', // After the change is committed
	fn: (value, event, cancel, instance, context) => {
		// Handle the event
	},
});
```

| Stage    | Can Modify? | Can Cancel? | Use Case                    |
| -------- | ----------- | ----------- | --------------------------- |
| `before` | Yes         | Yes         | Validation, transformation  |
| `on`     | Yes         | Yes         | Middleware, logging         |
| `after`  | No          | No          | Side effects, notifications |

### Event Types

| Event     | Description                                      |
| --------- | ------------------------------------------------ |
| `get`     | A read is starting (before interception stage)   |
| `resolve` | A value was resolved (after getter/defaultValue) |
| `patch`   | A general write occurred                         |
| `add`     | A value was added                                |
| `replace` | A value was replaced                             |
| `remove`  | A value was removed                              |

### Cancellation

Subscriptions in `before` and `on` stages can cancel operations:

```typescript
store.subscribe({
	path: '/user/age',
	before: 'patch',
	fn: (value, event, cancel) => {
		if (value < 0) {
			cancel(); // Prevent the change
		}
	},
});
```

### Dynamic Subscriptions

Subscriptions with wildcards or filters are "dynamic" - they automatically update when structural changes occur:

```typescript
store.subscribe({
	path: '$.users[*].name', // Watches all user names
	on: 'patch',
	fn: (value, event) => {
		console.log(`A name changed: ${value}`);
	},
});

// When a new user is added, the subscription automatically includes it
store.push('/users', { name: 'New User' });
// Console: "A name changed: New User"
```

## Batching

Batching groups multiple operations into a single atomic update:

```typescript
store.batch((dm) => {
	dm.set('/a', 1);
	dm.set('/b', 2);
	dm.set('/c', 3);
	// Subscriptions don't fire yet
});
// All subscriptions fire now, after the batch
```

### Why Batch?

1. **Performance**: Single notification cycle instead of many
2. **Consistency**: All changes applied atomically
3. **Reduced Re-renders**: UI frameworks see one update instead of many

### Nested Batches

Batches can be nested - notifications only fire after the outermost batch completes:

```typescript
store.batch((dm) => {
	dm.set('/a', 1);

	dm.batch((dm2) => {
		dm2.set('/b', 2);
		// Still batching
	});
	// Still batching
});
// All notifications fire now
```

## Transactions

Transactions are batches with automatic rollback on error:

```typescript
try {
	store.transaction((dm) => {
		dm.set('/balance', (b) => b - 100);

		if (store.get('/balance') < 0) {
			throw new Error('Insufficient funds');
		}
	});
} catch (e) {
	// Data is automatically rolled back
}
```

## Definitions

Definitions configure dynamic behavior for specific paths:

### Getters

Transform values when reading:

```typescript
new DataMap(
	{ dateMs: 1704067200000 },
	{
		context: {},
		define: [
			{
				pointer: '/dateMs',
				get: (value) => new Date(value),
			},
		],
	},
);

store.get('/dateMs'); // Date object, not number
```

### Setters

Transform values when writing:

```typescript
new DataMap(
	{ score: 0 },
	{
		context: {},
		define: [
			{
				pointer: '/score',
				set: (newValue) => Math.max(0, Number(newValue)),
			},
		],
	},
);

store.set('/score', -10);
store.get('/score'); // 0 (clamped to minimum)
```

### Read-Only

Prevent modifications:

```typescript
new DataMap(
	{ id: 'abc123' },
	{
		context: {},
		define: [
			{
				pointer: '/id',
				readOnly: true,
			},
		],
	},
);

store.set('/id', 'new'); // throws Error
```

### Dependencies

Getters can depend on other paths. Dependency values are passed to the getter
and the result is cached until any dependency changes:

```typescript
new DataMap(
	{ a: 1, b: 2, sum: 0 },
	{
		context: {},
		define: [
			{
				pointer: '/sum',
				deps: ['/a', '/b'], // Dependency pointers
				get: (_, [a, b]) => a + b, // Deps passed as second argument
			},
		],
	},
);

store.get('/sum'); // 3 (cached)
store.set('/a', 5);
store.get('/sum'); // 7 (cache invalidated, recomputed)
```

### Default Values

Definitions can specify fallback values when the resolved value is `undefined`:

```typescript
new DataMap(
	{},
	{
		context: {},
		define: [
			{
				pointer: '/user/name',
				defaultValue: 'Anonymous',
			},
		],
	},
);

store.get('/user/name'); // 'Anonymous' (path doesn't exist)
```

## Immutability

DataMap maintains immutability:

1. **Initial data is cloned**: Modifications don't affect the original
2. **Snapshots are cloned**: `getSnapshot()` returns a safe copy
3. **Internal cloning**: Patches are applied to clones, not originals

```typescript
const original = { user: { name: 'Alice' } };
const store = new DataMap(original);

store.set('/user/name', 'Bob');

original.user.name; // Still 'Alice'
```

## Next Steps

- [Reading Data Guide](../guides/reading-data.md) - Deep dive into querying
- [Subscriptions Guide](../guides/subscriptions.md) - Reactive patterns
- [Architecture Overview](../architecture/design-overview.md) - Internal design
