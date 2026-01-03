# Definitions

Definitions allow you to configure dynamic behavior for specific paths, including computed getters, value transformers (setters), read-only fields, and dependencies.

## Overview

Definitions are registered at construction time:

```typescript
const store = new DataMap(initialData, {
	context: {},
	define: [
		// Definition objects or factory functions
	],
});
```

## Definition Types

### Path-Based Definition

Matches JSONPath patterns:

```typescript
{
  path: '$.users[*].name',  // JSONPath
  get: (value) => value.toUpperCase()
}
```

### Pointer-Based Definition

Matches exact JSON Pointer:

```typescript
{
  pointer: '/user/name',  // JSON Pointer
  get: (value) => value.toUpperCase()
}
```

## Getters

Transform values when reading:

### Simple Getter

```typescript
const store = new DataMap(
	{ price: 1999 }, // Stored as cents
	{
		context: {},
		define: [
			{
				pointer: '/price',
				get: (value) => value / 100, // Return dollars
			},
		],
	},
);

store.get('/price'); // 19.99 (transformed)
```

### Getter with Dependencies

```typescript
const store = new DataMap(
	{ firstName: 'John', lastName: 'Doe', fullName: '' },
	{
		context: {},
		define: [
			{
				pointer: '/fullName',
				get: {
					deps: ['/firstName', '/lastName'],
					fn: (value, [first, last]) => `${first} ${last}`,
				},
			},
		],
	},
);

store.get('/fullName'); // 'John Doe'
```

### Getter Signature

```typescript
type GetterFn<T, Ctx> = (
	currentValue: unknown, // Current stored value
	depValues: unknown[], // Values from deps array
	instance: DataMap<T, Ctx>, // DataMap instance
	context: Ctx, // User-provided context
) => unknown;
```

## Setters

Transform values when writing:

### Simple Setter

```typescript
const store = new DataMap(
	{ email: '' },
	{
		context: {},
		define: [
			{
				pointer: '/email',
				set: (newValue) => String(newValue).toLowerCase().trim(),
			},
		],
	},
);

store.set('/email', '  ALICE@EXAMPLE.COM  ');
store.get('/email'); // 'alice@example.com'
```

### Setter with Validation

```typescript
const store = new DataMap(
	{ age: 25 },
	{
		context: {},
		define: [
			{
				pointer: '/age',
				set: (newValue, currentValue) => {
					const age = Number(newValue);
					if (isNaN(age) || age < 0 || age > 150) {
						throw new Error('Invalid age');
					}
					return age;
				},
			},
		],
	},
);

store.set('/age', '30'); // Works, stored as 30
store.set('/age', -5); // throws Error: Invalid age
```

### Setter with Dependencies

```typescript
const store = new DataMap(
	{ items: [], totalCount: 0 },
	{
		context: {},
		define: [
			{
				pointer: '/totalCount',
				set: {
					deps: ['/items'],
					fn: (newValue, currentValue, [items]) => {
						// Override with actual count
						return (items as any[]).length;
					},
				},
			},
		],
	},
);
```

### Setter Signature

```typescript
type SetterFn<T, Ctx> = (
	newValue: unknown, // Value being set
	currentValue: unknown, // Current stored value
	depValues: unknown[], // Values from deps array
	instance: DataMap<T, Ctx>, // DataMap instance
	context: Ctx, // User-provided context
) => unknown;
```

## Read-Only Fields

Prevent modifications to specific paths:

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

## Pattern Matching with JSONPath

Definitions can match multiple paths using JSONPath:

```typescript
const store = new DataMap(
	{ users: [{ name: 'alice' }, { name: 'bob' }] },
	{
		context: {},
		define: [
			{
				path: '$.users[*].name', // All user names
				get: (value) => String(value).toUpperCase(),
			},
		],
	},
);

store.get('/users/0/name'); // 'ALICE'
store.get('/users/1/name'); // 'BOB'
```

## Chained Definitions

Multiple definitions can target the same path. They execute in order:

```typescript
const store = new DataMap(
	{ value: 'hello' },
	{
		context: {},
		define: [
			{
				pointer: '/value',
				get: (v) => String(v).toUpperCase(), // First: uppercase
			},
			{
				pointer: '/value',
				get: (v) => `[${v}]`, // Second: wrap
			},
		],
	},
);

store.get('/value'); // '[HELLO]'
```

## Factory Functions

Definitions can be factory functions for dynamic configuration:

```typescript
const store = new DataMap(
	{ multiplier: 2, value: 10 },
	{
		context: { prefix: 'Result: ' },
		define: [
			// Factory function receives instance and context
			(instance, ctx) => ({
				pointer: '/computed',
				get: {
					deps: ['/multiplier', '/value'],
					fn: (_, [mult, val]) => {
						return `${ctx.prefix}${Number(mult) * Number(val)}`;
					},
				},
			}),
		],
	},
);

store.get('/computed'); // 'Result: 20'
```

### Returning Multiple Definitions

Factory functions can return an array:

```typescript
const store = new DataMap(data, {
	context: {},
	define: [
		(instance, ctx) => [
			{ pointer: '/a', get: (v) => v * 2 },
			{ pointer: '/b', get: (v) => v * 3 },
			{ pointer: '/c', get: (v) => v * 4 },
		],
	],
});
```

## Using Context

Context is passed to all getters and setters:

```typescript
interface AppContext {
	locale: string;
	currency: string;
}

const store = new DataMap<any, AppContext>(
	{ price: 1000 },
	{
		context: { locale: 'en-US', currency: 'USD' },
		define: [
			{
				pointer: '/formattedPrice',
				get: (_, deps, instance, ctx) => {
					const price = instance.get('/price') as number;
					return new Intl.NumberFormat(ctx.locale, {
						style: 'currency',
						currency: ctx.currency,
					}).format(price / 100);
				},
			},
		],
	},
);

store.get('/formattedPrice'); // '$10.00'
```

## Full Definition Shape

```typescript
interface Definition<T, Ctx> {
	// Path specification (one required)
	path?: string; // JSONPath pattern
	pointer?: string; // JSON Pointer (exact)

	// Transformers
	get?: GetterFn<T, Ctx> | GetterConfig<T, Ctx>;
	set?: SetterFn<T, Ctx> | SetterConfig<T, Ctx>;

	// Common options
	deps?: string[]; // Dependency paths
	readOnly?: boolean; // Prevent writes
	defaultValue?: unknown; // Initial value
}

interface GetterConfig<T, Ctx> {
	fn: GetterFn<T, Ctx>;
	deps?: string[];
}

interface SetterConfig<T, Ctx> {
	fn: SetterFn<T, Ctx>;
	deps?: string[];
}
```

## Common Patterns

### Computed Sum

```typescript
{
  pointer: '/total',
  get: {
    deps: ['/items'],
    fn: (_, [items]) => {
      return (items as any[]).reduce((sum, item) => sum + item.price, 0);
    }
  }
}
```

### Date Conversion

```typescript
{
  pointer: '/createdAt',
  get: (timestamp) => new Date(timestamp as number),
  set: (date) => {
    if (date instanceof Date) return date.getTime();
    return new Date(date as string).getTime();
  }
}
```

### Clamped Value

```typescript
{
  pointer: '/volume',
  set: (value) => Math.max(0, Math.min(100, Number(value)))
}
```

### Trimmed String

```typescript
{
  path: '$.user.*',  // All user fields
  set: (value) => typeof value === 'string' ? value.trim() : value
}
```

### Derived Status

```typescript
{
  pointer: '/status',
  get: {
    deps: ['/errors', '/loading'],
    fn: (_, [errors, loading]) => {
      if (loading) return 'loading';
      if ((errors as any[]).length > 0) return 'error';
      return 'ready';
    }
  }
}
```

### Protected Fields

```typescript
{
  pointer: '/password',
  get: () => '********',  // Never expose
  readOnly: true          // Never modify via API
}
```

## Definitions vs Subscriptions

| Feature         | Definitions                 | Subscriptions          |
| --------------- | --------------------------- | ---------------------- |
| Purpose         | Transform values            | React to changes       |
| Timing          | Synchronous                 | Before/on/after stages |
| Can cancel?     | Via setter throwing         | Via cancel() function  |
| Multiple stages | No                          | Yes (before/on/after)  |
| Best for        | Computed values, validation | Side effects, logging  |

Use definitions for:

- Computed/derived values
- Value normalization
- Type conversion
- Read-only enforcement

Use subscriptions for:

- Logging and analytics
- External sync
- Complex validation with cancel
- Side effects

## Preserving Definitions in Clones

Definitions are preserved when cloning:

```typescript
const original = new DataMap(
	{ value: 10 },
	{
		context: {},
		define: [{ pointer: '/value', get: (v) => Number(v) * 2 }],
	},
);

const cloned = original.clone();
cloned.get('/value'); // 20 (definition preserved)
```

## Next Steps

- [Subscriptions Guide](./subscriptions.md) - Event-based reactions
- [API Reference: Definitions](../api/definitions.md) - Full type definitions
- [Architecture: Definitions](../architecture/design-overview.md) - Internal design
