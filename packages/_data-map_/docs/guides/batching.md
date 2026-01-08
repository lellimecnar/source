# Batching & Transactions

Batching allows you to group multiple operations into a single atomic update, optimizing performance and ensuring consistency.

## Why Batch?

Without batching, each mutation triggers subscriptions immediately:

```typescript
const store = new DataMap({ a: 1, b: 2, c: 3 });

store.subscribe({
	path: '/*',
	after: 'patch',
	fn: () => console.log('Changed!'),
});

// Without batch: 3 separate notifications
store.set('/a', 10); // "Changed!"
store.set('/b', 20); // "Changed!"
store.set('/c', 30); // "Changed!"
```

With batching, all changes are applied atomically with a single notification cycle:

```typescript
// With batch: 1 notification cycle after all changes
store.batch((dm) => {
	dm.set('/a', 10);
	dm.set('/b', 20);
	dm.set('/c', 30);
});
// "Changed!" - fires once for each affected path, but after all mutations
```

## batch()

### Basic Usage

```typescript
const store = new DataMap({
	user: { name: 'Alice', score: 0 },
	stats: { updates: 0 },
});

store.batch((dm) => {
	dm.set('/user/name', 'Bob');
	dm.set('/user/score', 100);
	dm.set('/stats/updates', (n) => n + 1);
});
```

### Return Values

`batch()` returns whatever the callback returns:

```typescript
const result = store.batch((dm) => {
	dm.set('/value', 42);
	return dm.get('/value');
});

console.log(result); // 42
```

### Accessing Data During Batch

Inside a batch, you can read the in-progress state:

```typescript
store.batch((dm) => {
	dm.set('/a', 10);
	console.log(dm.get('/a')); // 10 (already updated in memory)

	dm.set('/b', dm.get('/a') * 2);
	console.log(dm.get('/b')); // 20
});
```

## Nested Batches

Batches can be nested. Notifications only fire after the outermost batch completes:

```typescript
const store = new DataMap({ a: 1, b: 2 });
const events: string[] = [];

store.subscribe({
	path: '/*',
	after: 'patch',
	fn: (_, e) => events.push(e.pointer),
});

store.batch((dm) => {
	dm.set('/a', 10);

	dm.batch((dm2) => {
		dm2.set('/b', 20);
		console.log(events); // [] - still no notifications
	});

	console.log(events); // [] - still batching
});

console.log(events); // ['/a', '/b'] - all notifications fire now
```

## transaction()

A transaction is a batch with automatic rollback on error:

```typescript
const store = new DataMap({ balance: 100 });

try {
	store.transaction((dm) => {
		dm.set('/balance', 50);

		// Simulate an error
		throw new Error('Payment failed');
	});
} catch (error) {
	console.log(store.get('/balance')); // 100 - rolled back!
}
```

### Use Cases

**Atomic Multi-Step Operations:**

```typescript
store.transaction((dm) => {
	const balance = dm.get('/account/balance') as number;
	const price = dm.get('/cart/total') as number;

	if (balance < price) {
		throw new Error('Insufficient funds');
	}

	dm.set('/account/balance', balance - price);
	dm.set('/order/status', 'confirmed');
	dm.set('/cart/items', []);
});
```

**Validation with Rollback:**

```typescript
store.transaction((dm) => {
	dm.set('/user/email', newEmail);
	dm.set('/user/emailVerified', false);

	// If this throws, all changes are rolled back
	validateEmailFormat(newEmail);
});
```

### Nested Transactions

Transactions can be nested within batches or other transactions:

```typescript
store.transaction((dm) => {
	dm.set('/a', 1);

	try {
		dm.transaction((dm2) => {
			dm2.set('/b', 2);
			throw new Error('Inner failed');
		});
	} catch {
		// Inner transaction rolled back, but outer continues
	}

	dm.set('/c', 3);
});
```

## Subscriptions and Batching

### Deferred Notifications

During a batch, subscriptions are deferred using `queueMicrotask`:

- `before` handlers still run **synchronously** (for validation/cancellation)
- `on` handlers are batched and scheduled via microtask
- `after` handlers fire after all `on` handlers complete (also via microtask)

This means reads inside `on` handlers will see the fully committed state.

```typescript
store.subscribe({
	path: '/value',
	before: 'patch',
	fn: (v) => console.log('before:', v), // Sync
});

store.subscribe({
	path: '/value',
	on: 'patch',
	fn: (v) => console.log('on:', v), // Async (microtask)
});

store.subscribe({
	path: '/value',
	after: 'patch',
	fn: (v) => console.log('after:', v), // Async (after on)
});

store.batch((dm) => {
	dm.set('/value', 1);
	console.log('inside batch');
});

// Output:
// before: 1
// inside batch
// on: 1
// after: 1
```

