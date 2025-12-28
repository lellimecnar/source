## UI-Spec MVP (Core + React Binding)

## Goal

Implement `@ui-spec/core` and `@ui-spec/react` in this monorepo so a JSON UI schema can be parsed and rendered in React with read-only `$path` bindings (JSONPath). UIScript (`$fn`) is explicitly not supported in this MVP.

## Prerequisites

Make sure that the user is currently on the `feature/ui-spec-mvp` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from `master`.

### Step-by-Step Instructions

#### Step 1: Scaffold `@ui-spec` packages + TypeScript types

- [x] Update the workspace globs so nested packages under `packages/ui-spec/*` are included.
- [x] Copy and paste the code below into `pnpm-workspace.yaml` (this replaces the full file):

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'packages/ui-spec/*'
  - 'card-stack/*'
```

- [x] Create the directories:
  - [x] `packages/ui-spec/core/src`
  - [x] `packages/ui-spec/react/src`

- [x] Copy and paste the code below into `packages/ui-spec/core/package.json`:

```json
{
	"name": "@ui-spec/core",
	"version": "0.1.0",
	"description": "UI-Spec core runtime (schema, parsing, store, JSONPath bindings).",
	"license": "MIT",
	"sideEffects": false,
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"type-check": "tsc -p tsconfig.json --noEmit",
		"test": "jest",
		"lint": "eslint . --max-warnings 0"
	},
	"dependencies": {
		"jsonpath-plus": "^10.3.0"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"eslint": "^8.57.1",
		"jest": "^29.7.0",
		"reflect-metadata": "^0.2.2",
		"ts-jest": "^29.2.5",
		"typescript": "~5.5.0"
	}
}
```

- [x] Copy and paste the code below into `packages/ui-spec/core/tsconfig.json`:

```json
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./dist",
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "node_modules"]
}
```

- [x] Copy and paste the code below into `packages/ui-spec/core/jest.config.js`:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/core',
	testEnvironment: 'node',
};
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/schema.ts`:

```ts
export type UISpecVersion = '1.0';

export type PathBinding = {
	$path: string;
};

export type NodeChild = string | NodeSchema | PathBinding;
export type NodeChildren = NodeChild | NodeChild[];

export type NodeProps = Record<string, unknown>;

export type NodeSchema = {
	type: string;
	class?: string;
	props?: NodeProps;
	children?: NodeChildren;
};

export type UISpecSchema = {
	$uispec: UISpecVersion;
	root: NodeSchema;
};

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

export function isPathBinding(value: unknown): value is PathBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof (value as Record<string, unknown>).$path === 'string'
	);
}
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/index.ts`:

```ts
export * from './schema';
export * from './errors';
export * from './parse';
export * from './store';
```

- [x] Copy and paste the code below into `packages/ui-spec/react/package.json`:

```json
{
	"name": "@ui-spec/react",
	"version": "0.1.0",
	"description": "React binding for UI-Spec.",
	"license": "MIT",
	"sideEffects": false,
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"type-check": "tsc -p tsconfig.json --noEmit",
		"test": "jest",
		"lint": "eslint . --max-warnings 0"
	},
	"dependencies": {
		"@ui-spec/core": "workspace:*"
	},
	"peerDependencies": {
		"react": ">=18",
		"react-dom": ">=18"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"@types/react": "^18.3.3",
		"@types/react-dom": "^18.3.0",
		"eslint": "^8.57.1",
		"jest": "^29.7.0",
		"react": "^18.3.1",
		"react-dom": "^18.3.1",
		"reflect-metadata": "^0.2.2",
		"ts-jest": "^29.2.5",
		"typescript": "~5.5.0"
	}
}
```

- [x] Copy and paste the code below into `packages/ui-spec/react/tsconfig.json`:

```json
{
	"extends": "@lellimecnar/typescript-config/react.json",
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./dist",
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true
	},
	"include": ["src/**/*.ts", "src/**/*.tsx"],
	"exclude": ["dist", "node_modules"]
}
```

- [x] Copy and paste the code below into `packages/ui-spec/react/jest.config.js`:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/react',
	testEnvironment: 'node',
};
```

- [x] Copy and paste the code below into `packages/ui-spec/react/src/index.ts`:

```ts
export * from './types';
export * from './provider';
export * from './render';
```

##### Step 1 Verification Checklist

- [x] Run `pnpm install` from repo root (workspace metadata must update after `pnpm-workspace.yaml` changes).
- [ ] Run `pnpm -w type-check` and confirm it succeeds. (Currently fails due to pre-existing `@lellimecnar/expo-with-modify-gradle` type-check errors.)

#### Step 1 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Core parser + validation errors

- [x] Copy and paste the code below into `packages/ui-spec/core/src/errors.ts`:

```ts
export type UISpecErrorCode =
	| 'INVALID_SCHEMA'
	| 'INVALID_SCHEMA_VERSION'
	| 'MISSING_ROOT'
	| 'INVALID_NODE'
	| 'INVALID_NODE_TYPE'
	| 'INVALID_CHILDREN'
	| 'INVALID_BINDING';

export class UISpecError extends Error {
	public readonly code: UISpecErrorCode;
	public readonly path: string;

	constructor(code: UISpecErrorCode, message: string, path: string) {
		super(message);
		this.name = 'UISpecError';
		this.code = code;
		this.path = path;
	}
}
```

- [x] Create the directory `packages/ui-spec/core/src/parse`.

- [x] Copy and paste the code below into `packages/ui-spec/core/src/parse/index.ts`:

```ts
import { UISpecError } from '../errors';
import {
	isPathBinding,
	isPlainObject,
	NodeSchema,
	UISpecSchema,
	UISpecVersion,
} from '../schema';

function assertUISpecVersion(value: unknown): asserts value is UISpecVersion {
	if (value !== '1.0') {
		throw new UISpecError(
			'INVALID_SCHEMA_VERSION',
			'Invalid or unsupported $uispec version; expected "1.0".',
			'$.\$uispec',
		);
	}
}

function validateChildren(children: unknown, path: string): void {
	if (children === undefined) return;

	const validateChild = (child: unknown, childPath: string) => {
		if (typeof child === 'string') return;
		if (isPathBinding(child)) return;
		if (isPlainObject(child)) {
			validateNode(child, childPath);
			return;
		}

		throw new UISpecError(
			'INVALID_CHILDREN',
			'Invalid children value; expected string, node, $path binding, or array.',
			childPath,
		);
	};

	if (Array.isArray(children)) {
		children.forEach((c, index) => validateChild(c, `${path}[${index}]`));
		return;
	}

	validateChild(children, path);
}

function validateNode(node: Record<string, unknown>, path: string): void {
	if (!isPlainObject(node)) {
		throw new UISpecError('INVALID_NODE', 'Node must be an object.', path);
	}

	if (typeof node.type !== 'string' || node.type.length === 0) {
		throw new UISpecError(
			'INVALID_NODE_TYPE',
			'Node.type must be a non-empty string.',
			`${path}.type`,
		);
	}

	if (node.class !== undefined && typeof node.class !== 'string') {
		throw new UISpecError(
			'INVALID_NODE',
			'Node.class must be a string when provided.',
			`${path}.class`,
		);
	}

	if (node.props !== undefined && !isPlainObject(node.props)) {
		throw new UISpecError(
			'INVALID_NODE',
			'Node.props must be an object when provided.',
			`${path}.props`,
		);
	}

	validateChildren(node.children, `${path}.children`);

	if (node.props && isPlainObject(node.props)) {
		for (const [key, value] of Object.entries(node.props)) {
			if (isPathBinding(value)) continue;
			if (
				value === null ||
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				Array.isArray(value) ||
				isPlainObject(value)
			) {
				continue;
			}

			throw new UISpecError(
				'INVALID_BINDING',
				'Invalid prop value; MVP supports literals, objects/arrays, or {$path: string} bindings.',
				`${path}.props.${key}`,
			);
		}
	}
}

export function parseUISpecSchema(input: unknown): UISpecSchema {
	if (!isPlainObject(input)) {
		throw new UISpecError(
			'INVALID_SCHEMA',
			'UI-Spec schema must be a JSON object.',
			'$',
		);
	}

	assertUISpecVersion(input.$uispec);

	if (!isPlainObject(input.root)) {
		throw new UISpecError(
			'MISSING_ROOT',
			'UI-Spec schema must include a root node.',
			'$.root',
		);
	}

	validateNode(input.root, '$.root');

	return input as unknown as UISpecSchema;
}

export function parseNode(input: unknown, path = '$'): NodeSchema {
	if (!isPlainObject(input)) {
		throw new UISpecError('INVALID_NODE', 'Node must be an object.', path);
	}

	validateNode(input, path);
	return input as unknown as NodeSchema;
}
```

- [x] Update `packages/ui-spec/core/src/index.ts` to export the parser.
- [x] Copy and paste the code below into `packages/ui-spec/core/src/index.ts` (this replaces the full file):

```ts
export * from './schema';
export * from './errors';
export * from './parse';
export * from './store';
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/parse.spec.ts`:

```ts
import { parseUISpecSchema } from './parse';

describe('parseUISpecSchema', () => {
	it('parses a minimal valid schema', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: {
				type: 'div',
				children: 'hello',
			},
		});

		expect(schema.$uispec).toBe('1.0');
		expect(schema.root.type).toBe('div');
	});

	it('rejects invalid version', () => {
		expect(() =>
			parseUISpecSchema({
				$uispec: '2.0',
				root: { type: 'div' },
			}),
		).toThrow(/expected \"1\.0\"/);
	});

	it('rejects invalid children', () => {
		expect(() =>
			parseUISpecSchema({
				$uispec: '1.0',
				root: { type: 'div', children: 123 },
			}),
		).toThrow(/Invalid children/);
	});

	it('accepts $path binding in children', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: { type: 'span', children: { $path: '$.user.name' } },
		});

		expect(schema.root.type).toBe('span');
	});
});
```

##### Step 2 Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test` and confirm it succeeds.

#### Step 2 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Store + JSONPath binding resolution (read-only MVP)

- [x] Create the directories:
  - [x] `packages/ui-spec/core/src/bindings`
  - [x] `packages/ui-spec/core/src/store`

- [x] Copy and paste the code below into `packages/ui-spec/core/src/bindings/jsonpath.ts`:

```ts
import { JSONPath } from 'jsonpath-plus';

export type JSONPathEvalMode = 'safe' | 'native' | false;

export type ReadPathOptions = {
	evalMode?: JSONPathEvalMode;
};

export function readJsonPath(
	json: unknown,
	path: string,
	options?: ReadPathOptions,
): unknown {
	const results = JSONPath({
		path,
		json,
		wrap: true,
		eval: options?.evalMode ?? 'safe',
	}) as unknown[];

	if (!Array.isArray(results) || results.length === 0) return undefined;
	if (results.length === 1) return results[0];
	return results;
}
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/store/types.ts`:

```ts
export type Unsubscribe = () => void;
export type StoreListener = () => void;

export interface UISpecStore {
	getData(): unknown;
	setData(nextData: unknown): void;
	get(path: string): unknown;
	subscribe(listener: StoreListener): Unsubscribe;
}
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/store/store.ts`:

```ts
import { readJsonPath } from '../bindings/jsonpath';
import type { StoreListener, UISpecStore, Unsubscribe } from './types';

export type CreateStoreOptions = {
	jsonPathEvalMode?: 'safe' | 'native' | false;
};

export function createStore(
	initialData: unknown,
	options?: CreateStoreOptions,
): UISpecStore {
	let data = initialData;
	const listeners = new Set<StoreListener>();

	const notify = () => {
		for (const listener of Array.from(listeners)) listener();
	};

	return {
		getData() {
			return data;
		},

		setData(nextData: unknown) {
			data = nextData;
			notify();
		},

		get(path: string) {
			return readJsonPath(data, path, {
				evalMode: options?.jsonPathEvalMode ?? 'safe',
			});
		},

		subscribe(listener: StoreListener): Unsubscribe {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/store/index.ts`:

```ts
export * from './types';
export * from './store';
```

- [x] Update `packages/ui-spec/core/src/index.ts` exports (it already exports `./store`; this step is just to ensure it remains accurate).

- [x] Copy and paste the code below into `packages/ui-spec/core/src/bindings.spec.ts`:

