# @jsonpath/compat-jsonpath-plus

A drop-in compatibility adapter for `jsonpath-plus`, powered by the modern `@jsonpath` engine.

## Usage

```typescript
import { JSONPath } from '@jsonpath/compat-jsonpath-plus';

const data = { a: { b: 1 } };
const result = JSONPath({ path: '$.a.b', json: data });
// [1]

// Supports various result types
const paths = JSONPath({ path: '$.a.b', json: data, resultType: 'path' });
// ["$['a']['b']"]

const pointers = JSONPath({ path: '$.a.b', json: data, resultType: 'pointer' });
// ["/a/b"]
```

## Supported Options

- `path`: The JSONPath query string.
- `json`: The data to query.
- `resultType`: `'value' | 'path' | 'pointer' | 'parent' | 'parentProperty' | 'all'`.
- `wrap`: Whether to wrap the result in an array (default: `true`).

## Why use this?

This package provides a modern, RFC 9535 compliant engine while maintaining the API surface of `jsonpath-plus`. It's ideal for projects looking to migrate to the new standard without rewriting their query logic.
