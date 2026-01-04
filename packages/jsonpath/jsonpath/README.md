# @jsonpath/jsonpath

Unified facade for the RFC-compliant JSONPath, Pointer, and Patch suite.

## Features

- **RFC 9535 JSONPath**: Full support for the latest JSONPath specification.
- **RFC 6901 JSON Pointer**: Resolve, exists, and parent navigation.
- **Relative JSON Pointer**: Support for relative navigation (draft-bhutton-relative-json-pointer).
- **RFC 6902 JSON Patch**: Atomic and mutable/immutable patch application.
- **RFC 7386 JSON Merge Patch**: Simple object merging and diffing.
- **High-level Utilities**: `transform`, `omit`, and unified function registry.

## Installation

```bash
pnpm add @jsonpath/jsonpath
```

## Usage

### Basic Query

```typescript
import { query } from '@jsonpath/jsonpath';

const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
const names = query(data, '$.users[*].name');
// ['Alice', 'Bob']
```

### Transformation

```typescript
import { transform } from '@jsonpath/jsonpath';

const data = { count: 10 };
transform(data, '$.count', (val) => val + 1);
// data.count is now 11
```

### JSON Patch

```typescript
import { applyPatch } from '@jsonpath/jsonpath';

const data = { a: 1 };
applyPatch(data, [{ op: 'replace', path: '/a', value: 2 }]);
// data.a is now 2
```

### Relative Pointers

```typescript
import { RelativeJSONPointer } from '@jsonpath/jsonpath';

const data = { a: { b: 1 } };
const rel = RelativeJSONPointer.parse('1/c');
const result = rel.resolve(data, data.a); // resolves to data.c
```

## License

MIT