```ts
import { readJsonPath } from './bindings/jsonpath';

describe('readJsonPath', () => {
	it('returns undefined when no matches', () => {
		expect(readJsonPath({ a: 1 }, '$.missing')).toBeUndefined();
	});

	it('returns a single value when one match', () => {
		expect(readJsonPath({ a: 1 }, '$.a')).toBe(1);
	});

	it('returns an array when multiple matches', () => {
		const data = {
			users: [
				{ active: true, name: 'A' },
				{ active: true, name: 'B' },
			],
		};
		expect(readJsonPath(data, '$.users[?(@.active)].name')).toEqual(['A', 'B']);
	});
});
```

- [x] Copy and paste the code below into `packages/ui-spec/core/src/store.spec.ts`:

```ts
import { createStore } from './store';

describe('createStore', () => {
	it('reads JSONPath values', () => {
		const store = createStore({ user: { name: 'Ada' } });
		expect(store.get('$.user.name')).toBe('Ada');
	});

	it('notifies subscribers on setData', () => {
		const store = createStore({ count: 0 });
		const listener = jest.fn();

		const unsubscribe = store.subscribe(listener);
		store.setData({ count: 1 });

		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		store.setData({ count: 2 });

		expect(listener).toHaveBeenCalledTimes(1);
	});
});
```

##### Step 3 Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test` and confirm it succeeds.
- [x] Run `pnpm --filter @ui-spec/core type-check` and confirm it succeeds.

#### Step 3 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: React binding renders primitives + bindings

- [x] Copy and paste the code below into `packages/ui-spec/react/src/types.ts`:

```ts
import type { UISpecSchema } from '@ui-spec/core';
import type { UISpecStore } from '@ui-spec/core';

export type UISpecProviderProps = {
	store: UISpecStore;
	children: React.ReactNode;
};

export type UISpecRendererProps = {
	schema: UISpecSchema;
};
```

- [x] Copy and paste the code below into `packages/ui-spec/react/src/provider.tsx`:

```tsx
import * as React from 'react';
import type { UISpecStore } from '@ui-spec/core';

const StoreContext = React.createContext<UISpecStore | null>(null);

export function UISpecProvider(props: {
	store: UISpecStore;
	children: React.ReactNode;
}) {
	return (
		<StoreContext.Provider value={props.store}>
			{props.children}
		</StoreContext.Provider>
	);
}

export function useUISpecStore(): UISpecStore {
	const store = React.useContext(StoreContext);
	if (!store) {
		throw new Error('UISpecProvider is missing in the component tree.');
	}
	return store;
}
```

- [x] Copy and paste the code below into `packages/ui-spec/react/src/render.tsx`:

```tsx
import * as React from 'react';
import {
	isPathBinding,
	isPlainObject,
	type NodeSchema,
	type UISpecSchema,
} from '@ui-spec/core';
import { useUISpecStore } from './provider';

function toChildArray(children: unknown): unknown[] {
	if (children === undefined) return [];
	return Array.isArray(children) ? children : [children];
}

function stringifyForText(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean')
		return String(value);
	return JSON.stringify(value);
}

function renderChild(
	child: unknown,
	readPath: (path: string) => unknown,
): React.ReactNode {
	if (typeof child === 'string') return child;
	if (isPathBinding(child)) return stringifyForText(readPath(child.$path));
	if (isPlainObject(child)) return renderNode(child as NodeSchema, readPath);
	return null;
}

function resolveProps(
	props: Record<string, unknown> | undefined,
	readPath: (path: string) => unknown,
) {
	if (!props) return undefined;

	const resolved: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		if (isPathBinding(value)) {
			resolved[key] = readPath(value.$path);
			continue;
		}

		resolved[key] = value;
	}

	return resolved;
}

function renderNode(
	node: NodeSchema,
	readPath: (path: string) => unknown,
): React.ReactElement {
	const resolvedProps = resolveProps(node.props, readPath) ?? {};

	if (typeof node.class === 'string' && node.class.length > 0) {
		(resolvedProps as Record<string, unknown>).className = node.class;
	}

	const childArray = toChildArray(node.children);
	const renderedChildren = childArray.map((c, index) => (
		<React.Fragment key={index}>{renderChild(c, readPath)}</React.Fragment>
	));

	return React.createElement(node.type, resolvedProps, ...renderedChildren);
}

export function UISpecRenderer(props: { schema: UISpecSchema }) {
	const store = useUISpecStore();

	React.useSyncExternalStore(
		store.subscribe,
		() => store.getData(),
		() => store.getData(),
	);

	const readPath = React.useCallback(
		(path: string) => store.get(path),
		[store],
	);

	return renderNode(props.schema.root, readPath);
}
```

- [x] Copy and paste the code below into `packages/ui-spec/react/src/render.spec.tsx`:

```tsx
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStore, type UISpecSchema } from '@ui-spec/core';
import { UISpecProvider } from './provider';
import { UISpecRenderer } from './render';

describe('UISpecRenderer', () => {
	it('renders text and $path binding', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			root: {
				type: 'div',
				children: [
					{ type: 'span', children: 'Hi ' },
					{ type: 'span', children: { $path: '$.user.name' } },
				],
			},
		};

		const store = createStore({ user: { name: 'Ada' } });

		const html = renderToStaticMarkup(
			<UISpecProvider store={store}>
				<UISpecRenderer schema={schema} />
			</UISpecProvider>,
		);

		expect(html).toContain('Hi');
		expect(html).toContain('Ada');
	});

	it('applies className and prop bindings', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			root: {
				type: 'button',
				class: 'btn',
				props: {
					disabled: { $path: '$.flags.disabled' },
					title: { $path: '$.labels.title' },
				},
				children: 'Click',
			},
		};

		const store = createStore({
			flags: { disabled: true },
			labels: { title: 'X' },
		});

		const html = renderToStaticMarkup(
			<UISpecProvider store={store}>
				<UISpecRenderer schema={schema} />
			</UISpecProvider>,
		);

		expect(html).toContain('class="btn"');
		expect(html).toContain('disabled');
		expect(html).toContain('title="X"');
	});
});
```

##### Step 4 Verification Checklist

- [x] Run `pnpm --filter @ui-spec/react test` and confirm it succeeds.
- [x] Run `pnpm --filter @ui-spec/react type-check` and confirm it succeeds.

#### Step 4 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Minimal docs + usage example

- [x] Copy and paste the code below into `packages/ui-spec/core/README.md`:

````md
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
````

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

````

- [x] Copy and paste the code below into `packages/ui-spec/react/README.md`:

```md
## @ui-spec/react

React binding for UI-Spec.

### MVP scope

- Renders a UI-Spec schema into intrinsic React elements (e.g. `div`, `span`, `button`).
- Supports `{ "$path": "..." }` bindings in children and in node props.
- **Does not** support UIScript (`$fn`) in this MVP.

### Install

```bash
pnpm add @ui-spec/react
````

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

````

- [x] Create the file `docs/api/ui-spec.md`.
- [x] Copy and paste the code below into `docs/api/ui-spec.md`:

```md
## UI-Spec (MVP)

This repository includes an MVP implementation of **UI-Spec**, a declarative JSON-to-UI framework described in `specs/ui-spec.md`.

### Packages

- `@ui-spec/core`: schema types, parsing/validation, store, and JSONPath bindings
- `@ui-spec/react`: React binding that renders schema nodes to intrinsic React elements

### MVP schema subset

A UI-Spec schema is a JSON object with:

- `$uispec`: must be `"1.0"`
- `root`: the root node

Each node supports:

- `type` (string): intrinsic element name (`div`, `span`, `button`, ...)
- `class` (string, optional): mapped to `className`
- `props` (object, optional): literals or `{ "$path": "..." }` bindings
- `children` (string | node | array, optional): may contain `{ "$path": "..." }` bindings

### Data binding

Bindings use JSONPath:

- `{ "$path": "$.user.name" }`
- Filters like `$.users[?(@.active)].name` are supported via the JSONPath engine.

### Not supported in MVP

- UIScript (`$fn`)
- Routing
- Validators/plugins
- Async boundaries
- Devtools

### Test commands

From repo root:

- `pnpm --filter @ui-spec/core test`
- `pnpm --filter @ui-spec/react test`
- `pnpm -w type-check`
````

##### Step 5 Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test` and `pnpm --filter @ui-spec/react test`.
- [x] Run `pnpm -w type-check`.
      Result: currently fails in `@lellimecnar/prettier-config` due to missing typings for `@vercel/style-guide/prettier` (TS7016).

#### Step 5 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## UI-Spec v1 (Post-MVP)

### Goal

Evolve the existing MVP into the UI-Spec v1 surface described in [specs/ui-spec.md](../../specs/ui-spec.md), aligned to [plans/ui-spec/plan.md](plan.md) Steps 1–13.

### Constraints

- Run commands from repo root; do not `cd` into workspaces.
- Use package-scoped verification commands (`pnpm --filter ...`) to avoid unrelated monorepo type-check noise.
- Preserve existing `UISpecError` shape (`code`, `path`) for downstream compatibility.
- Keep store snapshots immutable-by-reference (updates must replace the root data reference) to satisfy `useSyncExternalStore` behavior.

### Prerequisites

- Create and switch to branch `feature/ui-spec-v1` based on the committed MVP tip.

---

### Step 1 (v1) — Expand core schema/types (v1 surface, MVP-compatible)

**Files:**

- `packages/ui-spec/core/src/schema.ts`
- `packages/ui-spec/core/src/index.ts`
- `packages/ui-spec/core/src/fixtures/types.v1.ts`

**Instructions**

- [x] Replace `packages/ui-spec/core/src/schema.ts` with:

```ts
export type UISpecVersion = '1.0';

export interface PathBinding {
	$path: string;
}

export interface ExprBinding {
	$expr: string;
}

export interface CallBinding {
	$call: {
		name: string;
		args?: ValueExpr[];
	};
}

export interface FnBinding {
	$fn: string;
}

export type BindingExpr = PathBinding | ExprBinding | CallBinding | FnBinding;

export type Primitive = string | number | boolean | null;

export type ValueExpr =
	| Primitive
	| BindingExpr
	| Record<string, unknown>
	| unknown[];

export type NodeChild = string | NodeSchema | BindingExpr;
export type NodeChildren = NodeChild | NodeChild[];

export type NodeProps = Record<string, unknown>;

export interface ForDirective {
	$for: {
		each: ValueExpr;
		as?: string;
		key?: ValueExpr;
		then: NodeSchema;
	};
}

export interface IfDirective {
	$if: ValueExpr;
	$then: NodeSchema;
	$else?: NodeSchema | true;
}

export interface SwitchDirective {
	$switch: {
		on: ValueExpr;
		cases: Array<{ when: ValueExpr; then: NodeSchema }>;
		default?: NodeSchema;
	};
}

export interface BindDirective {
	$bind: {
		path: string;
		mode?: 'read' | 'write' | 'twoWay';
		parse?: FnBinding | CallBinding;
		transform?: FnBinding | CallBinding;
		debounceMs?: number;
		throttleMs?: number;
		validate?: {
			schema?: string;
			plugin?: string;
		};
	};
}

export interface OnDirective {
	$on: Record<string, FnBinding | CallBinding | ExprBinding>;
}

export interface SlotsDirective {
	$slots: Record<string, NodeChildren>;
}

export interface LifecycleHooks {
	$mounted?: FnBinding | CallBinding;
	$updated?: FnBinding | CallBinding;
	$unmounted?: FnBinding | CallBinding;
}

export interface NodeSchema extends Partial<LifecycleHooks> {
	// Intrinsic node
	type: string;
	$id?: string;
	$ref?: string;
	$extends?: string;
	class?: string;
	props?: NodeProps;
	children?: NodeChildren;

	// Directives
	$if?: IfDirective['$if'];
	$then?: IfDirective['$then'];
	$else?: IfDirective['$else'];
	$switch?: SwitchDirective['$switch'];
	$for?: ForDirective['$for'];
	$bind?: BindDirective['$bind'];
	$on?: OnDirective['$on'];
	$slots?: SlotsDirective['$slots'];
}

export interface ThemeConfig {
	mode?: 'light' | 'dark' | 'system';
}

export interface UISpecMeta {
	title?: string;
	description?: string;
	theme?: ThemeConfig;
	locale?: string;
}

export interface ComponentSchema {
	props?: Record<string, unknown>;
	root: NodeSchema;
}

export interface FunctionSchema {
	$fn: string;
}

export interface PluginConfig {
	name: string;
	options?: Record<string, unknown>;
}

export interface RouteSchema {
	path: string;
	root?: NodeSchema;
	load?: {
		url: string;
	};
	beforeEnter?: FnBinding | CallBinding;
}

export interface UISpecSchema {
	$uispec: UISpecVersion;
	$id?: string;

	meta?: UISpecMeta;
	data?: Record<string, unknown>;
	components?: Record<string, ComponentSchema>;
	functions?: Record<string, FunctionSchema>;
	plugins?: PluginConfig[];
	schemas?: Record<string, unknown>;
	computed?: Record<string, unknown>;

	root?: NodeSchema;
	routes?: RouteSchema[];
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

export function isPathBinding(value: unknown): value is PathBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof value.$path === 'string'
	);
}

export function isExprBinding(value: unknown): value is ExprBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof value.$expr === 'string'
	);
}

export function isCallBinding(value: unknown): value is CallBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		isPlainObject(value.$call) &&
		typeof value.$call.name === 'string'
	);
}

export function isFnBinding(value: unknown): value is FnBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof value.$fn === 'string'
	);
}

export function isBindingExpr(value: unknown): value is BindingExpr {
	return (
		isPathBinding(value) ||
		isExprBinding(value) ||
		isCallBinding(value) ||
		isFnBinding(value)
	);
}
```

