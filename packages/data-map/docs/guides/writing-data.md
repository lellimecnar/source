# Writing Data

This guide covers all the ways to modify data in a DataMap.

## Core Principle: Patch-First

All mutations in DataMap are internally expressed as RFC 6902 JSON Patch operations. This ensures:

- **Consistency**: Every change follows the same pattern
- **Traceability**: Changes can be inspected before applying
- **Serialization**: Patches can be sent over the network

## Basic Writing

### `set(pathOrPointer, value, options?)`

Sets a single value at the specified path:

```typescript
const store = new DataMap({
	user: { name: 'Alice', age: 30 },
});

// Set with JSON Pointer
store.set('/user/name', 'Bob');

// Set with JSONPath
store.set('$.user.age', 31);

// Verify
store.get('/user/name'); // 'Bob'
store.get('/user/age'); // 31
```

### Functional Updates

Pass a function to access the current value:

```typescript
const store = new DataMap({ count: 10 });

// Increment
store.set('/count', (current) => current + 1);
store.get('/count'); // 11

// Toggle boolean
const store2 = new DataMap({ active: false });
store2.set('/active', (val) => !val);
store2.get('/active'); // true
```

### Automatic Path Creation

Missing intermediate containers are created automatically:

```typescript
const store = new DataMap({});

// Creates the entire path structure
store.set('/user/profile/settings/theme', 'dark');

store.getSnapshot();
// { user: { profile: { settings: { theme: 'dark' } } } }
```

The container type (object or array) is inferred from the path:

```typescript
const store = new DataMap({});

// Object containers (property access)
store.set('/config/nested', 'value'); // { config: { nested: 'value' } }

// Array containers (numeric index)
store.set('/items/0', 'first'); // { items: ['first'] }
```

## Setting Multiple Values

### `setAll(pathOrPointer, value, options?)`

Sets all values matching a path pattern:

```typescript
const store = new DataMap({
	users: [
		{ name: 'Alice', active: true },
		{ name: 'Bob', active: true },
		{ name: 'Charlie', active: true },
	],
});

// Set all to false
store.setAll('$.users[*].active', false);

store.getAll('$.users[*].active'); // [false, false, false]
```

### Functional Updates with `setAll`

```typescript
const store = new DataMap({
	items: [{ price: 10 }, { price: 20 }, { price: 30 }],
});

// Increase all prices by 10%
store.setAll('$.items[*].price', (price) => price * 1.1);

store.getAll('$.items[*].price'); // [11, 22, 33]
```

## Mapping Values

### `map(pathOrPointer, mapperFn, options?)`

Transforms all values matching a path with a mapper function:

```typescript
const store = new DataMap({
	users: [{ name: 'alice' }, { name: 'bob' }],
});

// Capitalize all names
store.map('$.users[*].name', (name) => name.toUpperCase());

store.getAll('$.users[*].name'); // ['ALICE', 'BOB']
```

The mapper receives both the value and pointer:

```typescript
store.map('$.items[*]', (value, pointer) => {
	console.log(`Transforming ${pointer}`);
	return value * 2;
});
```

## Raw Patch Operations

### `patch(ops, options?)`

Apply RFC 6902 patch operations directly:

```typescript
const store = new DataMap({ a: 1, b: 2 });

store.patch([
	{ op: 'replace', path: '/a', value: 10 },
	{ op: 'add', path: '/c', value: 3 },
	{ op: 'remove', path: '/b' },
]);

store.getSnapshot(); // { a: 10, c: 3 }
```

### Supported Operations

```typescript
// Add - Insert a value
{ op: 'add', path: '/items/-', value: 'new' }  // Append to array
{ op: 'add', path: '/items/0', value: 'first' } // Insert at index
{ op: 'add', path: '/newProp', value: 123 }     // Add property

// Remove - Delete a value
{ op: 'remove', path: '/oldProp' }

// Replace - Change a value
{ op: 'replace', path: '/name', value: 'new name' }

// Move - Relocate a value
{ op: 'move', from: '/old/path', path: '/new/path' }

// Copy - Duplicate a value
{ op: 'copy', from: '/source', path: '/destination' }

// Test - Assert a value (throws if mismatch in strict mode)
{ op: 'test', path: '/name', value: 'expected' }
```

## Generating Patches Without Applying

Every mutation method has a `.toPatch()` variant:

```typescript
const store = new DataMap({ a: 1, b: 2 });

// Generate patch operations
const ops = store.set.toPatch('/a', 10);
console.log(ops); // [{ op: 'replace', path: '/a', value: 10 }]

// Original is unchanged
store.get('/a'); // 1

// Apply later
store.patch(ops);
store.get('/a'); // 10
```

### Available `.toPatch()` Methods

```typescript
// Basic mutations
store.set.toPatch('/path', value);
store.setAll.toPatch('$.path[*]', value);
store.map.toPatch('$.path[*]', mapperFn);
store.patch.toPatch(ops); // Just returns the ops

// Array mutations
store.push.toPatch('/arr', 1, 2, 3);
store.unshift.toPatch('/arr', 'first');
store.sort.toPatch('/arr', compareFn);
store.shuffle.toPatch('/arr');
```

## Setters and Definitions

When a path has a setter definition, values are transformed before storage:

```typescript
const store = new DataMap(
	{ score: 0 },
	{
		context: {},
		define: [
			{
				pointer: '/score',
				set: (newValue) => {
					// Clamp between 0 and 100
					return Math.max(0, Math.min(100, Number(newValue)));
				},
			},
		],
	},
);

store.set('/score', 150);
store.get('/score'); // 100 (clamped)

store.set('/score', -50);
store.get('/score'); // 0 (clamped)
```

### Read-Only Paths

```typescript
const store = new DataMap(
	{ id: 'abc123', name: 'Editable' },
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

store.set('/name', 'New Name'); // Works
store.set('/id', 'new-id'); // throws Error: "Read-only path: /id"
```

## Chaining

Mutation methods return the DataMap instance for chaining:

```typescript
const store = new DataMap({ a: 1, b: 2, c: 3 });

store.set('/a', 10).set('/b', 20).set('/c', 30);

store.getSnapshot(); // { a: 10, b: 20, c: 30 }
```

**Note**: For better performance with many operations, use `batch()` instead.

## Strict Mode

In strict mode, operations on missing paths throw:

```typescript
const store = new DataMap({ a: 1 }, { strict: true });

// When path doesn't exist and can't determine target
store.setAll('$.missing[*]', 'value'); // throws Error
```

Override per-call:

```typescript
store.set('/b', 2, { strict: false }); // Works (creates path)
```

## Common Patterns

### Toggle Boolean

```typescript
store.set('/active', (v) => !v);
```

### Increment/Decrement

```typescript
store.set('/count', (v) => v + 1);
store.set('/count', (v) => v - 1);
```

### Append to String

```typescript
store.set('/message', (v) => v + ' - updated');
```

### Conditional Update

```typescript
store.set('/status', (current) => {
	return current === 'pending' ? 'processing' : current;
});
```

### Deep Update

```typescript
store.set('/user/profile', (profile) => ({
	...profile,
	lastUpdated: Date.now(),
}));
```

### Update Multiple Conditionally

```typescript
// Only update active users
store.map('$.users[?(@.active)]', (user) => ({
	...user,
	notified: true,
}));
```

## Next Steps

- [Array Operations Guide](./array-operations.md) - Array-specific methods
- [Batching Guide](./batching.md) - Group operations atomically
- [Subscriptions Guide](./subscriptions.md) - React to changes
