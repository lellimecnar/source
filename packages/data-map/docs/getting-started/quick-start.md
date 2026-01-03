# Quick Start

This guide will get you up and running with `@data-map/core` in just a few minutes.

## Installation

```bash
# Using pnpm (recommended)
pnpm add @data-map/core

# Using npm
npm install @data-map/core

# Using yarn
yarn add @data-map/core
```

## Basic Usage

### Creating a DataMap

```typescript
import { DataMap } from '@data-map/core';

// Create with initial data
const store = new DataMap({
	user: {
		id: 1,
		profile: {
			name: 'Alice',
			email: 'alice@example.com',
		},
	},
	settings: {
		theme: 'dark',
		notifications: true,
	},
});
```

### Reading Data

You can read data using either JSON Pointer or JSONPath syntax:

```typescript
// JSON Pointer syntax (starts with /)
store.get('/user/profile/name'); // 'Alice'
store.get('/settings/theme'); // 'dark'

// JSONPath syntax (starts with $)
store.get('$.user.profile.name'); // 'Alice'
store.get('$.settings.theme'); // 'dark'

// Root access
store.get(''); // Returns entire data object
store.get('#'); // Also returns entire data object
```

### Writing Data

```typescript
// Set a single value
store.set('/user/profile/name', 'Bob');

// Set using JSONPath
store.set('$.settings.theme', 'light');

// Functional updates (access current value)
store.set('/user/id', (current) => current + 1);

// Create nested paths automatically
store.set('/user/profile/avatar', 'avatar.png');
// Creates the path if it doesn't exist
```

### Working with Arrays

```typescript
const store = new DataMap({
	items: [1, 2, 3],
});

// Append items
store.push('/items', 4, 5); // [1, 2, 3, 4, 5]

// Remove from end
store.pop('/items'); // returns 5, array is [1, 2, 3, 4]

// Remove from start
store.shift('/items'); // returns 1, array is [2, 3, 4]

// Insert at start
store.unshift('/items', 0); // [0, 2, 3, 4]

// Splice
store.splice('/items', 1, 2, 10, 11); // [0, 10, 11, 4]

// Sort
store.sort('/items'); // [0, 4, 10, 11]
```

### Subscribing to Changes

```typescript
// Subscribe to a specific path
const subscription = store.subscribe({
	path: '/user/profile/name',
	on: 'patch',
	fn: (value, event) => {
		console.log(`Name changed to: ${value}`);
		console.log(`Pointer: ${event.pointer}`);
	},
});

// Trigger the subscription
store.set('/user/profile/name', 'Charlie');
// Console: "Name changed to: Charlie"

// Unsubscribe when done
subscription.unsubscribe();
```

### Batch Operations

```typescript
const store = new DataMap({ a: 1, b: 2 });

// All changes are applied atomically
// Subscriptions fire only after the batch completes
store.batch((dm) => {
	dm.set('/a', 10);
	dm.set('/b', 20);
});
```

### Transactions (with Rollback)

```typescript
const store = new DataMap({ balance: 100 });

try {
	store.transaction((dm) => {
		dm.set('/balance', 50);

		// Simulate an error
		throw new Error('Transaction failed');
	});
} catch (e) {
	// Data is rolled back to original state
	console.log(store.get('/balance')); // 100
}
```

## Configuration Options

```typescript
const store = new DataMap(initialData, {
	// Throw errors for invalid paths/operations
	strict: true,

	// Pass context to getters/setters/subscriptions
	context: { apiUrl: 'https://api.example.com' },

	// Define computed values
	define: [
		{
			pointer: '/user/fullName',
			get: (value, deps, instance, ctx) => {
				return `${instance.get('/user/firstName')} ${instance.get('/user/lastName')}`;
			},
		},
	],

	// Register initial subscriptions
	subscribe: [
		{
			path: '/user/*',
			on: 'patch',
			fn: (value, event) => console.log('User changed'),
		},
	],
});
```

## Strict Mode

By default, DataMap operates in non-strict mode:

```typescript
const store = new DataMap({ a: 1 });

// Non-strict (default): returns undefined for missing paths
store.get('/missing'); // undefined

// Strict mode: throws for missing paths
const strictStore = new DataMap({ a: 1 }, { strict: true });
strictStore.get('/missing'); // throws Error
```

You can also override strict mode per-call:

```typescript
const store = new DataMap({ a: 1 }, { strict: false });

// Override for this call only
store.get('/missing', { strict: true }); // throws Error
```

## Getting Snapshots

```typescript
// Get an immutable snapshot of the entire data
const snapshot = store.getSnapshot();

// Equivalent to getSnapshot()
const json = store.toJSON();

// Modifications to the snapshot don't affect the store
snapshot.user.name = 'Hacked';
store.get('/user/name'); // Still 'Alice'
```

## Comparison Utilities

```typescript
const store1 = new DataMap({ a: 1, b: { c: 2 } });
const store2 = new DataMap({ a: 1, b: { c: 2 } });
const store3 = new DataMap({ a: 1, b: { c: 3 } });

// Deep equality comparison
store1.equals(store2); // true
store1.equals(store3); // false

// Partial matching (extends)
store1.extends({ b: { c: 2 } }); // true
store1.extends({ b: { c: 99 } }); // false
```

## Cloning

```typescript
const original = new DataMap({ a: 1 });

// Create an independent clone
const clone = original.clone();

// Clone with different options
const strictClone = original.clone({ strict: true });
```

## Next Steps

- [Core Concepts](./core-concepts.md) - Understand paths, patches, and subscriptions in depth
- [Reading Data Guide](../guides/reading-data.md) - Advanced querying techniques
- [Subscriptions Guide](../guides/subscriptions.md) - Reactive change notifications
- [API Reference](../api/datamap.md) - Complete API documentation
