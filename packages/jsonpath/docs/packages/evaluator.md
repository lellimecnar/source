# @jsonpath/evaluator

> RFC 9535 compliant AST interpreter for JSONPath queries.

## Overview

`@jsonpath/evaluator` executes parsed JSONPath ASTs against JSON documents. It implements the complete RFC 9535 specification including all selectors, operators, and evaluation semantics.

## Features

- **Full RFC 9535 Compliance**: All selectors and semantics
- **Rich Results**: Values, paths, pointers, and normalized paths
- **Security Options**: Depth limits, timeouts, path restrictions
- **Comparison Semantics**: Correct type coercion rules
- **Circular Reference Detection**: Optional protection

## Installation

```bash
pnpm add @jsonpath/evaluator
```

## API Reference

### evaluate()

Evaluate a parsed AST against data:

```typescript
import { parse } from '@jsonpath/parser';
import { evaluate } from '@jsonpath/evaluator';

const data = {
	store: {
		book: [
			{ title: 'Book 1', price: 10 },
			{ title: 'Book 2', price: 20 },
		],
	},
};

const ast = parse('$.store.book[*].title');
const result = evaluate(data, ast);

console.log(result.values()); // ['Book 1', 'Book 2']
console.log(result.normalizedPaths()); // ["$['store']['book'][0]['title']", "..."]
console.log(result.pointers()); // ['/store/book/0/title', '/store/book/1/title']
```

### QueryResult Class

The result of a query evaluation:

```typescript
class QueryResult<T = unknown> {
	// Extract all matched values
	values(): T[];

	// Get paths as segment arrays
	paths(): PathSegment[][];

	// Get paths as JSON Pointers (RFC 6901)
	pointers(): string[];

	// Get RFC 9535 normalized paths
	normalizedPaths(): string[];

	// Get full node objects
	nodes(): QueryResultNode<T>[];

	// First/last result
	first(): QueryResultNode<T> | undefined;
	last(): QueryResultNode<T> | undefined;

	// Check if empty
	isEmpty(): boolean;

	// Result count
	readonly length: number;

	// Functional methods
	map<U>(fn: (value: T, node: QueryResultNode<T>) => U): U[];
	filter(fn: (value: T, node: QueryResultNode<T>) => boolean): QueryResult<T>;
	forEach(fn: (value: T, node: QueryResultNode<T>) => void): void;

	// Get parent nodes
	parents(): QueryResult;

	// Iterable
	[Symbol.iterator](): Iterator<QueryResultNode<T>>;
}
```

### QueryResultNode

Individual result nodes:

```typescript
interface QueryResultNode<T = unknown> {
	readonly value: T;
	readonly path: readonly PathSegment[];
	readonly root: unknown;
	readonly parent?: unknown;
	readonly parentKey?: PathSegment;
}
```

---

## Selectors

### Name Selector

Access object properties by name:

```typescript
const data = { name: 'Alice', age: 30 };

evaluate(data, parse('$.name')).values(); // ['Alice']
evaluate(data, parse("$['name']")).values(); // ['Alice']
```

### Index Selector

Access array elements by index:

```typescript
const data = ['a', 'b', 'c', 'd'];

evaluate(data, parse('$[0]')).values(); // ['a']
evaluate(data, parse('$[2]')).values(); // ['c']
evaluate(data, parse('$[-1]')).values(); // ['d'] (last element)
evaluate(data, parse('$[-2]')).values(); // ['c'] (second to last)
```

### Wildcard Selector

Match all children:

```typescript
const data = { a: 1, b: 2, c: 3 };
evaluate(data, parse('$.*')).values(); // [1, 2, 3]
evaluate(data, parse('$[*]')).values(); // [1, 2, 3]

const arr = [10, 20, 30];
evaluate(arr, parse('$[*]')).values(); // [10, 20, 30]
```

### Slice Selector

Select array ranges with optional step:

```typescript
const data = [0, 1, 2, 3, 4, 5];

// Basic slicing
evaluate(data, parse('$[1:4]')).values(); // [1, 2, 3]
evaluate(data, parse('$[:3]')).values(); // [0, 1, 2]
evaluate(data, parse('$[3:]')).values(); // [3, 4, 5]

// With step
evaluate(data, parse('$[::2]')).values(); // [0, 2, 4] (every 2nd)
evaluate(data, parse('$[1::2]')).values(); // [1, 3, 5] (every 2nd from 1)

// Negative indices
evaluate(data, parse('$[-3:]')).values(); // [3, 4, 5] (last 3)
evaluate(data, parse('$[:-2]')).values(); // [0, 1, 2, 3] (except last 2)

// Reverse
evaluate(data, parse('$[::-1]')).values(); // [5, 4, 3, 2, 1, 0]
evaluate(data, parse('$[4:1:-1]')).values(); // [4, 3, 2]
```

### Filter Selector

Select elements matching a boolean expression:

```typescript
const data = {
	items: [
		{ name: 'apple', price: 1.5, inStock: true },
		{ name: 'banana', price: 0.5, inStock: true },
		{ name: 'cherry', price: 3.0, inStock: false },
	],
};

// Comparison
evaluate(data, parse('$.items[?(@.price < 2)]')).values();
// [{ name: 'apple', ... }, { name: 'banana', ... }]

// Boolean property
evaluate(data, parse('$.items[?(@.inStock)]')).values();
// [{ name: 'apple', ... }, { name: 'banana', ... }]

// Negation
evaluate(data, parse('$.items[?(!@.inStock)]')).values();
// [{ name: 'cherry', ... }]

// Logical operators
evaluate(data, parse('$.items[?(@.price < 2 && @.inStock)]')).values();
// [{ name: 'apple', ... }, { name: 'banana', ... }]
```

### Descendant Segment

Recursive descent through all nested structures:

```typescript
const data = {
	a: { b: { c: 1 } },
	d: [{ c: 2 }, { e: { c: 3 } }],
};

// Find all 'c' properties anywhere
evaluate(data, parse('$..c')).values(); // [1, 2, 3]

// All values in the tree
evaluate(data, parse('$..*')).values();
// [{ b: { c: 1 } }, { c: 1 }, 1, [{ c: 2 }, ...], { c: 2 }, 2, ...]
```

---

## Comparison Semantics

RFC 9535 defines specific comparison rules:

### Type Compatibility

Only comparable types can be compared:

```typescript
// Same types compare normally
evaluate([{ a: 1 }, { a: 2 }], parse('$[?(@.a == 1)]')).values(); // [{a: 1}]

// Different types are not equal
evaluate([{ a: '1' }], parse('$[?(@.a == 1)]')).values(); // [] (string != number)

// null comparisons
evaluate([{ a: null }, { a: 1 }], parse('$[?(@.a == null)]')).values(); // [{a: null}]
```

### Comparison Operators

| Operator | Description                     |
| -------- | ------------------------------- |
| `==`     | Equal (type-strict)             |
| `!=`     | Not equal                       |
| `<`      | Less than (strings and numbers) |
| `<=`     | Less than or equal              |
| `>`      | Greater than                    |
| `>=`     | Greater than or equal           |

### Logical Operators

| Operator | Description |
| -------- | ----------- |
| `&&`     | Logical AND |
| `\|\|`   | Logical OR  |
| `!`      | Logical NOT |

---

## Built-in Functions

Functions from `@jsonpath/functions` are available in filter expressions:

### length()

```typescript
// String length (Unicode code points)
evaluate(['ab', 'abc', 'abcd'], parse('$[?(length(@) > 2)]')).values();
// ['abc', 'abcd']

// Array length
evaluate(
	[{ items: [1, 2] }, { items: [1, 2, 3] }],
	parse('$[?(length(@.items) > 2)]'),
).values();
// [{items: [1,2,3]}]

// Object key count
evaluate([{ a: 1 }, { a: 1, b: 2 }], parse('$[?(length(@) > 1)]')).values();
// [{a:1,b:2}]
```

### count()

```typescript
// Count nodes in a result set
const data = [{ items: [1, 2, 3] }, { items: [1] }];
evaluate(data, parse('$[?(count(@.items[*]) > 2)]')).values();
// [{items: [1,2,3]}]
```

### match()

Full regex match:

```typescript
const data = ['test', 'testing', 'TEST'];
evaluate(data, parse('$[?(match(@, "test"))]')).values();
// ['test'] (exact match only)

evaluate(data, parse('$[?(match(@, "test.*"))]')).values();
// ['test', 'testing']
```

### search()

Partial regex match:

```typescript
const data = ['hello world', 'goodbye world', 'hello there'];
evaluate(data, parse('$[?(search(@, "world"))]')).values();
// ['hello world', 'goodbye world']
```

### value()

Extract single value from nodes:

```typescript
const data = [{ a: 1 }, { a: 2 }];
// value() returns undefined if not exactly one node
evaluate(data, parse('$[?(value(@.a) == 1)]')).values();
// [{a: 1}]
```

---

## Evaluation Options

### Limit Options

```typescript
import { evaluate } from '@jsonpath/evaluator';

const result = evaluate(data, ast, {
	maxDepth: 100, // Maximum recursion depth
	maxResults: 1000, // Maximum result count
	timeout: 5000, // Timeout in milliseconds
	detectCircular: true, // Detect circular references
});
```

### Security Options

```typescript
const result = evaluate(data, ast, {
	secure: {
		noRecursive: true, // Disable '..' operator
		noFilters: true, // Disable filter expressions
		allowPaths: ['$.safe.*'], // Whitelist paths
		blockPaths: ['$.secret'], // Blacklist paths
		maxQueryLength: 500, // Max query string length
	},
});
```

---

## Path Formats

Results include multiple path representations:

```typescript
const data = { store: { items: [{ name: 'Widget' }] } };
const result = evaluate(data, parse('$.store.items[0].name'));

// As segment array
result.paths();
// [['store', 'items', 0, 'name']]

// As JSON Pointer (RFC 6901)
result.pointers();
// ['/store/items/0/name']

// As RFC 9535 Normalized Path
result.normalizedPaths();
// ["$['store']['items'][0]['name']"]
```

### Normalized Path Escaping

Special characters in property names are properly escaped:

```typescript
const data = { "a'b": { 'c/d': 1 } };
const result = evaluate(data, parse("$['a\\'b']['c/d']"));

result.normalizedPaths();
// ["$['a\\'b']['c/d']"]
```

---

## Error Handling

```typescript
import { evaluate } from '@jsonpath/evaluator';
import {
	JSONPathError,
	JSONPathLimitError,
	JSONPathTimeoutError,
	JSONPathSecurityError,
} from '@jsonpath/core';

try {
	evaluate(data, ast, { maxDepth: 10 });
} catch (err) {
	if (err instanceof JSONPathLimitError) {
		console.error('Query too deep or too many results');
	} else if (err instanceof JSONPathTimeoutError) {
		console.error('Query timed out');
	} else if (err instanceof JSONPathSecurityError) {
		console.error('Security constraint violated');
	}
}
```

---

## Usage Examples

### Working with Results

```typescript
const data = {
	users: [
		{ name: 'Alice', role: 'admin', active: true },
		{ name: 'Bob', role: 'user', active: false },
		{ name: 'Charlie', role: 'user', active: true },
	],
};

const result = evaluate(data, parse('$.users[?(@.active)].name'));

// Iterate with full context
for (const node of result) {
	console.log(`Found "${node.value}" at ${node.path.join('.')}`);
	// "Found "Alice" at users.0.name"
	// "Found "Charlie" at users.2.name"
}

// Map values
const upper = result.map((name) => name.toUpperCase());
// ['ALICE', 'CHARLIE']

// Filter further
const startsWithA = result.filter((name) => name.startsWith('A'));
console.log(startsWithA.values()); // ['Alice']

// Get parents
const parentUsers = result.parents();
console.log(parentUsers.values());
// [{ name: 'Alice', ... }, { name: 'Charlie', ... }]
```

### Complex Queries

```typescript
const bookstore = {
	store: {
		book: [
			{ title: 'A', author: 'X', price: 10, tags: ['fiction'] },
			{ title: 'B', author: 'Y', price: 15, tags: ['reference', 'technical'] },
			{ title: 'C', author: 'X', price: 20, tags: ['fiction', 'classic'] },
		],
	},
};

// Books by author X under $15
evaluate(bookstore, parse('$.store.book[?(@.author == "X" && @.price < 15)]'));

// Books with 'fiction' tag (using search on stringified tags)
evaluate(bookstore, parse('$.store.book[?(search(@.tags, "fiction"))]'));

// All prices (recursive descent)
evaluate(bookstore, parse('$..price')).values(); // [10, 15, 20]
```
