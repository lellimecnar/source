# @jsonpath/patch

> RFC 6902 JSON Patch implementation with diff generation and fluent builder.

## Overview

`@jsonpath/patch` provides complete JSON Patch (RFC 6902) functionality including applying patches, generating diffs, and a fluent builder API. All operations are immutable.

## Features

- **Full RFC 6902 Compliance**: All 6 operations supported
- **Diff Generation**: Automatically generate patches between documents
- **Inverse Patches**: Get undo operations for any patch
- **Fluent Builder**: Programmatically build patches
- **Immutable**: Original data is never modified

## Installation

```bash
pnpm add @jsonpath/patch
```

## Patch Operations

RFC 6902 defines 6 operations:

| Operation | Description                                 |
| --------- | ------------------------------------------- |
| `add`     | Add a value at the target path              |
| `remove`  | Remove the value at the target path         |
| `replace` | Replace the value at the target path        |
| `move`    | Move a value from one path to another       |
| `copy`    | Copy a value from one path to another       |
| `test`    | Test that a value equals the expected value |

---

## API Reference

### applyPatch()

Apply a patch to a document:

```typescript
import { applyPatch } from '@jsonpath/patch';

const document = { foo: 'bar' };
const patch = [{ op: 'add', path: '/baz', value: 'qux' }];

const result = applyPatch(document, patch);
// { foo: 'bar', baz: 'qux' }

// Original unchanged
console.log(document); // { foo: 'bar' }
```

### applyWithInverse()

Apply a patch and get the inverse (undo) patch:

```typescript
import { applyWithInverse } from '@jsonpath/patch';

const document = { foo: 'bar' };
const patch = [{ op: 'replace', path: '/foo', value: 'baz' }];

const { result, inverse } = applyWithInverse(document, patch);

console.log(result); // { foo: 'baz' }
console.log(inverse); // [{ op: 'replace', path: '/foo', value: 'bar' }]

// Apply inverse to undo
const restored = applyPatch(result, inverse);
console.log(restored); // { foo: 'bar' }
```

### diff()

Generate a patch from comparing two documents:

```typescript
import { diff } from '@jsonpath/patch';

const source = { a: 1, b: 2 };
const target = { a: 1, b: 3, c: 4 };

const patch = diff(source, target);
// [
//   { op: 'replace', path: '/b', value: 3 },
//   { op: 'add', path: '/c', value: 4 }
// ]

// Apply diff to get target
applyPatch(source, patch); // { a: 1, b: 3, c: 4 }
```

---

## Operation Details

### add

Add a value at the specified path:

```typescript
const patch = [{ op: 'add', path: '/foo', value: 'bar' }];

// Add to object
applyPatch({}, patch);
// { foo: 'bar' }

// Add to array (inserts at index)
applyPatch({ arr: [1, 3] }, [{ op: 'add', path: '/arr/1', value: 2 }]);
// { arr: [1, 2, 3] }

// Append to array using "-"
applyPatch({ arr: [1, 2] }, [{ op: 'add', path: '/arr/-', value: 3 }]);
// { arr: [1, 2, 3] }
```

### remove

Remove the value at the specified path:

```typescript
const patch = [{ op: 'remove', path: '/foo' }];

applyPatch({ foo: 'bar', baz: 'qux' }, patch);
// { baz: 'qux' }

// Remove from array (splices out)
applyPatch({ arr: [1, 2, 3] }, [{ op: 'remove', path: '/arr/1' }]);
// { arr: [1, 3] }
```

### replace

Replace the value at the specified path:

```typescript
const patch = [{ op: 'replace', path: '/foo', value: 'baz' }];

applyPatch({ foo: 'bar' }, patch);
// { foo: 'baz' }
```

**Note:** The target path must exist. Use `add` for new paths.

### move

Move a value from one path to another:

```typescript
const patch = [{ op: 'move', from: '/foo', path: '/bar' }];

applyPatch({ foo: 'qux' }, patch);
// { bar: 'qux' }

// Move within arrays
applyPatch({ arr: ['a', 'b', 'c'] }, [
	{ op: 'move', from: '/arr/0', path: '/arr/2' },
]);
// { arr: ['b', 'c', 'a'] }
```

### copy

Copy a value from one path to another:

```typescript
const patch = [{ op: 'copy', from: '/foo', path: '/bar' }];

applyPatch({ foo: 'qux' }, patch);
// { foo: 'qux', bar: 'qux' }
```

