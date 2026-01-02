# ui-spec

## Goal

Implement the minimal `@ui-spec/*` runtime (core + React renderer + optional shadcn adapter) required to render interactive UIs from JSON specs with JSONPath reads via `json-p3` and RFC 6902 JSON Patch mutations.

## Prerequisites

Make sure that the user is currently on the `feat/ui-spec-core-react-adapters-jsonp3` branch before beginning implementation.

### Step-by-Step Instructions

#### Step 1: Scaffold `@ui-spec/*` packages (build/test/tooling)

- [ ] Create the following package folders:
  - [ ] `packages/ui-spec/core/`
  - [ ] `packages/ui-spec/react/`
  - [ ] `packages/ui-spec/adapter-shadcn/`

- [ ] Copy and paste the code below into `packages/ui-spec/core/package.json`:

```json
{
	"name": "@ui-spec/core",
	"version": "0.1.0",
	"description": "UI-Spec core runtime: schema/types + JSONPath store + JSON Patch mutations",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"scripts": {
		"build": "vite build",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"json-p3": "2.2.2"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"noEmit": false,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"module": "ESNext",
		"moduleResolution": "Bundler",
	},
	"include": ["src/**/*"],
	"exclude": ["dist", "node_modules"],
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

export default defineConfig(vitestBrowserConfigHappyDom());
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/README.md`:

```md
# @ui-spec/core

Framework-agnostic core runtime for UI-Spec:

- JSONPath reads via `json-p3` (RFC 9535)
- JSON Patch mutations via `json-p3` (RFC 6902)

This package intentionally does not depend on React or any component library.
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/index.ts`:

```ts
export {};
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/package.json`:

```json
{
	"name": "@ui-spec/react",
	"version": "0.1.0",
	"description": "UI-Spec React bindings: provider + renderer + hooks + adapters",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"scripts": {
		"build": "vite build",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@ui-spec/core": "workspace:*"
	},
	"peerDependencies": {
		"react": "^18 || ^19",
		"react-dom": "^18 || ^19",
		"typescript": "~5.5"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@testing-library/jest-dom": "^6.9.1",
		"@testing-library/react": "^16.3.1",
		"@testing-library/user-event": "^14.6.1",
		"@types/react": "^18",
		"@types/react-dom": "^18",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"happy-dom": "^20.0.11",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/react.json",
	"compilerOptions": {
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"jsx": "react-jsx",
	},
	"include": ["src/**/*.ts", "src/**/*.tsx"],
	"exclude": ["dist", "node_modules"],
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

export default defineConfig(vitestBrowserConfigHappyDom());
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/README.md`:

```md
# @ui-spec/react

React bindings for UI-Spec:

- Provider that wires up store + function registry + component adapters
- Renderer for JSON-schema nodes
- Hooks for subscribing to store values

This package is component-library-agnostic. Use adapters (e.g. `@ui-spec/adapter-shadcn`) to supply component mappings.
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/index.ts`:

```ts
export {};
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/package.json`:

```json
{
	"name": "@ui-spec/adapter-shadcn",
	"version": "0.1.0",
	"description": "Optional UI-Spec adapter for @lellimecnar/ui (shadcn)",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"scripts": {
		"build": "vite build",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@lellimecnar/ui": "workspace:*",
		"@ui-spec/react": "workspace:*"
	},
	"peerDependencies": {
		"react": "^18 || ^19",
		"react-dom": "^18 || ^19",
		"typescript": "~5.5"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@testing-library/jest-dom": "^6.9.1",
		"@testing-library/react": "^16.3.1",
		"@testing-library/user-event": "^14.6.1",
		"@types/react": "^18",
		"@types/react-dom": "^18",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"happy-dom": "^20.0.11",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/react.json",
	"compilerOptions": {
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"jsx": "react-jsx",
	},
	"include": ["src/**/*.ts", "src/**/*.tsx"],
	"exclude": ["dist", "node_modules"],
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

export default defineConfig(vitestBrowserConfigHappyDom());
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/README.md`:

```md
# @ui-spec/adapter-shadcn

Optional adapter that maps UI-Spec component names to `@lellimecnar/ui/*` (shadcn-style components).

This package is intentionally small; add mappings as needed.
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/src/index.ts`:

```ts
export {};
```

##### Step 1 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`
- [ ] `pnpm --filter @ui-spec/react test`
- [ ] `pnpm --filter @ui-spec/adapter-shadcn test`

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(ui-spec): scaffold core/react/adapter-shadcn packages

- Add new `packages/ui-spec/*` workspaces with Vite build + Vitest (happy-dom) tooling
- Pin `json-p3` in @ui-spec/core

completes: step 1 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 9: React adapter interface: pluggable component libraries

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/adapter.ts`:

```ts
import type { ComponentType } from 'react';

export type UISpecComponentAdapter = {
	getComponents(): Record<string, ComponentType<any>>;
};
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/registry.ts`:

```ts
import type { ComponentType } from 'react';

import { ComponentRegistry } from '@ui-spec/core';

import type { UISpecComponentAdapter } from './adapter';

export function createComponentRegistry(params: {
	adapters?: UISpecComponentAdapter[];
	intrinsic?: Record<string, ComponentType<any>>;
}): ComponentRegistry<ComponentType<any>> {
	const registry = new ComponentRegistry<ComponentType<any>>();

	for (const [id, component] of Object.entries(params.intrinsic ?? {})) {
		registry.register(id, component);
	}

	for (const adapter of params.adapters ?? []) {
		for (const [id, component] of Object.entries(adapter.getComponents())) {
			// Last adapter wins by overwriting.
			registry.register(id, component);
		}
	}

	return registry;
}
```

- [ ] Update `packages/ui-spec/react/src/index.ts` by replacing its contents with:

```ts
export * from './adapter';
export * from './registry';
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/adapter.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { UISpecComponentAdapter } from './adapter';

describe('UISpecComponentAdapter', () => {
	it('is a simple component provider interface', () => {
		const adapter: UISpecComponentAdapter = {
			getComponents: () => ({ X: () => null }),
		};
		expect(Object.keys(adapter.getComponents())).toEqual(['X']);
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/registry.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createComponentRegistry } from './registry';

describe('createComponentRegistry', () => {
	it('applies adapters in order (last wins)', () => {
		const A = () => null;
		const B = () => null;

		const registry = createComponentRegistry({
			adapters: [
				{ getComponents: () => ({ Button: A }) },
				{ getComponents: () => ({ Button: B }) },
			],
		});

		expect(registry.require('Button')).toBe(B);
	});
});
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @ui-spec/react test`

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-react): add component adapter interface

- Define UISpecComponentAdapter interface for component libraries
- Add createComponentRegistry adapter composition (last wins)

completes: step 9 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 10: React binding: provider, renderer, and subscription hooks

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/context.ts`:

```ts
import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';

import type {
	ComponentRegistry,
	UISpecContext,
	UISpecSchema,
	UISpecStore,
} from '@ui-spec/core';

export type UISpecReactRuntime = {
	schema: UISpecSchema;
	store: UISpecStore;
	ctx: UISpecContext;
	components: ComponentRegistry<ComponentType<any>>;
	children?: ReactNode;
};

export const UISpecRuntimeContext = createContext<UISpecReactRuntime | null>(
	null,
);

export function useUISpecRuntime(): UISpecReactRuntime {
	const runtime = useContext(UISpecRuntimeContext);
	if (!runtime) {
		throw new Error('UISpecProvider is missing');
	}
	return runtime;
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/hooks.ts`:

```ts
import { useMemo, useSyncExternalStore } from 'react';

import { useUISpecRuntime } from './context';

export function useUISpecValue<T = unknown>(path: string): T {
	const { store } = useUISpecRuntime();
	const observable = useMemo(() => store.select<T>(path), [store, path]);

	return useSyncExternalStore(
		(onStoreChange) => {
			let first = true;
			return observable.subscribe(() => {
				// select() emits immediately; ignore the first call.
				if (first) {
					first = false;
					return;
				}
				onStoreChange();
			});
		},
		() => observable.get(),
	);
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/provider.tsx`:

```tsx
import { useMemo, type ReactNode } from 'react';

import {
	createJsonp3FunctionRegistry,
	createUISpecContext,
	createUISpecStore,
	FunctionRegistry,
	type UISpecSchema,
	type UISpecStore,
} from '@ui-spec/core';

import type { UISpecComponentAdapter } from './adapter';
import { UISpecRuntimeContext } from './context';
import { createComponentRegistry } from './registry';

export type UISpecProviderProps = {
	schema: UISpecSchema;
	adapters?: UISpecComponentAdapter[];
	store?: UISpecStore;
	functions?: FunctionRegistry;
	children?: ReactNode;
};

export function UISpecProvider(props: UISpecProviderProps) {
	const {
		schema,
		adapters = [],
		store: injectedStore,
		functions: injectedFunctions,
		children,
	} = props;

	const store = useMemo(
		() => injectedStore ?? createUISpecStore(schema.data ?? {}),
		[injectedStore, schema],
	);

	const functions = useMemo(
		() =>
			injectedFunctions ?? new FunctionRegistry(createJsonp3FunctionRegistry()),
		[injectedFunctions],
	);

	const ctx = useMemo(
		() => createUISpecContext({ store, functions }),
		[store, functions],
	);
	const components = useMemo(
		() => createComponentRegistry({ adapters }),
		[adapters],
	);

	const runtimeValue = useMemo(
		() => ({ schema, store, ctx, components }),
		[schema, store, ctx, components],
	);

	return (
		<UISpecRuntimeContext.Provider value={runtimeValue}>
			{children}
		</UISpecRuntimeContext.Provider>
	);
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/render.tsx`:

```tsx
import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { resolveNode, type NodeSchema, type ResolvedNode } from '@ui-spec/core';

import { useUISpecRuntime } from './context';

function renderResolved(node: ResolvedNode<any>): ReactNode {
	const children = node.children.map((child, idx) => {
		if (
			typeof child === 'object' &&
			child !== null &&
			'type' in (child as any)
		) {
			return <Fragment key={idx}>{renderResolved(child as any)}</Fragment>;
		}
		return <Fragment key={idx}>{child as any}</Fragment>;
	});

	if (node.intrinsic) {
		const Tag = node.intrinsic as any;
		return <Tag {...node.props}>{children}</Tag>;
	}

	const Comp = node.component as any;
	return <Comp {...node.props}>{children}</Comp>;
}

export function UISpecNode(props: { node: NodeSchema }) {
	const { ctx, components } = useUISpecRuntime();
	const resolved = resolveNode(props.node, ctx, { components });
	return <>{renderResolved(resolved)}</>;
}

export function UISpecRoot() {
	const { schema } = useUISpecRuntime();
	return <UISpecNode node={schema.root} />;
}
```

- [ ] Update `packages/ui-spec/react/src/index.ts` by replacing its contents with:

```ts
export * from './adapter';
export * from './context';
export * from './hooks';
export * from './provider';
export * from './registry';
export * from './render';
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/provider.spec.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { UISpecProvider } from './provider';
import { UISpecRoot } from './render';

describe('UISpecProvider', () => {
	it('renders the schema root via UISpecRoot', () => {
		const { container } = render(
			<UISpecProvider
				schema={{
					data: { msg: 'hi' },
					root: { type: 'div', children: [{ $path: '$.msg' }] },
				}}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(container.textContent).toBe('hi');
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/render.spec.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createJsonp3FunctionRegistry, FunctionRegistry } from '@ui-spec/core';

import { UISpecProvider } from './provider';
import { UISpecRoot } from './render';

describe('UISpec rendering', () => {
	it('updates UI after store mutation via click handler', () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('inc', (ctx) => {
			const current = (ctx as any).get('$.count');
			(ctx as any).set('$.count', Number(current) + 1);
		});

		render(
			<UISpecProvider
				schema={{
					data: { count: 0 },
					root: {
						type: 'div',
						children: [
							{ type: 'span', children: [{ $path: '$.count' }] },
							{
								type: 'button',
								$on: { onClick: { $call: { id: 'inc' } } },
								children: ['+'],
							},
						],
					},
				}}
				functions={functions}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(screen.getByText('0')).toBeTruthy();
		fireEvent.click(screen.getByText('+'));
		expect(screen.getByText('1')).toBeTruthy();
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/hooks.spec.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createJsonp3FunctionRegistry, FunctionRegistry } from '@ui-spec/core';

import { UISpecProvider } from './provider';
import { useUISpecValue } from './hooks';

function CounterView() {
	const n = useUISpecValue<number>('$.n');
	return <div>{n}</div>;
}

describe('useUISpecValue', () => {
	it('subscribes and updates when selected value changes', () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('inc', (ctx) => {
			(ctx as any).set('$.n', Number((ctx as any).get('$.n')) + 1);
		});

		render(
			<UISpecProvider
				schema={{
					data: { n: 0 },
					root: {
						type: 'button',
						$on: { onClick: { $call: { id: 'inc' } } },
						children: ['inc'],
					},
				}}
				functions={functions}
			>
				<CounterView />
				<div />
			</UISpecProvider>,
		);

		expect(screen.getByText('0')).toBeTruthy();
		fireEvent.click(screen.getByText('inc'));
		expect(screen.getByText('1')).toBeTruthy();
	});
});
```

##### Step 10 Verification Checklist

- [ ] `pnpm --filter @ui-spec/react test`

#### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-react): provider + renderer + hooks

- Add UISpecProvider wiring store/functions/components
- Add UISpecNode/UISpecRoot renderer and useUISpecValue hook

completes: step 10 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 11: Optional adapter: `@ui-spec/adapter-shadcn` component mappings

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/src/adapter.ts`:

```ts
import { Button } from '@lellimecnar/ui/button';
import { Input } from '@lellimecnar/ui/input';

import type { UISpecComponentAdapter } from '@ui-spec/react';

export function createShadcnAdapter(): UISpecComponentAdapter {
	return {
		getComponents: () => ({
			Button,
			Input,
		}),
	};
}
```

- [ ] Update `packages/ui-spec/adapter-shadcn/src/index.ts` by replacing its contents with:

```ts
export * from './adapter';
```

- [ ] Copy and paste the code below into `packages/ui-spec/adapter-shadcn/src/adapter.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createShadcnAdapter } from './adapter';

describe('createShadcnAdapter', () => {
	it('provides a stable component mapping', () => {
		const adapter = createShadcnAdapter();
		const components = adapter.getComponents();
		expect(Object.keys(components)).toEqual(['Button', 'Input']);
	});
});
```

##### Step 11 Verification Checklist

- [ ] `pnpm --filter @ui-spec/adapter-shadcn test`

#### Step 11 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-adapter-shadcn): map component names to @lellimecnar/ui

- Add createShadcnAdapter mapping minimal component set (Button/Input)

completes: step 11 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 12: Cross-package integration tests (core ↔ react ↔ adapter-shadcn)

- [ ] Create folder `packages/ui-spec/react/src/integration/`.

- [ ] Copy and paste the code below into `packages/ui-spec/react/src/integration/counter.spec.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createJsonp3FunctionRegistry, FunctionRegistry } from '@ui-spec/core';
import { createShadcnAdapter } from '@ui-spec/adapter-shadcn';

import { UISpecProvider } from '../provider';
import { UISpecRoot } from '../render';

describe('integration: counter', () => {
	it('renders and increments via registry-backed onClick', () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('inc', (ctx) => {
			(ctx as any).set('$.count', Number((ctx as any).get('$.count')) + 1);
		});

		render(
			<UISpecProvider
				schema={{
					data: { count: 0 },
					root: {
						type: 'div',
						children: [
							{ type: 'span', children: [{ $path: '$.count' }] },
							{
								type: 'Button',
								$on: { onClick: { $call: { id: 'inc' } } },
								children: ['+'],
							},
						],
					},
				}}
				functions={functions}
				adapters={[createShadcnAdapter()]}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(screen.getByText('0')).toBeTruthy();
		fireEvent.click(screen.getByText('+'));
		expect(screen.getByText('1')).toBeTruthy();
	});
});
```

##### Step 12 Verification Checklist

- [ ] `pnpm --filter @ui-spec/react test`

#### Step 12 STOP & COMMIT

Multiline conventional commit message:

```txt
test(ui-spec): add integration suite for interactive counter

- Add end-to-end test for core + react + adapter-shadcn wiring

completes: step 12 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 13: Refactor + harden: deterministic errors, edge cases, docs

- [ ] Update `packages/ui-spec/core/README.md` by replacing its contents with:

```md
# @ui-spec/core

Framework-agnostic core runtime for UI-Spec.

## Guarantees

- JSONPath evaluation uses `json-p3` (RFC 9535 semantics).
- All mutations are applied via RFC 6902 JSON Patch operations.
- Write helpers that accept JSONPath targets require exactly one match.

## Non-goals

- No router or navigation.
- No external validation plugins.
- No embedded function strings (no UIScript). All callable behavior is supplied via a function registry.
```

- [ ] Update `packages/ui-spec/react/README.md` by replacing its contents with:

```md
# @ui-spec/react

React bindings for UI-Spec.

## What it provides

- `UISpecProvider`: wires store + function registry + component adapters
- `UISpecRoot` / `UISpecNode`: renders schema nodes
- `useUISpecValue(path)`: subscribes to store selections

## Component adapters

This package does not import any UI library. Provide component mappings via adapters.
```

- [ ] Update `packages/ui-spec/adapter-shadcn/README.md` by replacing its contents with:

```md
# @ui-spec/adapter-shadcn

Optional adapter mapping UI-Spec component names to `@lellimecnar/ui/*` (shadcn components).

## Exports

- `createShadcnAdapter()`

## Notes

This adapter intentionally stays small and grows incrementally.
```

- [ ] Leave `specs/ui-spec.md` unchanged in this PR.
  - Rationale: it is a large, broader design document and includes UIScript sections that are explicitly out-of-scope for this PR.
  - This PR’s behavior (“no embedded function strings”) is documented in the package READMEs above.

##### Step 13 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`
- [ ] `pnpm --filter @ui-spec/react test`
- [ ] `pnpm --filter @ui-spec/adapter-shadcn test`
- [ ] `pnpm --filter @ui-spec/core build`
- [ ] `pnpm --filter @ui-spec/react build`
- [ ] `pnpm --filter @ui-spec/adapter-shadcn build`
- [ ] `pnpm -w type-check`

#### Step 13 STOP & COMMIT

Multiline conventional commit message:

```txt
refactor(ui-spec): harden errors + edge cases + docs

- Tighten docs and package guarantees/non-goals
- Keep deterministic error behavior and end-to-end test coverage

completes: step 13 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Final verification checklist

- `pnpm --filter @ui-spec/core build && pnpm --filter @ui-spec/core test`
- `pnpm --filter @ui-spec/react build && pnpm --filter @ui-spec/react test`
- `pnpm --filter @ui-spec/adapter-shadcn build && pnpm --filter @ui-spec/adapter-shadcn test`
- `pnpm -w type-check`

---

#### Step 7: Core runtime context + action execution (registry-backed, no UIScript)

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/context.ts`:

```ts
import type { FunctionRegistry } from './function-registry';
import type { Observable } from './observable';
import type { JsonPatchOperation, UISpecStore } from './store';

export type UISpecContext = {
	store: UISpecStore;
	functions: FunctionRegistry;

	get<T = unknown>(path: string): T;
	select<T = unknown>(path: string): Observable<T>;
	patch(operations: JsonPatchOperation[]): void;
	set(path: string, value: unknown): void;
	update(path: string, updater: (current: unknown) => unknown): void;
	merge(path: string, partial: Record<string, unknown>): void;
	push(path: string, ...items: unknown[]): void;
	remove(path: string, predicate: (item: unknown) => boolean): void;

	call(id: string, ...args: unknown[]): unknown;
};

export function createUISpecContext(params: {
	store: UISpecStore;
	functions: FunctionRegistry;
}): UISpecContext {
	const { store, functions } = params;

	const ctx: UISpecContext = {
		store,
		functions,
		get: (path) => store.get(path),
		select: (path) => store.select(path),
		patch: (ops) => store.patch(ops),
		set: (path, value) => store.set(path, value),
		update: (path, updater) => store.update(path, updater),
		merge: (path, partial) => store.merge(path, partial),
		push: (path, ...items) => store.push(path, ...items),
		remove: (path, predicate) => store.remove(path, predicate),
		call: (id, ...args) => functions.call(id, ctx, ...args),
	};

	return ctx;
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/actions.ts`:

```ts
import { UISpecError } from './errors';
import type { UISpecContext } from './context';
import { isCallBinding, isPathBinding, type CallBinding } from './types';

export type ActionSchema = CallBinding;

function resolveValue(value: unknown, ctx: UISpecContext): unknown {
	if (isPathBinding(value)) {
		return ctx.get(value.$path);
	}
	if (isCallBinding(value)) {
		return resolveAction(value, ctx);
	}
	if (Array.isArray(value)) {
		return value.map((v) => resolveValue(v, ctx));
	}
	if (typeof value === 'object' && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveValue(v, ctx);
		}
		return out;
	}
	return value;
}

export function resolveAction(
	action: ActionSchema,
	ctx: UISpecContext,
): unknown {
	if (!action.$call?.id) {
		throw new UISpecError('UI_SPEC_INVALID_SCHEMA', 'Invalid $call action', {
			action,
		});
	}

	const args = (action.$call.args ?? []).map((a) => resolveValue(a, ctx));
	return ctx.functions.call(action.$call.id, ctx, ...args);
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/context.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';
import { createUISpecContext } from './context';
import { createUISpecStore } from './store';

describe('UISpecContext', () => {
	it('call() delegates to FunctionRegistry with ctx', () => {
		const store = createUISpecStore({ n: 1 });
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		const ctx = createUISpecContext({ store, functions });

		functions.registerFunction('inc', (c) => {
			const current = (c as any).get('$.n');
			(c as any).set('$.n', Number(current) + 1);
		});

		ctx.call('inc');
		expect(store.get('$.n')).toBe(2);
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/actions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';
import { createUISpecContext } from './context';
import { resolveAction } from './actions';
import { createUISpecStore } from './store';

describe('resolveAction', () => {
	it('resolves $path args at call time', () => {
		const store = createUISpecStore({ a: 2, b: 3 });
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		const ctx = createUISpecContext({ store, functions });

		functions.registerFunction(
			'sum',
			(_ctx, a: unknown, b: unknown) => Number(a) + Number(b),
		);

		const result = resolveAction(
			{ $call: { id: 'sum', args: [{ $path: '$.a' }, { $path: '$.b' }] } },
			ctx,
		);
		expect(result).toBe(5);
	});
});
```

- [ ] Update `packages/ui-spec/core/src/index.ts` by replacing its contents with:

```ts
export * from './actions';
export * from './context';
export * from './errors';
export * from './function-registry';
export * from './jsonp3';
export * from './observable';
export * from './patch-helpers';
export * from './schema';
export * from './store';
export * from './types';
```

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-core): add context + call execution

- Add UISpecContext for store + function registry access
- Add resolveAction() for $call schemas with $path arg bindings

completes: step 7 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 8: Node resolution: bindings (`$path`) in props/children + component resolution

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/component-registry.ts`:

```ts
import { UISpecError } from './errors';

export class ComponentRegistry<TComponent> {
	private readonly map = new Map<string, TComponent>();

	public register(id: string, component: TComponent): void {
		this.map.set(id, component);
	}

	public get(id: string): TComponent | undefined {
		return this.map.get(id);
	}

	public require(id: string): TComponent {
		const component = this.map.get(id);
		if (!component) {
			throw new UISpecError(
				'UI_SPEC_COMPONENT_NOT_FOUND',
				`UI-Spec component not found: ${id}`,
				{ id },
			);
		}
		return component;
	}
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/resolve.ts`:

```ts
import type { UISpecContext } from './context';
import { resolveAction, type ActionSchema } from './actions';
import type { ComponentRegistry } from './component-registry';
import { isCallBinding, isPathBinding, type NodeSchema } from './types';

export type ResolvedNode<TComponent = unknown> = {
	type: string;
	intrinsic?: string;
	component?: TComponent;
	props: Record<string, unknown>;
	children: Array<ResolvedNode<TComponent> | unknown>;
};

function isIntrinsicTag(type: string): boolean {
	return type.toLowerCase() === type;
}

function resolveAny(value: unknown, ctx: UISpecContext): unknown {
	if (isPathBinding(value)) {
		return ctx.get(value.$path);
	}
	if (isCallBinding(value)) {
		return resolveAction(value, ctx);
	}
	if (Array.isArray(value)) {
		return value.map((v) => resolveAny(v, ctx));
	}
	if (typeof value === 'object' && value !== null) {
		// NodeSchema-like
		if ('type' in value && typeof (value as any).type === 'string') {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveAny(v, ctx);
		}
		return out;
	}
	return value;
}

export function resolveNode<TComponent>(
	node: NodeSchema,
	ctx: UISpecContext,
	registries: { components: ComponentRegistry<TComponent> },
): ResolvedNode<TComponent> {
	const props: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(node.props ?? {})) {
		props[k] = resolveAny(v, ctx);
	}

	if (node.$on) {
		for (const [eventName, action] of Object.entries(node.$on)) {
			props[eventName] = () => resolveAction(action as ActionSchema, ctx);
		}
	}

	const children: Array<ResolvedNode<TComponent> | unknown> = [];
	for (const child of node.children ?? []) {
		if (typeof child === 'object' && child !== null && 'type' in child) {
			children.push(resolveNode(child as NodeSchema, ctx, registries));
			continue;
		}
		children.push(resolveAny(child, ctx));
	}

	if (isIntrinsicTag(node.type)) {
		return { type: node.type, intrinsic: node.type, props, children };
	}

	return {
		type: node.type,
		component: registries.components.require(node.type),
		props,
		children,
	};
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/component-registry.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { ComponentRegistry } from './component-registry';

describe('ComponentRegistry', () => {
	it('registers and resolves components', () => {
		const reg = new ComponentRegistry<number>();
		reg.register('X', 1);
		expect(reg.require('X')).toBe(1);
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/resolve.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';
import { createUISpecContext } from './context';
import { ComponentRegistry } from './component-registry';
import { resolveNode } from './resolve';
import { createUISpecStore } from './store';

describe('resolveNode', () => {
	it('resolves $path in props and children', () => {
		const store = createUISpecStore({ label: 'Hello' });
		const ctx = createUISpecContext({
			store,
			functions: new FunctionRegistry(createJsonp3FunctionRegistry()),
		});

		const components = new ComponentRegistry<unknown>();

		const resolved = resolveNode(
			{
				type: 'div',
				props: { title: { $path: '$.label' } },
				children: ['x', { $path: '$.label' }],
			},
			ctx,
			{ components },
		);

		expect(resolved.props.title).toBe('Hello');
		expect(resolved.children).toEqual(['x', 'Hello']);
	});

	it('creates callable event handlers from $on', () => {
		const store = createUISpecStore({ n: 0 });
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		const ctx = createUISpecContext({ store, functions });
		functions.registerFunction('inc', (c) => {
			const v = (c as any).get('$.n');
			(c as any).set('$.n', Number(v) + 1);
		});

		const components = new ComponentRegistry<unknown>();
		const node = resolveNode(
			{ type: 'button', $on: { onClick: { $call: { id: 'inc' } } } },
			ctx,
			{ components },
		);

		(node.props.onClick as () => void)();
		expect(store.get('$.n')).toBe(1);
	});
});
```

- [ ] Update `packages/ui-spec/core/src/index.ts` by replacing its contents with:

```ts
export * from './actions';
export * from './component-registry';
export * from './context';
export * from './errors';
export * from './function-registry';
export * from './jsonp3';
export * from './observable';
export * from './patch-helpers';
export * from './resolve';
export * from './schema';
export * from './store';
export * from './types';
```

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-core): resolve nodes with bindings + registries

- Add ComponentRegistry and resolveNode() for bindings and $on handlers
- Ensure missing components throw deterministic errors

completes: step 8 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Store v1: JSONPath reads (`get`, `select`) with exact-match semantics

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/observable.ts`:

```ts
export type Unsubscribe = () => void;

export type Listener<T> = (value: T) => void;

export function createEmitter<T>() {
	const listeners = new Set<Listener<T>>();

	return {
		emit(value: T) {
			for (const listener of Array.from(listeners)) {
				listener(value);
			}
		},
		subscribe(listener: Listener<T>): Unsubscribe {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

export type Observable<T> = {
	get(): T;
	subscribe(listener: Listener<T>): Unsubscribe;
};
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/store.ts`:

```ts
import { JSONPointer, jsonpatch } from 'json-p3';

import { UISpecError } from './errors';
import { createJsonp3Evaluator } from './jsonp3';
import { createEmitter, type Observable, type Unsubscribe } from './observable';

export type JsonPatchOperation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

export type UISpecStore = {
	get<T = unknown>(path: string): T;
	select<T = unknown>(path: string): Observable<T>;
	patch(operations: JsonPatchOperation[]): void;
	subscribe(listener: () => void): Unsubscribe;
	getDocument(): unknown;
};

export function createUISpecStore(initialDocument: unknown): UISpecStore {
	let document = initialDocument;
	const evaluator = createJsonp3Evaluator();
	const emitter = createEmitter<void>();

	const subscribe = (listener: () => void): Unsubscribe =>
		emitter.subscribe(listener);

	const get = <T = unknown>(path: string): T => {
		const matches = evaluator.findAll(path, document);
		if (matches.length === 0) {
			throw new UISpecError(
				'UI_SPEC_PATH_NOT_FOUND',
				`No match for JSONPath: ${path}`,
				{
					path,
				},
			);
		}
		if (matches.length > 1) {
			throw new UISpecError(
				'UI_SPEC_PATH_NOT_UNIQUE',
				`Multiple matches for JSONPath: ${path}`,
				{ path, matches: matches.length },
			);
		}
		return matches[0]!.value as T;
	};

	const select = <T = unknown>(path: string): Observable<T> => {
		return {
			get: () => get<T>(path),
			subscribe: (listener) => {
				let prev = get<T>(path);
				listener(prev);

				return subscribe(() => {
					const next = get<T>(path);
					if (Object.is(next, prev)) return;
					prev = next;
					listener(next);
				});
			},
		};
	};

	const patch = (operations: JsonPatchOperation[]) => {
		if (operations.length === 0) return;
		document = jsonpatch.apply(
			operations as unknown as jsonpatch.OpObject[],
			document as any,
		);
		emitter.emit(undefined);
	};

	const getDocument = () => document;

	// Force-link JSONPointer so we fail fast if json-p3 API changes.
	if (typeof JSONPointer !== 'function') {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 JSONPointer is missing',
		);
	}

	return {
		get,
		select,
		patch,
		subscribe,
		getDocument,
	};
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/store.read.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createUISpecStore } from './store';

describe('UISpecStore reads', () => {
	it('get() returns a single match value', () => {
		const store = createUISpecStore({ a: { b: 1 } });
		expect(store.get('$.a.b')).toBe(1);
	});

	it('get() throws when no matches', () => {
		const store = createUISpecStore({ a: { b: 1 } });
		expect(() => store.get('$.a.c')).toThrowError(/No match/i);
	});

	it('get() throws when multiple matches', () => {
		const store = createUISpecStore({ arr: [1, 2] });
		expect(() => store.get('$.arr[*]')).toThrowError(/Multiple matches/i);
	});

	it('select() emits initial + changes only', () => {
		const store = createUISpecStore({ count: 0 });
		const values: number[] = [];

		const unsubscribe = store
			.select<number>('$.count')
			.subscribe((v) => values.push(v));
		expect(values).toEqual([0]);

		store.patch([{ op: 'replace', path: '/count', value: 1 }]);
		store.patch([{ op: 'replace', path: '/count', value: 1 }]);
		store.patch([{ op: 'replace', path: '/count', value: 2 }]);

		expect(values).toEqual([0, 1, 2]);

		unsubscribe();
	});
});
```

- [ ] Update `packages/ui-spec/core/src/index.ts` by replacing its contents with:

```ts
export * from './errors';
export * from './function-registry';
export * from './jsonp3';
export * from './observable';
export * from './schema';
export * from './store';
export * from './types';
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-core): implement store reads + selectors

- Add createUISpecStore with JSONPath get/select semantics
- Enforce exact-match JSONPath reads and observable subscriptions

completes: step 4 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Store v1: JSON Patch engine + mutations (`patch`, `set`, `update`, `merge`, `push`, `remove`)

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/patch-helpers.ts`:

```ts
import { JSONPointer } from 'json-p3';

import { UISpecError } from './errors';
import type { JsonPatchOperation } from './store';

function escapeJsonPointerToken(token: string): string {
	return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function joinPointer(pointer: string, token: string): string {
	const t = escapeJsonPointerToken(token);
	if (pointer === '') return `/${t}`;
	return `${pointer}/${t}`;
}

export function makeSetOps(
	pointer: string,
	doc: unknown,
	value: unknown,
): JsonPatchOperation[] {
	const ptr = new JSONPointer(pointer);
	const exists = ptr.exists(doc as any);
	return [
		exists
			? { op: 'replace', path: pointer, value }
			: { op: 'add', path: pointer, value },
	];
}

export function makeMergeOps(
	basePointer: string,
	current: unknown,
	partial: Record<string, unknown>,
): JsonPatchOperation[] {
	if (
		typeof current !== 'object' ||
		current === null ||
		Array.isArray(current)
	) {
		throw new UISpecError(
			'UI_SPEC_INVALID_SCHEMA',
			'merge target is not an object',
			{
				pointer: basePointer,
			},
		);
	}

	const ops: JsonPatchOperation[] = [];
	for (const [key, next] of Object.entries(partial)) {
		const path = joinPointer(basePointer, key);
		const hasKey = Object.prototype.hasOwnProperty.call(current, key);
		ops.push(
			hasKey
				? { op: 'replace', path, value: next }
				: { op: 'add', path, value: next },
		);
	}
	return ops;
}

export function makePushOps(
	basePointer: string,
	current: unknown,
	items: unknown[],
): JsonPatchOperation[] {
	if (!Array.isArray(current)) {
		throw new UISpecError(
			'UI_SPEC_INVALID_SCHEMA',
			'push target is not an array',
			{
				pointer: basePointer,
			},
		);
	}

	return items.map((value) => ({ op: 'add', path: `${basePointer}/-`, value }));
}

export function makeRemoveOps(
	basePointer: string,
	current: unknown,
	predicate: (item: unknown) => boolean,
): JsonPatchOperation[] {
	if (!Array.isArray(current)) {
		throw new UISpecError(
			'UI_SPEC_INVALID_SCHEMA',
			'remove target is not an array',
			{
				pointer: basePointer,
			},
		);
	}

	const ops: JsonPatchOperation[] = [];
	for (let i = current.length - 1; i >= 0; i -= 1) {
		if (predicate(current[i])) {
			ops.push({ op: 'remove', path: `${basePointer}/${i}` });
		}
	}
	return ops;
}
```

- [ ] Update `packages/ui-spec/core/src/store.ts` by replacing its contents with:

```ts
import { JSONPointer, jsonpatch, jsonpath, type JSONValue } from 'json-p3';

import { UISpecError } from './errors';
import { createEmitter, type Observable, type Unsubscribe } from './observable';
import {
	makeMergeOps,
	makePushOps,
	makeRemoveOps,
	makeSetOps,
} from './patch-helpers';

export type JsonPatchOperation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

export type UISpecStore = {
	get<T = unknown>(path: string): T;
	select<T = unknown>(path: string): Observable<T>;
	patch(operations: JsonPatchOperation[]): void;
	set(path: string, value: unknown): void;
	update(path: string, updater: (current: unknown) => unknown): void;
	merge(path: string, partial: Record<string, unknown>): void;
	push(path: string, ...items: unknown[]): void;
	remove(path: string, predicate: (item: unknown) => boolean): void;
	subscribe(listener: () => void): Unsubscribe;
	getDocument(): unknown;
};

function findSinglePointer(
	document: unknown,
	path: string,
): { pointer: string; value: unknown } {
	if (!jsonpath?.query) {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 jsonpath.query is missing',
		);
	}

	const nodes = jsonpath.query(path, document as JSONValue);
	if (nodes.length === 0) {
		throw new UISpecError(
			'UI_SPEC_PATH_NOT_FOUND',
			`No match for JSONPath: ${path}`,
			{
				path,
			},
		);
	}
	if (nodes.length > 1) {
		throw new UISpecError(
			'UI_SPEC_PATH_NOT_UNIQUE',
			`Multiple matches for JSONPath: ${path}`,
			{
				path,
				matches: nodes.length,
			},
		);
	}

	const node = nodes.nodes[0]!;
	return { pointer: node.toPointer().toString(), value: node.value };
}

export function createUISpecStore(initialDocument: unknown): UISpecStore {
	let document = initialDocument;
	const emitter = createEmitter<void>();

	const subscribe = (listener: () => void): Unsubscribe =>
		emitter.subscribe(listener);

	const get = <T = unknown>(path: string): T =>
		findSinglePointer(document, path).value as T;

	const select = <T = unknown>(path: string): Observable<T> => {
		return {
			get: () => get<T>(path),
			subscribe: (listener) => {
				let prev = get<T>(path);
				listener(prev);

				return subscribe(() => {
					const next = get<T>(path);
					if (Object.is(next, prev)) return;
					prev = next;
					listener(next);
				});
			},
		};
	};

	const patch = (operations: JsonPatchOperation[]) => {
		if (operations.length === 0) return;
		document = jsonpatch.apply(
			operations as unknown as jsonpatch.OpObject[],
			document as any,
		);
		emitter.emit(undefined);
	};

	const set = (path: string, value: unknown) => {
		const { pointer } = findSinglePointer(document, path);
		patch(makeSetOps(pointer, document, value));
	};

	const update = (path: string, updater: (current: unknown) => unknown) => {
		const { pointer, value } = findSinglePointer(document, path);
		patch(makeSetOps(pointer, document, updater(value)));
	};

	const merge = (path: string, partial: Record<string, unknown>) => {
		const { pointer, value } = findSinglePointer(document, path);
		patch(makeMergeOps(pointer, value, partial));
	};

	const push = (path: string, ...items: unknown[]) => {
		const { pointer, value } = findSinglePointer(document, path);
		patch(makePushOps(pointer, value, items));
	};

	const remove = (path: string, predicate: (item: unknown) => boolean) => {
		const { pointer, value } = findSinglePointer(document, path);
		const ops = makeRemoveOps(pointer, value, predicate);
		patch(ops);
	};

	const getDocument = () => document;

	if (typeof JSONPointer !== 'function') {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 JSONPointer is missing',
		);
	}

	return {
		get,
		select,
		patch,
		set,
		update,
		merge,
		push,
		remove,
		subscribe,
		getDocument,
	};
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/patch-helpers.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	makeMergeOps,
	makePushOps,
	makeRemoveOps,
	makeSetOps,
} from './patch-helpers';

describe('patch helpers', () => {
	it('makeSetOps chooses add vs replace', () => {
		expect(makeSetOps('/a', {}, 1)).toEqual([
			{ op: 'add', path: '/a', value: 1 },
		]);
		expect(makeSetOps('/a', { a: 1 }, 2)).toEqual([
			{ op: 'replace', path: '/a', value: 2 },
		]);
	});

	it('makeMergeOps creates per-key ops', () => {
		const ops = makeMergeOps('/obj', { a: 1 }, { a: 2, b: 3 });
		expect(ops).toEqual([
			{ op: 'replace', path: '/obj/a', value: 2 },
			{ op: 'add', path: '/obj/b', value: 3 },
		]);
	});

	it('makePushOps appends using /-', () => {
		const ops = makePushOps('/arr', [1], [2, 3]);
		expect(ops).toEqual([
			{ op: 'add', path: '/arr/-', value: 2 },
			{ op: 'add', path: '/arr/-', value: 3 },
		]);
	});

	it('makeRemoveOps removes in descending index order', () => {
		const ops = makeRemoveOps('/arr', [1, 2, 3, 4], (x) => Number(x) % 2 === 0);
		expect(ops).toEqual([
			{ op: 'remove', path: '/arr/3' },
			{ op: 'remove', path: '/arr/1' },
		]);
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/store.write.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createUISpecStore } from './store';

describe('UISpecStore writes', () => {
	it('set() updates a scalar', () => {
		const store = createUISpecStore({ a: { b: 1 } });
		store.set('$.a.b', 2);
		expect(store.get('$.a.b')).toBe(2);
	});

	it('update() transforms a value', () => {
		const store = createUISpecStore({ count: 1 });
		store.update('$.count', (v) => Number(v) + 1);
		expect(store.get('$.count')).toBe(2);
	});

	it('merge() applies partial object changes', () => {
		const store = createUISpecStore({ obj: { a: 1 } });
		store.merge('$.obj', { a: 2, b: 3 });
		expect(store.get('$.obj')).toEqual({ a: 2, b: 3 });
	});

	it('push() appends items', () => {
		const store = createUISpecStore({ arr: [1] });
		store.push('$.arr', 2, 3);
		expect(store.get('$.arr')).toEqual([1, 2, 3]);
	});

	it('remove() filters items by predicate', () => {
		const store = createUISpecStore({ arr: [1, 2, 3, 4] });
		store.remove('$.arr', (x) => Number(x) % 2 === 0);
		expect(store.get('$.arr')).toEqual([1, 3]);
	});

	it('patch([...]) notifies subscribers once', () => {
		const store = createUISpecStore({ a: 1, b: 2 });
		let notifications = 0;
		const unsub = store.subscribe(() => {
			notifications += 1;
		});

		store.patch([
			{ op: 'replace', path: '/a', value: 10 },
			{ op: 'replace', path: '/b', value: 20 },
		]);
		expect(store.get('$.a')).toBe(10);
		expect(store.get('$.b')).toBe(20);
		expect(notifications).toBe(1);

		unsub();
	});
});
```

- [ ] Update `packages/ui-spec/core/src/index.ts` by replacing its contents with:

```ts
export * from './errors';
export * from './function-registry';
export * from './jsonp3';
export * from './observable';
export * from './patch-helpers';
export * from './schema';
export * from './store';
export * from './types';
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-core): implement json patch engine + write helpers

- Add RFC 6902 patch application via json-p3
- Add set/update/merge/push/remove helpers built on patch([...])

completes: step 5 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: Store v1: subscription correctness + notification semantics

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/store.subscribe.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createUISpecStore } from './store';

describe('UISpecStore subscriptions', () => {
	it('subscribe() is idempotent to unsubscribe', () => {
		const store = createUISpecStore({ a: 1 });
		let count = 0;
		const unsub = store.subscribe(() => {
			count += 1;
		});
		unsub();
		unsub();

		store.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(count).toBe(0);
	});

	it('select() does not produce stale reads after patch', () => {
		const store = createUISpecStore({ a: 1 });
		const seen: number[] = [];
		const unsub = store.select<number>('$.a').subscribe((v) => seen.push(v));

		store.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(seen[seen.length - 1]).toBe(2);

		unsub();
	});

	it('multiple subscribers get notified', () => {
		const store = createUISpecStore({ a: 1 });
		let a = 0;
		let b = 0;
		const ua = store.subscribe(() => (a += 1));
		const ub = store.subscribe(() => (b += 1));

		store.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(a).toBe(1);
		expect(b).toBe(1);

		ua();
		ub();
	});
});
```

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
test(ui-spec-core): harden subscriptions + notification ordering

- Add tests for subscribe/unsubscribe semantics
- Lock in select() update behavior after patch

completes: step 6 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Define core public types + error model (MVP schema subset)

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/errors.ts`:

```ts
export type UISpecErrorCode =
	| 'UI_SPEC_JSONP3_API_MISSING'
	| 'UI_SPEC_PATH_NOT_FOUND'
	| 'UI_SPEC_PATH_NOT_UNIQUE'
	| 'UI_SPEC_INVALID_SCHEMA'
	| 'UI_SPEC_FUNCTION_NOT_FOUND'
	| 'UI_SPEC_COMPONENT_NOT_FOUND';

export class UISpecError extends Error {
	public readonly code: UISpecErrorCode;
	public readonly details?: Record<string, unknown>;

	public constructor(
		code: UISpecErrorCode,
		message: string,
		details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'UISpecError';
		this.code = code;
		this.details = details;
	}

	public toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			details: this.details,
		};
	}
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/types.ts`:

```ts
export type JsonPath = string;

export type PathBinding = { $path: JsonPath };
export type CallBinding = { $call: { id: string; args?: unknown[] } };

export type BindingValue = unknown | PathBinding | CallBinding;

export type EventHandlerSchema = { $call: { id: string; args?: unknown[] } };

export type NodeSchema = {
	type: string;
	props?: Record<string, BindingValue>;
	children?: Array<BindingValue | NodeSchema>;
	$on?: Record<string, EventHandlerSchema>;
};

export type UISpecSchema = {
	data?: unknown;
	root: NodeSchema;
	components?: Record<string, unknown>;
	functions?: Record<string, unknown>;
};

export function isPathBinding(value: unknown): value is PathBinding {
	return (
		typeof value === 'object' &&
		value !== null &&
		'$path' in value &&
		typeof (value as { $path?: unknown }).$path === 'string'
	);
}

export function isCallBinding(value: unknown): value is CallBinding {
	return (
		typeof value === 'object' &&
		value !== null &&
		'$call' in value &&
		typeof (value as { $call?: unknown }).$call === 'object' &&
		(value as { $call?: { id?: unknown } }).$call?.id !== undefined &&
		typeof (value as { $call?: { id?: unknown } }).$call?.id === 'string'
	);
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/schema.ts`:

```ts
export type {
	UISpecSchema,
	NodeSchema,
	BindingValue,
	PathBinding,
	CallBinding,
} from './types';
```

- [ ] Update `packages/ui-spec/core/src/index.ts` by replacing its contents with:

```ts
export * from './errors';
export * from './schema';
export * from './types';
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/errors.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { UISpecError } from './errors';

describe('UISpecError', () => {
	it('serializes deterministically', () => {
		const err = new UISpecError('UI_SPEC_INVALID_SCHEMA', 'bad schema', {
			path: '$.root',
		});

		expect(JSON.parse(JSON.stringify(err))).toEqual({
			name: 'UISpecError',
			code: 'UI_SPEC_INVALID_SCHEMA',
			message: 'bad schema',
			details: { path: '$.root' },
		});
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/types.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isCallBinding, isPathBinding } from './types';

describe('bindings', () => {
	it('detects $path binding', () => {
		expect(isPathBinding({ $path: '$.a' })).toBe(true);
		expect(isPathBinding({ $path: 1 })).toBe(false);
		expect(isPathBinding(null)).toBe(false);
	});

	it('detects $call binding', () => {
		expect(isCallBinding({ $call: { id: 'fn' } })).toBe(true);
		expect(isCallBinding({ $call: { id: 123 } })).toBe(false);
		expect(isCallBinding({ $call: null })).toBe(false);
	});
});
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-core): add types + error codes

- Add MVP UI-Spec schema and binding primitives
- Add stable UISpecError code model + serialization

completes: step 2 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: `json-p3` adapter boundary + function registry (authoritative)

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/jsonp3.ts`:

```ts
import { JSONPathEnvironment, jsonpath, type JSONValue } from 'json-p3';

import { UISpecError } from './errors';

export type Jsonp3Match = { value: unknown; pointer: string };

export type Jsonp3Evaluator = {
	findAll(path: string, doc: unknown): Jsonp3Match[];
};

export type Jsonp3FunctionRegister = Map<string, unknown>;

export function createJsonp3FunctionRegistry(): Jsonp3FunctionRegister {
	// json-p3 exposes a function register on JSONPathEnvironment. We use that Map
	// as the backing store for UI-Spec callable functions (no embedded strings).
	const env = new JSONPathEnvironment();
	// Make it explicit that UI-Spec controls what is registered.
	env.functionRegister.clear();
	return env.functionRegister as unknown as Map<string, unknown>;
}

export function createJsonp3Evaluator(): Jsonp3Evaluator {
	if (!jsonpath?.query) {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 jsonpath.query is missing',
		);
	}

	return {
		findAll(path: string, doc: unknown): Jsonp3Match[] {
			const nodes = jsonpath.query(path, doc as JSONValue);
			return nodes.nodes.map((node) => ({
				value: node.value,
				pointer: node.toPointer().toString(),
			}));
		},
	};
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/function-registry.ts`:

```ts
import type { Jsonp3FunctionRegister } from './jsonp3';
import { UISpecError } from './errors';

export type UISpecCallable = (ctx: unknown, ...args: unknown[]) => unknown;

export class FunctionRegistry {
	private readonly register: Jsonp3FunctionRegister;

	public constructor(register: Jsonp3FunctionRegister) {
		this.register = register;
	}

	public registerFunction(id: string, fn: UISpecCallable): void {
		this.register.set(id, fn);
	}

	public get(id: string): UISpecCallable | undefined {
		const value = this.register.get(id);
		return typeof value === 'function' ? (value as UISpecCallable) : undefined;
	}

	public call(id: string, ctx: unknown, ...args: unknown[]): unknown {
		const fn = this.get(id);
		if (!fn) {
			throw new UISpecError(
				'UI_SPEC_FUNCTION_NOT_FOUND',
				`UI-Spec function not found: ${id}`,
				{ id },
			);
		}
		return fn(ctx, ...args);
	}
}
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/jsonp3.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createJsonp3Evaluator } from './jsonp3';

describe('jsonp3 adapter', () => {
	it('findAll returns values + pointers', () => {
		const evalr = createJsonp3Evaluator();
		const doc = { a: { b: 1 }, arr: [10, 20] };

		const matches = evalr.findAll('$.a.b', doc);
		expect(matches).toEqual([{ value: 1, pointer: '/a/b' }]);

		const arrMatches = evalr.findAll('$.arr[*]', doc);
		expect(arrMatches.map((m) => m.pointer)).toEqual(['/arr/0', '/arr/1']);
	});
});
```

- [ ] Copy and paste the code below into `packages/ui-spec/core/src/function-registry.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';

describe('FunctionRegistry', () => {
	it('registers and calls functions', () => {
		const reg = new FunctionRegistry(createJsonp3FunctionRegistry());

		reg.registerFunction(
			'add',
			(_ctx, a: unknown, b: unknown) => Number(a) + Number(b),
		);

		expect(reg.call('add', {}, 1, 2)).toBe(3);
	});

	it('throws when function missing', () => {
		const reg = new FunctionRegistry(createJsonp3FunctionRegistry());
		expect(() => reg.call('missing', {}, 1)).toThrowError(
			/Function not found|UI-Spec function not found/i,
		);
	});
});
```

- [ ] Update `packages/ui-spec/core/src/index.ts` by replacing its contents with:

```ts
export * from './errors';
export * from './function-registry';
export * from './jsonp3';
export * from './schema';
export * from './types';
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @ui-spec/core test`

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(ui-spec-core): add json-p3 boundary + function registry

- Add json-p3 adapter boundary for JSONPath evaluation
- Add FunctionRegistry backed by json-p3 function register

completes: step 3 of 13 for ui-spec
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
