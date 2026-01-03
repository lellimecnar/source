# Definition Types

TypeScript types and interfaces for computed properties and definitions.

## Core Types

### `Definition<T, Ctx>`

Configuration for a computed or transformed property.

```typescript
interface Definition<T, Ctx> {
	/**
	 * Path pattern where this definition applies.
	 * Can be JSON Pointer or JSONPath.
	 */
	path: string;

	/**
	 * Getter function that computes the value.
	 * Called when reading the path.
	 */
	get?: GetterFn<T, Ctx>;

	/**
	 * Setter function that transforms incoming values.
	 * Called when writing to the path.
	 */
	set?: SetterFn<T, Ctx>;

	/**
	 * When true, prevents writes to this path.
	 */
	readOnly?: boolean;

	/**
	 * Optional type identifier for the value.
	 */
	type?: string;
}
```

**Example:**

```typescript
const store = new DataMap(
	{ firstName: 'John', lastName: 'Doe' },
	{
		define: [
			{
				path: '/fullName',
				get: (data) => `${data.firstName} ${data.lastName}`,
				readOnly: true,
				type: 'computed',
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
	dataMap: DataMap<T, Ctx>,
) => Definition<T, Ctx> | Definition<T, Ctx>[];
```

Factories are invoked at construction time with access to the DataMap instance.

```typescript
const createTimestampDef: DefinitionFactory<AppData, AppContext> = (dm) => ({
	path: '/lastModified',
	get: () => Date.now(),
	readOnly: true,
});

const store = new DataMap(data, {
	define: [createTimestampDef],
});
```

---

### `GetterFn<T, Ctx>`

Function that computes a value when reading.

```typescript
type GetterFn<T, Ctx> = (
	data: T,
	context: Ctx | undefined,
	pointer: string,
) => unknown;
```

**Parameters:**

| Parameter | Type               | Description                  |
| --------- | ------------------ | ---------------------------- |
| `data`    | `T`                | Complete data store snapshot |
| `context` | `Ctx \| undefined` | Context from construction    |
| `pointer` | `string`           | JSON Pointer being read      |

**Example:**

```typescript
const totalGetter: GetterFn<CartData, AppContext> = (data, ctx, ptr) => {
	const items = data.cart.items;
	const subtotal = items.reduce((sum, item) => sum + item.price, 0);
	const taxRate = ctx?.taxRate ?? 0;
	return subtotal * (1 + taxRate);
};

const store = new DataMap(cartData, {
	context: { taxRate: 0.08 },
	define: [{ path: '/cart/total', get: totalGetter, readOnly: true }],
});
```

---

### `SetterFn<T, Ctx>`

Function that transforms values when writing.

```typescript
type SetterFn<T, Ctx> = (
	value: unknown,
	data: T,
	context: Ctx | undefined,
	pointer: string,
) => unknown;
```

**Parameters:**

| Parameter | Type               | Description                  |
| --------- | ------------------ | ---------------------------- |
| `value`   | `unknown`          | Incoming value to transform  |
| `data`    | `T`                | Complete data store snapshot |
| `context` | `Ctx \| undefined` | Context from construction    |
| `pointer` | `string`           | JSON Pointer being written   |

**Example:**

```typescript
const nameSetter: SetterFn<UserData, AppContext> = (value, data, ctx, ptr) => {
	// Normalize name: trim and capitalize
	const name = String(value).trim();
	return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const store = new DataMap(userData, {
	define: [{ path: '$.users[*].name', set: nameSetter }],
});

store.set('/users/0/name', '  ALICE  ');
store.get('/users/0/name'); // 'Alice'
```

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