### test

Test that a value equals the expected value:

```typescript
const patch = [
	{ op: 'test', path: '/foo', value: 'bar' },
	{ op: 'replace', path: '/foo', value: 'baz' },
];

// If test passes, subsequent operations run
applyPatch({ foo: 'bar' }, patch);
// { foo: 'baz' }

// If test fails, throws error
applyPatch({ foo: 'wrong' }, patch);
// throws JSONPatchError
```

**Use cases for test:**

- Optimistic concurrency control
- Conditional updates
- Validation before mutations

---

## PatchBuilder

Fluent API for building patches:

```typescript
import { PatchBuilder } from '@jsonpath/patch';

const patch = new PatchBuilder()
	.add('/foo', 'bar')
	.remove('/baz')
	.replace('/qux', 42)
	.move('/from', '/to')
	.copy('/source', '/dest')
	.test('/check', true)
	.build();

// Result:
// [
//   { op: 'add', path: '/foo', value: 'bar' },
//   { op: 'remove', path: '/baz' },
//   { op: 'replace', path: '/qux', value: 42 },
//   { op: 'move', from: '/from', path: '/to' },
//   { op: 'copy', from: '/source', path: '/dest' },
//   { op: 'test', path: '/check', value: true }
// ]
```

### Builder Methods

```typescript
class PatchBuilder {
	add(path: string, value: JSONValue): this;
	remove(path: string): this;
	replace(path: string, value: JSONValue): this;
	move(from: string, path: string): this;
	copy(from: string, path: string): this;
	test(path: string, value: JSONValue): this;
	build(): JSONPatchOperation[];
}
```

---

## Diff Options

Configure diff generation:

```typescript
import { diff } from '@jsonpath/patch';

const source = { a: 1, b: { c: 2 } };
const target = { a: 1, b: { c: 3, d: 4 } };

// Default behavior
diff(source, target);
// [
//   { op: 'replace', path: '/b/c', value: 3 },
//   { op: 'add', path: '/b/d', value: 4 }
// ]
```

### Diff Strategies

The diff algorithm:

1. Compares objects recursively
2. Generates `add` for new properties
3. Generates `remove` for deleted properties
4. Generates `replace` for changed values
5. Handles arrays element-by-element

---

## Error Handling

```typescript
import { applyPatch } from '@jsonpath/patch';
import { JSONPatchError } from '@jsonpath/core';

try {
	applyPatch({}, [{ op: 'remove', path: '/nonexistent' }]);
} catch (err) {
	if (err instanceof JSONPatchError) {
		console.log(err.code); // 'PATCH_ERROR'
		console.log(err.message); // 'Cannot remove: path does not exist'
		console.log(err.operation); // { op: 'remove', path: '/nonexistent' }
	}
}
```

### Error Types

| Error             | Cause                                    |
| ----------------- | ---------------------------------------- |
| Path not found    | `remove`, `replace` on non-existent path |
| Test failed       | `test` value doesn't match               |
| Invalid operation | Unknown `op` value                       |
| Invalid path      | Malformed JSON Pointer                   |

---

## Usage Examples

### Optimistic Concurrency

Use `test` to ensure data hasn't changed:

```typescript
import { applyPatch } from '@jsonpath/patch';

const document = { version: 1, name: 'foo' };

const patch = [
	// Only apply if version matches
	{ op: 'test', path: '/version', value: 1 },
	{ op: 'replace', path: '/name', value: 'bar' },
	{ op: 'replace', path: '/version', value: 2 },
];

try {
	const result = applyPatch(document, patch);
	console.log(result); // { version: 2, name: 'bar' }
} catch (err) {
	console.log('Concurrent modification detected');
}
```

### Undo/Redo System