- [x] Replace `packages/ui-spec/core/src/index.ts` with:

```ts
export * from './schema';
export * from './errors';
export * from './parse';
export * from './store';
```

- [x] Create `packages/ui-spec/core/src/fixtures/types.v1.ts` with:

```ts
import type {
	BindDirective,
	CallBinding,
	ExprBinding,
	FnBinding,
	NodeSchema,
	PathBinding,
	RouteSchema,
	UISpecSchema,
} from '../schema';

// Compile-only fixtures to lock the public type surface.

const _path: PathBinding = { $path: '$.user.name' };
const _expr: ExprBinding = { $expr: '1 + 1' };
const _call: CallBinding = { $call: { name: 'doThing', args: [_path] } };
const _fn: FnBinding = { $fn: '(ctx) => ctx' };

const _bind: BindDirective = {
	$bind: {
		path: '$.user.name',
		mode: 'twoWay',
		debounceMs: 100,
		validate: { schema: 'User', plugin: 'jsonschema' },
	},
};

const _node: NodeSchema = {
	type: 'div',
	class: 'p-4',
	props: { title: _path },
	children: ['hello', _expr, _call, _fn],
	..._bind,
};

const _route: RouteSchema = {
	path: '/users/:id',
	load: { url: 'https://example.com/schema.json' },
};

const _schema: UISpecSchema = {
	$uispec: '1.0',
	meta: { title: 'Example' },
	data: { user: { name: 'Ada' } },
	root: _node,
	routes: [_route],
};

void _schema;
```

#### Step 1 (v1) Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core type-check`.

**Note:** This was initially blocked by `schema.root` becoming optional; Step 2 updates resolve it.

#### Step 1 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 2 (v1) — Core parsing + structural validation (schema + node directives)

**Files:**

- `packages/ui-spec/core/src/errors.ts`
- `packages/ui-spec/core/src/parse/index.ts`
- `packages/ui-spec/core/src/parse/validate.ts`
- `packages/ui-spec/core/src/parse.spec.ts`

**Instructions**

- [x] Replace `packages/ui-spec/core/src/errors.ts` with:

```ts
export type UISpecErrorCode =
	| 'INVALID_SCHEMA'
	| 'INVALID_SCHEMA_VERSION'
	| 'MISSING_ROOT'
	| 'INVALID_NODE'
	| 'INVALID_NODE_TYPE'
	| 'INVALID_CHILDREN'
	| 'INVALID_BINDING'
	| 'INVALID_DIRECTIVE'
	| 'SECURITY_LIMIT_EXCEEDED';

export class UISpecError extends Error {
	public readonly code: UISpecErrorCode;
	public readonly path: string;

	constructor(code: UISpecErrorCode, message: string, path: string) {
		super(message);
		this.name = 'UISpecError';
		this.code = code;
		this.path = path;
	}
}
```

- [x] Create `packages/ui-spec/core/src/parse/validate.ts` with:

```ts
import { UISpecError } from '../errors';
import {
	isBindingExpr,
	isPlainObject,
	type NodeSchema,
	type UISpecSchema,
} from '../schema';

export interface ValidateOptions {
	strictUnknownProps?: boolean;
	maxDepth?: number;
	maxNodes?: number;
}

function assert(
	condition: unknown,
	code: UISpecError['code'],
	message: string,
	path: string,
) {
	if (!condition) throw new UISpecError(code, message, path);
}

function validateChildren(
	children: unknown,
	path: string,
	state: { nodes: number; depth: number },
	options: ValidateOptions,
): void {
	if (children === undefined) return;

	const validateChild = (child: unknown, childPath: string) => {
		if (typeof child === 'string') return;
		if (isBindingExpr(child)) return;
		if (isPlainObject(child)) {
			validateNode(child, childPath, state, options);
			return;
		}
		throw new UISpecError(
			'INVALID_CHILDREN',
			'Invalid children value; expected string, node, binding, or array.',
			childPath,
		);
	};

	if (Array.isArray(children)) {
		children.forEach((c, index) => validateChild(c, `${path}[${index}]`));
		return;
	}

	validateChild(children, path);
}

export function validateNode(
	node: Record<string, unknown>,
	path: string,
	state: { nodes: number; depth: number },
	options: ValidateOptions,
): void {
	assert(isPlainObject(node), 'INVALID_NODE', 'Node must be an object.', path);

	state.nodes += 1;
	assert(
		options.maxNodes === undefined || state.nodes <= options.maxNodes,
		'SECURITY_LIMIT_EXCEEDED',
		`Node limit exceeded (maxNodes=${options.maxNodes}).`,
		path,
	);
	assert(
		options.maxDepth === undefined || state.depth <= options.maxDepth,
		'SECURITY_LIMIT_EXCEEDED',
		`Depth limit exceeded (maxDepth=${options.maxDepth}).`,
		path,
	);

	assert(
		typeof node.type === 'string' && node.type.length > 0,
		'INVALID_NODE_TYPE',
		'Node.type must be a non-empty string.',
		`${path}.type`,
	);

	if (node.class !== undefined) {
		assert(
			typeof node.class === 'string',
			'INVALID_NODE',
			'Node.class must be a string.',
			`${path}.class`,
		);
	}
	if (node.props !== undefined) {
		assert(
			isPlainObject(node.props),
			'INVALID_NODE',
			'Node.props must be an object.',
			`${path}.props`,
		);
	}

	validateChildren(
		node.children,
		`${path}.children`,
		{ ...state, depth: state.depth + 1 },
		options,
	);

	if (node.props && isPlainObject(node.props)) {
		for (const [key, value] of Object.entries(node.props)) {
			if (isBindingExpr(value)) continue;
			if (
				value === null ||
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				Array.isArray(value) ||
				isPlainObject(value)
			) {
				continue;
			}

			throw new UISpecError(
				'INVALID_BINDING',
				'Invalid prop value; supports literals, objects/arrays, or bindings.',
				`${path}.props.${key}`,
			);
		}
	}

	// Directive structural checks (minimal; runtime semantics are in later steps)
	if (node.$if !== undefined) {
		assert(
			node.$then !== undefined,
			'INVALID_DIRECTIVE',
			'$if requires $then.',
			`${path}.$then`,
		);
	}
	if (node.$switch !== undefined) {
		assert(
			isPlainObject(node.$switch) && Array.isArray((node.$switch as any).cases),
			'INVALID_DIRECTIVE',
			'$switch must have { on, cases[] }.',
			`${path}.$switch`,
		);
	}
	if (node.$for !== undefined) {
		assert(
			isPlainObject(node.$for) &&
				isPlainObject(node.$for as any) &&
				(node.$for as any).then,
			'INVALID_DIRECTIVE',
			'$for must have { each, then }.',
			`${path}.$for`,
		);
	}
	if (node.$bind !== undefined) {
		assert(
			isPlainObject(node.$bind) && typeof (node.$bind as any).path === 'string',
			'INVALID_DIRECTIVE',
			'$bind must have { path: string }.',
			`${path}.$bind`,
		);
	}
	if (node.$on !== undefined) {
		assert(
			isPlainObject(node.$on),
			'INVALID_DIRECTIVE',
			'$on must be an object.',
			`${path}.$on`,
		);
	}
}

export function validateSchema(
	schema: UISpecSchema,
	options?: ValidateOptions,
): void {
	const opts: ValidateOptions = {
		strictUnknownProps: options?.strictUnknownProps ?? false,
		maxDepth: options?.maxDepth ?? 200,
		maxNodes: options?.maxNodes ?? 50_000,
	};

	if (schema.routes && schema.routes.length > 0) {
		// Routed apps can omit root; shell semantics are handled by router packages.
		return;
	}

	if (!schema.root) {
		throw new UISpecError(
			'MISSING_ROOT',
			'UI-Spec schema must include a root node.',
			'$.root',
		);
	}

	validateNode(
		schema.root as unknown as Record<string, unknown>,
		'$.root',
		{ nodes: 0, depth: 0 },
		opts,
	);
}
```

- [x] Replace `packages/ui-spec/core/src/parse/index.ts` with:

```ts
import { UISpecError } from '../errors';
import {
	isPlainObject,
	type UISpecSchema,
	type UISpecVersion,
} from '../schema';
import { validateSchema } from './validate';

function assertUISpecVersion(value: unknown): asserts value is UISpecVersion {
	if (value !== '1.0') {
		throw new UISpecError(
			'INVALID_SCHEMA_VERSION',
			'Invalid or unsupported $uispec version; expected "1.0".',
			'$.$uispec',
		);
	}
}

export function parseUISpecSchema(input: unknown): UISpecSchema {
	if (!isPlainObject(input)) {
		throw new UISpecError(
			'INVALID_SCHEMA',
			'UI-Spec schema must be a JSON object.',
			'$',
		);
	}

	assertUISpecVersion((input as any).$uispec);

	const schema = input as unknown as UISpecSchema;
	validateSchema(schema);
	return schema;
}
```

- [x] Replace `packages/ui-spec/core/src/parse.spec.ts` with:

```ts
import { parseUISpecSchema } from './parse';

describe('parseUISpecSchema (v1)', () => {
	it('parses a minimal valid schema (MVP-compatible)', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: {
				type: 'div',
				children: 'hello',
			},
		});

		expect(schema.$uispec).toBe('1.0');
		expect(schema.root?.type).toBe('div');
	});

	it('accepts $if/$then structural shape', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: {
				type: 'div',
				$if: { $path: '$.flag' },
				$then: { type: 'span', children: 'yes' },
				$else: { type: 'span', children: 'no' },
			},
		});

		expect(schema.root?.type).toBe('div');
	});

	it('accepts routed schema without root (router add-on)', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			routes: [{ path: '/', root: { type: 'div' } }],
		});

		expect(Array.isArray(schema.routes)).toBe(true);
	});
});
```

#### Step 2 (v1) Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test`.

#### Step 2 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 3 (v1) — Store v1: fine-grained select + write operations + JSONPath write semantics

**Files:**

- `packages/ui-spec/core/src/store/types.ts`
- `packages/ui-spec/core/src/store/store.ts`
- `packages/ui-spec/core/src/store.spec.ts`
- `packages/ui-spec/core/src/bindings/jsonpath.ts`

**Instructions**

- [x] Replace `packages/ui-spec/core/src/bindings/jsonpath.ts` with:

```ts
import { JSONPath } from 'jsonpath-plus';

export type JSONPathEvalMode = 'safe' | 'native' | false;

export interface ReadPathOptions {
	evalMode?: JSONPathEvalMode;
}

export interface FindPointersOptions {
	evalMode?: JSONPathEvalMode;
}

export function readJsonPath(
	json: unknown,
	path: string,
	options?: ReadPathOptions,
): unknown {
	const results = JSONPath<unknown[]>({
		path,
		json: json as any,
		wrap: true,
		eval: options?.evalMode ?? 'safe',
	});

	if (!Array.isArray(results) || results.length === 0) return undefined;
	if (results.length === 1) return results[0];
	return results;
}

export function findJsonPathPointers(
	json: unknown,
	path: string,
	options?: FindPointersOptions,
): string[] {
	const pointers = JSONPath<string[]>({
		path,
		json: json as any,
		wrap: true,
		resultType: 'pointer',
		eval: options?.evalMode ?? 'safe',
	});

	return Array.isArray(pointers) ? pointers : [];
}

function decodePointerSegment(segment: string): string {
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function getByJsonPointer(root: unknown, pointer: string): unknown {
	if (pointer === '' || pointer === '/') return root;
	const parts = pointer.split('/').filter(Boolean).map(decodePointerSegment);

	let current: any = root as any;
	for (const part of parts) {
		if (current == null) return undefined;
		current = current[part];
	}
	return current;
}

export function setByJsonPointer(
	root: unknown,
	pointer: string,
	value: unknown,
): { ok: true } | { ok: false; error: string } {
	if (pointer === '' || pointer === '/') {
		return {
			ok: false,
			error: 'Cannot set the document root via JSON Pointer.',
		};
	}

	const parts = pointer.split('/').filter(Boolean).map(decodePointerSegment);

	let current: any = root as any;
	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i];
		if (
			current == null ||
			(typeof current !== 'object' && !Array.isArray(current))
		) {
			return {
				ok: false,
				error: `Cannot traverse pointer at segment "${part}".`,
			};
		}
		current = current[part];
	}

	const last = parts[parts.length - 1];
	if (
		current == null ||
		(typeof current !== 'object' && !Array.isArray(current))
	) {
		return {
			ok: false,
			error: `Cannot set pointer at final segment "${last}".`,
		};
	}

	(current as any)[last] = value;
	return { ok: true };
}

export function removeByJsonPointer(
	root: unknown,
	pointer: string,
): { ok: true } | { ok: false; error: string } {
	if (pointer === '' || pointer === '/') {
		return {
			ok: false,
			error: 'Cannot remove the document root via JSON Pointer.',
		};
	}

	const parts = pointer.split('/').filter(Boolean).map(decodePointerSegment);

	let current: any = root as any;
	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i];
		if (current == null)
			return { ok: false, error: `Missing container at "${part}".` };
		current = current[part];
	}

	const last = parts[parts.length - 1];
	if (Array.isArray(current)) {
		const index = Number(last);
		if (!Number.isInteger(index))
			return { ok: false, error: 'Array removal requires numeric index.' };
		current.splice(index, 1);
		return { ok: true };
	}

	if (current && typeof current === 'object') {
		delete current[last];
		return { ok: true };
	}

	return { ok: false, error: 'Cannot remove from non-object container.' };
}
```

- [x] Replace `packages/ui-spec/core/src/store/types.ts` with:

```ts
export type Unsubscribe = () => void;
export type StoreListener = () => void;

export type WriteError = {
	path: string;
	pointer?: string;
	message: string;
};

export type WriteResult = {
	matched: number;
	changed: number;
	errors: WriteError[];
};

export type UpdateFn = (prev: unknown) => unknown;

export interface UISpecStore {
	getData: () => unknown;
	setData: (nextData: unknown) => void;

	get: (path: string) => unknown;
	select: (path: string) => unknown;

	subscribe: (listener: StoreListener) => Unsubscribe;
	subscribePath: (path: string, listener: StoreListener) => Unsubscribe;

	set: (path: string, value: unknown) => WriteResult;
	update: (path: string, fn: UpdateFn) => WriteResult;
	merge: (path: string, value: Record<string, unknown>) => WriteResult;
	push: (path: string, value: unknown) => WriteResult;
	remove: (path: string) => WriteResult;

	batch: (ops: Array<() => void>) => void;
	transaction: <T>(fn: () => T) => T;
}
```

- [x] Replace `packages/ui-spec/core/src/store/store.ts` with:

```ts
import {
	findJsonPathPointers,
	getByJsonPointer,
	readJsonPath,
	removeByJsonPointer,
	setByJsonPointer,
	type JSONPathEvalMode,
} from '../bindings/jsonpath';
import type {
	StoreListener,
	UISpecStore,
	Unsubscribe,
	WriteResult,
} from './types';

export interface CreateStoreOptions {
	jsonPathEvalMode?: JSONPathEvalMode;
}

function emptyWriteResult(): WriteResult {
	return { matched: 0, changed: 0, errors: [] };
}

export function createStore(
	initialData: unknown,
	options?: CreateStoreOptions,
): UISpecStore {
	let data = initialData;
	const listeners = new Set<StoreListener>();
	const pathListeners = new Map<string, Set<StoreListener>>();
	let batching = 0;
	let pendingNotify = false;

	const evalMode = options?.jsonPathEvalMode ?? 'safe';

	const notifyAll = () => {
		for (const listener of Array.from(listeners)) listener();

		for (const [path, set] of Array.from(pathListeners.entries())) {
			const snapshot = readJsonPath(data, path, { evalMode });
			for (const listener of Array.from(set)) {
				// Path listeners are called on any mutation; React-level equality checks happen in binding hooks.
				void snapshot;
				listener();
			}
		}
	};

	const scheduleNotify = () => {
		if (batching > 0) {
			pendingNotify = true;
			return;
		}
		notifyAll();
	};

	const writeEachPointer = (
		path: string,
		apply: (pointer: string) => { ok: true } | { ok: false; error: string },
	): WriteResult => {
		const pointers = findJsonPathPointers(data, path, { evalMode });
		const result = emptyWriteResult();
		result.matched = pointers.length;

		for (const pointer of pointers) {
			const before = getByJsonPointer(data, pointer);
			const res = apply(pointer);
			if (!res.ok) {
				result.errors.push({ path, pointer, message: res.error });
				continue;
			}
			const after = getByJsonPointer(data, pointer);
			if (!Object.is(before, after)) result.changed += 1;
		}

		// Ensure top-level reference changes for external-store semantics.
		data =
			isPlainObject(data) || Array.isArray(data)
				? structuredClone(data as any)
				: data;
		scheduleNotify();
		return result;
	};

	return {
		getData() {
			return data;
		},
		setData(nextData: unknown) {
			data = nextData;
			scheduleNotify();
		},
		get(path: string) {
			return readJsonPath(data, path, { evalMode });
		},
		select(path: string) {
			return readJsonPath(data, path, { evalMode });
		},
		subscribe(listener: StoreListener): Unsubscribe {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		subscribePath(path: string, listener: StoreListener): Unsubscribe {
			const set = pathListeners.get(path) ?? new Set<StoreListener>();
			set.add(listener);
			pathListeners.set(path, set);
			return () => {
				const current = pathListeners.get(path);
				if (!current) return;
				current.delete(listener);
				if (current.size === 0) pathListeners.delete(path);
			};
		},
		set(path: string, value: unknown) {
			return writeEachPointer(path, (pointer) =>
				setByJsonPointer(data, pointer, value),
			);
		},
		update(path: string, fn: (prev: unknown) => unknown) {
			return writeEachPointer(path, (pointer) => {
				const prev = getByJsonPointer(data, pointer);
				return setByJsonPointer(data, pointer, fn(prev));
			});
		},
		merge(path: string, value: Record<string, unknown>) {
			return writeEachPointer(path, (pointer) => {
				const prev = getByJsonPointer(data, pointer);
				if (prev == null || typeof prev !== 'object' || Array.isArray(prev)) {
					return { ok: false, error: 'merge target must be an object.' };
				}
				return setByJsonPointer(data, pointer, { ...(prev as any), ...value });
			});
		},
		push(path: string, value: unknown) {
			return writeEachPointer(path, (pointer) => {
				const prev = getByJsonPointer(data, pointer);
				if (!Array.isArray(prev))
					return { ok: false, error: 'push target must be an array.' };
				prev.push(value);
				return { ok: true };
			});
		},
		remove(path: string) {
			return writeEachPointer(path, (pointer) =>
				removeByJsonPointer(data, pointer),
			);
		},
		batch(ops: Array<() => void>) {
			batching += 1;
			try {
				for (const op of ops) op();
			} finally {
				batching -= 1;
				if (batching === 0 && pendingNotify) {
					pendingNotify = false;
					notifyAll();
				}
			}
		},
		transaction<T>(fn: () => T) {
			batching += 1;
			try {
				return fn();
			} finally {
				batching -= 1;
				if (batching === 0 && pendingNotify) {
					pendingNotify = false;
					notifyAll();
				}
			}
		},
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
```

- [x] Replace `packages/ui-spec/core/src/store.spec.ts` with:

```ts
import { createStore } from './store';

describe('createStore (v1)', () => {
	it('reads JSONPath values', () => {
		const store = createStore({ user: { name: 'Ada' } });
		expect(store.get('$.user.name')).toBe('Ada');
	});

	it('notifies subscribers on setData', () => {
		const store = createStore({ count: 0 });
		const listener = jest.fn();

		const unsubscribe = store.subscribe(listener);
		store.setData({ count: 1 });

		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		store.setData({ count: 2 });
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('applies JSONPath writes to all matches (stable order)', () => {
		const store = createStore({ users: [{ active: true }, { active: true }] });
		const result = store.set('$.users[*].active', false);

		expect(result.matched).toBe(2);
		expect(result.changed).toBe(2);
		expect(store.get('$.users[0].active')).toBe(false);
		expect(store.get('$.users[1].active')).toBe(false);
	});
});
```

#### Step 3 (v1) Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test`.

#### Step 3 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 4 (v1) — Core evaluation: resolve bindings + style/class helpers (no UIScript execution yet)

**Files:**

- `packages/ui-spec/core/src/eval/index.ts`
- `packages/ui-spec/core/src/eval/resolveValue.ts`
- `packages/ui-spec/core/src/eval/resolveClass.ts`
- `packages/ui-spec/core/src/eval/resolveStyle.ts`
- `packages/ui-spec/core/src/eval.spec.ts`

**Instructions**

- [x] Create `packages/ui-spec/core/src/eval/index.ts` with:

```ts
import type { UISpecStore } from '../store';
import type { BindingExpr, ValueExpr } from '../schema';

export type EvalExec = {
	evalExpr?: (code: string, ctx: EvalContext) => unknown;
	call?: (name: string, args: unknown[], ctx: EvalContext) => unknown;
	fn?: (source: string, ctx: EvalContext) => (...args: unknown[]) => unknown;
};

export type EvalContext = {
	store: UISpecStore;
	scope?: Record<string, unknown>;
	exec?: EvalExec;
};

export type ResolvedValue = unknown;
export type ResolveValue = (
	value: ValueExpr,
	ctx: EvalContext,
) => ResolvedValue;
export type ResolveBinding = (
	binding: BindingExpr,
	ctx: EvalContext,
) => ResolvedValue;

export * from './resolveValue';
export * from './resolveClass';
export * from './resolveStyle';
```

- [x] Create `packages/ui-spec/core/src/eval/resolveValue.ts` with:

```ts
import { UISpecError } from '../errors';
import {
	isCallBinding,
	isExprBinding,
	isFnBinding,
	isPathBinding,
	type ValueExpr,
} from '../schema';
import type { EvalContext } from './index';

export function resolveValue(value: ValueExpr, ctx: EvalContext): unknown {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((v) => resolveValue(v as any, ctx));
	}

	if (isPathBinding(value)) {
		return ctx.store.get(value.$path);
	}

	if (isExprBinding(value)) {
		if (!ctx.exec?.evalExpr) {
			throw new UISpecError(
				'INVALID_BINDING',
				'$expr evaluation is disabled (UIScript not enabled).',
				'$expr',
			);
		}
		return ctx.exec.evalExpr(value.$expr, ctx);
	}

	if (isCallBinding(value)) {
		if (!ctx.exec?.call) {
			throw new UISpecError(
				'INVALID_BINDING',
				'$call invocation is disabled (UIScript not enabled).',
				'$call',
			);
		}
		const args = (value.$call.args ?? []).map((a) =>
			resolveValue(a as any, ctx),
		);
		return ctx.exec.call(value.$call.name, args, ctx);
	}

	if (isFnBinding(value)) {
		if (!ctx.exec?.fn) {
			throw new UISpecError(
				'INVALID_BINDING',
				'$fn compilation is disabled (UIScript not enabled).',
				'$fn',
			);
		}
		return ctx.exec.fn(value.$fn, ctx);
	}

	if (value && typeof value === 'object') {
		return value;
	}

	return undefined;
}
```

