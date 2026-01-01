# @jsonpath/patch

Generate RFC 6902 JSON Patches using JSONPath queries.

## Usage

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

## Features

- **Pointer Generation**: Automatically converts JSONPath locations to RFC 6901 JSON Pointers.
- **Batch Operations**: Generate multiple operations in a single patch.
- **RFC 9535 Powered**: Uses the modern JSONPath engine for precise targeting.
