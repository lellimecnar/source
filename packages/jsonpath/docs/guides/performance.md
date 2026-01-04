# Performance Guide

> Best practices for optimal JSONPath performance.

## Overview

The JSONPath library is designed for high performance through:

- **Pratt Parsing**: O(n) parsing with minimal backtracking
- **ASCII Lookup Tables**: O(1) character classification
- **Query Compilation**: Parse once, execute many times
- **LRU Caching**: Automatic caching of compiled queries
- **Streaming**: Memory-efficient iteration for large datasets

---

## Quick Wins

### 1. Compile Repeated Queries

The biggest performance gain for repeated queries:

```typescript
import { compile, query } from '@jsonpath/jsonpath';

// ❌ Slow: Parses on every call
function slow(data: any[]) {
	return data.map((d) => query(d, '$.user.name').values()[0]);
}

// ✅ Fast: Parse once, execute many
function fast(data: any[]) {
	const getName = compile('$.user.name');
	return data.map((d) => getName(d).values()[0]);
}
```

**Performance difference:** ~10x faster for repeated use.

### 2. Be Specific with Paths

Avoid recursive descent when possible:

```typescript
// ❌ Slow: Searches entire tree
query(data, '$..title');

// ✅ Fast: Direct path
query(data, '$.store.book[*].title');
```

**Why:** Recursive descent (`..`) must examine every node.

### 3. Limit Results Early

Apply filters and limits as early as possible:

```typescript
// ❌ Slow: Gets all, then filters in JS
const all = query(data, '$.items[*]').values();
const filtered = all.filter((i) => i.price > 100).slice(0, 10);

// ✅ Fast: Filter in query
const filtered = query(data, '$.items[?@.price > 100]').values().slice(0, 10);
```

### 4. Use exists() for Presence Checks

```typescript
// ❌ Slow: Full query execution
if (query(data, '$.user.email').values().length > 0) {
}

// ✅ Fast: Short-circuit on first match
if (exists(data, '$.user.email')) {
}
```

### 5. Use value() for Single Results

```typescript
// ❌ Slow: Creates array for single value
const name = query(data, '$.user.name').values()[0];

// ✅ Fast: Optimized for single value
const name = value(data, '$.user.name');
```

---

## Query Optimization

### Filter Expression Order

Put the most selective condition first:

```typescript
// ❌ Less efficient: Broad condition first
query(data, '$.items[?@.active && @.id == 12345]');

// ✅ More efficient: Narrow condition first
query(data, '$.items[?@.id == 12345 && @.active]');
```

### Avoid Redundant Paths

```typescript
// ❌ Traverses $.store twice
const books = query(data, '$.store.book[*]').values();
const magazines = query(data, '$.store.magazine[*]').values();

// ✅ Single traversal
const items = query(data, '$.store[book, magazine][*]').values();
```

### Use Slices Instead of Filters for Indices

```typescript
// ❌ Slow: Filter expression for range
query(data, '$.items[?@ >= 0 && @ < 10]');

// ✅ Fast: Native slice
query(data, '$.items[0:10]');
```

---

## Memory Optimization

### Use Streaming for Large Data

```typescript
import { stream } from '@jsonpath/jsonpath';

// ❌ Loads all results into memory
const results = query(hugeData, '$.items[*]').values();

// ✅ Processes one at a time
for (const match of stream(hugeData, '$.items[*]')) {
	processItem(match.value);
}
```

### Configure Limits

Prevent runaway queries:

```typescript
import { configure } from '@jsonpath/jsonpath';

configure({
	maxResults: 10000, // Stop after this many matches
	maxDepth: 64, // Limit recursion depth
	timeout: 5000, // Timeout in ms
});
```

### Clear Caches When Done

For long-running processes:

```typescript
import { clearCache } from '@jsonpath/compiler';

// After processing a batch
clearCache();
```

---

## Compilation Strategies

### Pre-compile Static Queries

```typescript
// At module load time
const queries = {
	activeUsers: compile('$.users[?@.active]'),
	adminUsers: compile('$.users[?@.role == "admin"]'),
	recentOrders: compile('$.orders[?@.date > $minDate]'),
};

// At runtime
export function getActiveUsers(data: any) {
	return queries.activeUsers(data).values();
}
```