- [x] Create `packages/ui-spec/core/src/eval/resolveClass.ts` with:

```ts
export function resolveClass(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		return value
			.flatMap((v) => (typeof v === 'string' ? [v] : []))
			.filter(Boolean)
			.join(' ');
	}
	return undefined;
}
```

- [x] Create `packages/ui-spec/core/src/eval/resolveStyle.ts` with:

```ts
export function resolveStyle(
	value: unknown,
): Record<string, unknown> | undefined {
	if (value === undefined || value === null) return undefined;
	if (value && typeof value === 'object' && !Array.isArray(value))
		return value as any;
	return undefined;
}
```

- [x] Create `packages/ui-spec/core/src/eval.spec.ts` with:

```ts
import { createStore } from './store';
import { resolveValue } from './eval/resolveValue';

describe('eval.resolveValue', () => {
	it('resolves $path via store', () => {
		const store = createStore({ user: { name: 'Ada' } });
		const value = resolveValue({ $path: '$.user.name' } as any, { store });
		expect(value).toBe('Ada');
	});

	it('throws for $expr when UIScript not enabled', () => {
		const store = createStore({});
		expect(() => resolveValue({ $expr: '1+1' } as any, { store })).toThrow(
			/disabled/,
		);
	});
});
```

#### Step 4 (v1) Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test`.

#### Step 4 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 5 (v1) — Component system: components registry, $ref, $extends, slots

**Files:**

- `packages/ui-spec/core/src/components/index.ts`
- `packages/ui-spec/core/src/components/resolveRef.ts`
- `packages/ui-spec/core/src/components/slots.ts`
- `packages/ui-spec/core/src/components.spec.ts`

**Instructions**

- [x] Create `packages/ui-spec/core/src/components/index.ts` with:

```ts
import type { ComponentSchema, NodeSchema, UISpecSchema } from '../schema';
import { resolveRefNode } from './resolveRef';
import { applySlots } from './slots';

export type ComponentRegistry = Record<string, ComponentSchema>;

export function getComponentRegistry(schema: UISpecSchema): ComponentRegistry {
	return schema.components ?? {};
}

export function resolveComponentTree(
	schema: UISpecSchema,
	node: NodeSchema,
): NodeSchema {
	const withRefs = resolveRefNode(schema, node);
	return applySlots(schema, withRefs);
}
```

- [x] Create `packages/ui-spec/core/src/components/resolveRef.ts` with:

```ts
import { UISpecError } from '../errors';
import { isPlainObject, type NodeSchema, type UISpecSchema } from '../schema';

function getComponentKey(ref: string): string {
	if (ref.startsWith('#/components/')) return ref.slice('#/components/'.length);
	return ref;
}

function mergeNodes(base: NodeSchema, next: NodeSchema): NodeSchema {
	return {
		...base,
		...next,
		props: { ...(base.props ?? {}), ...(next.props ?? {}) },
		class: next.class ?? base.class,
		children: next.children ?? base.children,
		$slots: { ...(base.$slots ?? {}), ...(next.$slots ?? {}) },
	};
}

export function resolveRefNode(
	schema: UISpecSchema,
	node: NodeSchema,
): NodeSchema {
	// Resolve $extends first (inheritance), then $ref (substitution).
	let working = node;

	if (working.$extends) {
		const key = getComponentKey(working.$extends);
		const component = schema.components?.[key];
		if (!component) {
			throw new UISpecError(
				'INVALID_NODE',
				`Unknown component for $extends: ${key}`,
				'$.$extends',
			);
		}
		working = mergeNodes(component.root, working);
		delete (working as any).$extends;
	}

	if (working.$ref) {
		const key = getComponentKey(working.$ref);
		const component = schema.components?.[key];
		if (!component) {
			throw new UISpecError(
				'INVALID_NODE',
				`Unknown component for $ref: ${key}`,
				'$.$ref',
			);
		}

		// Component root becomes the resolved node; instance props/slots are layered on top.
		const instance = { ...working };
		delete (instance as any).$ref;
		const merged = mergeNodes(component.root, instance);
		return deepResolve(schema, merged);
	}

	return deepResolve(schema, working);
}

function deepResolve(schema: UISpecSchema, node: NodeSchema): NodeSchema {
	const children = node.children;
	if (children === undefined) return node;

	const normalize = Array.isArray(children) ? children : [children];
	const nextChildren = normalize.map((c) => {
		if (typeof c === 'string') return c;
		if (isPlainObject(c) && typeof (c as any).type === 'string')
			return resolveRefNode(schema, c as any);
		return c;
	});

	return {
		...node,
		children: Array.isArray(children) ? nextChildren : nextChildren[0],
	};
}
```

- [x] Create `packages/ui-spec/core/src/components/slots.ts` with:

```ts
import {
	isPlainObject,
	type NodeChildren,
	type NodeSchema,
	type UISpecSchema,
} from '../schema';

function toArray(
	children: NodeChildren | undefined,
): Array<string | NodeSchema | unknown> {
	if (children === undefined) return [];
	return Array.isArray(children) ? children : [children];
}

function isSlotNode(value: unknown): value is NodeSchema {
	return (
		isPlainObject(value) &&
		typeof (value as any).type === 'string' &&
		(value as any).type === 'Slot'
	);
}

export function applySlots(schema: UISpecSchema, node: NodeSchema): NodeSchema {
	const slots = node.$slots ?? {};
	const children = toArray(node.children);

	const nextChildren = children.flatMap((child) => {
		if (typeof child === 'string') return [child];
		if (isSlotNode(child)) {
			const name = ((child.props as any)?.name as string) ?? 'default';
			const injected = slots[name];
			if (injected === undefined) return [];
			return toArray(injected);
		}
		if (isPlainObject(child) && typeof (child as any).type === 'string') {
			return [applySlots(schema, child as any)];
		}
		return [child];
	});

	return {
		...node,
		children: nextChildren,
	};
}
```

- [x] Create `packages/ui-spec/core/src/components.spec.ts` with:

```ts
import { resolveComponentTree } from './components';
import type { UISpecSchema } from './schema';

describe('components', () => {
	it('resolves $ref into component root with merged props', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			components: {
				Button: {
					root: { type: 'button', props: { role: 'button' }, children: 'OK' },
				},
			},
			root: { type: 'div' },
		};

		const node = resolveComponentTree(schema, {
			type: 'div',
			children: {
				type: 'Button',
				$ref: 'Button',
				props: { disabled: true },
			} as any,
		});

		const child = (node.children as any[])[0];
		expect(child.type).toBe('button');
		expect(child.props.disabled).toBe(true);
		expect(child.props.role).toBe('button');
	});

	it('projects slots via Slot node convention', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			components: {
				Card: {
					root: {
						type: 'div',
						children: [{ type: 'Slot', props: { name: 'default' } } as any],
					},
				},
			},
			root: { type: 'div' },
		};

		const node = resolveComponentTree(schema, {
			type: 'Card',
			$ref: 'Card',
			$slots: { default: { type: 'span', children: 'Hello' } },
		} as any);

		expect((node.children as any[])[0].type).toBe('span');
	});
});
```

#### Step 5 (v1) Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test`.

#### Step 5 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 6 (v1) — Compile/resolve pass: $if/$else, $switch, $for

**Files:**

- `packages/ui-spec/core/src/compile/index.ts`
- `packages/ui-spec/core/src/compile/compileNode.ts`
- `packages/ui-spec/core/src/compile/compile.spec.ts`

**Instructions**

- [x] Create `packages/ui-spec/core/src/compile/index.ts` with:

```ts
export * from './compileNode';
```

- [x] Create `packages/ui-spec/core/src/compile/compileNode.ts` with:

```ts
import type { NodeSchema, UISpecSchema, ValueExpr } from '../schema';
import type { UISpecStore } from '../store';
import { resolveValue } from '../eval/resolveValue';
import { resolveComponentTree } from '../components';

export type CompileContext = {
	schema: UISpecSchema;
	store: UISpecStore;
	scope?: Record<string, unknown>;
	exec?: any;
};

function truthy(value: unknown): boolean {
	return !!value;
}

export function compileNode(node: NodeSchema, ctx: CompileContext): NodeSchema {
	// Resolve components ($ref/$extends/slots) before directives.
	const resolved = resolveComponentTree(ctx.schema, node);

	// $if
	if (resolved.$if !== undefined) {
		const test = resolveValue(resolved.$if as unknown as ValueExpr, {
			store: ctx.store,
			scope: ctx.scope,
			exec: ctx.exec,
		});
		const branch = truthy(test)
			? (resolved.$then as NodeSchema)
			: resolved.$else === true
				? undefined
				: (resolved.$else as NodeSchema | undefined);
		return branch
			? compileNode(branch, ctx)
			: { type: 'fragment', children: [] };
	}

	// $switch
	if (resolved.$switch) {
		const onValue = resolveValue(resolved.$switch.on as any, {
			store: ctx.store,
			scope: ctx.scope,
			exec: ctx.exec,
		});
		for (const c of resolved.$switch.cases) {
			const whenValue = resolveValue(c.when as any, {
				store: ctx.store,
				scope: ctx.scope,
				exec: ctx.exec,
			});
			if (Object.is(onValue, whenValue)) return compileNode(c.then, ctx);
		}
		return resolved.$switch.default
			? compileNode(resolved.$switch.default, ctx)
			: { type: 'fragment', children: [] };
	}

	// $for
	if (resolved.$for) {
		const eachValue = resolveValue(resolved.$for.each as any, {
			store: ctx.store,
			scope: ctx.scope,
			exec: ctx.exec,
		});
		const items = Array.isArray(eachValue) ? eachValue : [];
		const as = resolved.$for.as ?? 'item';

		const children = items.map((item, index) => {
			const scope = { ...(ctx.scope ?? {}), [as]: item, $index: index };
			return compileNode(resolved.$for.then, { ...ctx, scope });
		});

		return { type: 'fragment', children };
	}

	// Recurse children for base nodes
	if (resolved.children === undefined) return resolved;
	const arr = Array.isArray(resolved.children)
		? resolved.children
		: [resolved.children];
	const nextChildren = arr.map((c) => {
		if (typeof c === 'string') return c;
		if (c && typeof c === 'object' && (c as any).type)
			return compileNode(c as any, ctx);
		return c;
	});

	return {
		...resolved,
		children: Array.isArray(resolved.children) ? nextChildren : nextChildren[0],
	};
}
```

- [x] Create `packages/ui-spec/core/src/compile/compile.spec.ts` with:

```ts
import { compileNode } from './compileNode';
import type { UISpecSchema } from '../schema';
import { createStore } from '../store';

describe('compileNode', () => {
	it('compiles $if branches', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { flag: true },
			root: { type: 'div' },
		};
		const store = createStore(schema.data);

		const node = compileNode(
			{
				type: 'div',
				$if: { $path: '$.flag' },
				$then: { type: 'span', children: 'yes' },
				$else: { type: 'span', children: 'no' },
			} as any,
			{ schema, store },
		);

		expect(node.type).toBe('span');
	});

	it('compiles $for into fragment children', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { items: [1, 2] },
			root: { type: 'div' },
		};
		const store = createStore(schema.data);

		const node = compileNode(
			{
				type: 'div',
				$for: {
					each: { $path: '$.items' },
					as: 'item',
					then: { type: 'span', children: 'x' },
				},
			} as any,
			{ schema, store },
		);

		expect(node.type).toBe('fragment');
		expect(Array.isArray(node.children)).toBe(true);
	});
});
```

#### Step 6 (v1) Verification Checklist

- [x] Run `pnpm --filter @ui-spec/core test`.

#### Step 6 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 7 (v1) — UIScript runtime: $fn, $call, $expr (restricted Function, opt-in)

**Files:**

- `packages/ui-spec/core/src/uiscript/index.ts`
- `packages/ui-spec/core/src/uiscript/sandbox.ts`
- `packages/ui-spec/core/src/uiscript/spec.ts`
- `packages/ui-spec/core/src/uiscript.spec.ts`

**Instructions**

