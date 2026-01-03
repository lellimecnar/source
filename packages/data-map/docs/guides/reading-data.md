# Reading Data

This guide covers all the ways to read data from a DataMap.

## Basic Reading

### `get(pathOrPointer, options?)`

Returns a single value at the specified path. If the path matches multiple values, only the first is returned.

```typescript
const store = new DataMap({
	user: { name: 'Alice', age: 30 },
	items: ['a', 'b', 'c'],
});

// JSON Pointer syntax
store.get('/user/name'); // 'Alice'
store.get('/items/0'); // 'a'
store.get(''); // { user: {...}, items: [...] }

// JSONPath syntax
store.get('$.user.name'); // 'Alice'
store.get('$.items[0]'); // 'a'
store.get('$'); // { user: {...}, items: [...] }
```

### `getAll(pathOrPointer, options?)`

Returns an array of all values matching the path.

```typescript
const store = new DataMap({
	users: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
});

// Get all names
store.getAll('$.users[*].name'); // ['Alice', 'Bob', 'Charlie']

// Single value still returns array
store.getAll('/users/0/name'); // ['Alice']

// No matches returns empty array (non-strict mode)
store.getAll('$.missing'); // []
```

### `resolve(pathOrPointer, options?)`

Returns detailed match information including pointers and metadata.

```typescript
const store = new DataMap({
	users: [{ name: 'Alice' }, { name: 'Bob' }],
});

const matches = store.resolve('$.users[*].name');
// [
//   { pointer: '/users/0/name', value: 'Alice' },
//   { pointer: '/users/1/name', value: 'Bob' }
// ]
```

This is useful when you need to know the exact pointers for the matched values.

### `peek(pointer, options?)`

Returns the raw value at a pointer **without triggering any subscriptions**.

```typescript
const store = new DataMap({ count: 0 });

store.subscribe({
	path: '/count',
	on: 'get', // or 'resolve'
	fn: () => console.log('Read happened!'),
});

store.get('/count'); // logs "Read happened!"
store.peek('/count'); // No log! Silent read.
```

**Use cases:**

- Reading values inside subscription handlers without triggering recursion
- Debugging without side effects
- Performance-critical reads where subscriptions aren't needed

**Limitations:**

- Only accepts JSON Pointers (not JSONPath)
- Does not apply getters or default values from definitions
- Bypasses all subscription hooks (`get`, `resolve`, `before`, `on`, `after`)

## Path Syntax Examples

### JSON Pointer

```typescript
const store = new DataMap({
	a: { b: { c: 1 } },
	items: [10, 20, 30],
	'special/key': 'value',
	'key~tilde': 'value2',
});

// Nested access
store.get('/a/b/c'); // 1

// Array index
store.get('/items/1'); // 20

// Special characters (escaped per RFC 6901)
store.get('/special~1key'); // 'value' (~1 = /)
store.get('/key~0tilde'); // 'value2' (~0 = ~)

// Root access
store.get(''); // entire object
store.get('#'); // entire object (URI fragment)
store.get('#/a/b'); // { c: 1 }
```

### JSONPath Wildcards

```typescript
const store = new DataMap({
	users: [
		{ name: 'Alice', role: 'admin' },
		{ name: 'Bob', role: 'user' },
		{ name: 'Charlie', role: 'user' },
	],
});

// All items in array
store.getAll('$.users[*]'); // [{ name: 'Alice'... }, ...]

// All properties of all users
store.getAll('$.users[*].name'); // ['Alice', 'Bob', 'Charlie']

// Wildcard on object properties
store.getAll('$.users[0].*'); // ['Alice', 'admin']
```

### JSONPath Filters

```typescript
const store = new DataMap({
	products: [
		{ name: 'Widget', price: 10, inStock: true },
		{ name: 'Gadget', price: 50, inStock: false },
		{ name: 'Gizmo', price: 25, inStock: true },
	],
});

// Filter by boolean
store.getAll('$.products[?(@.inStock == true)].name');
// ['Widget', 'Gizmo']

// Filter by comparison
store.getAll('$.products[?(@.price > 20)].name');
// ['Gadget', 'Gizmo']

// Multiple conditions
store.getAll('$.products[?(@.price < 30 && @.inStock == true)].name');
// ['Widget', 'Gizmo']
```

### JSONPath Slices

