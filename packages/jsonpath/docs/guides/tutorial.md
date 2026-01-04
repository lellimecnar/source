# JSONPath Tutorial

> A comprehensive guide to JSONPath queries with practical examples.

## What is JSONPath?

JSONPath is a query language for JSON, similar to XPath for XML. It allows you to extract data from JSON documents using path expressions.

```typescript
import { query } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: [
			{ title: 'Moby Dick', price: 8.99 },
			{ title: '1984', price: 12.99 },
		],
	},
};

// Get all book titles
const titles = query(data, '$.store.book[*].title').values();
// ['Moby Dick', '1984']
```

---

## Basic Syntax

### Root Identifier: `$`

Every JSONPath query starts with `$`, representing the root of the document:

```typescript
query(data, '$'); // The entire document
query(data, '$.store'); // The "store" property
```

### Child Access: `.name` or `['name']`

Access object properties using dot notation or bracket notation:

```typescript
query(data, '$.store.book'); // Dot notation
query(data, "$['store']['book']"); // Bracket notation

// Bracket notation required for:
// - Property names with spaces
// - Property names starting with numbers
// - Special characters
query(data, "$['my property']");
query(data, "$['123']");
```

### Array Index: `[n]`

Access array elements by index (0-based):

```typescript
query(data, '$.store.book[0]'); // First book
query(data, '$.store.book[1]'); // Second book
query(data, '$.store.book[-1]'); // Last book (negative index)
```

### Wildcard: `*`

Match all elements at a level:

```typescript
query(data, '$.store.book[*]'); // All books
query(data, '$.store.book[*].title'); // All book titles
query(data, '$.store.*'); // All properties of store
```

### Recursive Descent: `..`

Search recursively through the entire document:

```typescript
query(data, '$..title'); // All "title" properties anywhere
query(data, '$..price'); // All "price" properties anywhere
query(data, '$..[*]'); // All values at any level
```

---

## Array Slices

Slice syntax: `[start:end:step]`

```typescript
const data = { items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };

query(data, '$.items[0:3]'); // [0, 1, 2] (indices 0, 1, 2)
query(data, '$.items[3:]'); // [3, 4, 5, 6, 7, 8, 9] (from index 3)
query(data, '$.items[:3]'); // [0, 1, 2] (up to index 3)
query(data, '$.items[::2]'); // [0, 2, 4, 6, 8] (every 2nd element)
query(data, '$.items[-3:]'); // [7, 8, 9] (last 3 elements)
query(data, '$.items[::-1]'); // [9, 8, 7, ...] (reversed)
```

**Slice semantics:**

- `start`: Starting index (inclusive, default 0)
- `end`: Ending index (exclusive, default length)
- `step`: Step size (default 1, negative = reverse)

---

## Filter Expressions

Filter expressions select elements based on conditions: `[?expression]`

### Comparison Operators

```typescript
const books = {
	store: {
		book: [
			{ title: 'A', price: 5.99, pages: 100 },
			{ title: 'B', price: 12.99, pages: 300 },
			{ title: 'C', price: 8.99, pages: 200 },
		],
	},
};

// Equality
query(books, '$.store.book[?@.price == 8.99]');

// Comparison
query(books, '$.store.book[?@.price > 10]');
query(books, '$.store.book[?@.price >= 10]');
query(books, '$.store.book[?@.price < 10]');
query(books, '$.store.book[?@.price <= 10]');
query(books, '$.store.book[?@.price != 10]');
```

### The Current Node: `@`

Inside a filter, `@` refers to the current element being tested:

```typescript
// @ is each book object
query(books, '$.store.book[?@.price > 10]');

// Access nested properties
query(books, '$.store.book[?@.author.name == "Orwell"]');
```

### Logical Operators

```typescript
// AND: &&
query(books, '$.store.book[?@.price > 5 && @.price < 10]');

// OR: ||
query(books, '$.store.book[?@.pages < 150 || @.pages > 250]');

// NOT: !
query(books, '$.store.book[?!(@.price > 10)]');
```

### Existence Tests

```typescript
// Property exists
query(books, '$.store.book[?@.isbn]');

// Property doesn't exist
query(books, '$.store.book[?!@.isbn]');
```

### String Operations

```typescript
const data = {
	items: [
		{ name: 'iPhone 15' },
		{ name: 'Samsung Galaxy' },
		{ name: 'Google Pixel' },
	],
};

// Regular expression match
query(data, '$.items[?match(@.name, "^i")]'); // Starts with 'i'
query(data, '$.items[?search(@.name, "pixel")]'); // Contains 'pixel' (case-insensitive)
```

---

## Built-in Functions

### length()

Get the length of strings or arrays:

```typescript
const data = {
	items: ['a', 'bb', 'ccc'],
	nested: { arr: [1, 2, 3, 4, 5] },
};

// Array length
query(data, '$.items[?length(@) > 1]'); // ['bb', 'ccc']

// String length
query(data, '$.items[?length(@) == 2]'); // ['bb']
```

### count()

Count elements in an array (within a filter):

