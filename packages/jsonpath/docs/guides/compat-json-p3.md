# json-p3 Compatibility Layer

The `@jsonpath/compat-json-p3` package provides a drop-in compatible subset of the `json-p3` library, which is commonly used in projects like `@data-map/core`.

## Usage

```typescript
import { jsonpath, jsonpatch, JSONPointer } from '@jsonpath/compat-json-p3';

const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };

// Querying (arg order: path, data)
const result = jsonpath.query('$.users[*].name', data);
console.log(result.values()); // ['Alice', 'Bob']

// Patching (arg order: patch, target)
const target = { a: 1 };
jsonpatch.apply([{ op: 'replace', path: '/a', value: 2 }], target);
console.log(target.a); // 2

// JSON Pointer
const ptr = new JSONPointer('/users/0/name');
console.log(ptr.resolve(data)); // 'Alice'
```

## Why use this?

If you are migrating from `json-p3` to this RFC 9535 compliant suite, this package allows you to keep your existing code patterns while benefiting from the improved performance and compliance of the new engine.