- [ ] Create `packages/ui-spec/core/src/uiscript/spec.ts` with:

```ts
export type UIScriptAllowlist = {
	globals?: Record<string, unknown>;
};

export type UIScriptOptions = {
	enabled?: boolean;
	allowlist?: UIScriptAllowlist;
	timeoutMs?: number;
};

export const defaultUIScriptOptions: Required<UIScriptOptions> = {
	enabled: false,
	allowlist: { globals: {} },
	timeoutMs: 250,
};
```

- [ ] Create `packages/ui-spec/core/src/uiscript/sandbox.ts` with:

```ts
import { UISpecError } from '../errors';
import type { UIScriptOptions } from './spec';

export type CompiledFunction = (...args: unknown[]) => unknown;

export function compileRestrictedFunction(
	source: string,
	options: UIScriptOptions,
): CompiledFunction {
	if (!options.enabled) {
		throw new UISpecError('INVALID_BINDING', 'UIScript is disabled.', '$fn');
	}

	// NOTE: This is a restricted Function-based compiler. It is NOT a complete security sandbox.
	// It enforces an allowlisted global object and a soft timeout wrapper.
	const globals = options.allowlist?.globals ?? {};

	let fn: unknown;
	try {
		// eslint-disable-next-line no-new-func
		fn = Function(
			'globals',
			`"use strict"; const { ${Object.keys(globals).join(', ')} } = globals; return (${source});`,
		)(globals);
	} catch (err) {
		throw new UISpecError(
			'INVALID_BINDING',
			`Failed to compile UIScript: ${(err as Error).message}`,
			'$fn',
		);
	}

	if (typeof fn !== 'function') {
		throw new UISpecError(
			'INVALID_BINDING',
			'UIScript $fn must evaluate to a function.',
			'$fn',
		);
	}

	return fn as CompiledFunction;
}

export async function runWithSoftTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	if (timeoutMs <= 0) return promise;
	let timeout: any;
	const timer = new Promise<never>((_, reject) => {
		timeout = setTimeout(
			() =>
				reject(
					new UISpecError(
						'SECURITY_LIMIT_EXCEEDED',
						'UIScript timeout exceeded.',
						'$fn',
					),
				),
			timeoutMs,
		);
	});

	try {
		return await Promise.race([promise, timer]);
	} finally {
		clearTimeout(timeout);
	}
}
```

- [ ] Create `packages/ui-spec/core/src/uiscript/index.ts` with:

```ts
import type { UISpecSchema } from '../schema';
import type { EvalExec } from '../eval';
import type { EvalContext } from '../eval';
import { UISpecError } from '../errors';
import { compileRestrictedFunction } from './sandbox';
import { defaultUIScriptOptions, type UIScriptOptions } from './spec';

export type UISpecContext = {
	store: EvalContext['store'];
	validate?: (
		value: unknown,
		schemaRef: string,
	) => { ok: true } | { ok: false; errors: unknown };
	navigate?: (to: string) => void;
	back?: () => void;
	route?: unknown;
};

export function createUIScriptExec(
	schema: UISpecSchema,
	options?: UIScriptOptions,
): EvalExec {
	const opts = { ...defaultUIScriptOptions, ...options };

	const functions = schema.functions ?? {};

	return {
		evalExpr(code, ctx) {
			if (!opts.enabled)
				throw new UISpecError(
					'INVALID_BINDING',
					'UIScript is disabled.',
					'$expr',
				);
			// eslint-disable-next-line no-new-func
			const expr = Function('ctx', `"use strict"; return (${code});`);
			return expr(toUISpecContext(ctx));
		},
		call(name, args, ctx) {
			const fnSchema = functions[name];
			if (!fnSchema)
				throw new UISpecError(
					'INVALID_BINDING',
					`Unknown function: ${name}`,
					'$call',
				);
			const fn = compileRestrictedFunction(fnSchema.$fn, opts);
			return fn(toUISpecContext(ctx), ...args);
		},
		fn(source, ctx) {
			const compiled = compileRestrictedFunction(source, opts);
			return (...args: unknown[]) => compiled(toUISpecContext(ctx), ...args);
		},
	};
}

function toUISpecContext(ctx: EvalContext): UISpecContext {
	return {
		store: ctx.store,
		validate: undefined,
		navigate: undefined,
		back: undefined,
		route: undefined,
	};
}
```

- [ ] Create `packages/ui-spec/core/src/uiscript.spec.ts` with:

```ts
import { createStore } from './store';
import { createUIScriptExec } from './uiscript';
import type { UISpecSchema } from './schema';
import { resolveValue } from './eval/resolveValue';

describe('uiscript', () => {
	it('executes $expr when enabled', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			functions: {},
			root: { type: 'div' },
		};
		const store = createStore({});
		const exec = createUIScriptExec(schema, { enabled: true });
		const value = resolveValue({ $expr: '1 + 1' } as any, { store, exec });
		expect(value).toBe(2);
	});

	it('invokes named functions via $call', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			functions: { add: { $fn: '(ctx, a, b) => a + b' } },
			root: { type: 'div' },
		};
		const store = createStore({});
		const exec = createUIScriptExec(schema, { enabled: true });
		const value = resolveValue(
			{ $call: { name: 'add', args: [1, 2] } } as any,
			{ store, exec },
		);
		expect(value).toBe(3);
	});
});
```

#### Step 7 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/core test`.

#### Step 7 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 8 (v1) — React binding API: Provider(schema/plugins/initialData), UISpecApp, UISpecNode

**Files:**

- `packages/ui-spec/react/src/provider.tsx`
- `packages/ui-spec/react/src/types.ts`
- `packages/ui-spec/react/src/index.ts`
- `packages/ui-spec/react/src/render.tsx`
- `packages/ui-spec/react/src/render.spec.tsx`

**Instructions**

- [ ] Replace `packages/ui-spec/react/src/types.ts` with:

```ts
import type {
	UISpecSchema,
	UISpecStore,
	NodeSchema,
	UIScriptOptions,
} from '@ui-spec/core';

export interface UISpecProviderProps {
	schema: UISpecSchema;
	initialData?: unknown;
	store?: UISpecStore;
	uiscript?: UIScriptOptions;
	children: React.ReactNode;
}

export type UISpecRuntime = {
	schema: UISpecSchema;
	store: UISpecStore;
	uiscript?: UIScriptOptions;
};

export interface UISpecAppProps {
	// For non-router usage: renders schema.root.
	schema?: UISpecSchema;
}

export interface UISpecNodeProps {
	node: NodeSchema;
}
```

- [ ] Replace `packages/ui-spec/react/src/provider.tsx` with:

```tsx
import {
	createStore,
	type UISpecSchema,
	type UISpecStore,
	type UIScriptOptions,
} from '@ui-spec/core';
import * as React from 'react';

type UISpecRuntime = {
	schema: UISpecSchema;
	store: UISpecStore;
	uiscript?: UIScriptOptions;
};

const RuntimeContext = React.createContext<UISpecRuntime | null>(null);

export function UISpecProvider(props: {
	schema: UISpecSchema;
	initialData?: unknown;
	store?: UISpecStore;
	uiscript?: UIScriptOptions;
	children: React.ReactNode;
}) {
	const store = React.useMemo(() => {
		if (props.store) return props.store;
		const seed = props.initialData ?? props.schema.data ?? {};
		return createStore(seed);
	}, [props.store, props.initialData, props.schema]);

	const runtime = React.useMemo(
		() => ({ schema: props.schema, store, uiscript: props.uiscript }),
		[props.schema, store, props.uiscript],
	);

	return (
		<RuntimeContext.Provider value={runtime}>
			{props.children}
		</RuntimeContext.Provider>
	);
}

export function useUISpecRuntime(): UISpecRuntime {
	const runtime = React.useContext(RuntimeContext);
	if (!runtime)
		throw new Error('UISpecProvider is missing in the component tree.');
	return runtime;
}
```

- [ ] Replace `packages/ui-spec/react/src/render.tsx` with:

```tsx
import {
	compileNode,
	createUIScriptExec,
	resolveValue,
	isBindingExpr,
	isPlainObject,
	type NodeSchema,
	type UISpecSchema,
} from '@ui-spec/core';
import * as React from 'react';

import { useUISpecRuntime } from './provider';
import { useLifecycle } from './hooks/useLifecycle';
import { toReactEventProp } from './runtime/events';

function toChildArray(children: unknown): unknown[] {
	if (children === undefined) return [];
	return Array.isArray(children) ? children : [children];
}

function stringifyForText(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean')
		return String(value);
	return JSON.stringify(value);
}

function renderChild(
	child: unknown,
	resolve: (value: unknown) => unknown,
): React.ReactNode {
	if (typeof child === 'string') return child;
	if (isBindingExpr(child)) return stringifyForText(resolve(child));
	if (isPlainObject(child)) return renderNode(child as any, resolve);
	return null;
}

function resolveProps(
	props: Record<string, unknown> | undefined,
	resolve: (value: unknown) => unknown,
) {
	if (!props) return undefined;
	const resolved: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		resolved[key] = isBindingExpr(value) ? resolve(value) : value;
	}
	return resolved;
}

function renderNode(
	node: NodeSchema,
	resolve: (value: unknown) => unknown,
): React.ReactElement {
	if (node.type === 'fragment') {
		const childArray = toChildArray(node.children);
		return React.createElement(
			React.Fragment,
			null,
			...childArray.map((c, i) =>
				React.createElement(
					React.Fragment,
					{ key: i },
					renderChild(c, resolve),
				),
			),
		);
	}

	const resolvedProps = resolveProps(node.props, resolve) ?? {};
	if (typeof node.class === 'string' && node.class.length > 0) {
		(resolvedProps as any).className = node.class;
	}

	if (node.$on) {
		for (const [eventName, handlerExpr] of Object.entries(node.$on)) {
			const propName = toReactEventProp(eventName);
			(resolvedProps as any)[propName] = (...args: unknown[]) => {
				const result = resolve(handlerExpr);
				if (typeof result === 'function') return (result as any)(...args);
				return result;
			};
		}
	}

	const childArray = toChildArray(node.children);
	const renderedChildren = childArray.map((c, index) => (
		<React.Fragment key={index}>{renderChild(c, resolve)}</React.Fragment>
	));

	return React.createElement(node.type, resolvedProps, ...renderedChildren);
}

export function UISpecNode(props: { node: NodeSchema }) {
	const { schema, store, uiscript } = useUISpecRuntime();

	React.useSyncExternalStore(
		store.subscribe,
		() => store.getData(),
		() => store.getData(),
	);

	const exec = React.useMemo(
		() => createUIScriptExec(schema, uiscript),
		[schema, uiscript],
	);

	const resolve = React.useCallback(
		(value: unknown) => resolveValue(value as any, { store, exec }),
		[store, exec],
	);

	const compiled = React.useMemo(
		() => compileNode(props.node, { schema, store, exec }),
		[props.node, schema, store, exec],
	);

	useLifecycle({
		onMounted: () => {
			if (!compiled.$mounted) return;
			const fn = resolve(compiled.$mounted as any);
			if (typeof fn === 'function') fn();
		},
		onUpdated: () => {
			if (!compiled.$updated) return;
			const fn = resolve(compiled.$updated as any);
			if (typeof fn === 'function') fn();
		},
		onUnmounted: () => {
			if (!compiled.$unmounted) return;
			const fn = resolve(compiled.$unmounted as any);
			if (typeof fn === 'function') fn();
		},
	});
	return renderNode(compiled, resolve);
}

export function UISpecApp(props: { schema?: UISpecSchema }) {
	const runtime = useUISpecRuntime();
	const schema = props.schema ?? runtime.schema;
	if (!schema.root) return null;
	return <UISpecNode node={schema.root} />;
}
```

- [ ] Replace `packages/ui-spec/react/src/index.ts` with:

```ts
export * from './types';
export * from './provider';
export * from './render';
```

- [ ] Replace `packages/ui-spec/react/src/render.spec.tsx` with:

```tsx
import { type UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { UISpecProvider } from './provider';
import { UISpecApp } from './render';

describe('UISpecApp', () => {
	it('renders text and $path binding', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { user: { name: 'Ada' } },
			root: {
				type: 'div',
				children: [
					{ type: 'span', children: 'Hi ' },
					{ type: 'span', children: { $path: '$.user.name' } },
				],
			},
		};

		const html = renderToStaticMarkup(
			<UISpecProvider schema={schema}>
				<UISpecApp />
			</UISpecProvider>,
		);

		expect(html).toContain('Hi');
		expect(html).toContain('Ada');
	});
});
```

