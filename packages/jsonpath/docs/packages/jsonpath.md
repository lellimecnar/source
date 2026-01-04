# @jsonpath/jsonpath

> Unified facade for the complete JSONPath suite.

## Overview

`@jsonpath/jsonpath` is the main entry point for the JSONPath library suite. It provides a unified, easy-to-use API that combines all package functionality:

- **JSONPath Queries** (RFC 9535)
- **JSON Pointer** (RFC 6901)
- **JSON Patch** (RFC 6902)
- **JSON Merge Patch** (RFC 7386)

If you're new to the library, start here.

## Installation

```bash
pnpm add @jsonpath/jsonpath
```

This package re-exports everything from all sub-packages, so you typically only need this one dependency.

---

## Quick Start

```typescript
import { query, compile, transform, pointer, patch } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: [
			{ title: 'The Great Gatsby', price: 8.99 },
			{ title: '1984', price: 12.99 },
			{ title: 'Brave New World', price: 9.99 },
		],
	},
};

// Query with JSONPath
const books = query(data, '$.store.book[*].title');
console.log(books.values());
// ['The Great Gatsby', '1984', 'Brave New World']

// Compile for repeated use
const expensive = compile('$.store.book[?@.price > 10]');
console.log(expensive(data).values());
// [{ title: '1984', price: 12.99 }]

// Transform data
const updated = transform(data, '$.store.book[*].price', (p) => p * 0.9);

// Use JSON Pointer
const title = pointer.resolve(data, '/store/book/0/title');
// 'The Great Gatsby'

// Apply JSON Patch
const patched = patch.applyPatch(data, [
	{
		op: 'add',
		path: '/store/book/-',
		value: { title: 'New Book', price: 14.99 },
	},
]);
```

---

## API Reference

### Query Functions

#### query()

Execute a JSONPath query and get a `QueryResult`:

```typescript
import { query } from '@jsonpath/jsonpath';

const result = query(data, '$.store.book[*]');

result.values(); // Array of matched values
result.paths(); // Array of paths (string[])
result.pointers(); // Array of JSON Pointers (string)
result.normalizedPaths(); // Array of RFC 9535 normalized paths
result.isEmpty(); // true if no matches
result.count(); // Number of matches
```

#### queryValues()

Get values directly without a `QueryResult` wrapper:

```typescript
import { queryValues } from '@jsonpath/jsonpath';

const titles = queryValues(data, '$.store.book[*].title');
// ['The Great Gatsby', '1984', 'Brave New World']
```

#### queryPaths()

Get paths directly:

```typescript
import { queryPaths } from '@jsonpath/jsonpath';

const paths = queryPaths(data, '$.store.book[*].title');
// [['store', 'book', '0', 'title'], ['store', 'book', '1', 'title'], ...]
```

#### value()

Get a single value (first match):

```typescript
import { value } from '@jsonpath/jsonpath';

const firstTitle = value(data, '$.store.book[0].title');
// 'The Great Gatsby'

const missing = value(data, '$.store.missing');
// undefined
```

#### exists()

Check if any matches exist:

```typescript
import { exists } from '@jsonpath/jsonpath';

exists(data, '$.store.book[?@.price > 10]'); // true
exists(data, '$.store.book[?@.price > 100]'); // false
```

#### count()

Count matches:

```typescript
import { count } from '@jsonpath/jsonpath';

count(data, '$.store.book[*]'); // 3
count(data, '$.store.book[?@.price > 10]'); // 1
```

---

### Compilation

#### compileQuery()

Compile a query for repeated execution:

```typescript
import { compileQuery } from '@jsonpath/jsonpath';

// Compile once
const findExpensive = compileQuery('$.store.book[?@.price > 10]');

// Use many times
findExpensive(data1).values();
findExpensive(data2).values();
findExpensive(data3).values();
```

Compiled queries:

- Parse the expression once
- Cache the AST
- Execute ~10x faster for repeated use

#### compile()

Alias for `compileQuery`:

```typescript
import { compile } from '@jsonpath/jsonpath';

const query = compile('$..name');
```

---

### Transformation

#### transform()

Transform matched values in-place:

```typescript
import { transform } from '@jsonpath/jsonpath';

const data = {
	items: [
		{ name: 'a', value: 1 },
		{ name: 'b', value: 2 },
	],
};

// Double all values
const result = transform(data, '$.items[*].value', (v) => v * 2);
// {
//   items: [
//     { name: 'a', value: 2 },
//     { name: 'b', value: 4 }
//   ]
// }
```

**Immutable**: Returns a new object; original unchanged.

#### project()

Project to a subset of properties:

```typescript
import { project } from '@jsonpath/jsonpath';

const users = [
	{ id: 1, name: 'Alice', email: 'a@x.com', password: 'secret' },
	{ id: 2, name: 'Bob', email: 'b@x.com', password: 'secret' },
];

const safe = project(users, ['name', 'email']);
// [
//   { name: 'Alice', email: 'a@x.com' },
//   { name: 'Bob', email: 'b@x.com' }
// ]
```

#### pick()

Pick specific properties from objects at matched paths:

```typescript
import { pick } from '@jsonpath/jsonpath';

const data = {
	users: [
		{ id: 1, name: 'Alice', role: 'admin' },
		{ id: 2, name: 'Bob', role: 'user' },
	],
};

const result = pick(data, '$.users[*]', ['id', 'name']);
// {
//   users: [
//     { id: 1, name: 'Alice' },
//     { id: 2, name: 'Bob' }
//   ]
// }
```

#### omit()

Omit specific properties from objects at matched paths:

```typescript
import { omit } from '@jsonpath/jsonpath';

const result = omit(data, '$.users[*]', ['role']);
// Same result as pick example above
```

---

### Streaming

#### stream()

Stream results for large datasets:

```typescript
import { stream } from '@jsonpath/jsonpath';

const data = { items: Array(100000).fill({ value: 1 }) };

for (const match of stream(data, '$.items[*]')) {
	console.log(match.value);
	console.log(match.path);
	// Process one at a time without loading all into memory
}
```

---

### JSON Pointer

Access RFC 6901 functionality via the `pointer` namespace:

```typescript
import { pointer } from '@jsonpath/jsonpath';

// Resolve
pointer.resolve(data, '/store/book/0');

// Set (immutable)
const updated = pointer.set(data, '/store/book/0/price', 7.99);

// Remove (immutable)
const removed = pointer.remove(data, '/store/book/0');

// Check existence
pointer.exists(data, '/store/book/0');

// Parse pointer
pointer.parse('/foo/bar'); // ['foo', 'bar']

// Join segments
pointer.join('/foo', 'bar'); // '/foo/bar'
```

---

### JSON Patch

Access RFC 6902 functionality via the `patch` namespace:

```typescript
import { patch } from '@jsonpath/jsonpath';

// Apply patch
const result = patch.applyPatch(data, [
	{ op: 'add', path: '/foo', value: 'bar' },
]);

// Apply with inverse for undo
const { result, inverse } = patch.applyWithInverse(data, operations);

// Generate diff
const operations = patch.diff(source, target);

// Fluent builder
const ops = new patch.PatchBuilder().add('/foo', 'bar').remove('/baz').build();
```

---

### JSON Merge Patch

Access RFC 7386 functionality:

```typescript
import { mergePatch } from '@jsonpath/jsonpath';

const result = mergePatch.apply(data, {
	title: 'New Title',
	obsoleteField: null, // Deletes this field
});
```

---

### Global Configuration

Configure default behavior:

```typescript
import { configure, getConfig, resetConfig } from '@jsonpath/jsonpath';

// Set defaults
configure({
	maxDepth: 128,
	maxResults: 5000,
	timeout: 5000,
	throwOnError: true,
});

// Get current config
const config = getConfig();

// Reset to defaults
resetConfig();
```

Configuration options:

| Option         | Type    | Default | Description                    |
| -------------- | ------- | ------- | ------------------------------ |
| `maxDepth`     | number  | 256     | Maximum recursion depth        |
| `maxResults`   | number  | 10000   | Maximum results returned       |
| `timeout`      | number  | 30000   | Query timeout (ms)             |
| `throwOnError` | boolean | true    | Throw vs return empty on error |

---

## Re-exports

The facade re-exports all types and utilities from sub-packages:

```typescript
// Types from @jsonpath/core
import type {
	JSONValue,
	QueryNode,
	QueryResult,
	JSONPatchOperation,
} from '@jsonpath/jsonpath';

// Errors from @jsonpath/core
import {
	JSONPathError,
	JSONPathSyntaxError,
	JSONPointerError,
	JSONPatchError,
} from '@jsonpath/jsonpath';

// Parser utilities
import { parse, walk, transform as transformAST } from '@jsonpath/jsonpath';

// Evaluator
import { Evaluator, QueryResult } from '@jsonpath/jsonpath';

// All pointer functions
import {
	resolve,
	set,
	remove,
	append,
	parse as parsePointer,
	escape,
	unescape,
} from '@jsonpath/jsonpath';

// All patch functions
import {
	applyPatch,
	applyWithInverse,
	diff,
	PatchBuilder,
} from '@jsonpath/jsonpath';
```

---

## Usage Examples

### Complete Workflow

```typescript
import { query, compile, transform, pointer, patch } from '@jsonpath/jsonpath';

// 1. Query data
const data = loadData();
const activeUsers = query(data, '$.users[?@.active == true]');

console.log(`Found ${activeUsers.count()} active users`);

// 2. Compile for repeated queries
const findByRole = compile('$.users[?@.role == $role]');

// 3. Transform values
const updated = transform(data, '$.users[*].lastSeen', () =>
	new Date().toISOString(),
);

// 4. Apply patches
const patched = patch.applyPatch(updated, [
	{ op: 'add', path: '/metadata/processedAt', value: Date.now() },
]);

// 5. Use pointers for direct access
const firstUser = pointer.resolve(patched, '/users/0');
```

### API Response Shaping

```typescript
import { pick, omit, project } from '@jsonpath/jsonpath';

function sanitizeUserResponse(data) {
	// Remove sensitive fields from all users
	return omit(data, '$.users[*]', ['password', 'ssn', 'tokens']);
}

function getPublicProfile(data) {
	// Keep only public fields
	return pick(data, '$.user', ['id', 'name', 'avatar', 'bio']);
}
```

### Validation with JSONPath

```typescript
import { exists, value, count } from '@jsonpath/jsonpath';

function validateOrder(order) {
	const errors = [];

	if (!exists(order, '$.customer.email')) {
		errors.push('Customer email required');
	}

	if (count(order, '$.items[*]') === 0) {
		errors.push('Order must have at least one item');
	}

	const total = value(order, '$.total');
	if (typeof total !== 'number' || total <= 0) {
		errors.push('Invalid order total');
	}

	return errors;
}
```

### Building Dynamic Queries

```typescript
import { query } from '@jsonpath/jsonpath';

function search(data, filters) {
	let path = '$.items[*]';

	const conditions = [];

	if (filters.minPrice) {
		conditions.push(`@.price >= ${filters.minPrice}`);
	}
	if (filters.maxPrice) {
		conditions.push(`@.price <= ${filters.maxPrice}`);
	}
	if (filters.category) {
		conditions.push(`@.category == "${filters.category}"`);
	}

	if (conditions.length > 0) {
		path = `$.items[?${conditions.join(' && ')}]`;
	}

	return query(data, path).values();
}
```
