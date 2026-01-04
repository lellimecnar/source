# Basic Query Examples

Common query patterns for everyday use.

## Setup

```typescript
import { query, value, exists, count, compile } from '@jsonpath/jsonpath';

const store = {
	name: 'Book Store',
	location: { city: 'New York', country: 'USA' },
	books: [
		{ title: '1984', author: 'George Orwell', price: 9.99, inStock: true },
		{
			title: 'Brave New World',
			author: 'Aldous Huxley',
			price: 12.99,
			inStock: true,
		},
		{
			title: 'Fahrenheit 451',
			author: 'Ray Bradbury',
			price: 8.99,
			inStock: false,
		},
		{ title: 'The Giver', author: 'Lois Lowry', price: 7.99, inStock: true },
	],
	staff: [
		{ name: 'Alice', role: 'manager', departments: ['fiction', 'children'] },
		{ name: 'Bob', role: 'clerk', departments: ['fiction'] },
		{ name: 'Carol', role: 'clerk', departments: ['non-fiction', 'magazines'] },
	],
};
```

---

## Reading Data

### Get a Single Value

```typescript
// Store name
const name = value(store, '$.name');
// "Book Store"

// First book title
const firstTitle = value(store, '$.books[0].title');
// "1984"

// City from nested object
const city = value(store, '$.location.city');
// "New York"
```

### Get Multiple Values

```typescript
// All book titles
const titles = query(store, '$.books[*].title').values();
// ["1984", "Brave New World", "Fahrenheit 451", "The Giver"]

// All prices
const prices = query(store, '$.books[*].price').values();
// [9.99, 12.99, 8.99, 7.99]

// All staff names
const staffNames = query(store, '$.staff[*].name').values();
// ["Alice", "Bob", "Carol"]
```

### Check Existence

```typescript
// Does the store have books?
exists(store, '$.books'); // true

// Does any book have an ISBN?
exists(store, '$.books[*].isbn'); // false

// Is there a manager?
exists(store, '$.staff[?@.role == "manager"]'); // true
```

### Count Items

```typescript
// How many books?
count(store, '$.books[*]'); // 4

// How many in stock?
count(store, '$.books[?@.inStock]'); // 3

// How many clerks?
count(store, '$.staff[?@.role == "clerk"]'); // 2
```

---

## Filtering

### By Property Value

```typescript
// Books under $10
const cheap = query(store, '$.books[?@.price < 10]').values();
// [{ title: "1984", ... }, { title: "Fahrenheit 451", ... }, { title: "The Giver", ... }]

// In-stock books
const inStock = query(store, '$.books[?@.inStock == true]').values();
// [{ title: "1984", ... }, { title: "Brave New World", ... }, { title: "The Giver", ... }]

// By exact author
const orwell = query(store, '$.books[?@.author == "George Orwell"]').values();
// [{ title: "1984", ... }]
```

### Multiple Conditions

```typescript
// In stock AND under $10
const cheapAndAvailable = query(
	store,
	'$.books[?@.inStock && @.price < 10]',
).values();
// [{ title: "1984", ... }, { title: "The Giver", ... }]

// By Orwell OR Huxley
const dystopian = query(
	store,
	'$.books[?@.author == "George Orwell" || @.author == "Aldous Huxley"]',
).values();
// [{ title: "1984", ... }, { title: "Brave New World", ... }]
```

### By String Pattern

```typescript
// Titles starting with "The"
const theBooks = query(store, '$.books[?match(@.title, "^The")]').values();
// [{ title: "The Giver", ... }]

// Authors containing "ley"
const leyAuthors = query(store, '$.books[?search(@.author, "ley")]').values();
// [{ title: "Brave New World", ... }, { title: "The Giver", ... }]
```

---

## Array Operations

### By Index

```typescript
// First book
query(store, '$.books[0]').values();

// Last book
query(store, '$.books[-1]').values();

// First three
query(store, '$.books[0:3]').values();

// Every other book
query(store, '$.books[::2]').values();
```

### Slicing

```typescript
// First two books
query(store, '$.books[:2]').values();

// Last two books
query(store, '$.books[-2:]').values();

// Reverse order
query(store, '$.books[::-1]').values();
```

---

## Nested Data

### Deep Property Access

```typescript
// Get all departments across all staff
const allDepts = query(store, '$.staff[*].departments[*]').values();
// ["fiction", "children", "fiction", "non-fiction", "magazines"]

// Unique departments (use Set in JS)
const uniqueDepts = [...new Set(allDepts)];
// ["fiction", "children", "non-fiction", "magazines"]
```

### Recursive Descent

```typescript
// Find all "name" properties anywhere in the document
const allNames = query(store, '$..name').values();
// ["Book Store", "Alice", "Bob", "Carol"]

// Find all prices
const allPrices = query(store, '$..price').values();
// [9.99, 12.99, 8.99, 7.99]
```

---

## Working with Results

### Get Paths

```typescript
const result = query(store, '$.books[?@.price > 10]');

// Values
result.values();
// [{ title: "Brave New World", ... }]

// Paths as arrays
result.paths();
// [["books", "1"]]

// JSON Pointers
result.pointers();
// ["/books/1"]

// Normalized paths (RFC 9535)
result.normalizedPaths();
// ["$['books'][1]"]
```

### Iterate Results

```typescript
const result = query(store, '$.books[*]');

// For...of
for (const book of result) {
	console.log(book.title);
}

// Map
const titles = result.map((book) => book.title);

// Filter
const expensive = result.filter((book) => book.price > 10);

// ForEach
result.forEach((book) => console.log(book.title));
```

---

## Compiled Queries

### Basic Compilation

```typescript
// Compile once
const getExpensiveBooks = compile('$.books[?@.price > 10]');

// Use many times
const expensive1 = getExpensiveBooks(store1).values();
const expensive2 = getExpensiveBooks(store2).values();
const expensive3 = getExpensiveBooks(store3).values();
```

### Dynamic Thresholds

```typescript
// Build query string dynamically, but safely
function findBooksUnderPrice(data: any, maxPrice: number) {
	const compiled = compile(`$.books[?@.price <= ${maxPrice}]`);
	return compiled(data).values();
}

const under10 = findBooksUnderPrice(store, 10);
const under15 = findBooksUnderPrice(store, 15);
```

---

## Practical Patterns

### Find by ID

```typescript
function findBookByTitle(data: any, title: string): any | undefined {
	const escaped = title.replace(/"/g, '\\"');
	return value(data, `$.books[?@.title == "${escaped}"]`);
}

const book = findBookByTitle(store, '1984');
```

### Extract Field from Collection

```typescript
function pluck<T>(data: any, path: string, field: string): T[] {
	return query(data, `${path}[*].${field}`).values() as T[];
}

const titles = pluck<string>(store, '$.books', 'title');
const roles = pluck<string>(store, '$.staff', 'role');
```

### Group By Field

```typescript
function groupBy<T>(
	data: any,
	path: string,
	field: string,
): Record<string, T[]> {
	const items = query(data, `${path}[*]`).values() as T[];
	return items.reduce(
		(acc, item: any) => {
			const key = item[field];
			(acc[key] = acc[key] || []).push(item);
			return acc;
		},
		{} as Record<string, T[]>,
	);
}

const byRole = groupBy(store, '$.staff', 'role');
// { manager: [...], clerk: [...] }
```

### Sum/Aggregate

```typescript
function sumField(data: any, path: string): number {
	const values = query(data, path).values() as number[];
	return values.reduce((sum, v) => sum + v, 0);
}

const totalPrice = sumField(store, '$.books[*].price');
// 39.96
```
