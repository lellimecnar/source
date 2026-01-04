# @jsonpath/compiler

> Functional wrapper for reusable JSONPath queries with caching.

## Overview

`@jsonpath/compiler` provides query compilation and caching. Compiled queries are reusable functions that can be executed against multiple documents, avoiding repeated parsing overhead.

## Features

- **Query Compilation**: Convert AST to executable function
- **Query Caching**: Automatic LRU cache for compiled queries
- **Reusable Queries**: Execute same query against multiple documents

## Installation

```bash
pnpm add @jsonpath/compiler
```

## API Reference

### compile()

Compile a parsed AST into an executable function:

```typescript
import { parse } from '@jsonpath/parser';
import { compile } from '@jsonpath/compiler';

const ast = parse('$.store.book[*].title');
const query = compile(ast);

// Execute against multiple documents
const result1 = query(document1);
const result2 = query(document2);

console.log(result1.values()); // Titles from document1
console.log(result2.values()); // Titles from document2
```

### CompiledQuery Type

```typescript
type CompiledQuery = (root: any, options?: EvaluatorOptions) => QueryResult;
```

A compiled query is a function that:

- Takes a root document to query
- Optionally takes evaluation options
- Returns a `QueryResult`

### CompilerOptions

```typescript
interface CompilerOptions {
	readonly useCache?: boolean; // Enable caching (default: true)
	readonly optimize?: boolean; // Enable optimizations (future)
}
```

---

## Usage Patterns

### Basic Compilation

```typescript
import { parse } from '@jsonpath/parser';
import { compile, type CompiledQuery } from '@jsonpath/compiler';

// Compile once
const getPrices: CompiledQuery = compile(parse('$..price'));

// Use many times
const docs = [
	{ store: { book: { price: 10 } } },
	{ store: { book: { price: 20 } } },
	{ store: { book: { price: 30 } } },
];

const allPrices = docs.flatMap((doc) => getPrices(doc).values());
// [10, 20, 30]
```

### With Options

```typescript
const query = compile(parse('$..items[*]'));

// Apply different limits per execution
const result1 = query(largeDoc, { maxResults: 100 });
const result2 = query(smallDoc, { maxResults: 10 });
```

### Creating a Query Library

```typescript
import { parse } from '@jsonpath/parser';
import { compile, type CompiledQuery } from '@jsonpath/compiler';

// Define reusable queries
const queries = {
	allPrices: compile(parse('$..price')),
	allTitles: compile(parse('$..title')),
	expensiveItems: compile(parse('$[?(@.price > 100)]')),
	activeUsers: compile(parse('$.users[?(@.active == true)]')),
} as const;

// Export for use elsewhere
export { queries };

// Usage
import { queries } from './queries';

const prices = queries.allPrices(data).values();
const expensive = queries.expensiveItems(data).values();
```

---

## Query Caching

The compiler includes an automatic LRU cache for compiled queries:

```typescript
import { getCompiledQuery, setCompiledQuery } from '@jsonpath/compiler';

// Check if a query is cached
const cached = getCompiledQuery('$.store.book[*]');
if (cached) {
	// Use cached query
	return cached(data);
}

// Cache a compiled query
const compiled = compile(parse('$.store.book[*]'));
setCompiledQuery('$.store.book[*]', compiled);
```

### Cache Characteristics

- **Size Limit**: 1000 entries (LRU eviction)
- **Key**: Original query string
- **Automatic Management**: Oldest entries evicted when full

---

## Using with @jsonpath/jsonpath

The main `@jsonpath/jsonpath` package provides higher-level compilation:

```typescript
import { compileQuery } from '@jsonpath/jsonpath';

// Automatically parses and compiles
const query = compileQuery('$.store.book[*].title');

// Use with caching
const result = query(data);
```

This is the recommended approach for most use cases.

---

## Performance Benefits

### Without Compilation

```typescript
import { query } from '@jsonpath/jsonpath';

// Parses the query string every time
for (const doc of documents) {
	query(doc, '$.store.book[*].title');
}
```

### With Compilation

```typescript
import { compileQuery } from '@jsonpath/jsonpath';

// Parse once
const getBookTitles = compileQuery('$.store.book[*].title');

// Execute many times (no parsing)
for (const doc of documents) {
	getBookTitles(doc);
}
```

For queries executed multiple times, compilation provides significant performance improvement by eliminating repeated parsing overhead.

---

## Advanced Usage

### Type-Safe Compiled Queries

```typescript
import { parse } from '@jsonpath/parser';
import { compile } from '@jsonpath/compiler';
import type { QueryResult } from '@jsonpath/evaluator';

interface Book {
	title: string;
	price: number;
}

// Create typed query wrapper
function typedQuery<T>(path: string): (data: any) => QueryResult<T> {
	return compile(parse(path)) as (data: any) => QueryResult<T>;
}

const getBooks = typedQuery<Book>('$.store.book[*]');

const books = getBooks(data);
// TypeScript knows: books.values() returns Book[]
```

### Conditional Compilation

```typescript
import { parse } from '@jsonpath/parser';
import { compile } from '@jsonpath/compiler';

// Build query dynamically based on user input
function createFilterQuery(field: string, value: string) {
	const path = `$[?(@.${field} == "${value}")]`;
	return compile(parse(path));
}

const filterByCategory = createFilterQuery('category', 'fiction');
const results = filterByCategory(data).values();
```
