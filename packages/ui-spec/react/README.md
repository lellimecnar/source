## @ui-spec/react

React binding for UI-Spec.

### MVP scope

- Renders a UI-Spec schema into intrinsic React elements (e.g. `div`, `span`, `button`).
- Supports `{ "$path": "..." }` bindings in children and in node props.
- **Does not** support UIScript (`$fn`) in this MVP.

### Install

```bash
pnpm add @ui-spec/react
```

### Usage

```tsx
import * as React from 'react';
import { createStore, type UISpecSchema } from '@ui-spec/core';
import { UISpecProvider, UISpecRenderer } from '@ui-spec/react';

const schema: UISpecSchema = {
	$uispec: '1.0',
	root: {
		type: 'div',
		children: [
			{ type: 'span', children: 'Hello, ' },
			{ type: 'span', children: { $path: '$.user.name' } },
		],
	},
};

const store = createStore({ user: { name: 'Ada' } });

export function App() {
	return (
		<UISpecProvider store={store}>
			<UISpecRenderer schema={schema} />
		</UISpecProvider>
	);
}
```
