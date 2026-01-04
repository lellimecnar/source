# @jsonpath/pointer

> RFC 6901 JSON Pointer implementation with immutable mutations.

## Overview

`@jsonpath/pointer` provides complete JSON Pointer (RFC 6901) functionality including parsing, resolution, and immutable mutation operations. All mutation operations return new objects, leaving the original data unchanged.

## Features

- **Full RFC 6901 Compliance**: Complete pointer syntax support
- **Immutable Mutations**: `set()`, `remove()`, `append()` return new objects
- **Rich Utilities**: Parent, join, split, escape/unescape
- **Validation**: Check pointer syntax validity
- **Type-Safe**: Full TypeScript support

## Installation

```bash
pnpm add @jsonpath/pointer
```

## API Reference

### JSONPointer Class

```typescript
import { JSONPointer } from '@jsonpath/pointer';

// From string
const ptr = new JSONPointer('/store/book/0');

// From token array
const ptr2 = new JSONPointer(['store', 'book', '0']);

// Parse a pointer string
const tokens = JSONPointer.parse('/foo/bar'); // ['foo', 'bar']

// Format tokens to string
const str = JSONPointer.format(['foo', 'bar']); // '/foo/bar'

// Evaluate against data
const value = ptr.evaluate(data);

// Get tokens
const tokens = ptr.getTokens(); // ['store', 'book', '0']

// Convert to string
const str = ptr.toString(); // '/store/book/0'
```

### Resolution Functions

#### resolve()

Resolve a pointer against data, returning `undefined` if not found:

```typescript
import { resolve } from '@jsonpath/pointer';

const data = { a: { b: [1, 2, 3] } };

resolve(data, '/a/b/1'); // 2
resolve(data, '/a/c'); // undefined
resolve(data, ''); // data (root)
```

#### resolveOrThrow()

Resolve a pointer, throwing if not found:

```typescript
import { resolveOrThrow } from '@jsonpath/pointer';

const value = resolveOrThrow(data, '/a/b/1'); // 2
resolveOrThrow(data, '/a/c'); // throws Error
```

#### exists()

Check if a pointer exists in the data:

```typescript
import { exists } from '@jsonpath/pointer';

exists(data, '/a/b/1'); // true
exists(data, '/a/c'); // false
exists(data, ''); // true (root always exists)
```

#### resolveWithParent()

Resolve a pointer and get the parent context:

```typescript
import { resolveWithParent } from '@jsonpath/pointer';

const data = { a: { b: 1 } };
const result = resolveWithParent(data, '/a/b');

console.log(result.value); // 1
console.log(result.parent); // { b: 1 }
console.log(result.key); // 'b'
```

---

### Mutation Functions

All mutations are **immutable** - they return new objects.

#### set()

Set a value at a pointer path:

```typescript
import { set } from '@jsonpath/pointer';

const data = { a: { b: 1 } };

// Set existing property
const result1 = set(data, '/a/b', 2);
// { a: { b: 2 } }

// Set new property
const result2 = set(data, '/a/c', 3);
// { a: { b: 1, c: 3 } }

// Set array element
const arr = { items: [1, 2, 3] };
const result3 = set(arr, '/items/1', 42);
// { items: [1, 42, 3] }

// Original unchanged
console.log(data); // { a: { b: 1 } }
```

#### remove()

Remove a value at a pointer path:

```typescript
import { remove } from '@jsonpath/pointer';

const data = { a: { b: 1, c: 2 } };

// Remove property
const result1 = remove(data, '/a/b');
// { a: { c: 2 } }

// Remove array element (splices, doesn't leave hole)
const arr = { items: [1, 2, 3] };
const result2 = remove(arr, '/items/1');
// { items: [1, 3] }
```

#### append()

Append a value to an array:

```typescript
import { append } from '@jsonpath/pointer';

const data = { items: [1, 2] };

// Append to array at path
const result = append(data, '/items', 3);
// { items: [1, 2, 3] }

// Using "-" token (RFC 6902 style)
const result2 = set(data, '/items/-', 3);
// { items: [1, 2, 3] }
```

---

### Utility Functions

#### parent()

Get the parent pointer:

```typescript
import { parent } from '@jsonpath/pointer';

parent('/foo/bar'); // '/foo'
parent('/foo'); // ''
parent(''); // ''
```

#### join()

Join pointer segments:

```typescript
import { join } from '@jsonpath/pointer';

join('/foo', 'bar'); // '/foo/bar'
join('/foo', '/bar'); // '/foo/bar'
join('', 'foo'); // '/foo'
join('/a', 'b', 'c'); // '/a/b/c'
```

#### split()

Split a pointer into tokens:

```typescript
import { split } from '@jsonpath/pointer';

split('/foo/bar'); // ['foo', 'bar']
split(''); // []
```

#### escape() / unescape()

Handle special characters:

```typescript
import { escape, unescape } from '@jsonpath/pointer';

// Escape for use in pointers
escape('foo/bar~baz'); // 'foo~1bar~0baz'

// Unescape from pointer token
unescape('foo~1bar~0baz'); // 'foo/bar~baz'
```

**Escape Rules (RFC 6901):**

