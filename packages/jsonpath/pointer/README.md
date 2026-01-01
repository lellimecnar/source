# @jsonpath/pointer

A hardened, RFC 6901 compliant JSON Pointer implementation for TypeScript.

## Features

- **RFC 6901 Compliant**: Full support for JSON Pointer syntax and escaping.
- **Type-Safe**: Built with TypeScript for excellent developer experience.
- **Hardened**: Robust handling of edge cases and malformed pointers.
- **Zero Dependencies**: Lightweight and fast.

## Installation

```bash
pnpm add @jsonpath/pointer
```

## Usage

```typescript
import { get, set, parse, compile } from '@jsonpath/pointer';

const data = { foo: { bar: [1, 2, 3] } };

// Get a value
const value = get(data, '/foo/bar/1'); // 2

// Set a value
set(data, '/foo/bar/1', 42);
console.log(data.foo.bar[1]); // 42

// Parse a pointer into segments
const segments = parse('/foo/bar/1'); // ['foo', 'bar', '1']

// Compile segments into a pointer
const pointer = compile(['foo', 'bar', '1']); // '/foo/bar/1'
```

## API

### `get(data, pointer)`

Retrieves the value at the specified pointer.

### `set(data, pointer, value)`

Sets the value at the specified pointer.

### `parse(pointer)`

Parses a pointer string into an array of segments.

### `compile(segments)`

Compiles an array of segments into a pointer string.

## License

[MIT](../../../LICENSE)