### Cache Custom Queries

For dynamic but repeated queries:

```typescript
const queryCache = new Map<string, CompiledQuery>();

function cachedQuery(data: any, path: string) {
	let compiled = queryCache.get(path);
	if (!compiled) {
		compiled = compile(path);
		queryCache.set(path, compiled);
	}
	return compiled(data);
}
```

---

## Benchmarking

### Measure Query Performance

```typescript
function benchmark(name: string, fn: () => void, iterations = 1000) {
	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const elapsed = performance.now() - start;
	console.log(
		`${name}: ${elapsed.toFixed(2)}ms (${(elapsed / iterations).toFixed(3)}ms/op)`,
	);
}

// Compare approaches
const data = generateTestData();

benchmark('Uncompiled', () => {
	query(data, '$.items[?@.price > 100]').values();
});

const compiled = compile('$.items[?@.price > 100]');
benchmark('Compiled', () => {
	compiled(data).values();
});
```

### Profile Memory Usage

```typescript
function measureMemory(fn: () => void) {
	if (global.gc) global.gc(); // Node.js with --expose-gc
	const before = process.memoryUsage().heapUsed;
	fn();
	if (global.gc) global.gc();
	const after = process.memoryUsage().heapUsed;
	console.log(
		`Memory delta: ${((after - before) / 1024 / 1024).toFixed(2)} MB`,
	);
}
```

---

## Architecture Considerations

### Query Complexity

| Pattern      | Complexity | Notes                 |
| ------------ | ---------- | --------------------- |
| `$.a.b.c`    | O(1)       | Direct path traversal |
| `$.a[0]`     | O(1)       | Index access          |
| `$.a[*]`     | O(n)       | Linear scan           |
| `$.a[?expr]` | O(n)       | Filter evaluation     |
| `$..a`       | O(n)       | Full tree traversal   |
| `$.a[?$..b]` | O(n²)      | Nested recursion      |

### Avoid O(n²) Patterns

```typescript
// ❌ O(n²): Recursive query in filter
query(data, '$.items[?length($..children) > 0]');

// ✅ O(n): Pre-compute if possible
const itemsWithChildren = data.items.filter((item) => hasDeepChildren(item));
```

### Batch Processing

For very large datasets:

```typescript
async function processLargeDataset(items: any[]) {
	const BATCH_SIZE = 1000;
	const results = [];

	for (let i = 0; i < items.length; i += BATCH_SIZE) {
		const batch = items.slice(i, i + BATCH_SIZE);
		const batchResults = query({ items: batch }, '$.items[?@.active]').values();
		results.push(...batchResults);

		// Yield to event loop
		await new Promise((resolve) => setImmediate(resolve));
	}

	return results;
}
```

---

## Performance Checklist

- [ ] Compile queries that run more than once
- [ ] Use specific paths instead of recursive descent
- [ ] Apply filters in the query, not in JS
- [ ] Use `exists()` for presence checks
- [ ] Use `value()` for single-value lookups
- [ ] Configure resource limits
- [ ] Use streaming for large datasets
- [ ] Order filter conditions by selectivity
- [ ] Avoid O(n²) nested recursive patterns
- [ ] Profile before and after optimization

---

## Internal Optimizations

The library includes several automatic optimizations:

### LRU Cache

Queries are automatically cached (default: 1000 entries):

```typescript
// These use the same cached AST
query(data1, '$.items[*]');
query(data2, '$.items[*]');
query(data3, '$.items[*]');
```

### ASCII Lookup Tables

Character classification is O(1):

```typescript
// Instead of: char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z' || ...
// Uses: CHAR_FLAGS[charCode] & IS_IDENT_START
```

### Singular Query Detection

The parser detects "singular" queries that return at most one result:

```typescript
// Singular: $.store.book[0].title
// Non-singular: $.store.book[*].title

// Singular queries can short-circuit evaluation
```

### Immutable Mutations with Structural Sharing

Pointer mutations reuse unchanged structure:

```typescript
const original = { a: { b: 1 }, c: { d: 2 } };
const updated = set(original, '/a/b', 99);

// updated.c === original.c  // Reused!
```
