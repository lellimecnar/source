# @data-map/core Changelog

## Recent Updates

### Subscription System Enhancements

#### `get` and `resolve` Events

Subscriptions now support `get` and `resolve` events for read-time interception and monitoring:

```typescript
store.subscribe({
	path: '/secret',
	before: 'get',
	fn: () => '********', // Mask the value on read
});

console.log(store.get('/secret')); // "********"
```

#### Async Notification Batching (`queueMicrotask`)

The `on` and `after` notification stages now use `queueMicrotask` for non-blocking updates:

| Stage    | Timing                         | Purpose                            |
| -------- | ------------------------------ | ---------------------------------- |
| `before` | Synchronous - immediate        | Validation, transformation, cancel |
| `on`     | Async (microtask) - batched    | Non-blocking side effects          |
| `after`  | Async (microtask) - after `on` | Non-blocking side effects          |

#### Filter Re-expansion

Dynamic subscriptions with filter expressions automatically re-evaluate when the underlying data changes:

```typescript
// Subscribe to active users only
store.subscribe({
	path: '$.users[?(@.active == true)].name',
	on: 'patch',
	fn: (value) => console.log(value),
});

// When Bob becomes active, the subscription now includes him
store.set('/users/1/active', true);
```

### Definition Enhancements

#### `defaultValue` Support

Definitions can now specify initial values:

```typescript
const store = new DataMap(
	{ user: {} },
	{
		context: {},
		define: [
			{
				pointer: '/user/settings',
				defaultValue: { theme: 'dark' },
			},
		],
	},
);

store.get('/user/settings'); // { theme: 'dark' }
```

#### Auto-Subscription and Caching

Definitions with `deps` automatically:

1. Subscribe to dependency changes
2. Cache computed values
3. Invalidate cache when dependencies change

```typescript
{
	pointer: '/total',
	deps: ['/quantity', '/price'],
	get: (_, [qty, price]) => qty * price,
}
```

### API Additions

#### `peek()` Method

New internal read method that bypasses notifications:

```typescript
const rawValue = store.peek('/path');
```

#### Array `.toPatch()` Methods

All array methods now have `.toPatch()` variants:

- `pop.toPatch()`
- `shift.toPatch()`
- `splice.toPatch()`

```typescript
const ops = store.pop.toPatch('/items');
// [{ op: 'remove', path: '/items/2' }]
```

#### `CompiledPathPattern.toJSON()`

Compiled patterns now support serialization:

```typescript
const pattern = compilePathPattern('$.users[*].name');
const serialized = pattern.toJSON();
// { source: '$.users[*].name', segments: [...], isSingular: false, ... }
```

### Before-Hook Value Transformation

The `before` stage for `patch` events can now transform values:

```typescript
store.subscribe({
	path: '/name',
	before: 'patch',
	fn: (value) => String(value).toUpperCase(),
});

store.set('/name', 'alice');
store.get('/name'); // 'ALICE'
```

---

## Specification Compliance

Current compliance: **~95%**

| Category                 | Status       |
| ------------------------ | ------------ |
| Core DataMap API         | ✅ Compliant |
| Read API                 | ✅ Compliant |
| Write API                | ✅ Compliant |
| Patch Generation API     | ✅ Compliant |
| Array Mutation API       | ✅ Compliant |
| Subscription API         | ✅ Compliant |
| Compiled Patterns        | ✅ Compliant |
| Definitions              | ✅ Compliant |
| Performance Requirements | ⚠️ Partial   |

See [SPEC_COMPLIANCE_REPORT.md](../core/SPEC_COMPLIANCE_REPORT.md) for details.