```typescript
const store = new DataMap({
	items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
});

// First 3 items
store.getAll('$.items[0:3]'); // [0, 1, 2]

// Items from index 5 onwards
store.getAll('$.items[5:]'); // [5, 6, 7, 8, 9]

// Every other item
store.getAll('$.items[::2]'); // [0, 2, 4, 6, 8]

// Negative indices (from end)
store.getAll('$.items[-3:]'); // [7, 8, 9]
```

### JSONPath Recursive Descent

```typescript
const store = new DataMap({
	level1: {
		name: 'first',
		level2: {
			name: 'second',
			level3: {
				name: 'third',
			},
		},
	},
});

// Find all 'name' fields at any depth
store.getAll('$..name');
// ['first', 'second', 'third']

// Find all objects with a 'name' field
store.getAll('$..[?(@.name)]');
// [{ name: 'first', level2: {...} }, { name: 'second', level3: {...} }, { name: 'third' }]
```

## Getting Snapshots

### `getSnapshot()`

Returns a deep clone of the entire data structure:

```typescript
const store = new DataMap({ user: { name: 'Alice' } });

const snapshot = store.getSnapshot();
snapshot.user.name = 'Modified';

// Original is unchanged
store.get('/user/name'); // 'Alice'
```

### `toJSON()`

Equivalent to `getSnapshot()`. Useful for JSON serialization:

```typescript
const store = new DataMap({ a: 1, b: 2 });

JSON.stringify(store.toJSON());
// '{"a":1,"b":2}'

// Can also stringify the store directly
JSON.stringify(store); // Works because toJSON() is called
```

## Strict Mode Behavior

By default, missing paths return `undefined`:

```typescript
const store = new DataMap({ a: 1 });

store.get('/missing'); // undefined
store.getAll('$.nothing[*]'); // []
```

With strict mode, missing paths throw:

```typescript
const store = new DataMap({ a: 1 }, { strict: true });

store.get('/missing'); // throws Error: "Pointer not found: /missing"
store.getAll('$.nothing[*]'); // throws Error

// Override per-call
store.get('/missing', { strict: false }); // undefined (no throw)
```

## Definitions and Getters

When a path has a getter definition, the getter transforms the value:

```typescript
const store = new DataMap(
	{ timestamp: 1704067200000 },
	{
		context: {},
		define: [
			{
				pointer: '/timestamp',
				get: (value) => new Date(value),
			},
		],
	},
);

store.get('/timestamp'); // Date object, not number
```

Getters can also have dependencies which are cached until deps change:

```typescript
const store = new DataMap(
	{ firstName: 'John', lastName: 'Doe', fullName: '' },
	{
		context: {},
		define: [
			{
				pointer: '/fullName',
				deps: ['/firstName', '/lastName'],
				get: (_, [first, last]) => `${first} ${last}`,
			},
		],
	},
);

store.get('/fullName'); // 'John Doe' (cached)
store.set('/firstName', 'Jane');
store.get('/fullName'); // 'Jane Doe' (recomputed)
```

## Comparison Methods

### `equals(other)`

Deep equality comparison:

```typescript
const store1 = new DataMap({ a: 1, b: { c: 2 } });
const store2 = new DataMap({ a: 1, b: { c: 2 } });
const store3 = new DataMap({ a: 1, b: { c: 3 } });

store1.equals(store2); // true
store1.equals(store3); // false

// Can also compare with plain objects
store1.equals({ a: 1, b: { c: 2 } }); // true
```

### `extends(partial)`

Check if the data contains a partial structure:

```typescript
const store = new DataMap({
	user: { name: 'Alice', age: 30, role: 'admin' },
});

// Check for subset of properties
store.extends({ user: { name: 'Alice' } }); // true
store.extends({ user: { age: 30, role: 'admin' } }); // true
store.extends({ user: { name: 'Bob' } }); // false
store.extends({ user: { email: 'x@y.z' } }); // false
```

## Performance Considerations

1. **JSON Pointer is faster** than JSONPath for direct access
2. **Avoid recursive descent** (`$..`) on large data structures
3. **Use specific paths** when possible instead of wildcards
4. **Cache resolved pointers** when you need to read the same path repeatedly

```typescript
// Good: Direct pointer access
store.get('/users/0/name');

// Avoid in hot paths: Complex queries
store.getAll('$..[?(@.active && @.role == "admin")]');
```

## Next Steps

- [Writing Data Guide](./writing-data.md) - Modifying data
- [Subscriptions Guide](./subscriptions.md) - React to changes
- [API Reference](../api/datamap.md) - Complete method documentation