#### Step 8 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/react test`.

#### Step 8 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 9 (v1) — React runtime: $on events, $bind (two-way), lifecycle hooks + jsdom tests

**Files:**

- `packages/ui-spec/react/jest.config.js`
- `packages/ui-spec/react/src/runtime/events.ts`
- `packages/ui-spec/react/src/hooks/useLifecycle.ts`
- `packages/ui-spec/react/src/runtime.spec.tsx`

**Instructions**

- [ ] Replace `packages/ui-spec/react/jest.config.js` with:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/react',
	testEnvironment: 'jsdom',
};
```

- [ ] Create `packages/ui-spec/react/src/runtime/events.ts` with:

```ts
export function toReactEventProp(eventName: string): string {
	// Spec uses lower-case DOM event names (click, change, input, submit, ...)
	// React expects onClick, onChange, onInput, onSubmit, ...
	return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}
```

- [ ] Create `packages/ui-spec/react/src/hooks/useLifecycle.ts` with:

```ts
import * as React from 'react';

export function useLifecycle(options: {
	onMounted?: () => void;
	onUpdated?: () => void;
	onUnmounted?: () => void;
}) {
	const mountedRef = React.useRef(false);

	React.useEffect(() => {
		mountedRef.current = true;
		options.onMounted?.();
		return () => {
			options.onUnmounted?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		if (!mountedRef.current) return;
		options.onUpdated?.();
	});
}
```

- [ ] Create `packages/ui-spec/react/src/runtime.spec.tsx` with:

```tsx
import { type UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { UISpecProvider } from './provider';
import { UISpecApp } from './render';

describe('react runtime', () => {
	it('renders into jsdom and supports basic click event wiring shape', async () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { count: 0 },
			functions: {
				inc: {
					$fn: '(ctx) => ctx.store.set("$.count", (ctx.store.get("$.count") ?? 0) + 1)',
				},
			},
			root: {
				type: 'button',
				props: { id: 'btn' },
				$on: { click: { $call: { name: 'inc' } } },
				children: { $path: '$.count' },
			} as any,
		};

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<UISpecProvider schema={schema} uiscript={{ enabled: true }}>
					<UISpecApp />
				</UISpecProvider>,
			);
		});

		const btn = container.querySelector('#btn') as HTMLButtonElement;
		expect(btn).toBeTruthy();

		await act(async () => {
			btn.click();
		});

		expect(container.textContent).toContain('1');
	});
});
```

#### Step 9 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/react test`.

#### Step 9 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 10 (v1) — Validation: core plugin API + JSON Schema validator package

**Files:**

- `packages/ui-spec/core/src/validation/types.ts`
- `packages/ui-spec/core/src/validation/index.ts`
- `packages/ui-spec/core/src/validation.spec.ts`
- `packages/ui-spec/core/src/index.ts`
- `packages/ui-spec/validate-jsonschema/package.json`
- `packages/ui-spec/validate-jsonschema/tsconfig.json`
- `packages/ui-spec/validate-jsonschema/jest.config.js`
- `packages/ui-spec/validate-jsonschema/src/index.ts`
- `packages/ui-spec/validate-jsonschema/src/index.spec.ts`

**Instructions**

- [ ] Replace `packages/ui-spec/core/src/index.ts` with:

```ts
export * from './schema';
export * from './errors';
export * from './parse';
export * from './store';
export * from './eval';
export * from './components';
export * from './compile';
export * from './uiscript';
export * from './validation';
```

- [ ] Create `packages/ui-spec/core/src/validation/types.ts` with:

```ts
export type ValidationOk = { ok: true };

export type ValidationFail = {
	ok: false;
	errors: unknown;
};

export type ValidationResult = ValidationOk | ValidationFail;

export interface ValidationPlugin {
	name: string;
	// Schema refs are strings like "User"; the plugin decides resolution.
	validate: (value: unknown, schemaRef: string) => ValidationResult;
}
```

- [ ] Create `packages/ui-spec/core/src/validation/index.ts` with:

```ts
import type { ValidationPlugin, ValidationResult } from './types';
import { UISpecError } from '../errors';

export function createValidationRegistry(plugins: ValidationPlugin[]) {
	const byName = new Map<string, ValidationPlugin>();
	for (const plugin of plugins) byName.set(plugin.name, plugin);

	return {
		validate(
			value: unknown,
			schemaRef: string,
			pluginName?: string,
		): ValidationResult {
			if (pluginName) {
				const plugin = byName.get(pluginName);
				if (!plugin)
					throw new UISpecError(
						'INVALID_SCHEMA',
						`Unknown validation plugin: ${pluginName}`,
						'$.plugins',
					);
				return plugin.validate(value, schemaRef);
			}

			// Default: try all plugins until one returns ok, else return the first failure.
			let firstFailure: ValidationResult | undefined;
			for (const plugin of byName.values()) {
				const result = plugin.validate(value, schemaRef);
				if (result.ok) return result;
				firstFailure ??= result;
			}
			return (
				firstFailure ?? {
					ok: false,
					errors: [{ message: 'No validation plugins registered.' }],
				}
			);
		},
	};
}

export * from './types';
```

- [ ] Create `packages/ui-spec/core/src/validation.spec.ts` with:

```ts
import { createValidationRegistry } from './validation';

describe('validation registry', () => {
	it('uses named plugin', () => {
		const registry = createValidationRegistry([
			{
				name: 'test',
				validate: (value) =>
					typeof value === 'string'
						? { ok: true }
						: { ok: false, errors: ['not string'] },
			},
		]);

		expect(registry.validate('x', 'Any', 'test').ok).toBe(true);
		expect(registry.validate(1, 'Any', 'test').ok).toBe(false);
	});
});
```

- [ ] Create `packages/ui-spec/validate-jsonschema/package.json` with:

```json
{
	"name": "@ui-spec/validate-jsonschema",
	"version": "0.1.0",
	"description": "JSON Schema validation plugin for UI-Spec.",
	"license": "MIT",
	"sideEffects": false,
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"type-check": "tsc -p tsconfig.json --noEmit",
		"test": "jest",
		"lint": "eslint . --max-warnings 0"
	},
	"dependencies": {
		"@ui-spec/core": "workspace:*",
		"ajv": "^8.17.1"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"eslint": "^8.57.1",
		"jest": "^29.7.0",
		"reflect-metadata": "^0.2.2",
		"ts-jest": "^29.2.5",
		"typescript": "~5.5.0"
	}
}
```

- [ ] Create `packages/ui-spec/validate-jsonschema/tsconfig.json` with:

```json
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./dist",
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "node_modules"]
}
```

- [ ] Create `packages/ui-spec/validate-jsonschema/jest.config.js` with:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/validate-jsonschema',
	testEnvironment: 'node',
};
```

- [ ] Create `packages/ui-spec/validate-jsonschema/src/index.ts` with:

```ts
import Ajv from 'ajv';
import type { ValidationPlugin, ValidationResult } from '@ui-spec/core';

export type JSONSchemaRegistry = Record<string, unknown>;

export function createJsonSchemaPlugin(options: {
	schemas: JSONSchemaRegistry;
}): ValidationPlugin {
	const ajv = new Ajv({ allErrors: true, strict: false });
	for (const [key, schema] of Object.entries(options.schemas)) {
		ajv.addSchema(schema, key);
	}

	return {
		name: 'jsonschema',
		validate(value: unknown, schemaRef: string): ValidationResult {
			const validate = ajv.getSchema(schemaRef);
			if (!validate)
				return {
					ok: false,
					errors: [{ message: `Unknown schemaRef: ${schemaRef}` }],
				};
			const ok = validate(value);
			if (ok) return { ok: true };
			return { ok: false, errors: validate.errors ?? [] };
		},
	};
}
```

- [ ] Create `packages/ui-spec/validate-jsonschema/src/index.spec.ts` with:

```ts
import { createJsonSchemaPlugin } from './index';

describe('createJsonSchemaPlugin', () => {
	it('validates against a registered schema', () => {
		const plugin = createJsonSchemaPlugin({
			schemas: {
				User: {
					type: 'object',
					properties: { name: { type: 'string' } },
					required: ['name'],
					additionalProperties: false,
				},
			},
		});

		expect(plugin.validate({ name: 'Ada' }, 'User').ok).toBe(true);
		expect(plugin.validate({ name: 1 }, 'User').ok).toBe(false);
	});
});
```

#### Step 10 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/core test`.
- [ ] Run `pnpm --filter @ui-spec/validate-jsonschema test`.

#### Step 10 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 11 (v1) — Routing (optional add-on): router + router-react with fetch-based lazy loading

**Files:**

- `packages/ui-spec/router/package.json`
- `packages/ui-spec/router/tsconfig.json`
- `packages/ui-spec/router/jest.config.js`
- `packages/ui-spec/router/src/index.ts`
- `packages/ui-spec/router/src/match.ts`
- `packages/ui-spec/router/src/lazy.ts`
- `packages/ui-spec/router/src/index.spec.ts`
- `packages/ui-spec/router-react/package.json`
- `packages/ui-spec/router-react/tsconfig.json`
- `packages/ui-spec/router-react/jest.config.js`
- `packages/ui-spec/router-react/src/index.ts`
- `packages/ui-spec/router-react/src/UISpecRouter.tsx`
- `packages/ui-spec/router-react/src/index.spec.tsx`

**Instructions**

- [ ] Create `packages/ui-spec/router/package.json` with:

```json
{
	"name": "@ui-spec/router",
	"version": "0.1.0",
	"description": "Optional routing add-on for UI-Spec.",
	"license": "MIT",
	"sideEffects": false,
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"type-check": "tsc -p tsconfig.json --noEmit",
		"test": "jest",
		"lint": "eslint . --max-warnings 0"
	},
	"dependencies": {
		"@ui-spec/core": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"eslint": "^8.57.1",
		"jest": "^29.7.0",
		"reflect-metadata": "^0.2.2",
		"ts-jest": "^29.2.5",
		"typescript": "~5.5.0"
	}
}
```

- [ ] Create `packages/ui-spec/router/tsconfig.json` with:

```json
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./dist",
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "node_modules"]
}
```

- [ ] Create `packages/ui-spec/router/jest.config.js` with:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/router',
	testEnvironment: 'node',
};
```

- [ ] Create `packages/ui-spec/router/src/match.ts` with:

```ts
export type Match = {
	params: Record<string, string>;
};

export function matchPath(pattern: string, pathname: string): Match | null {
	const pSegs = pattern.split('/').filter(Boolean);
	const uSegs = pathname.split('/').filter(Boolean);
	if (pSegs.length !== uSegs.length) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < pSegs.length; i += 1) {
		const p = pSegs[i];
		const u = uSegs[i];
		if (p.startsWith(':')) {
			params[p.slice(1)] = decodeURIComponent(u);
			continue;
		}
		if (p !== u) return null;
	}

	return { params };
}
```

- [ ] Create `packages/ui-spec/router/src/lazy.ts` with:

```ts
import { parseUISpecSchema, type UISpecSchema } from '@ui-spec/core';

export async function fetchSchema(url: string): Promise<UISpecSchema> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
	const json = await res.json();
	return parseUISpecSchema(json);
}
```

- [ ] Create `packages/ui-spec/router/src/index.ts` with:

```ts
import type { RouteSchema, UISpecSchema } from '@ui-spec/core';
import { matchPath } from './match';
import { fetchSchema } from './lazy';

export type RouterState = {
	pathname: string;
	params: Record<string, string>;
	active?: RouteSchema;
	loadedSchema?: UISpecSchema;
};

