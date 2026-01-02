# @jsonpath/patch

Generate RFC 6902 JSON Patches using JSONPath queries.

## Features

- **Pointer Generation**: Automatically converts JSONPath locations to RFC 6901 JSON Pointers.
- **Batch Operations**: Generate multiple operations in a single patch.
- **RFC 9535 Powered**: Uses the modern JSONPath engine for precise targeting.
- **Type-Safe**: Full TypeScript support for patch operations.

## Installation

```bash
pnpm add @jsonpath/patch
```

## Usage

### `createPatch(data, path, value, op = 'replace')`

Generates a JSON Patch array by evaluating a JSONPath against the data.

```typescript
import { createPatch } from '@jsonpath/patch';

const data = {
	users: [
		{ id: 1, name: 'Alice', active: true },
		{ id: 2, name: 'Bob', active: false },
	],
};

// Generate a patch to activate all users
const patch = createPatch(data, '$.users[*].active', true);
// [
//   { op: 'replace', path: '/users/0/active', value: true },
//   { op: 'replace', path: '/users/1/active', value: true }
// ]
```

### `applyPatch(data, patch)`

A utility to apply an RFC 6902 patch to a JSON object.

```typescript
import { applyPatch } from '@jsonpath/patch';

const data = { a: 1 };
const patch = [{ op: 'replace', path: '/a', value: 2 }];

const result = applyPatch(data, patch);
console.log(result.a); // 2
```

## License

[MIT](../../../LICENSE)
