# @jsonpath/jsonpath

Unified facade for the RFC-compliant JSONPath, Pointer, and Patch suite.

## Features

- **RFC 9535 JSONPath**: 100% compliance with the official JSONPath specification.
- **Extensible Function Registry**: Add custom functions via a robust plugin system.
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
const names = query(data, '$.users[*].name').values();
// ['Alice', 'Bob']
```

### Plugins

The suite includes several optional plugin packages for extended functionality:

- `@jsonpath/plugin-arithmetic`: `add`, `sub`, `mul`, `div`, `mod`
- `@jsonpath/plugin-extras`: `values`, `entries`, `flatten`, `unique`
- `@jsonpath/plugin-types`: `is_string`, `to_number`, etc.

```typescript
import { query, registerPlugin } from '@jsonpath/jsonpath';
import { ArithmeticPlugin } from '@jsonpath/plugin-arithmetic';

registerPlugin(new ArithmeticPlugin());

const data = { a: 10, b: 20 };
const result = query(data, '$[?add(@.a, @.b) > 25]').values();
// [{ a: 10, b: 20 }]
```

### Path Builder

Fluent API for building JSONPath strings:

```typescript
import { PathBuilder } from '@jsonpath/jsonpath';

const selector = new PathBuilder()
	.root()
	.child('users')
	.index(0)
	.child('name')
	.toString();
// "$.users[0].name"
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
