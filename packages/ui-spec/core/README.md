## @ui-spec/core

Core runtime for UI-Spec.

### MVP scope

- Parses and validates a minimal UI-Spec schema (`$uispec: "1.0"` + `root`).
- Provides a minimal reactive store with read-only JSONPath access via `{ "$path": "..." }`.
- **Does not** support UIScript (`$fn`) in this MVP.

### Install

```bash
pnpm add @ui-spec/core
```

### Usage

```ts
import { createStore, parseUISpecSchema } from '@ui-spec/core';

const schema = parseUISpecSchema({
	$uispec: '1.0',
	root: {
		type: 'div',
		children: { $path: '$.user.name' },
	},
});

const store = createStore({ user: { name: 'Ada' } });

console.log(schema.root.type);
console.log(store.get('$.user.name'));
```
