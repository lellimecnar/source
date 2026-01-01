# @jsonpath/compat-jsonpath

A drop-in compatibility adapter for the original `jsonpath` package, powered by the modern `@jsonpath` engine.

## Usage

```typescript
import jp from '@jsonpath/compat-jsonpath';

const data = { a: { b: 1 } };
const result = jp.query(data, '$.a.b');
// [1]

const nodes = jp.nodes(data, '$.a.b');
// [{ path: ['$', 'a', 'b'], value: 1 }]
```

## API

- `query(obj, path, count)`
- `paths(obj, path, count)`
- `nodes(obj, path, count)`
- `value(obj, path, newValue)`
- `parent(obj, path)`
- `apply(obj, path, fn)`
- `parse(path)`
- `stringify(path)`

## Why use this?

This package provides a modern, RFC 9535 compliant engine while maintaining the API surface of the legacy `jsonpath` package. It fixes many long-standing bugs and adds support for modern JSONPath features.
