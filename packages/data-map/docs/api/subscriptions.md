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
	 * Event(s) to trigger before mutation (synchronous).
	 * Can cancel or transform values.
	 */
	before?: SubscriptionEvent | SubscriptionEvent[];

	/**
	 * Event(s) to trigger during mutation (async via microtask).
	 */
	on?: SubscriptionEvent | SubscriptionEvent[];

	/**
	 * Event(s) to trigger after mutation (async via microtask).
	 */
	after?: SubscriptionEvent | SubscriptionEvent[];

	/**
	 * Handler function invoked on matching events.
	 */
	fn: SubscriptionHandler<T, Ctx>;
}
```

**Example:**

```typescript
store.subscribe({
	path: '$.users[*].status',
	before: 'patch',
	on: 'patch',
	after: 'patch',
	fn: (value, event, cancel) => {
		if (event.stage === 'before' && !isValid(value)) {
			cancel();
		}
	},
});
```

---

### `SubscriptionEvent`

Type of event that triggers a subscription.

```typescript
type SubscriptionEvent = 'get' | 'set' | 'remove' | 'resolve' | 'patch';
```

| Event     | Triggers When                   | Use Case                   |
| --------- | ------------------------------- | -------------------------- |
| `get`     | `get()` is called               | Read interception, masking |
| `set`     | Alias for `patch` (convenience) | React to writes            |
| `remove`  | Remove operations in patches    | Cleanup, logging           |
| `resolve` | `resolve()` is called           | Query monitoring           |
| `patch`   | Any write operation completes   | React to data changes      |

---

### `SubscriptionHandler<T, Ctx>`

Callback function signature.

```typescript
type SubscriptionHandler<T, Ctx> = (
	value: unknown,
	event: SubscriptionEventInfo,
	cancel: () => void,
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown | void;
```

**Parameters:**

| Parameter  | Type                    | Description                                   |
| ---------- | ----------------------- | --------------------------------------------- |
| `value`    | `unknown`               | Current or new value at the matched path      |
| `event`    | `SubscriptionEventInfo` | Detailed event information                    |
| `cancel`   | `() => void`            | Call to cancel the operation (before/on only) |
| `instance` | `DataMap<T, Ctx>`       | The DataMap instance                          |
| `context`  | `Ctx`                   | Context from construction                     |

**Returns:** In `before` stage, return a value to transform it. Otherwise ignored.

**Example:**

```typescript
const handler: SubscriptionHandler<AppData, AppContext> = (
	value,
	event,
	cancel,
	instance,
	context,
) => {
	console.log('Path:', event.pointer);
	console.log('Stage:', event.stage);
	console.log('Event:', event.type);

	if (event.stage === 'before' && !isValid(value)) {
		cancel(); // Abort the mutation
	}
};
```

---

### `SubscriptionEventInfo`

Detailed information about a subscription event.

```typescript
interface SubscriptionEventInfo {
	/**
	 * The event type that triggered this callback.
	 */
	type: SubscriptionEvent;

	/**
	 * The lifecycle stage: 'before', 'on', or 'after'.
	 */
	stage: 'before' | 'on' | 'after';

	/**
	 * JSON Pointer to the affected path.
	 */
	pointer: string;

	/**
	 * Original path from the subscription or operation.
	 */
	originalPath: string;

	/**
	 * The patch operation (for patch events).
	 */
	operation?: Operation;

	/**
	 * Previous value before the change.
	 */
	previousValue?: unknown;
}
```

---

### `Subscription`

Handle returned from `subscribe()`.

```typescript
interface Subscription {
	/**
	 * Unique identifier for this subscription.
	 */
	readonly id: string;

	/**
	 * The original query path.
	 */
	readonly query: string;

	/**
	 * Compiled path pattern (null for static pointers).
	 */
	readonly compiledPattern: CompiledPathPattern | null;

	/**
	 * Currently matched concrete paths.
	 */
	readonly expandedPaths: ReadonlySet<string>;

	/**
	 * True if the subscription uses wildcards or filters.
	 */
	readonly isDynamic: boolean;

	/**
	 * Removes the subscription.
	 */
	unsubscribe(): void;
}
```

**Example:**

```typescript
const sub = store.subscribe({
	path: '$.users[*].name',
	on: 'patch',
	fn: (value) => console.log(value),
});

console.log(`ID: ${sub.id}`);
console.log(`Query: ${sub.query}`); // '$.users[*].name'
console.log(`Dynamic: ${sub.isDynamic}`); // true
console.log(`Expanded:`, [...sub.expandedPaths]);

// Later, cleanup
sub.unsubscribe();
```

---

## Lifecycle Stages

### Stage Timing

| Stage    | Execution              | Can Cancel | Can Transform |
| -------- | ---------------------- | ---------- | ------------- |
| `before` | Synchronous, immediate | ✅         | ✅            |
| `on`     | Async (queueMicrotask) | ❌         | ❌            |
| `after`  | Async (queueMicrotask) | ❌         | ❌            |

### Execution Order

```
store.set('/path', value)
  │
  ├── before handlers (sync) ─┐
  │                           ├─ Can cancel, can transform
  │                           │
  ├── Mutation applied ───────┘
  │
  └── queueMicrotask ──────────┐
                               ├─ on handlers
                               └─ after handlers
```

---

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
	path: '$.users[?(@.active == true)]',
	on: 'patch',
	fn: (value) => console.log(value),
});
```

### Filter Re-expansion

Dynamic subscriptions with filter expressions automatically re-evaluate when relevant data changes:

```typescript
const store = new DataMap({
	users: [
		{ name: 'Alice', active: true },
		{ name: 'Bob', active: false },
	],
});

store.subscribe({
	path: '$.users[?(@.active == true)].name',
	on: 'patch',
	fn: (value) => console.log(`Active: ${value}`),
});

// Bob becomes active - subscription now includes him
store.set('/users/1/active', true);
store.set('/users/1/name', 'Robert');
// Console: "Active: Robert"
```

---

## See Also

- [DataMap API](./datamap.md)
- [Subscriptions Guide](../guides/subscriptions.md)
- [Types & Interfaces](./types.md)
