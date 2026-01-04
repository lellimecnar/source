# @jsonpath/\* Library Documentation

> A modular, high-performance, RFC-compliant implementation of JSONPath, JSON Pointer, JSON Patch, and JSON Merge Patch for JavaScript and TypeScript.

## Overview

The `@jsonpath/*` library suite provides comprehensive tools for querying, navigating, and modifying JSON documents. Each package focuses on a single RFC specification or concern, enabling tree-shaking and minimal bundle sizes.

### Key Features

- **🎯 RFC Compliant**: Full implementations of RFC 9535 (JSONPath), RFC 6901 (JSON Pointer), RFC 6902 (JSON Patch), and RFC 7386 (JSON Merge Patch)
- **📦 Modular**: Import only what you need
- **🚀 High Performance**: ASCII lookup tables, Pratt parsing, query caching
- **🔒 Type Safe**: Complete TypeScript support with strict types
- **🪶 Zero Dependencies**: No external runtime dependencies
- **🌳 Tree-Shakeable**: Dead code elimination friendly

## Package Overview

| Package                                            | Description                         | RFC      |
| -------------------------------------------------- | ----------------------------------- | -------- |
| [@jsonpath/jsonpath](./packages/jsonpath.md)       | Main entry point - unified facade   | -        |
| [@jsonpath/core](./packages/core.md)               | Shared types, errors, and utilities | -        |
| [@jsonpath/lexer](./packages/lexer.md)             | High-performance tokenizer          | -        |
| [@jsonpath/parser](./packages/parser.md)           | Pratt parser for JSONPath           | -        |
| [@jsonpath/evaluator](./packages/evaluator.md)     | AST interpreter                     | RFC 9535 |
| [@jsonpath/functions](./packages/functions.md)     | Built-in filter functions           | RFC 9535 |
| [@jsonpath/compiler](./packages/compiler.md)       | Query compilation and caching       | -        |
| [@jsonpath/pointer](./packages/pointer.md)         | JSON Pointer implementation         | RFC 6901 |
| [@jsonpath/patch](./packages/patch.md)             | JSON Patch operations               | RFC 6902 |
| [@jsonpath/merge-patch](./packages/merge-patch.md) | JSON Merge Patch                    | RFC 7386 |

## Quick Start

### Installation

```bash
# Install the main package (includes all functionality)
pnpm add @jsonpath/jsonpath

# Or install individual packages
pnpm add @jsonpath/pointer @jsonpath/patch
```

### Basic Usage

```typescript
import { query, queryValues } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: [
			{ title: 'Book 1', price: 10, category: 'fiction' },
			{ title: 'Book 2', price: 20, category: 'reference' },
			{ title: 'Book 3', price: 15, category: 'fiction' },
		],
	},
};

// Query all book titles
const titles = queryValues(data, '$.store.book[*].title');
// => ['Book 1', 'Book 2', 'Book 3']

// Query with filter
const cheapFiction = queryValues(
	data,
	'$.store.book[?(@.category == "fiction" && @.price < 20)].title',
);
// => ['Book 1', 'Book 3']

// Full result with paths
const result = query(data, '$.store.book[0]');
console.log(result.values()); // [{ title: 'Book 1', ... }]
console.log(result.normalizedPaths()); // ["$['store']['book'][0]"]
console.log(result.pointers()); // ['/store/book/0']
```

### JSON Pointer

```typescript
import { resolve, set, remove } from '@jsonpath/pointer';

const data = { a: { b: [1, 2, 3] } };

// Resolve a value
const value = resolve(data, '/a/b/1'); // => 2

// Set a value (returns new object)
const updated = set(data, '/a/b/1', 42);
// => { a: { b: [1, 42, 3] } }

// Remove a value
const removed = remove(data, '/a/b/1');
// => { a: { b: [1, 3] } }
```

### JSON Patch

```typescript
import { applyPatch, diff } from '@jsonpath/patch';

const original = { name: 'Alice', age: 30 };
const target = { name: 'Alice', age: 31, email: 'alice@example.com' };

// Apply a patch
const result = applyPatch(original, [
	{ op: 'replace', path: '/age', value: 31 },
	{ op: 'add', path: '/email', value: 'alice@example.com' },
]);

// Generate a patch from diff
const patch = diff(original, target);
// => [
//   { op: 'replace', path: '/age', value: 31 },
//   { op: 'add', path: '/email', value: 'alice@example.com' }
// ]
```

## Documentation Guide

### For Quick Reference

- [API Reference](./api/README.md) - Quick function/type lookup
- [Examples Index](./examples/README.md) - Common use cases and patterns

### For Learning

- [JSONPath Tutorial](./guides/tutorial.md) - Learn JSONPath syntax step-by-step
- [RFC Compliance Guide](./guides/rfc-compliance.md) - Understanding the RFCs

### For Advanced Usage

- [Performance Guide](./guides/performance.md) - Optimization tips and benchmarking
- [Security Guide](./guides/security.md) - Secure query options and input validation
- [Error Handling Guide](./guides/errors.md) - Working with errors and debugging

### Practical Examples

- [Basic Queries](./examples/basic-queries.md) - Common query patterns
- [Data Transformation](./examples/data-transformation.md) - Reshaping JSON data
- [Undo/Redo Systems](./examples/undo-redo.md) - Building history with JSON Patch
- [API Integration](./examples/api-integration.md) - Working with REST APIs
- [Configuration Management](./examples/configuration-management.md) - Hierarchical configs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    @jsonpath/jsonpath                        │
│                    (unified facade)                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
      ▼                       ▼                       ▼
┌───────────┐         ┌─────────────┐         ┌─────────────┐
│ evaluator │         │  compiler   │         │    patch    │
└─────┬─────┘         └──────┬──────┘         └──────┬──────┘
      │                      │                       │
      └──────────┬───────────┘                       │
                 │                                   │
                 ▼                                   ▼
          ┌─────────────┐                    ┌─────────────┐
          │   parser    │                    │   pointer   │
          └──────┬──────┘                    └─────────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│  lexer  │ │functions│ │  core   │
└─────────┘ └─────────┘ └─────────┘
```

## RFC Standards

| RFC                                                | Title                                     | Status  |
| -------------------------------------------------- | ----------------------------------------- | ------- |
| [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535) | JSONPath: Query Expressions for JSON      | ✅ Full |
| [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) | JavaScript Object Notation (JSON) Pointer | ✅ Full |
| [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902) | JavaScript Object Notation (JSON) Patch   | ✅ Full |
| [RFC 7386](https://www.rfc-editor.org/rfc/rfc7386) | JSON Merge Patch                          | ✅ Full |

## License

MIT
