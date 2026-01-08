# Array Operations

DataMap provides convenient methods for manipulating arrays that mirror JavaScript's native array methods while maintaining the patch-first architecture.

## Overview

All array methods:

- Work with both JSON Pointer and JSONPath
- Generate RFC 6902 patch operations internally
- Trigger subscriptions appropriately
- Have `.toPatch()` variants for generating patches without applying

## push()

Append items to the end of an array:

```typescript
const store = new DataMap({ items: [1, 2, 3] });

store.push('/items', 4, 5);
store.get('/items'); // [1, 2, 3, 4, 5]

// Using JSONPath
store.push('$.items', 6);
store.get('/items'); // [1, 2, 3, 4, 5, 6]
```

### Generates These Patches

```typescript
const ops = store.push.toPatch('/items', 4, 5);
// [
//   { op: 'add', path: '/items/-', value: 4 },
//   { op: 'add', path: '/items/-', value: 5 }
// ]
```

### Creates Array if Missing

```typescript
const store = new DataMap({});
store.push('/newArray', 1, 2);
store.get('/newArray'); // [1, 2]
```

## pop()

Remove and return the last item from an array:

```typescript
const store = new DataMap({ items: [1, 2, 3] });

const last = store.pop('/items');
console.log(last); // 3
store.get('/items'); // [1, 2]
```

### pop.toPatch()

Generate the patch without applying:

```typescript
const ops = store.pop.toPatch('/items');
// [{ op: 'remove', path: '/items/2' }]
```

### Empty Array Behavior

```typescript
const store = new DataMap({ items: [] });
const result = store.pop('/items');
console.log(result); // undefined
store.get('/items'); // []
```

## shift()

Remove and return the first item from an array:

```typescript
const store = new DataMap({ items: [1, 2, 3] });

const first = store.shift('/items');
console.log(first); // 1
store.get('/items'); // [2, 3]
```

### shift.toPatch()

Generate the patch without applying:

```typescript
const ops = store.shift.toPatch('/items');
// [{ op: 'remove', path: '/items/0' }]
```

### Index Re-mapping

When you shift, all subsequent indices are updated. Subscriptions and pointers adjust accordingly:

```typescript
const store = new DataMap({ items: ['a', 'b', 'c'] });

// Before: /items/0='a', /items/1='b', /items/2='c'
store.shift('/items');
// After:  /items/0='b', /items/1='c'
```

## unshift()

Insert items at the beginning of an array:

```typescript
const store = new DataMap({ items: [1, 2, 3] });

store.unshift('/items', -1, 0);
store.get('/items'); // [-1, 0, 1, 2, 3]
```

### Generates These Patches

```typescript
const ops = store.unshift.toPatch('/items', -1, 0);
// Items are inserted in order at position 0
// [
//   { op: 'add', path: '/items/0', value: 0 },
//   { op: 'add', path: '/items/0', value: -1 }
// ]
// (Order ensures final result is [-1, 0, ...])
```

## splice()

Remove and/or insert items at a specific position:

```typescript
const store = new DataMap({ items: [1, 2, 3, 4, 5] });

// Remove 2 items starting at index 1, insert 99
const removed = store.splice('/items', 1, 2, 99);
console.log(removed); // [2, 3]
store.get('/items'); // [1, 99, 4, 5]
```

### Method Signature

```typescript
splice(
  pathOrPointer: string,
  start: number,
  deleteCount?: number,
  ...items: unknown[]
): unknown[]
```

### Examples

```typescript
const store = new DataMap({ arr: [1, 2, 3, 4, 5] });

// Remove items only
store.splice('/arr', 2, 2); // [1, 2, 5]

// Insert items only (deleteCount = 0)
store.splice('/arr', 1, 0, 'a', 'b'); // [1, 'a', 'b', 2, 5]

// Replace items
store.splice('/arr', 0, 1, 'first'); // ['first', 'a', 'b', 2, 5]
```

### splice.toPatch()

Generate the patches without applying:

```typescript
const ops = store.splice.toPatch('/items', 1, 2, 'a', 'b');
// Generates remove operations for deleted items
// and add operations for inserted items
```

## sort()

Sort an array in place:

```typescript
const store = new DataMap({ numbers: [3, 1, 4, 1, 5, 9, 2, 6] });

store.sort('/numbers');
store.get('/numbers'); // [1, 1, 2, 3, 4, 5, 6, 9]
```

### Custom Compare Function

```typescript
const store = new DataMap({
	items: [
		{ name: 'Charlie', age: 35 },
		{ name: 'Alice', age: 28 },
		{ name: 'Bob', age: 42 },
	],
});

// Sort by age
store.sort('/items', (a, b) => a.age - b.age);
// [{ name: 'Alice', age: 28 }, { name: 'Charlie', age: 35 }, { name: 'Bob', age: 42 }]

// Sort by name
store.sort('/items', (a, b) => a.name.localeCompare(b.name));
// [{ name: 'Alice'... }, { name: 'Bob'... }, { name: 'Charlie'... }]
```

