# Subscription Types

TypeScript types and interfaces for the subscription system.

## Core Types

### `SubscriptionConfig<T, Ctx>`

Configuration for creating a subscription.

```typescript
interface SubscriptionConfig<T, Ctx> {
	/**
	 * Path pattern to subscribe to.
	 * Can be JSON Pointer or JSONPath.
	 */
	path: string;

	/**
	 * Event type that triggers the callback.
	 */
	on: SubscriptionEvent;

	/**
	 * Callback function invoked on matching events.
	 */
	fn: SubscriptionHandler<T, Ctx>;

	/**
	 * Optional priority for execution order.
	 * Lower numbers run first.
	 * @default 0
	 */
	priority?: number;

	/**
	 * Optional filter to conditionally skip execution.
	 */
	filter?: (event: SubscriptionEventInfo<T, Ctx>) => boolean;
}
```

**Example:**

```typescript
store.subscribe({
	path: '$.users[*].status',
	on: 'patch',
	priority: 10,
	filter: (event) => event.previousValue !== event.value,
	fn: (value, event) => {
		console.log(`User status changed to: ${value}`);
	},
});
```

---

### `SubscriptionEvent`

Type of event that triggers a subscription.

```typescript
type SubscriptionEvent = 'patch' | 'read' | 'get' | 'set';
```

| Event   | Triggers When                              | Use Case              |
| ------- | ------------------------------------------ | --------------------- |
| `patch` | Any write operation completes              | React to data changes |
| `read`  | `get()`, `getAll()`, or `resolve()` called | Audit, logging        |
| `get`   | Alias for `read`                           | Compatibility         |
| `set`   | `set()` or `setAll()` called               | Intercept writes      |

**Lifecycle:**

```
set('/path', value)
  ├── 'set' event fires (before apply)
  └── 'patch' event fires (after apply)
```

---

### `SubscriptionHandler<T, Ctx>`

Callback function signature.

```typescript
type SubscriptionHandler<T, Ctx> = (
	value: unknown,
	event: SubscriptionEventInfo<T, Ctx>,
) => void | Promise<void>;
```

**Parameters:**

| Parameter | Type                            | Description                       |
| --------- | ------------------------------- | --------------------------------- |
| `value`   | `unknown`                       | Current value at the matched path |
| `event`   | `SubscriptionEventInfo<T, Ctx>` | Detailed event information        |

**Example:**

```typescript
const handler: SubscriptionHandler<AppData, AppContext> = (value, event) => {
	console.log('Path:', event.pointer);
	console.log('New value:', value);
	console.log('Old value:', event.previousValue);
	console.log('Context:', event.context);
};
```

---

### `SubscriptionEventInfo<T, Ctx>`

Detailed information about a subscription event.

```typescript
interface SubscriptionEventInfo<T, Ctx> {
	/**
	 * The event type that triggered this callback.
	 */
	readonly type: SubscriptionEvent;

	/**
	 * JSON Pointer to the affected path.
	 */
	readonly pointer: string;

	/**
	 * Current value at the path.
	 */
	readonly value: unknown;

	/**
	 * Previous value before the change.
	 * Only present for 'patch' events.
	 */
	readonly previousValue?: unknown;

	/**
	 * The patch operations that caused this event.
	 * Only present for 'patch' events.
	 */
	readonly operations?: Operation[];

	/**
	 * Context object from DataMap construction.
	 */
	readonly context?: Ctx;

	/**
	 * Reference to the DataMap instance.
	 */
	readonly dataMap: DataMap<T, Ctx>;

	/**
	 * Timestamp when the event occurred.
	 */
	readonly timestamp: number;

	/**
	 * True if this event is part of a batch.
	 */
	readonly batched?: boolean;
}
```

**Example:**

```typescript
store.subscribe({
	path: '/count',
	on: 'patch',
	fn: (value, event) => {
		if (event.previousValue !== undefined) {
			const delta = (value as number) - (event.previousValue as number);
			console.log(`Count changed by ${delta}`);
		}

		if (event.batched) {
			console.log('Part of a batch operation');
		}
	},
});
```

---

### `Subscription`

Handle returned from `subscribe()`.

```typescript
interface Subscription {
	/**
	 * Removes the subscription.
	 */
	unsubscribe(): void;

	/**
	 * The path pattern this subscription watches.
	 */
	readonly path: string;

	/**
	 * The event type this subscription responds to.
	 */
	readonly event: SubscriptionEvent;
}
```

**Example:**

```typescript
const sub = store.subscribe({
	path: '/user',
	on: 'patch',
	fn: (value) => console.log(value),
});

console.log(`Watching: ${sub.path}`); // '/user'
console.log(`Event: ${sub.event}`); // 'patch'

// Later, cleanup
sub.unsubscribe();
```

---

## Path Patterns

### Static Paths (JSON Pointer)

Subscribe to exact paths:

```typescript
store.subscribe({
	path: '/users/0/name', // Exact path
	on: 'patch',
	fn: (value) => console.log(value),
});
```

### Dynamic Paths (JSONPath)

Subscribe to patterns:

```typescript
// All user names
store.subscribe({
	path: '$.users[*].name',
	on: 'patch',
	fn: (value, event) => {
		console.log(`${event.pointer} = ${value}`);
	},
});

// Recursive - all 'id' properties anywhere
store.subscribe({
	path: '$..id',
	on: 'patch',
	fn: (value) => console.log(value),
});

// Filter - active users only
store.subscribe({
	path: '$.users[?@.active == true]',
	on: 'patch',
	fn: (value) => console.log(value),
});
```

---

## Priority System

Subscriptions with lower priority numbers execute first:

```typescript
// Runs third (default priority = 0)
store.subscribe({
	path: '/data',
	on: 'patch',
	fn: () => console.log('Third'),
});

// Runs first
store.subscribe({
	path: '/data',
	on: 'patch',
	priority: -10,
	fn: () => console.log('First'),
});

// Runs second
store.subscribe({
	path: '/data',
	on: 'patch',
	priority: -5,
	fn: () => console.log('Second'),
});
```

---

## Filter Function

Skip execution based on conditions:

```typescript
store.subscribe({
	path: '/value',
	on: 'patch',
	filter: (event) => {
		// Only trigger for significant changes
		const oldVal = event.previousValue as number;
		const newVal = event.value as number;
		return Math.abs(newVal - oldVal) > 10;
	},
	fn: (value) => {
		console.log('Significant change:', value);
	},
});
```

---

## Async Handlers

Handlers can be async:

```typescript
store.subscribe({
	path: '/user',
	on: 'patch',
	fn: async (value, event) => {
		await saveToServer(value);
		await logAnalytics(event);
	},
});
```

> **Note:** Async handlers don't block subsequent handlers. DataMap does not await them.

---

## See Also

- [DataMap API](./datamap.md)
- [Subscriptions Guide](../guides/subscriptions.md)
- [Types & Interfaces](./types.md)
