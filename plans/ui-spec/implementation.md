# UI-Spec MVP (Core + React Binding)

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