```typescript
import { applyPatch, applyWithInverse } from '@jsonpath/patch';
import type { JSONPatchOperation } from '@jsonpath/core';

class UndoableDocument<T> {
	private current: T;
	private undoStack: JSONPatchOperation[][] = [];
	private redoStack: JSONPatchOperation[][] = [];

	constructor(initial: T) {
		this.current = initial;
	}

	apply(patch: JSONPatchOperation[]): void {
		const { result, inverse } = applyWithInverse(this.current, patch);
		this.current = result as T;
		this.undoStack.push(inverse);
		this.redoStack = []; // Clear redo on new change
	}

	undo(): boolean {
		const inverse = this.undoStack.pop();
		if (!inverse) return false;

		const { result, inverse: redo } = applyWithInverse(this.current, inverse);
		this.current = result as T;
		this.redoStack.push(redo);
		return true;
	}

	redo(): boolean {
		const redo = this.redoStack.pop();
		if (!redo) return false;

		const { result, inverse } = applyWithInverse(this.current, redo);
		this.current = result as T;
		this.undoStack.push(inverse);
		return true;
	}

	get value(): T {
		return this.current;
	}
}

// Usage
const doc = new UndoableDocument({ count: 0 });
doc.apply([{ op: 'replace', path: '/count', value: 1 }]);
doc.apply([{ op: 'replace', path: '/count', value: 2 }]);
console.log(doc.value); // { count: 2 }

doc.undo();
console.log(doc.value); // { count: 1 }

doc.redo();
console.log(doc.value); // { count: 2 }
```

### Batch Document Updates

```typescript
import { diff, applyPatch } from '@jsonpath/patch';

function updateDocument<T extends object>(
	current: T,
	updates: Partial<T>,
): { result: T; patch: JSONPatchOperation[] } {
	const merged = { ...current, ...updates };
	const patch = diff(current, merged);
	return { result: merged, patch };
}

const doc = { name: 'foo', count: 1 };
const { result, patch } = updateDocument(doc, { count: 2, status: 'active' });

console.log(result); // { name: 'foo', count: 2, status: 'active' }
console.log(patch); // Generated operations
```

### Conflict Detection

```typescript
import { applyPatch } from '@jsonpath/patch';
import type { JSONPatchOperation } from '@jsonpath/core';

function tryApplyPatch(
	doc: any,
	patch: JSONPatchOperation[],
): { success: true; result: any } | { success: false; error: Error } {
	try {
		const result = applyPatch(doc, patch);
		return { success: true, result };
	} catch (err) {
		return { success: false, error: err as Error };
	}
}
```

---

## RFC 6902 Examples

From the RFC 6902 specification:

```typescript
const document = {
	foo: 'bar',
	baz: 'qux',
};

// A.1. Adding an Object Member
applyPatch(document, [{ op: 'add', path: '/baz', value: 'qux' }]);

// A.2. Adding an Array Element
applyPatch({ foo: ['bar', 'baz'] }, [
	{ op: 'add', path: '/foo/1', value: 'qux' },
]);
// { foo: ["bar", "qux", "baz"] }

// A.3. Removing an Object Member
applyPatch({ baz: 'qux', foo: 'bar' }, [{ op: 'remove', path: '/baz' }]);
// { foo: "bar" }

// A.4. Removing an Array Element
applyPatch({ foo: ['bar', 'qux', 'baz'] }, [{ op: 'remove', path: '/foo/1' }]);
// { foo: ["bar", "baz"] }

// A.5. Replacing a Value
applyPatch({ baz: 'qux', foo: 'bar' }, [
	{ op: 'replace', path: '/baz', value: 'boo' },
]);
// { baz: "boo", foo: "bar" }

// A.6. Moving a Value
applyPatch({ foo: { bar: 'baz', waldo: 'fred' }, qux: { corge: 'grault' } }, [
	{ op: 'move', from: '/foo/waldo', path: '/qux/thud' },
]);
// { foo: { bar: "baz" }, qux: { corge: "grault", thud: "fred" } }

// A.7. Moving an Array Element
applyPatch({ foo: ['all', 'grass', 'cows', 'eat'] }, [
	{ op: 'move', from: '/foo/1', path: '/foo/3' },
]);
// { foo: ["all", "cows", "eat", "grass"] }

// A.8. Testing a Value: Success
applyPatch({ baz: 'qux', foo: ['a', 2, 'c'] }, [
	{ op: 'test', path: '/baz', value: 'qux' },
	{ op: 'test', path: '/foo/1', value: 2 },
]);
// No error: tests pass

// A.9. Testing a Value: Error
applyPatch({ baz: 'qux' }, [{ op: 'test', path: '/baz', value: 'bar' }]);
// Throws: test failed

// A.10. Adding a Nested Member Object
applyPatch({ foo: 'bar' }, [
	{ op: 'add', path: '/child', value: { grandchild: {} } },
]);
// { foo: "bar", child: { grandchild: {} } }
```
