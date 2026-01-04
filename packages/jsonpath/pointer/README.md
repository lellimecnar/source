# @jsonpath/pointer

RFC 6901 (JSON Pointer) and Relative JSON Pointer implementation.

## Install

```bash
pnpm add @jsonpath/pointer
```

## Usage

### JSON Pointer (RFC 6901)

```ts
import { JSONPointer } from '@jsonpath/pointer';

const data = { foo: { bar: 42 } };
const ptr = new JSONPointer('/foo/bar');

ptr.resolve(data); // 42
ptr.exists(data); // true
ptr.parent().toString(); // "/foo"
```

### Relative JSON Pointer

```ts
import { RelativeJSONPointer, JSONPointer } from '@jsonpath/pointer';

const data = { foo: { bar: 42 } };
const base = new JSONPointer('/foo/bar');
const rel = new RelativeJSONPointer('1/baz');

// Evaluates to the value at "/foo/baz"
rel.evaluate(data, base);
```