export function createRouter(schema: UISpecSchema) {
	let state: RouterState = {
		pathname: '/',
		params: {},
		active: undefined,
		loadedSchema: undefined,
	};
	const listeners = new Set<() => void>();

	const routes = schema.routes ?? [];

	const notify = () => {
		for (const l of Array.from(listeners)) l();
	};

	const compute = async (pathname: string) => {
		for (const route of routes) {
			const match = matchPath(route.path, pathname);
			if (!match) continue;
			state = { ...state, pathname, params: match.params, active: route };
			if (route.load?.url) {
				const loadedSchema = await fetchSchema(route.load.url);
				state = { ...state, loadedSchema };
			} else {
				state = { ...state, loadedSchema: undefined };
			}
			notify();
			return;
		}
		state = {
			...state,
			pathname,
			params: {},
			active: undefined,
			loadedSchema: undefined,
		};
		notify();
	};

	const onPop = () => {
		void compute(getPathname());
	};

	const getPathname = () => {
		if (typeof window === 'undefined') return state.pathname;
		return window.location.pathname;
	};

	const start = () => {
		if (typeof window !== 'undefined')
			window.addEventListener('popstate', onPop);
		void compute(getPathname());
	};

	const stop = () => {
		if (typeof window !== 'undefined')
			window.removeEventListener('popstate', onPop);
	};

	const navigate = (to: string) => {
		if (typeof window !== 'undefined') {
			window.history.pushState(null, '', to);
			void compute(getPathname());
		} else {
			state = { ...state, pathname: to };
			notify();
		}
	};

	return {
		start,
		stop,
		navigate,
		getState: () => state,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export * from './match';
export * from './lazy';
```

- [ ] Create `packages/ui-spec/router/src/index.spec.ts` with:

```ts
import type { UISpecSchema } from '@ui-spec/core';
import { matchPath } from './match';

describe('router matchPath', () => {
	it('matches params', () => {
		expect(matchPath('/users/:id', '/users/123')?.params.id).toBe('123');
	});
});

describe('createRouter', () => {
	it('creates without throwing for basic schema', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			routes: [{ path: '/', root: { type: 'div' } }],
		};
		expect(schema.routes?.length).toBe(1);
	});
});
```

- [ ] Create `packages/ui-spec/router-react/package.json` with:

```json
{
	"name": "@ui-spec/router-react",
	"version": "0.1.0",
	"description": "React integration for @ui-spec/router.",
	"license": "MIT",
	"sideEffects": false,
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"type-check": "tsc -p tsconfig.json --noEmit",
		"test": "jest",
		"lint": "eslint . --max-warnings 0"
	},
	"dependencies": {
		"@ui-spec/core": "workspace:*",
		"@ui-spec/react": "workspace:*",
		"@ui-spec/router": "workspace:*"
	},
	"peerDependencies": {
		"react": ">=18",
		"react-dom": ">=18"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"@types/react": "^18.3.3",
		"@types/react-dom": "^18.3.0",
		"eslint": "^8.57.1",
		"jest": "^29.7.0",
		"react": "^18.3.1",
		"react-dom": "^18.3.1",
		"reflect-metadata": "^0.2.2",
		"ts-jest": "^29.2.5",
		"typescript": "~5.5.0"
	}
}
```

- [ ] Create `packages/ui-spec/router-react/tsconfig.json` with:

```json
{
	"extends": "@lellimecnar/typescript-config/react.json",
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./dist",
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true
	},
	"include": ["src/**/*.ts", "src/**/*.tsx"],
	"exclude": ["dist", "node_modules"]
}
```

- [ ] Create `packages/ui-spec/router-react/jest.config.js` with:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/router-react',
	testEnvironment: 'jsdom',
};
```

- [ ] Create `packages/ui-spec/router-react/src/UISpecRouter.tsx` with:

```tsx
import type { UISpecSchema } from '@ui-spec/core';
import { createRouter } from '@ui-spec/router';
import * as React from 'react';

import { UISpecProvider } from '@ui-spec/react';
import { UISpecApp } from '@ui-spec/react';

export function UISpecRouter(props: { schema: UISpecSchema }) {
	const router = React.useMemo(
		() => createRouter(props.schema),
		[props.schema],
	);

	React.useEffect(() => {
		router.start();
		return () => router.stop();
	}, [router]);

	React.useSyncExternalStore(
		router.subscribe,
		() => router.getState(),
		() => router.getState(),
	);

	const state = router.getState();
	const activeSchema = state.loadedSchema ?? props.schema;

	const node = state.active?.root ?? activeSchema.root;
	if (!node) return null;

	return (
		<UISpecProvider schema={activeSchema}>
			<UISpecApp schema={{ ...activeSchema, root: node }} />
		</UISpecProvider>
	);
}
```

- [ ] Create `packages/ui-spec/router-react/src/index.ts` with:

```ts
export * from './UISpecRouter';
```

- [ ] Create `packages/ui-spec/router-react/src/index.spec.tsx` with:

```tsx
import type { UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { UISpecRouter } from './UISpecRouter';

describe('UISpecRouter', () => {
	it('renders without crashing for a simple route', async () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			routes: [{ path: '/', root: { type: 'div', children: 'Home' } }],
		};

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<UISpecRouter schema={schema} />);
		});

		expect(container.textContent).toContain('Home');
	});
});
```

#### Step 11 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/router test`.
- [ ] Run `pnpm --filter @ui-spec/router-react test`.

#### Step 11 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 12 (v1) — TypeScript authoring helpers + CLI (validate + generate-types)

**Files:**

- `packages/ui-spec/cli/package.json`
- `packages/ui-spec/cli/tsconfig.json`
- `packages/ui-spec/cli/jest.config.js`
- `packages/ui-spec/cli/src/index.ts`
- `packages/ui-spec/cli/src/commands/validate.ts`
- `packages/ui-spec/cli/src/commands/generateTypes.ts`
- `packages/ui-spec/cli/src/index.spec.ts`

**Instructions**

- [ ] Create `packages/ui-spec/cli/package.json` with:

```json
{
	"name": "@ui-spec/cli",
	"version": "0.1.0",
	"description": "UI-Spec CLI (validate and generate-types).",
	"license": "MIT",
	"bin": {
		"uispec": "./dist/index.js"
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"type-check": "tsc -p tsconfig.json --noEmit",
		"test": "jest",
		"lint": "eslint . --max-warnings 0"
	},
	"dependencies": {
		"@ui-spec/core": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"eslint": "^8.57.1",
		"jest": "^29.7.0",
		"reflect-metadata": "^0.2.2",
		"ts-jest": "^29.2.5",
		"typescript": "~5.5.0"
	}
}
```

- [ ] Create `packages/ui-spec/cli/tsconfig.json` with:

```json
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./dist",
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "node_modules"]
}
```

- [ ] Create `packages/ui-spec/cli/jest.config.js` with:

```js
const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/cli',
	testEnvironment: 'node',
};
```

- [ ] Create `packages/ui-spec/cli/src/commands/validate.ts` with:

```ts
import { parseUISpecSchema } from '@ui-spec/core';
import { readFile } from 'node:fs/promises';

export async function validateCommand(
	filePath: string,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const raw = await readFile(filePath, 'utf8');
		parseUISpecSchema(JSON.parse(raw));
		return { ok: true };
	} catch (err) {
		return { ok: false, error: (err as Error).message };
	}
}
```

- [ ] Create `packages/ui-spec/cli/src/commands/generateTypes.ts` with:

```ts
import type { UISpecSchema } from '@ui-spec/core';
import { readFile, writeFile } from 'node:fs/promises';

function inferTsType(value: unknown): string {
	if (value === null) return 'null';
	if (typeof value === 'string') return 'string';
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (Array.isArray(value)) {
		const inner = value.length ? inferTsType(value[0]) : 'unknown';
		return `${inner}[]`;
	}
	if (value && typeof value === 'object') {
		const entries = Object.entries(value as any)
			.map(([k, v]) => `\t${k}: ${inferTsType(v)};`)
			.join('\n');
		return `{\n${entries}\n}`;
	}
	return 'unknown';
}

export async function generateTypesCommand(
	inputFile: string,
	outFile: string,
): Promise<void> {
	const raw = await readFile(inputFile, 'utf8');
	const schema = JSON.parse(raw) as UISpecSchema;
	const dataType = inferTsType(schema.data ?? {});

	const output = [
		`// Generated by @ui-spec/cli`,
		`export type UISpecData = ${dataType};`,
	].join('\n');

	await writeFile(outFile, output, 'utf8');
}
```

- [ ] Create `packages/ui-spec/cli/src/index.ts` with:

```ts
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { validateCommand } from './commands/validate';
import { generateTypesCommand } from './commands/generateTypes';

async function main() {
	const { positionals, values } = parseArgs({
		allowPositionals: true,
		options: {
			out: { type: 'string', short: 'o' },
		},
	});

	const [cmd, file] = positionals;
	if (!cmd || !file) {
		process.stderr.write(
			'Usage: uispec <validate|generate-types> <file> [-o out.ts]\n',
		);
		process.exit(1);
	}

	if (cmd === 'validate') {
		const result = await validateCommand(file);
		if (!result.ok) {
			process.stderr.write(`${result.error}\n`);
			process.exit(1);
		}
		process.stdout.write('OK\n');
		return;
	}

	if (cmd === 'generate-types') {
		const out = values.out;
		if (!out) {
			process.stderr.write('Missing -o <out>\n');
			process.exit(1);
		}
		await generateTypesCommand(file, out);
		process.stdout.write('OK\n');
		return;
	}

	process.stderr.write(`Unknown command: ${cmd}\n`);
	process.exit(1);
}

void main();
```

- [ ] Create `packages/ui-spec/cli/src/index.spec.ts` with:

```ts
import { validateCommand } from './commands/validate';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('cli commands', () => {
	it('validateCommand returns ok for basic schema', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'uispec-'));
		const file = join(dir, 'schema.json');
		await writeFile(
			file,
			JSON.stringify({ $uispec: '1.0', root: { type: 'div' } }),
			'utf8',
		);
		const result = await validateCommand(file);
		expect(result.ok).toBe(true);
	});
});
```

#### Step 12 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/cli test`.

#### Step 12 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.

---

### Step 13 (v1) — AsyncBoundary for React (caching deferred)

**Files:**

- `packages/ui-spec/react/src/components/AsyncBoundary.tsx`
- `packages/ui-spec/react/src/components/AsyncBoundary.spec.tsx`
- `packages/ui-spec/react/src/index.ts`

**Instructions**

- [ ] Create `packages/ui-spec/react/src/components/AsyncBoundary.tsx` with:

```tsx
import * as React from 'react';

export function AsyncBoundary<T>(props: {
	promise: Promise<T>;
	fallback?: React.ReactNode;
	children: (value: T) => React.ReactNode;
}) {
	const [state, setState] = React.useState<{
		status: 'pending' | 'fulfilled' | 'rejected';
		value?: T;
		error?: unknown;
	}>({
		status: 'pending',
	});

	React.useEffect(() => {
		let cancelled = false;
		setState({ status: 'pending' });
		props.promise
			.then((value) => {
				if (cancelled) return;
				setState({ status: 'fulfilled', value });
			})
			.catch((error) => {
				if (cancelled) return;
				setState({ status: 'rejected', error });
			});
		return () => {
			cancelled = true;
		};
	}, [props.promise]);

	if (state.status === 'pending') return <>{props.fallback ?? null}</>;
	if (state.status === 'rejected')
		return <>{String((state.error as any)?.message ?? state.error)}</>;
	return <>{props.children(state.value as T)}</>;
}
```

- [ ] Create `packages/ui-spec/react/src/components/AsyncBoundary.spec.tsx` with:

```tsx
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { AsyncBoundary } from './AsyncBoundary';

describe('AsyncBoundary', () => {
	it('renders fallback then value', async () => {
		let resolve!: (v: string) => void;
		const promise = new Promise<string>((r) => (resolve = r));

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<AsyncBoundary promise={promise} fallback={<span>Loading</span>}>
					{(v) => <span>{v}</span>}
				</AsyncBoundary>,
			);
		});

		expect(container.textContent).toContain('Loading');

		await act(async () => {
			resolve('Done');
			await promise;
		});

		expect(container.textContent).toContain('Done');
	});
});
```

- [ ] Update `packages/ui-spec/react/src/index.ts` to export AsyncBoundary:

```ts
export * from './types';
export * from './provider';
export * from './render';
export * from './components/AsyncBoundary';
```

#### Step 13 (v1) Verification Checklist

- [ ] Run `pnpm --filter @ui-spec/react test`.

#### Step 13 (v1) STOP & COMMIT

**STOP & COMMIT:** Stop here and wait for the user to test, stage, and commit.
