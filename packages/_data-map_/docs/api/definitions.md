# Definition Types

TypeScript types and interfaces for computed properties and definitions.

## Core Types

### `Definition<T, Ctx>`

Configuration for a computed or transformed property.

```typescript
type Definition<T, Ctx> =
	| DefinitionWithPath<T, Ctx>
	| DefinitionWithPointer<T, Ctx>;

interface DefinitionBase<T, Ctx> {
	/**
	 * Getter function or config that computes the value.
	 * Called when reading the path.
	 */
	get?: GetterFn<T, Ctx> | GetterConfig<T, Ctx>;

	/**
	 * Setter function or config that transforms incoming values.
	 * Called when writing to the path.
	 */
	set?: SetterFn<T, Ctx> | SetterConfig<T, Ctx>;

	/**
	 * Dependency paths. Values from these paths are passed to getter/setter.
	 * Changes to dependencies invalidate cached getters.
	 */
	deps?: string[];

	/**
	 * When true, prevents writes to this path.
	 */
	readOnly?: boolean;

	/**
	 * Initial value to use if path doesn't exist at construction.
	 */
	defaultValue?: unknown;
}

interface DefinitionWithPath<T, Ctx> extends DefinitionBase<T, Ctx> {
	/** JSONPath pattern where this definition applies */
	path: string;
	pointer?: never;
}

interface DefinitionWithPointer<T, Ctx> extends DefinitionBase<T, Ctx> {
	/** JSON Pointer where this definition applies */
	pointer: string;
	path?: never;
}
```

**Example:**

```typescript
const store = new DataMap(
	{ firstName: 'John', lastName: 'Doe' },
	{
		context: {},
		define: [
			{
				pointer: '/fullName',
				defaultValue: '',
				get: {
					deps: ['/firstName', '/lastName'],
					fn: (_, [first, last]) => `${first} ${last}`,
				},
				readOnly: true,
			},
		],
	},
);

store.get('/fullName'); // 'John Doe'
store.set('/fullName', 'Jane'); // Throws (readOnly)
```

---

### `DefinitionFactory<T, Ctx>`

Factory function that returns definitions dynamically.

```typescript
type DefinitionFactory<T, Ctx> = (
	instance: DataMap<T, Ctx>,
	ctx: Ctx,
) => Definition<T, Ctx> | Definition<T, Ctx>[];
```

Factories are invoked at construction time with access to the DataMap instance and context.

```typescript
const createTimestampDef: DefinitionFactory<AppData, AppContext> = (
	dm,
	ctx,
) => ({
	pointer: '/lastModified',
	get: () => Date.now(),
	readOnly: true,
});

const store = new DataMap(data, {
	context: {},
	define: [createTimestampDef],
});
```

---

### `GetterFn<T, Ctx>`

Function that computes a value when reading.

```typescript
type GetterFn<T, Ctx> = (
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;
```

**Parameters:**

| Parameter      | Type              | Description                         |
| -------------- | ----------------- | ----------------------------------- |
| `currentValue` | `unknown`         | Raw value at the path               |
| `depValues`    | `unknown[]`       | Values from `deps` array (in order) |
| `instance`     | `DataMap<T, Ctx>` | The DataMap instance                |
| `context`      | `Ctx`             | Context from construction           |

---

### `GetterConfig<T, Ctx>`

Extended getter configuration with dependencies.

```typescript
interface GetterConfig<T, Ctx> {
	fn: GetterFn<T, Ctx>;
	deps?: string[];
}
```

**Example:**

```typescript
{
	pointer: '/total',
	get: {
		deps: ['/quantity', '/unitPrice'],
		fn: (_, [qty, price]) => Number(qty) * Number(price),
	},
}
```

---

### `SetterFn<T, Ctx>`

Function that transforms values when writing.

```typescript
type SetterFn<T, Ctx> = (
	newValue: unknown,
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;
```

**Parameters:**

| Parameter      | Type              | Description                         |
| -------------- | ----------------- | ----------------------------------- |
| `newValue`     | `unknown`         | Incoming value to transform         |
| `currentValue` | `unknown`         | Current value at the path           |
| `depValues`    | `unknown[]`       | Values from `deps` array (in order) |
| `instance`     | `DataMap<T, Ctx>` | The DataMap instance                |
| `context`      | `Ctx`             | Context from construction           |

---

### `SetterConfig<T, Ctx>`

Extended setter configuration with dependencies.

```typescript
interface SetterConfig<T, Ctx> {
	fn: SetterFn<T, Ctx>;
	deps?: string[];
}
```

**Example:**

```typescript
{
	pointer: '/email',
	set: {
		deps: [],
		fn: (value) => String(value).toLowerCase().trim(),
	},
}
```

---

## Default Values

The `defaultValue` property initializes paths at construction time:

