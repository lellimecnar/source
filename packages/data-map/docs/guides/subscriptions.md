# Subscriptions

Subscriptions allow you to react to changes in the DataMap. They provide a powerful event system with lifecycle hooks for validation, transformation, and side effects.

## Basic Subscription

```typescript
const store = new DataMap({ user: { name: 'Alice' } });

const subscription = store.subscribe({
	path: '/user/name',
	on: 'patch',
	fn: (value, event) => {
		console.log(`Name changed to: ${value}`);
	},
});

store.set('/user/name', 'Bob');
// Console: "Name changed to: Bob"

// Cleanup when done
subscription.unsubscribe();
```

## Subscription Configuration

```typescript
interface SubscriptionConfig<T, Ctx> {
	path: string; // Path to watch (pointer or JSONPath)
	before?: SubscriptionEvent | SubscriptionEvent[]; // Before stage events
	on?: SubscriptionEvent | SubscriptionEvent[]; // On stage events
	after?: SubscriptionEvent | SubscriptionEvent[]; // After stage events
	fn: SubscriptionHandler<T, Ctx>; // Handler function
}

type SubscriptionEvent = 'get' | 'set' | 'remove' | 'resolve' | 'patch';
```

## Lifecycle Stages

Each subscription can hook into three stages of an operation:

### Before Stage

Runs **before** the mutation is applied. Can modify values or cancel the operation.

```typescript
store.subscribe({
	path: '/user/age',
	before: 'patch',
	fn: (value, event, cancel) => {
		if (value < 0) {
			cancel(); // Prevent negative ages
		}
		return value; // Can transform the value
	},
});
```

### On Stage

Runs **during** the mutation, after `before` handlers but before committing. Can still cancel.

```typescript
store.subscribe({
	path: '/user/email',
	on: 'patch',
	fn: (value, event, cancel) => {
		console.log(`Changing email to: ${value}`);
	},
});
```

### After Stage

Runs **after** the mutation is committed. Cannot modify or cancel - use for side effects.

```typescript
store.subscribe({
	path: '/user/name',
	after: 'patch',
	fn: (value, event) => {
		analytics.track('name_changed', { newName: value });
	},
});
```

### Stage Execution Order

For a single mutation:

1. All `before` handlers (can cancel)
2. All `on` handlers (can cancel)
3. **Mutation is committed**
4. All `after` handlers (side effects only)

## Handler Function

The handler receives five parameters:

```typescript
fn: (
  value: unknown,           // Current or new value
  event: SubscriptionEventInfo,  // Event metadata
  cancel: () => void,       // Cancel function (before/on only)
  instance: DataMap<T, Ctx>, // The DataMap instance
  context: Ctx              // User-provided context
) => unknown | void
```

### Event Info

```typescript
interface SubscriptionEventInfo {
	type: SubscriptionEvent; // 'get' | 'set' | 'remove' | 'resolve' | 'patch'
	stage: 'before' | 'on' | 'after';
	pointer: string; // Resolved pointer path
	originalPath: string; // Original path from subscription
	operation?: Operation; // The patch operation (for patch events)
	previousValue?: unknown; // Previous value (if available)
}
```

## Event Types

### `patch` Event

The most common event - fires on any mutation:

```typescript
store.subscribe({
	path: '/user/name',
	before: 'patch',
	on: 'patch',
	after: 'patch',
	fn: (value, event) => {
		console.log(`Stage: ${event.stage}, Value: ${value}`);
	},
});

store.set('/user/name', 'Bob');
// Console: "Stage: before, Value: Bob"
// Console: "Stage: on, Value: Bob"
// Console: "Stage: after, Value: Bob"
```

### `set` Event

Convenience alias - `set` subscriptions also catch `patch` events:

```typescript
store.subscribe({
	path: '/user/name',
	on: 'set', // Will fire on patch operations too
	fn: (value) => console.log(value),
});
```

## Cancellation

Cancel operations in `before` or `on` stages:

```typescript
store.subscribe({
	path: '/user/email',
	before: 'patch',
	fn: (value, event, cancel) => {
		if (!isValidEmail(value)) {
			cancel(); // Prevent invalid emails
			console.log('Invalid email rejected');
		}
	},
});

// In strict mode, cancelled operations throw
const strictStore = new DataMap(data, { strict: true });
// Throws: "Patch cancelled by subscription"
```

When cancelled:

- The mutation is aborted
- Subsequent handlers don't run
- The data remains unchanged

## Value Transformation

Return a value from `before` or `on` handlers to transform:

```typescript
store.subscribe({
	path: '/user/name',
	before: 'patch',
	fn: (value) => {
		// Normalize to uppercase
		return String(value).toUpperCase();
	},
});

store.set('/user/name', 'alice');
store.get('/user/name'); // 'ALICE'
```

## Path Patterns

### Static Paths (Pointers)

Watch exact paths:

```typescript
store.subscribe({
	path: '/user/name',
	on: 'patch',
	fn: (value) => console.log(value),
});
```

### Dynamic Paths (JSONPath)

Watch patterns with wildcards:

```typescript
store.subscribe({
	path: '$.users[*].name', // All user names
	on: 'patch',
	fn: (value, event) => {
		console.log(`${event.pointer} changed to ${value}`);
	},
});

store.set('/users/0/name', 'Alice');
// Console: "/users/0/name changed to Alice"

store.set('/users/1/name', 'Bob');
// Console: "/users/1/name changed to Bob"
```

### Filter Expressions

```typescript
store.subscribe({
	path: '$.users[?(@.active == true)].score',
	on: 'patch',
	fn: (value) => console.log(`Active user score: ${value}`),
});
```

### Recursive Descent

```typescript
store.subscribe({
	path: '$..email', // Any email field at any depth
	on: 'patch',
	fn: (value) => console.log(`Email changed: ${value}`),
});
```

## Dynamic Subscription Behavior

Subscriptions with wildcards are "dynamic" - they automatically adapt when the data structure changes:

```typescript
const store = new DataMap({ users: [{ name: 'Alice' }] });

store.subscribe({
	path: '$.users[*].name',
	on: 'patch',
	fn: (value, event) => console.log(`${event.pointer}: ${value}`),
});

// Add a new user - subscription automatically picks it up
store.push('/users', { name: 'Bob' });
// Console: "/users/1/name: Bob"
```

### Checking if Subscription is Dynamic

```typescript
const sub = store.subscribe({
	path: '$.users[*].name',
	on: 'patch',
	fn: () => {},
});

console.log(sub.isDynamic); // true

const staticSub = store.subscribe({
	path: '/users/0/name',
	on: 'patch',
	fn: () => {},
});

console.log(staticSub.isDynamic); // false
```

## Subscription Object

The `subscribe()` method returns a subscription object:

```typescript
interface Subscription {
	readonly id: string; // Unique identifier
	readonly query: string; // Original path
	readonly compiledPattern: CompiledPathPattern | null;
	readonly expandedPaths: ReadonlySet<string>; // Currently matched pointers
	readonly isDynamic: boolean; // Uses wildcards/filters?
	unsubscribe: () => void; // Cleanup function
}
```

## Multiple Event Types

Subscribe to multiple event types:

```typescript
store.subscribe({
	path: '/user',
	on: ['patch', 'remove'], // Array of events
	fn: (value, event) => {
		console.log(`${event.type} on /user`);
	},
});
```

## Multiple Stages

Subscribe to multiple stages:

```typescript
store.subscribe({
	path: '/user/name',
	before: 'patch',
	on: 'patch',
	after: 'patch',
	fn: (value, event) => {
		console.log(`${event.stage}: ${value}`);
	},
});
```

## Constructor Subscriptions

Register subscriptions at construction time:

```typescript
const store = new DataMap(initialData, {
	subscribe: [
		{
			path: '/user/name',
			after: 'patch',
			fn: (value) => console.log(`Name: ${value}`),
		},
		{
			path: '$.items[*]',
			on: 'patch',
			fn: (value) => console.log(`Item changed: ${value}`),
		},
	],
});
```

## Subscription Priority

When multiple subscriptions match the same path:

1. More specific paths execute first
2. Within same specificity, registration order is preserved

```typescript
// Order: specific → general
store.subscribe({ path: '/a/b/c', ... });  // Runs first
store.subscribe({ path: '/a/b', ... });    // Runs second
store.subscribe({ path: '/a', ... });      // Runs third
```

## Common Patterns

### Validation

```typescript
store.subscribe({
	path: '/user/email',
	before: 'patch',
	fn: (value, event, cancel) => {
		if (!isValidEmail(value)) {
			cancel();
			throw new Error('Invalid email format');
		}
	},
});
```

### Logging

```typescript
store.subscribe({
	path: '$.*', // All top-level properties
	after: 'patch',
	fn: (value, event) => {
		logger.info('Data changed', {
			path: event.pointer,
			value,
			operation: event.operation,
		});
	},
});
```

### Syncing

```typescript
store.subscribe({
	path: '/user',
	after: 'patch',
	fn: async (value) => {
		await api.updateUser(value);
	},
});
```

### Derived Values

```typescript
store.subscribe({
	path: '$.items[*].price',
	after: 'patch',
	fn: (value, event, cancel, instance) => {
		const prices = instance.getAll('$.items[*].price') as number[];
		const total = prices.reduce((sum, p) => sum + p, 0);
		instance.set('/totalPrice', total);
	},
});
```

### Notification Debouncing

```typescript
let timeout: NodeJS.Timeout;

store.subscribe({
	path: '/searchQuery',
	after: 'patch',
	fn: (value) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			performSearch(value);
		}, 300);
	},
});
```

## Cleanup

Always unsubscribe when done to prevent memory leaks:

```typescript
const sub = store.subscribe({ ... });

// Later...
sub.unsubscribe();
```

For React:

```typescript
useEffect(() => {
	const sub = store.subscribe({
		path: '/user',
		on: 'patch',
		fn: (value) => setUser(value),
	});

	return () => sub.unsubscribe();
}, [store]);
```

## Next Steps

- [Batching Guide](./batching.md) - How subscriptions work with batches
- [Definitions Guide](./definitions.md) - Computed values and transformations
- [Subscription API Reference](../api/subscriptions.md) - Full type definitions