### Implementation Note

Sort is implemented as a single `replace` operation on the entire array for correctness:

```typescript
const ops = store.sort.toPatch('/numbers');
// [{ op: 'replace', path: '/numbers', value: [sorted array] }]
```

## shuffle()

Randomly reorder an array:

```typescript
const store = new DataMap({ deck: [1, 2, 3, 4, 5] });

store.shuffle('/deck');
// Array is now in random order
```

### Implementation Note

Like sort, shuffle is a single `replace` operation:

```typescript
const ops = store.shuffle.toPatch('/deck');
// [{ op: 'replace', path: '/deck', value: [shuffled array] }]
```

## Working with JSONPath

All array methods work with JSONPath too:

```typescript
const store = new DataMap({
	users: [
		{ name: 'Alice', items: [1, 2] },
		{ name: 'Bob', items: [3, 4] },
	],
});

// Push to first user's items
store.push('$.users[0].items', 99);
store.get('/users/0/items'); // [1, 2, 99]
```

## Generating Patches

All array methods have `.toPatch()` variants:

```typescript
const store = new DataMap({ items: [1, 2, 3] });

// Generate patches without applying
const pushOps = store.push.toPatch('/items', 4);
const unshiftOps = store.unshift.toPatch('/items', 0);
const sortOps = store.sort.toPatch('/items');
const shuffleOps = store.shuffle.toPatch('/items');

// Original array unchanged
store.get('/items'); // [1, 2, 3]

// Apply all at once
store.patch([...unshiftOps, ...pushOps, ...sortOps]);
```

## Batch Array Operations

For multiple array operations, use `batch()` to optimize notifications:

```typescript
const store = new DataMap({ items: [] });

store.batch((dm) => {
	dm.push('/items', 1, 2, 3);
	dm.push('/items', 4, 5);
	dm.unshift('/items', 0);
	dm.sort('/items');
});

// All subscriptions fire once at the end
store.get('/items'); // [0, 1, 2, 3, 4, 5]
```

## Subscriptions with Arrays

### Watching Array Elements

```typescript
const store = new DataMap({ items: ['a', 'b', 'c'] });

// Watch all array elements
store.subscribe({
	path: '$.items[*]',
	on: 'patch',
	fn: (value, event) => {
		console.log(`${event.pointer} changed to ${value}`);
	},
});

store.push('/items', 'd');
// Console: "/items/3 changed to d"
```

### Watching Specific Indices

```typescript
store.subscribe({
	path: '/items/0',
	on: 'patch',
	fn: (value) => console.log(`First item is now: ${value}`),
});

store.shift('/items'); // Triggers subscription as /items/0 changes
```

## Common Patterns

### Queue (FIFO)

```typescript
const queue = new DataMap({ items: [] });

// Enqueue
queue.push('/items', 'task1');
queue.push('/items', 'task2');

// Dequeue
const next = queue.shift('/items'); // 'task1'
```

### Stack (LIFO)

```typescript
const stack = new DataMap({ items: [] });

// Push
stack.push('/items', 'first');
stack.push('/items', 'second');

// Pop
const top = stack.pop('/items'); // 'second'
```

### Insert at Position

```typescript
const store = new DataMap({ items: [1, 2, 4, 5] });

// Insert 3 at index 2
store.splice('/items', 2, 0, 3);
store.get('/items'); // [1, 2, 3, 4, 5]
```

### Remove by Value

```typescript
const store = new DataMap({ items: ['a', 'b', 'c', 'b', 'd'] });

// Find and remove first 'b'
const items = store.get('/items') as string[];
const index = items.indexOf('b');
if (index !== -1) {
	store.splice('/items', index, 1);
}
store.get('/items'); // ['a', 'c', 'b', 'd']
```

### Remove All Matching

```typescript
const store = new DataMap({
	items: [
		{ id: 1, active: true },
		{ id: 2, active: false },
		{ id: 3, active: true },
	],
});

// Get only active items and replace the array
const active = store.getAll('$.items[?(@.active)]');
store.set('/items', active);
```

### Rotate Array

```typescript
function rotateLeft(store: DataMap, path: string) {
	const first = store.shift(path);
	if (first !== undefined) {
		store.push(path, first);
	}
}

const store = new DataMap({ items: [1, 2, 3, 4] });
rotateLeft(store, '/items');
store.get('/items'); // [2, 3, 4, 1]
```

## Next Steps

- [Batching Guide](./batching.md) - Optimize multiple operations
- [Subscriptions Guide](./subscriptions.md) - React to array changes
- [API Reference](../api/datamap.md) - Complete method signatures