| Character | Escaped |
| --------- | ------- |
| `~`       | `~0`    |
| `/`       | `~1`    |

The order matters: `~` is escaped first to avoid double-escaping.

---

### Conversion Functions

#### toNormalizedPath()

Convert a JSON Pointer to RFC 9535 Normalized Path:

```typescript
import { toNormalizedPath } from '@jsonpath/pointer';

toNormalizedPath('/store/book/0');
// "$['store']['book'][0]"

toNormalizedPath('/a/b c/d');
// "$['a']['b c']['d']"
```

#### fromNormalizedPath()

Convert a Normalized Path to JSON Pointer:

```typescript
import { fromNormalizedPath } from '@jsonpath/pointer';

fromNormalizedPath("$['store']['book'][0]");
// '/store/book/0'
```

---

### Validation Functions

#### isValid()

Check if a string is a valid JSON Pointer:

```typescript
import { isValid } from '@jsonpath/pointer';

isValid('/foo/bar'); // true
isValid(''); // true (root pointer)
isValid('foo'); // false (must start with /)
isValid('/foo~2bar'); // false (invalid escape)
```

#### validate()

Get detailed validation results:

```typescript
import { validate } from '@jsonpath/pointer';

validate('/foo/bar');
// { valid: true, errors: [] }

validate('foo');
// { valid: false, errors: ['JSON Pointer must start with "/" or be empty'] }

validate('/foo~2bar');
// { valid: false, errors: ['Invalid tilde sequence in segment 0: foo~2bar'] }
```

---

## RFC 6901 Examples

From the RFC 6901 specification:

```typescript
const document = {
	foo: ['bar', 'baz'],
	'': 0,
	'a/b': 1,
	'c%d': 2,
	'e^f': 3,
	'g|h': 4,
	'i\\j': 5,
	'k"l': 6,
	' ': 7,
	'm~n': 8,
};

// RFC 6901 examples
resolve(document, ''); // the whole document
resolve(document, '/foo'); // ["bar", "baz"]
resolve(document, '/foo/0'); // "bar"
resolve(document, '/'); // 0
resolve(document, '/a~1b'); // 1
resolve(document, '/c%d'); // 2
resolve(document, '/e^f'); // 3
resolve(document, '/g|h'); // 4
resolve(document, '/i\\j'); // 5
resolve(document, '/k"l'); // 6
resolve(document, '/ '); // 7
resolve(document, '/m~0n'); // 8
```

---

## Array Index Handling

### Valid Array Indices

```typescript
const data = [10, 20, 30];

resolve(data, '/0'); // 10
resolve(data, '/1'); // 20
resolve(data, '/2'); // 30
resolve(data, '/3'); // undefined (out of bounds)
```

### Invalid Array Indices

RFC 6901 prohibits certain index formats:

```typescript
// Leading zeros not allowed
resolve(data, '/00'); // undefined (invalid)
resolve(data, '/01'); // undefined (invalid)

// Negative indices not allowed in pointers
resolve(data, '/-1'); // undefined (invalid)

// Non-numeric not allowed for arrays
resolve(data, '/foo'); // undefined (invalid)
```

### The "-" Token

The `-` token represents "past the end" (used in RFC 6902 for appending):

```typescript
import { set } from '@jsonpath/pointer';

const data = { items: [1, 2] };

// Append using "-"
const result = set(data, '/items/-', 3);
// { items: [1, 2, 3] }
```

---

## Error Handling

```typescript
import { JSONPointer } from '@jsonpath/pointer';
import { JSONPointerError } from '@jsonpath/core';

try {
	JSONPointer.parse('invalid'); // No leading /
} catch (err) {
	if (err instanceof JSONPointerError) {
		console.log(err.code); // 'POINTER_ERROR'
		console.log(err.message); // 'Invalid JSON Pointer...'
	}
}
```

---

## Usage Examples

### Deep Property Access

```typescript
import { resolve, set, remove } from '@jsonpath/pointer';

const config = {
	database: {
		primary: { host: 'localhost', port: 5432 },
		replica: { host: 'replica.local', port: 5432 },
	},
};

// Read
const port = resolve(config, '/database/primary/port'); // 5432

// Update
const updated = set(config, '/database/primary/port', 5433);

// Delete
const reduced = remove(config, '/database/replica');
```

### Building Paths Dynamically

```typescript
import { join, escape, resolve } from '@jsonpath/pointer';

function getNestedValue(data: any, ...keys: string[]) {
	const path = join(...keys.map(escape));
	return resolve(data, path);
}

const data = { 'foo/bar': { 'baz~qux': 42 } };
getNestedValue(data, 'foo/bar', 'baz~qux'); // 42
```

### Batch Updates

```typescript
import { set } from '@jsonpath/pointer';

function setMany(data: any, updates: Record<string, any>): any {
	let result = data;
	for (const [path, value] of Object.entries(updates)) {
		result = set(result, path, value);
	}
	return result;
}

const data = { a: 1, b: 2 };
const updated = setMany(data, {
	'/a': 10,
	'/c': 30,
});
// { a: 10, b: 2, c: 30 }
```
