# @ui-spec/react

React bindings for UI-Spec:

- `UISpecProvider`: Wires up store, function registry, and component adapters.
- `UISpecRoot`: Renders the root node of the schema.
- `UISpecNode`: Renders a specific node schema.
- `useUISpecValue`: Hook for subscribing to store values via JSONPath.

## Usage

```tsx
import { createUISpecStore, createJsonp3FunctionRegistry } from '@ui-spec/core';
import {
	UISpecProvider,
	UISpecRoot,
	createUISpecAdapter,
} from '@ui-spec/react';

const store = createUISpecStore({ count: 0 });
const functions = createJsonp3FunctionRegistry(store);
const adapter = createUISpecAdapter({
	Button: ({ children, onClick }) => (
		<button onClick={onClick}>{children}</button>
	),
});

const schema = {
	root: {
		type: 'Button',
		props: {
			onClick: { $call: 'increment' },
		},
		children: ['Count: ', { $path: '$.count' }],
	},
};

functions.register('increment', () => {
	store.update('$.count', (v) => v + 1);
});

function App() {
	return (
		<UISpecProvider
			store={store}
			functions={functions}
			adapter={adapter}
			schema={schema}
		>
			<UISpecRoot />
		</UISpecProvider>
	);
}
```

This package is component-library-agnostic. Use adapters (e.g. `@ui-spec/adapter-shadcn`) to supply component mappings.