### Cancellation in Batches

If a subscription cancels an operation in a batch, that specific operation fails but the batch continues (unless in strict mode):

```typescript
store.subscribe({
	path: '/blocked',
	before: 'patch',
	fn: (v, e, cancel) => cancel(),
});

store.batch((dm) => {
	dm.set('/allowed', 1); // Works
	dm.set('/blocked', 2); // Cancelled
	dm.set('/alsoAllowed', 3); // Works
});

// Only /allowed and /alsoAllowed are updated
```

## Combining Batch with toPatch

Generate patches within a batch for inspection:

```typescript
const allOps: Operation[] = [];

store.batch((dm) => {
	allOps.push(...dm.set.toPatch('/a', 1));
	allOps.push(...dm.set.toPatch('/b', 2));

	console.log('Will apply:', allOps);

	dm.patch(allOps);
});
```

## Error Handling

### batch() - Errors Propagate

```typescript
try {
	store.batch((dm) => {
		dm.set('/a', 1);
		throw new Error('Something failed');
	});
} catch (error) {
	// Error propagates, but changes may be partially applied
	console.log(store.get('/a')); // 1 (change was applied)
}
```

### transaction() - Automatic Rollback

```typescript
const store = new DataMap({ a: 0, b: 0 });

try {
	store.transaction((dm) => {
		dm.set('/a', 1);
		dm.set('/b', 2);
		throw new Error('Something failed');
	});
} catch (error) {
	console.log(store.get('/a')); // 0 (rolled back)
	console.log(store.get('/b')); // 0 (rolled back)
}
```

## Performance Considerations

### When to Batch

- **Multiple related changes**: Setting several properties at once
- **UI updates**: Prevent multiple re-renders
- **Data synchronization**: Apply received patches atomically
- **Complex operations**: Multi-step calculations with intermediate states

### When Not to Batch

- **Single operations**: No benefit, adds overhead
- **Independent changes**: Changes that shouldn't appear atomic
- **Real-time updates**: When immediate feedback is needed

## Best Practices

### Keep Batches Short

```typescript
// Good: Focused batch
store.batch((dm) => {
	dm.set('/user/name', name);
	dm.set('/user/email', email);
});

// Avoid: Too much in one batch
store.batch((dm) => {
	dm.set('/user/name', name);
	dm.set('/user/email', email);
	await fetchSomething(); // Don't do async in batch!
	dm.set('/data', result);
});
```

### Handle Errors Appropriately

```typescript
// For required atomicity, use transaction
store.transaction((dm) => {
	// All or nothing
});

// For optional atomicity, use batch with try/catch
try {
	store.batch((dm) => {
		// Partial success acceptable
	});
} catch (e) {
	// Handle partial state
}
```

### Avoid Side Effects in Batches

```typescript
// Bad: Side effects in batch
store.batch((dm) => {
	dm.set('/value', 1);
	sendAnalytics(); // Side effect - unpredictable timing
});

// Good: Side effects after batch
store.batch((dm) => {
	dm.set('/value', 1);
});
sendAnalytics();
```

## Common Patterns

### Form Submission

```typescript
function submitForm(formData: FormData) {
	store.transaction((dm) => {
		dm.set('/form/status', 'submitting');
		dm.set('/form/data', formData);
		dm.set('/form/errors', null);

		// Validate
		const errors = validateForm(formData);
		if (errors.length > 0) {
			throw new ValidationError(errors);
		}

		dm.set('/form/status', 'submitted');
	});
}
```

### Optimistic Updates

```typescript
async function updateItem(id: string, changes: Partial<Item>) {
	const previous = store.get(`/items/${id}`);

	// Optimistic update
	store.batch((dm) => {
		dm.set(`/items/${id}`, { ...previous, ...changes });
		dm.set('/pendingUpdates', (n) => n + 1);
	});

	try {
		await api.updateItem(id, changes);
	} catch (error) {
		// Rollback on failure
		store.batch((dm) => {
			dm.set(`/items/${id}`, previous);
			dm.set('/pendingUpdates', (n) => n - 1);
		});
		throw error;
	}

	store.set('/pendingUpdates', (n) => n - 1);
}
```

### Bulk Import

```typescript
function importItems(items: Item[]) {
	store.batch((dm) => {
		for (const item of items) {
			dm.push('/items', item);
		}
		dm.set('/lastImport', Date.now());
	});
}
```

## Next Steps

- [Subscriptions Guide](./subscriptions.md) - How notifications work
- [Definitions Guide](./definitions.md) - Computed values
- [API Reference](../api/datamap.md) - Complete method documentation