```typescript
const data = {
	orders: [
		{ id: 1, items: ['a', 'b'] },
		{ id: 2, items: ['c', 'd', 'e'] },
		{ id: 3, items: ['f'] },
	],
};

// Orders with more than 2 items
query(data, '$.orders[?count(@.items) > 2]');
// [{ id: 2, items: ['c', 'd', 'e'] }]
```

### value()

Get a single value from a query (within a filter):

```typescript
const data = {
	products: [
		{ name: 'A', details: { price: 10 } },
		{ name: 'B', details: { price: 20 } },
	],
};

// Compare nested values
query(data, '$.products[?value(@.details.price) > 15]');
```

### match() and search()

Regular expression functions:

```typescript
// match() - Full string match (anchored)
query(data, '$.items[?match(@.name, "^Test.*")]');

// search() - Substring match (unanchored)
query(data, '$.items[?search(@.name, "test")]');
```

---

## Query Results

The `query()` function returns a `QueryResult` object with multiple output formats:

```typescript
import { query } from '@jsonpath/jsonpath';

const result = query(data, '$.store.book[*].title');

// Get values as array
result.values();
// ['Moby Dick', '1984']

// Get paths as arrays
result.paths();
// [['store', 'book', '0', 'title'], ['store', 'book', '1', 'title']]

// Get JSON Pointers
result.pointers();
// ['/store/book/0/title', '/store/book/1/title']

// Get RFC 9535 normalized paths
result.normalizedPaths();
// ["$['store']['book'][0]['title']", "$['store']['book'][1]['title']"]

// Check if empty
result.isEmpty(); // false

// Count matches
result.count(); // 2

// Iterate
for (const value of result) {
	console.log(value);
}

// Map/filter
result.map((title) => title.toUpperCase());
result.filter((title) => title.length > 5);
```

---

## Compiled Queries

For repeated queries, compile once and reuse:

```typescript
import { compile } from '@jsonpath/jsonpath';

// Compile once
const findExpensive = compile('$.products[?@.price > 100]');

// Reuse many times
const expensiveA = findExpensive(dataA).values();
const expensiveB = findExpensive(dataB).values();
const expensiveC = findExpensive(dataC).values();
```

**Performance benefit:** ~10x faster for repeated use.

---

## Practical Examples

### Extract All Values of a Specific Key

```typescript
const apiResponse = {
	users: [
		{ id: 1, profile: { email: 'a@x.com' } },
		{ id: 2, profile: { email: 'b@x.com' } },
	],
};

const emails = query(apiResponse, '$..email').values();
// ['a@x.com', 'b@x.com']
```

### Filter by Multiple Conditions

```typescript
const products = {
	items: [
		{ name: 'Laptop', price: 999, inStock: true, category: 'electronics' },
		{ name: 'Book', price: 19, inStock: false, category: 'media' },
		{ name: 'Phone', price: 699, inStock: true, category: 'electronics' },
	],
};

// In-stock electronics under $800
const results = query(
	products,
	'$.items[?@.inStock == true && @.category == "electronics" && @.price < 800]',
).values();
// [{ name: 'Phone', price: 699, ... }]
```

### Get Nested Arrays

```typescript
const data = {
	departments: [
		{ name: 'Engineering', teams: [{ name: 'Frontend' }, { name: 'Backend' }] },
		{ name: 'Design', teams: [{ name: 'UX' }, { name: 'Visual' }] },
	],
};

// All team names
const teams = query(data, '$..teams[*].name').values();
// ['Frontend', 'Backend', 'UX', 'Visual']
```

### Find by ID

```typescript
const data = {
	users: [
		{ id: 'u1', name: 'Alice' },
		{ id: 'u2', name: 'Bob' },
	],
};

const user = query(data, '$.users[?@.id == "u1"]').values()[0];
// { id: 'u1', name: 'Alice' }
```

### Validate Data Structure

```typescript
import { exists, count } from '@jsonpath/jsonpath';

function validateConfig(config) {
	const errors = [];

	if (!exists(config, '$.database.host')) {
		errors.push('Database host required');
	}

	if (count(config, '$.services[*]') === 0) {
		errors.push('At least one service required');
	}

	return errors;
}
```

---

## Tips and Best Practices

### 1. Start Simple

Build queries incrementally:

```typescript
// Start here
query(data, '$');

// Add path
query(data, '$.store');

// Add more
query(data, '$.store.book');

// Add filter
query(data, '$.store.book[?@.price > 10]');
```

### 2. Use Bracket Notation for Safety

When property names are dynamic:

```typescript
const key = 'my-property';
query(data, `$['${key}']`); // Safe
// query(data, `$.${key}`);  // Might fail with special chars
```

### 3. Compile Repeated Queries

```typescript
// Bad: Parsing on every call
users.forEach((u) => query(data, '$.settings.theme'));

// Good: Parse once
const getTheme = compile('$.settings.theme');
users.forEach((u) => getTheme(data));
```

### 4. Use exists() for Presence Checks

```typescript
// Bad: Query and check length
if (query(data, '$.user.email').values().length > 0) {
}

// Good: Direct existence check
if (exists(data, '$.user.email')) {
}
```

### 5. Prefer Specific Paths Over Recursive

```typescript
// Slower: Searches entire tree
query(data, '$..title');

// Faster: Direct path
query(data, '$.store.book[*].title');
```