```typescript
const store = new DataMap(
	{ user: {} },
	{
		context: {},
		define: [
			{ pointer: '/user/settings', defaultValue: { theme: 'dark' } },
			{ pointer: '/user/preferences', defaultValue: [] },
		],
	},
);

store.get('/user/settings'); // { theme: 'dark' }
```

### Behavior

- Applied only at construction time
- Only if the path does not already exist
- Works with both `path` (JSONPath) and `pointer` definitions

---

## Dependency Tracking

Definitions with `deps` automatically re-evaluate when dependencies change:

```typescript
{
	pointer: '/age',
	get: {
		deps: ['/birthYear'],
		fn: (_, [birthYear], dm, ctx) => ctx.currentYear - birthYear,
	},
}
```

### Caching

- Getter results are **cached** when `deps` is specified
- Cache is **invalidated** automatically when any dependency changes
- Getters without `deps` are not cached

---

## Definition Patterns

### Read-Only Computed Property

```typescript
{
  path: '/computed/value',
  get: (data) => expensiveComputation(data),
  readOnly: true
}
```

### Write Transform

```typescript
{
  path: '/email',
  set: (value) => String(value).toLowerCase().trim()
}
```

### Read Transform

```typescript
{
  path: '/price',
  get: (data, ctx, ptr) => {
    const rawPrice = jsonpointer.get(data, ptr);
    return `$${rawPrice.toFixed(2)}`;
  }
}
```

### Bidirectional Transform

```typescript
{
  path: '/temperatureCelsius',
  get: (data) => (data.temperatureFahrenheit - 32) * 5/9,
  set: (celsius) => celsius * 9/5 + 32
}
```

### Pattern-Based Definition

```typescript
{
  path: '$.users[*].displayName',
  get: (data, ctx, ptr) => {
    const match = ptr.match(/\/users\/(\d+)/);
    if (match) {
      const user = data.users[parseInt(match[1])];
      return `${user.firstName} ${user.lastName}`;
    }
    return '';
  },
  readOnly: true
}
```

---

## Definition Factory Patterns

### Multiple Related Definitions

```typescript
const userDefinitions: DefinitionFactory<AppData, AppContext> = (dm) => [
	{
		path: '/currentUser/fullName',
		get: (data) => `${data.currentUser.first} ${data.currentUser.last}`,
		readOnly: true,
	},
	{
		path: '/currentUser/initials',
		get: (data) =>
			`${data.currentUser.first[0]}${data.currentUser.last[0]}`.toUpperCase(),
		readOnly: true,
	},
];
```

### Context-Dependent Definitions

```typescript
const roleDefinitions: DefinitionFactory<AppData, AppContext> = (dm) => {
	const isAdmin = dm.context?.userRole === 'admin';

	return {
		path: '/sensitiveData',
		get: (data) => (isAdmin ? data.sensitiveData : '[REDACTED]'),
		readOnly: !isAdmin,
	};
};
```

### Dynamic Registration Based on Data

```typescript
const dynamicDefs: DefinitionFactory<ConfigData, void> = (dm) => {
	const data = dm.getSnapshot();

	return data.fields.map((field) => ({
		path: `/computed/${field.name}`,
		get: () => computeField(field),
		type: field.type,
	}));
};
```

---

## Type Metadata

Definitions can include a `type` property for categorization:

```typescript
const store = new DataMap(data, {
	define: [
		{ path: '/total', get: computeTotal, type: 'currency' },
		{ path: '/createdAt', get: () => new Date(), type: 'timestamp' },
		{ path: '/status', get: deriveStatus, type: 'enum' },
	],
});

const matches = store.resolve('$..total');
matches.forEach((m) => {
	if (m.type === 'currency') {
		// Format as currency
	}
});
```

---

## Definition Resolution Order

When multiple definitions could match a path:

1. **Exact match** takes precedence over pattern match
2. **More specific pattern** wins over less specific
3. **Later registration** overrides earlier for same path

```typescript
const store = new DataMap(data, {
	define: [
		{ path: '$.users[*].name', get: fn1 }, // General pattern
		{ path: '/users/0/name', get: fn2 }, // Specific - wins for /users/0/name
	],
});
```

---

## Error Handling

### Getter Errors

```typescript
{
  path: '/risky',
  get: (data) => {
    if (!data.required) {
      throw new Error('Required data missing');
    }
    return data.required.value;
  }
}
```

In strict mode, getter errors propagate. In non-strict mode, returns `undefined`.

### Setter Validation

```typescript
{
  path: '/email',
  set: (value) => {
    const email = String(value);
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
    return email.toLowerCase();
  }
}
```

Setter errors always propagate, preventing invalid data.

---

## See Also

- [DataMap API](./datamap.md)
- [Definitions Guide](../guides/definitions.md)
- [Types & Interfaces](./types.md)
