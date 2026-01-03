# Patch System

RFC 6902 JSON Patch implementation in `@data-map/core`.

## Overview

The patch system implements RFC 6902 JSON Patch, providing:

- Atomic patch operations (add, remove, replace, move, copy, test)
- Automatic intermediate container creation
- Minimal patch generation
- Transaction support with rollback

## RFC 6902 Operations

### add

Adds a value at the target location.

```typescript
{ op: 'add', path: '/users/-', value: { name: 'New' } }
```

**Behavior:**

- If path exists: Error (use `replace`)
- If parent missing: Error in strict mode
- `-` at end of array: Append
- Index in array: Insert at position

### remove

Removes the value at the target location.

```typescript
{ op: 'remove', path: '/users/0' }
```

**Behavior:**

- If path doesn't exist: Error
- Arrays re-index after removal

### replace

Replaces the value at the target location.

```typescript
{ op: 'replace', path: '/config/theme', value: 'dark' }
```

**Behavior:**

- Path must exist
- Equivalent to `remove` + `add`

### move

Moves a value from one location to another.

```typescript
{ op: 'move', from: '/temp', path: '/permanent' }
```

**Behavior:**

- Source must exist
- Source is removed
- Value appears at destination

### copy

Copies a value from one location to another.

```typescript
{ op: 'copy', from: '/template', path: '/instance' }
```

**Behavior:**

- Source must exist
- Source remains unchanged
- Deep copy to destination

### test

Tests that a value equals the expected value.

```typescript
{ op: 'test', path: '/version', value: 1 }
```

**Behavior:**

- If test fails: Entire patch fails
- Deep equality comparison
- Useful for optimistic locking

## Patch Building

### Single Value Set

```typescript
function buildSetPatch(
	pointer: string,
	value: unknown,
	data: unknown,
): Operation[] {
	const exists = pointerExists(data, pointer);

	if (exists) {
		return [{ op: 'replace', path: pointer, value }];
	}

	return buildAddWithContainers(pointer, value, data);
}
```

### Intermediate Container Creation

When setting a nested path where parents don't exist:

```typescript
// data = {}
// Setting /a/b/c = 1

buildSetPatch('/a/b/c', 1, {});

// Result:
[{ op: 'add', path: '/a', value: { b: { c: 1 } } }];
```

**Algorithm:**

```typescript
function buildAddWithContainers(
	pointer: string,
	value: unknown,
	data: unknown,
): Operation[] {
	const segments = parsePointer(pointer);
	let existingPath = '';
	let current = data;

	// Find deepest existing path
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const testPath = existingPath + '/' + escapePointer(segment);

		if (!hasProperty(current, segment)) {
			// Build from here
			const remaining = segments.slice(i);
			const nestedValue = buildNested(remaining, value);
			return [{ op: 'add', path: testPath, value: nestedValue }];
		}

		existingPath = testPath;
		current = current[segment];
	}

	// Full path exists
	return [{ op: 'replace', path: pointer, value }];
}

function buildNested(segments: string[], value: unknown): unknown {
	let result = value;

	for (let i = segments.length - 1; i > 0; i--) {
		const segment = segments[i];
		if (isArrayIndex(segment)) {
			const arr = [];
			arr[parseInt(segment)] = result;
			result = arr;
		} else {
			result = { [segment]: result };
		}
	}

	return result;
}
```

### Array Operation Patches

```typescript
// push
buildPushPatch('/items', 4, 5, 6);
// [
//   { op: 'add', path: '/items/-', value: 4 },
//   { op: 'add', path: '/items/-', value: 5 },
//   { op: 'add', path: '/items/-', value: 6 }
// ]

// unshift
buildUnshiftPatch('/items', 0);
// [
//   { op: 'add', path: '/items/0', value: 0 }
// ]

// pop (needs current length)
buildPopPatch('/items', 3); // array length = 3
// [
//   { op: 'remove', path: '/items/2' }
// ]

// splice
buildSplicePatch('/items', 1, 2, 'a', 'b');
// [
//   { op: 'remove', path: '/items/2' },
//   { op: 'remove', path: '/items/1' },
//   { op: 'add', path: '/items/1', value: 'a' },
//   { op: 'add', path: '/items/2', value: 'b' }
// ]
```

## Patch Application

### Using json-p3

DataMap delegates patch application to `json-p3`:

```typescript
import { jsonpatch } from 'json-p3';

function applyOperations<T>(data: T, ops: Operation[]): T {
	if (ops.length === 0) {
		return data;
	}

	// json-p3 returns a new object (immutable)
	return jsonpatch.apply(data, ops);
}
```

### Error Handling

```typescript
try {
	const newData = applyOperations(data, [
		{ op: 'test', path: '/version', value: 1 },
		{ op: 'replace', path: '/data', value: newValue },
	]);
} catch (error) {
	// Test failed or path not found
	console.error('Patch failed:', error.message);
}
```

## Patch Optimization

### Combining Adjacent Operations

```typescript
// Before optimization:
[
	{ op: 'replace', path: '/a', value: 1 },
	{ op: 'replace', path: '/a', value: 2 },
	{ op: 'replace', path: '/a', value: 3 },
][
	// After optimization:
	{ op: 'replace', path: '/a', value: 3 }
];
```

### Dead Operation Elimination

```typescript
// Before:
[
  { op: 'add', path: '/temp', value: 1 },
  { op: 'remove', path: '/temp' }
]

// After: (empty - no net effect)
[]
```

### Array Index Adjustment

When multiple array operations occur in sequence:

```typescript
// Removing indices 1 and 3 from array of [a, b, c, d, e]
// Naive approach fails because indices shift

// Correct order (highest index first):
[
	{ op: 'remove', path: '/items/3' }, // First, removes 'd'
	{ op: 'remove', path: '/items/1' }, // Then, removes 'b'
];
// Result: [a, c, e]
```

## Transaction Support

### Implementation

```typescript
transaction<R>(fn: (dm: this) => R): R {
  const snapshot = this.getSnapshot();

  try {
    return this.batch(fn);
  } catch (error) {
    // Rollback to snapshot
    this._data = snapshot;
    throw error;
  }
}
```

### Rollback Semantics

```typescript
const store = new DataMap({ count: 0 });

try {
	store.transaction((dm) => {
		dm.set('/count', 10);
		dm.set('/count', 20);
		throw new Error('Abort!');
	});
} catch {
	// Rolled back
}

store.get('/count'); // 0 (original value)
```

## .toPatch() Methods

Every mutation method has a `.toPatch()` variant:

```typescript
// Preview without applying
const ops = store.set.toPatch('/name', 'Bob');
console.log(ops);
// [{ op: 'replace', path: '/name', value: 'Bob' }]

// Data unchanged
store.get('/name'); // Still original value

// Apply manually if desired
store.patch(ops);
```

### Use Cases

1. **Preview Changes**: See what would happen before committing
2. **Remote Sync**: Send patches to a server
3. **Undo/Redo**: Store patches for history
4. **Debugging**: Inspect operation sequences

## Patch Validation

### Pre-Application Checks

```typescript
function validatePatch(ops: Operation[], data: unknown): void {
	for (const op of ops) {
		switch (op.op) {
			case 'add':
				validateAddTarget(op.path, data);
				break;
			case 'remove':
			case 'replace':
				validatePathExists(op.path, data);
				break;
			case 'move':
			case 'copy':
				validatePathExists(op.from, data);
				break;
			case 'test':
				// Validated during apply
				break;
		}
	}
}
```

### Test Operation Usage

```typescript
// Optimistic locking pattern
store.patch([
	{ op: 'test', path: '/version', value: currentVersion },
	{ op: 'replace', path: '/data', value: newData },
	{ op: 'replace', path: '/version', value: currentVersion + 1 },
]);
// Fails atomically if version changed
```

## Performance Characteristics

| Operation          | Complexity | Notes                         |
| ------------------ | ---------- | ----------------------------- |
| Single add/replace | O(d)       | d = path depth                |
| Remove from array  | O(n)       | n = array length              |
| Move/Copy          | O(d + s)   | d = depth, s = value size     |
| Test               | O(s)       | s = value size (deep compare) |
| Batch of k ops     | O(k × avg) | Sequential application        |

## Integration with json-p3

DataMap uses `json-p3` for:

- **JSONPath queries**: `$.users[*].name`
- **JSON Pointer access**: `/users/0/name`
- **Patch application**: `jsonpatch.apply()`

This ensures RFC compliance and battle-tested implementation.

## See Also

- [Architecture Overview](./design-overview.md)
- [Path System](./path-system.md)
- [RFC 6902 - JSON Patch](https://tools.ietf.org/html/rfc6902)
- [json-p3 Documentation](https://github.com/jg-rp/json-p3)
