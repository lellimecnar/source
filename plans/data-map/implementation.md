# DataMap: High-Performance Reactive State Library

## Goal

Implement the DataMap workspace packages (`@data-map/*`) so deeply-nested state can be accessed/mutated via JSON Pointer keys with subscriptions, computed values, and optimized array helpers.

## Prerequisites

Make sure that the use is currently on the `master` branch before beginning implementation.
If not, move them to the correct branch.

### Repo Conventions (Verified)

- Workspaces already include `packages/data-map/*` in [pnpm-workspace.yaml](../../pnpm-workspace.yaml).
- Root Vitest workspace already includes `packages/data-map/*/vitest.config.ts` in [vitest.config.ts](../../vitest.config.ts).
- Package convention is Vite library mode + `vite-plugin-dts`, `tsgo --noEmit`, per-package `vitest.config.ts` that imports `vitestBaseConfig()`.

### Step-by-Step Instructions

#### Step 1: Workspace Setup & Foundation

- [ ] Create these directories:
  - [ ] `packages/data-map/signals`
  - [ ] `packages/data-map/storage`
  - [ ] `packages/data-map/subscriptions`
  - [ ] `packages/data-map/arrays`
  - [ ] `packages/data-map/path`
  - [ ] `packages/data-map/computed`
  - [ ] `packages/data-map/core`
  - [ ] `packages/data-map/benchmarks`

- [ ] Replace the contents of `pnpm-workspace.yaml` with the exact YAML below (this is idempotent and ensures `packages/data-map/*` is present):

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'packages/card-stack/*'
  - 'packages/ui-spec/*'
  - 'packages/data-map/*'
  - 'packages/jsonpath/*'
```

- [ ] Update root `package.json` scripts to add a convenience script for DataMap development.
- [ ] Copy and paste the JSON below into `package.json` (only the `scripts` field changes; everything else stays identical):

```json
{
	"name": "@lellimecnar/source",
	"version": "1.0.0",
	"private": true,
	"workspaces": [
		"packages/*",
		"packages/card-stack/*",
		"packages/ui-spec/*",
		"web/*",
		"mobile/*"
	],
	"scripts": {
		"analyze:miller.pub": "cd web/miller.pub && ANALYZE=true pnpm build",
		"analyze:readon.app": "cd web/readon.app && ANALYZE=true pnpm build",
		"build": "turbo build",
		"clean": "turbo clean; git clean -xdf node_modules .turbo .next .expo",
		"clean:hard": "pnpm clean && rm -rf pnpm-lock.yaml && pnpm install",
		"dev": "turbo dev",
		"format": "prettier --write \"**/*.{js,jsx,ts,tsx,md,json}\"",
		"graph": "pnpm list --depth=Infinity --json",
		"lint": "turbo lint",
		"miller.pub": "turbo run -F miller.pub",
		"outdated": "pnpm outdated --recursive",
		"prepare": "husky",
		"readon": "turbo run -F readon",
		"readon.app": "turbo run -F readon.app",
		"test": "turbo test",
		"test:coverage": "turbo test:coverage",
		"test:watch": "turbo test:watch",
		"type-check": "turbo type-check",
		"ui": "turbo run -F @lellimecnar/ui",
		"data-map": "turbo run -F @data-map/core",
		"update-interactive": "pnpm update --interactive --recursive --latest",
		"verify:exports": "node scripts/node/verify-dist-exports.mjs",
		"why": "pnpm why"
	},
	"lint-staged": {
		"*.{js,jsx,ts,tsx,mjs,cjs}": ["pnpm format"],
		"*.{json,md,yml,yaml}": ["prettier --write"]
	},
	"overrides": {
		"eslint": "^8",
		"react": "^19",
		"react-dom": "^19"
	},
	"dependencies": {
		"web-vitals": "^5.1.0"
	},
	"devDependencies": {
		"@changesets/cli": "^2.29.8",
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/prettier-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lhci/cli": "^0.15.1",
		"@types/node": "^24",
		"@typescript/native-preview": "7.0.0-dev.20251228.1",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"husky": "^9.1.7",
		"lint-staged": "^16.2.7",
		"prettier": "^3.4.2",
		"turbo": "^2.3.3",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	},
	"packageManager": "pnpm@9.12.2",
	"engines": {
		"node": "^24.12.0",
		"pnpm": "^9.12.2"
	}
}
```

##### Step 1 Verification Checklist

- [ ] Run `pnpm install` and confirm no workspace errors.
- [ ] Run `pnpm -w data-map build` and confirm Turbo recognizes the filter.

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(data-map): scaffold workspace folders and root scripts

- Add root convenience script for @data-map/core
- Ensure pnpm workspace globs include packages/data-map/*

completes: step 1 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Add External Dependency (mnemonist)

- [ ] Add `mnemonist` as a dependency to the packages that will import it (`@data-map/subscriptions`, `@data-map/path`).
- [ ] Create `packages/data-map/subscriptions/package.json` with the exact content below:

```json
{
	"name": "@data-map/subscriptions",
	"version": "0.1.0",
	"description": "DataMap subscription engine",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"mnemonist": "^0.39.0",
		"@jsonpath/jsonpath": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

- [ ] Create `packages/data-map/path/package.json` with the exact content below:

```json
{
	"name": "@data-map/path",
	"version": "0.1.0",
	"description": "DataMap JSONPath wrapper optimized for flat stores",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"mnemonist": "^0.39.0",
		"@jsonpath/jsonpath": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

##### Step 2 Verification Checklist

- [ ] Run `pnpm install`.
- [ ] Confirm pnpm can resolve mnemonist: `pnpm why mnemonist`.

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(data-map): add mnemonist dependency for indexing/caching

- Add mnemonist dependency to @data-map/subscriptions and @data-map/path

completes: step 2 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: @data-map/signals - Core Reactivity Primitives

- [ ] Create `packages/data-map/signals/package.json`:

```json
{
	"name": "@data-map/signals",
	"version": "0.1.0",
	"description": "Zero-dependency signal-based reactivity primitives for DataMap",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

- [ ] Create `packages/data-map/signals/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/signals/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/signals/src/types.ts`:

```ts
export type CleanupFn = () => void;

export type Subscriber<T> = (value: T) => void;

export type Unsubscribe = () => void;

export interface ReadonlySignal<T> {
	readonly value: T;
	subscribe(subscriber: Subscriber<T>): Unsubscribe;
}

export interface Signal<T> extends ReadonlySignal<T> {
	value: T;
}

export interface EffectHandle {
	dispose(): void;
}
```

- [ ] Create `packages/data-map/signals/src/context.ts`:

```ts
import type { DependencySource, Observer } from './internal.js';

const observerStack: Observer[] = [];

export function pushObserver(observer: Observer): void {
	observerStack.push(observer);
}

export function popObserver(): void {
	observerStack.pop();
}

export function currentObserver(): Observer | undefined {
	return observerStack[observerStack.length - 1];
}

export function trackRead(source: DependencySource): void {
	const obs = currentObserver();
	if (!obs) return;
	obs.onDependencyRead(source);
}
```

- [ ] Create `packages/data-map/signals/src/internal.ts`:

```ts
export interface DependencySource {
	addObserver(observer: Observer): void;
	removeObserver(observer: Observer): void;
}

export interface Observer {
	onDependencyRead(source: DependencySource): void;
	onDependencyChanged(): void;
}
```

- [ ] Create `packages/data-map/signals/src/batch.ts`:

```ts
import type { Observer } from './internal.js';

let batchDepth = 0;
const pending = new Set<Observer>();

export function batch<T>(fn: () => T): T {
	batchDepth++;
	try {
		return fn();
	} finally {
		batchDepth--;
		if (batchDepth === 0) {
			flush();
		}
	}
}

export function isBatching(): boolean {
	return batchDepth > 0;
}

export function queueObserver(observer: Observer): void {
	pending.add(observer);
}

function flush(): void {
	if (pending.size === 0) return;
	const toRun = Array.from(pending);
	pending.clear();
	for (const obs of toRun) obs.onDependencyChanged();
}
```

- [ ] Create `packages/data-map/signals/src/signal.ts`:

```ts
import { isBatching, queueObserver } from './batch.js';
import { trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Signal as SignalType, Subscriber, Unsubscribe } from './types.js';

class SignalImpl<T> implements SignalType<T>, DependencySource {
	private _value: T;
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	constructor(initial: T) {
		this._value = initial;
	}

	get value(): T {
		trackRead(this);
		return this._value;
	}

	set value(next: T) {
		if (Object.is(this._value, next)) return;
		this._value = next;
		this.notify();
	}

	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		this.observers.delete(observer);
	}

	private notify(): void {
		for (const sub of this.subscribers) sub(this._value);
		for (const obs of this.observers) {
			if (isBatching()) queueObserver(obs);
			else obs.onDependencyChanged();
		}
	}
}

export function signal<T>(initial: T): SignalType<T> {
	return new SignalImpl(initial);
}
```

- [ ] Create `packages/data-map/signals/src/computed.ts`:

```ts
import { isBatching, queueObserver } from './batch.js';
import { popObserver, pushObserver, trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { ReadonlySignal, Subscriber, Unsubscribe } from './types.js';

class ComputedImpl<T> implements ReadonlySignal<T>, DependencySource, Observer {
	private compute: () => T;
	private _value!: T;
	private dirty = true;

	private sources = new Set<DependencySource>();
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	constructor(compute: () => T) {
		this.compute = compute;
	}

	get value(): T {
		trackRead(this);
		if (this.dirty) this.recompute();
		return this._value;
	}

	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		this.observers.delete(observer);
	}

	onDependencyRead(source: DependencySource): void {
		if (this.sources.has(source)) return;
		this.sources.add(source);
		source.addObserver(this);
	}

	onDependencyChanged(): void {
		if (this.dirty) return;
		this.dirty = true;
		for (const obs of this.observers) {
			if (isBatching()) queueObserver(obs);
			else obs.onDependencyChanged();
		}
		for (const sub of this.subscribers) sub(this._value);
	}

	invalidate(): void {
		this.onDependencyChanged();
	}

	private recompute(): void {
		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();
		pushObserver(this);
		try {
			const next = this.compute();
			this._value = next;
			this.dirty = false;
		} finally {
			popObserver();
		}
	}
}

export function computed<T>(fn: () => T): ComputedImpl<T> {
	return new ComputedImpl(fn);
}
```

- [ ] Create `packages/data-map/signals/src/effect.ts`:

```ts
import { popObserver, pushObserver } from './context.js';
import type { CleanupFn, EffectHandle } from './types.js';
import type { DependencySource, Observer } from './internal.js';

class EffectImpl implements EffectHandle, Observer {
	private fn: () => void | CleanupFn;
	private sources = new Set<DependencySource>();
	private cleanup: CleanupFn | undefined;
	private disposed = false;

	constructor(fn: () => void | CleanupFn) {
		this.fn = fn;
		this.run();
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();
		this.cleanup?.();
		this.cleanup = undefined;
	}

	onDependencyRead(source: DependencySource): void {
		if (this.sources.has(source)) return;
		this.sources.add(source);
		source.addObserver(this);
	}

	onDependencyChanged(): void {
		if (this.disposed) return;
		this.run();
	}

	private run(): void {
		this.cleanup?.();
		this.cleanup = undefined;
		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();
		pushObserver(this);
		try {
			const res = this.fn();
			if (typeof res === 'function') this.cleanup = res;
		} finally {
			popObserver();
		}
	}
}

export function effect(fn: () => void | CleanupFn): EffectHandle {
	return new EffectImpl(fn);
}
```

- [ ] Create `packages/data-map/signals/src/index.ts`:

```ts
export type {
	CleanupFn,
	Subscriber,
	Unsubscribe,
	ReadonlySignal,
	Signal,
	EffectHandle,
} from './types.js';

export { signal } from './signal.js';
export { computed } from './computed.js';
export { effect } from './effect.js';
export { batch } from './batch.js';
```

- [ ] Create tests:

```ts
// packages/data-map/signals/src/__tests__/signals.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { batch, computed, effect, signal } from '../index.js';

describe('signals', () => {
	it('signal read/write and subscribe', () => {
		const s = signal(1);
		const seen: number[] = [];
		const unsub = s.subscribe((v) => seen.push(v));
		expect(s.value).toBe(1);
		s.value = 2;
		s.value = 3;
		unsub();
		s.value = 4;
		expect(seen).toEqual([2, 3]);
	});

	it('computed tracks dependencies lazily', () => {
		const a = signal(1);
		const b = signal(2);
		let runs = 0;
		const c = computed(() => {
			runs++;
			return a.value + b.value;
		});

		expect(runs).toBe(0);
		expect(c.value).toBe(3);
		expect(runs).toBe(1);

		a.value = 2;
		expect(runs).toBe(1);
		expect(c.value).toBe(4);
		expect(runs).toBe(2);
	});

	it('effect re-runs on dependency changes and runs cleanup', () => {
		const s = signal(0);
		const cleanup = vi.fn();
		const fn = vi.fn(() => {
			s.value;
			return cleanup;
		});
		const e = effect(fn);

		expect(fn).toHaveBeenCalledTimes(1);
		s.value = 1;
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledTimes(2);

		e.dispose();
		s.value = 2;
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('batch coalesces effect notifications', () => {
		const a = signal(1);
		const b = signal(2);
		const fn = vi.fn(() => {
			a.value;
			b.value;
		});
		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);
		batch(() => {
			a.value = 2;
			b.value = 3;
		});
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('diamond dependencies do not glitch (single recompute on read)', () => {
		const s = signal(1);
		let bRuns = 0;
		let cRuns = 0;
		let dRuns = 0;
		const b = computed(() => {
			bRuns++;
			return s.value + 1;
		});
		const c = computed(() => {
			cRuns++;
			return s.value + 2;
		});
		const d = computed(() => {
			dRuns++;
			return b.value + c.value;
		});

		expect(d.value).toBe(1 + 1 + 1 + 2);
		expect([bRuns, cRuns, dRuns]).toEqual([1, 1, 1]);

		s.value = 2;
		expect(d.value).toBe(2 + 1 + 2 + 2);
		expect([bRuns, cRuns, dRuns]).toEqual([2, 2, 2]);
	});
});
```

- [ ] Create `packages/data-map/signals/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

##### Step 3 Verification Checklist

- [ ] Run `pnpm --filter @data-map/signals test`.
- [ ] Run `pnpm --filter @data-map/signals type-check`.

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/signals reactivity primitives

- Implement signal/computed/effect/batch with dependency tracking
- Add unit tests for core reactive behaviors

completes: step 3 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: @data-map/storage - Flat Store Implementation

- [ ] Create `packages/data-map/storage/package.json`:

```json
{
	"name": "@data-map/storage",
	"version": "0.1.0",
	"description": "Flat pointer-keyed storage for DataMap",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/pointer": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

- [ ] Create `packages/data-map/storage/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/storage/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/storage/src/types.ts`:

```ts
export type Pointer = string;

export interface ArrayMetadata {
	length: number;
	indices: number[];
	freeSlots: number[];
	physicalPrefix: Pointer;
}

export interface FlatSnapshot {
	data: Map<Pointer, unknown>;
	versions: Map<Pointer, number>;
	arrays: Map<Pointer, ArrayMetadata>;
}
```

- [ ] Create `packages/data-map/storage/src/versioning.ts`:

```ts
import type { Pointer } from './types.js';

export function bumpVersion(
	versions: Map<Pointer, number>,
	pointer: Pointer,
): void {
	versions.set(pointer, (versions.get(pointer) ?? 0) + 1);
}
```

- [ ] Create `packages/data-map/storage/src/pointer-utils.ts`:

```ts
import { parse, compile } from '@jsonpath/pointer';

export function pointerToSegments(pointer: string): string[] {
	if (pointer === '') return [];
	return parse(pointer);
}

export function segmentsToPointer(segments: string[]): string {
	return compile(segments);
}

export function parentPointer(pointer: string): string {
	const segs = pointerToSegments(pointer);
	segs.pop();
	return segmentsToPointer(segs);
}
```

- [ ] Create `packages/data-map/storage/src/array-metadata.ts`:

```ts
import type { ArrayMetadata, Pointer } from './types.js';

export function ensureArrayMeta(
	arrays: Map<Pointer, ArrayMetadata>,
	pointer: Pointer,
): ArrayMetadata {
	let meta = arrays.get(pointer);
	if (!meta) {
		meta = {
			length: 0,
			indices: [],
			freeSlots: [],
			physicalPrefix: `${pointer}/_p`,
		};
		arrays.set(pointer, meta);
	}
	return meta;
}
```

- [ ] Create `packages/data-map/storage/src/nested-converter.ts`:

```ts
import type { Pointer } from './types.js';
import { ensureArrayMeta } from './array-metadata.js';

export function ingestNested(
	data: Map<Pointer, unknown>,
	versions: Map<Pointer, number>,
	arrays: Map<Pointer, any>,
	root: unknown,
	basePointer = '',
): void {
	if (Array.isArray(root)) {
		const meta = ensureArrayMeta(arrays, basePointer);
		meta.length = root.length;
		meta.indices = Array.from({ length: root.length }, (_, i) => i);
		for (let i = 0; i < root.length; i++) {
			ingestNested(data, versions, arrays, root[i], `${basePointer}/${i}`);
		}
		return;
	}

	if (root !== null && typeof root === 'object') {
		for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
			ingestNested(
				data,
				versions,
				arrays,
				v,
				`${basePointer}/${escapeSegment(k)}`,
			);
		}
		return;
	}

	data.set(basePointer, root);
	versions.set(basePointer, (versions.get(basePointer) ?? 0) + 1);
}

function escapeSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function materializeNested(data: Map<Pointer, unknown>): unknown {
	const root: any = {};
	for (const [ptr, value] of data.entries()) {
		if (ptr === '') continue;
		const segs = ptr.split('/').slice(1).map(unescapeSegment);
		let cur: any = root;
		for (let i = 0; i < segs.length; i++) {
			const s = segs[i];
			const isLast = i === segs.length - 1;
			const nextIsIndex = !isLast && isNumeric(segs[i + 1]);

			if (isLast) {
				if (isNumeric(s)) {
					if (!Array.isArray(cur)) cur = forceArray(cur);
					cur[Number(s)] = value;
				} else {
					cur[s] = value;
				}
				break;
			}

			if (isNumeric(s)) {
				if (!Array.isArray(cur)) cur = forceArray(cur);
				cur[Number(s)] ??= nextIsIndex ? [] : {};
				cur = cur[Number(s)];
			} else {
				cur[s] ??= nextIsIndex ? [] : {};
				cur = cur[s];
			}
		}
	}
	return root;
}

function unescapeSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}

function isNumeric(s: string): boolean {
	return /^\d+$/.test(s);
}

function forceArray(obj: any): any[] {
	// minimal helper: if this happens, object reconstruction has ambiguous structure
	return Array.isArray(obj) ? obj : [];
}
```

- [ ] Create `packages/data-map/storage/src/flat-store.ts`:

```ts
import type { ArrayMetadata, FlatSnapshot, Pointer } from './types.js';
import { bumpVersion } from './versioning.js';
import { ingestNested, materializeNested } from './nested-converter.js';

export class FlatStore {
	private data = new Map<Pointer, unknown>();
	private versions = new Map<Pointer, number>();
	private arrays = new Map<Pointer, ArrayMetadata>();

	constructor(initial?: unknown) {
		if (typeof initial !== 'undefined') {
			ingestNested(this.data, this.versions, this.arrays, initial, '');
		}
	}

	get(pointer: Pointer): unknown {
		return this.data.get(pointer);
	}

	has(pointer: Pointer): boolean {
		return this.data.has(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		this.data.set(pointer, value);
		bumpVersion(this.versions, pointer);
	}

	delete(pointer: Pointer): boolean {
		const existed = this.data.delete(pointer);
		if (existed) bumpVersion(this.versions, pointer);
		return existed;
	}

	version(pointer: Pointer): number {
		return this.versions.get(pointer) ?? 0;
	}

	snapshot(): FlatSnapshot {
		return {
			data: new Map(this.data),
			versions: new Map(this.versions),
			arrays: new Map(this.arrays),
		};
	}

	toObject(): unknown {
		return materializeNested(this.data);
	}

	ingest(root: unknown): void {
		ingestNested(this.data, this.versions, this.arrays, root, '');
	}
}
```

- [ ] Create `packages/data-map/storage/src/index.ts`:

```ts
export type { Pointer, ArrayMetadata, FlatSnapshot } from './types.js';
export { FlatStore } from './flat-store.js';
export {
	pointerToSegments,
	segmentsToPointer,
	parentPointer,
} from './pointer-utils.js';
```

- [ ] Create `packages/data-map/storage/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

- [ ] Create tests:

```ts
// packages/data-map/storage/src/__tests__/flat-store.spec.ts
import { describe, expect, it } from 'vitest';
import { FlatStore } from '../flat-store.js';

describe('FlatStore', () => {
	it('set/get/delete at depth', () => {
		const s = new FlatStore();
		s.set('/users/0/name', 'Alice');
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.has('/users/0/name')).toBe(true);
		expect(s.delete('/users/0/name')).toBe(true);
		expect(s.get('/users/0/name')).toBeUndefined();
	});

	it('ingest and toObject round-trip', () => {
		const s = new FlatStore({ users: [{ name: 'Alice' }, { name: 'Bob' }] });
		const obj = s.toObject() as any;
		expect(obj.users[0].name).toBe('Alice');
		expect(obj.users[1].name).toBe('Bob');
	});

	it('versions bump on changes', () => {
		const s = new FlatStore();
		expect(s.version('/x')).toBe(0);
		s.set('/x', 1);
		expect(s.version('/x')).toBe(1);
		s.set('/x', 2);
		expect(s.version('/x')).toBe(2);
		s.delete('/x');
		expect(s.version('/x')).toBe(3);
	});
});
```

##### Step 4 Verification Checklist

- [ ] Run `pnpm --filter @data-map/storage test`.
- [ ] Run `pnpm --filter @data-map/storage type-check`.

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/storage flat pointer store

- Implement FlatStore map-based storage with versioning
- Add nested ingest + materialize conversion

completes: step 4 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: @data-map/subscriptions - Subscription Engine

- [ ] Create `packages/data-map/subscriptions/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/subscriptions/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/subscriptions/src/types.ts`:

```ts
export type Pointer = string;

export type SubscriptionKind = 'exact' | 'pattern' | 'query';

export interface SubscriptionEvent {
	pointer: Pointer;
	value: unknown;
}

export type Unsubscribe = () => void;

export type Subscriber = (event: SubscriptionEvent) => void;

export interface Subscription {
	id: symbol;
	kind: SubscriptionKind;
	pattern: string;
	subscriber: Subscriber;
}

export interface CompiledPattern {
	pattern: string;
	kind: 'pattern' | 'query';
	matchesPointer(pointer: Pointer): boolean;
}
```

- [ ] Create `packages/data-map/subscriptions/src/notification-batcher.ts`:

```ts
import type { Subscription, SubscriptionEvent } from './types.js';

export class NotificationBatcher {
	private pending = new Map<
		symbol,
		{ sub: Subscription; event: SubscriptionEvent }
	>();
	private scheduled = false;

	queue(sub: Subscription, event: SubscriptionEvent): void {
		this.pending.set(sub.id, { sub, event });
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => this.flush());
	}

	flush(): void {
		this.scheduled = false;
		if (this.pending.size === 0) return;
		const items = Array.from(this.pending.values());
		this.pending.clear();
		for (const { sub, event } of items) sub.subscriber(event);
	}
}
```

- [ ] Create `packages/data-map/subscriptions/src/exact-index.ts`:

```ts
import { TrieMap } from 'mnemonist/trie-map';
import type { Pointer, Subscription } from './types.js';

function pointerSegments(pointer: Pointer): string[] {
	if (pointer === '') return [''];
	return pointer.split('/');
}

export class ExactIndex {
	private trie = new TrieMap<string, Set<Subscription>>();

	add(pointer: Pointer, sub: Subscription): void {
		const key = pointerSegments(pointer);
		const set = this.trie.get(key) ?? new Set<Subscription>();
		set.add(sub);
		this.trie.set(key, set);
	}

	delete(pointer: Pointer, sub: Subscription): void {
		const key = pointerSegments(pointer);
		const set = this.trie.get(key);
		if (!set) return;
		set.delete(sub);
		if (set.size === 0) this.trie.delete(key);
	}

	get(pointer: Pointer): Set<Subscription> {
		return this.trie.get(pointerSegments(pointer)) ?? new Set();
	}
}
```

- [ ] Create `packages/data-map/subscriptions/src/pattern-compiler.ts`:

```ts
import type { CompiledPattern, Pointer } from './types.js';
import { validateQuery } from '@jsonpath/jsonpath';

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compilePattern(path: string): CompiledPattern {
	// Ensure it's at least parseable JSONPath.
	const v = validateQuery(path);
	if (!v.valid) {
		throw new Error(v.error ?? 'Invalid JSONPath');
	}

	if (path.startsWith('$..')) {
		const tail = path.slice(3);
		const seg = tail.startsWith('.') ? tail.slice(1) : tail;
		const rx = new RegExp(`(^|/)${escapeRegex(seg)}$`);
		return {
			pattern: path,
			kind: 'pattern',
			matchesPointer(pointer: Pointer) {
				return rx.test(pointer);
			},
		};
	}

	// Minimal JSONPath pattern support:
	// - $.a.b
	// - $.a[*].b
	// - $.a.*.b
	let ptrish = path;
	ptrish = ptrish.replace(/^\$\.?/, '/');
	ptrish = ptrish.replaceAll('..', '/**/');
	ptrish = ptrish.replaceAll('[*]', '/*');
	ptrish = ptrish.replaceAll('.', '/');

	const parts = ptrish.split('/').filter(Boolean);
	const rxParts = parts.map((p) => {
		if (p === '*') return '[^/]+';
		if (p === '**') return '.*';
		return escapeRegex(p);
	});

	const rx = new RegExp(`^/${rxParts.join('/')}$`);
	return {
		pattern: path,
		kind: 'pattern',
		matchesPointer(pointer: Pointer) {
			return rx.test(pointer);
		},
	};
}
```

- [ ] Create `packages/data-map/subscriptions/src/pattern-index.ts`:

```ts
import type { CompiledPattern, Pointer, Subscription } from './types.js';
import { compilePattern } from './pattern-compiler.js';

export class PatternIndex {
	private patterns = new Map<
		symbol,
		{ compiled: CompiledPattern; sub: Subscription }
	>();

	add(sub: Subscription): void {
		const compiled = compilePattern(sub.pattern);
		this.patterns.set(sub.id, { compiled, sub });
	}

	delete(sub: Subscription): void {
		this.patterns.delete(sub.id);
	}

	match(pointer: Pointer): Subscription[] {
		const out: Subscription[] = [];
		for (const { compiled, sub } of this.patterns.values()) {
			if (compiled.matchesPointer(pointer)) out.push(sub);
		}
		return out;
	}
}
```

- [ ] Create `packages/data-map/subscriptions/src/subscription-engine.ts`:

```ts
import type {
	Pointer,
	Subscriber,
	Subscription,
	SubscriptionEvent,
	Unsubscribe,
} from './types.js';
import { ExactIndex } from './exact-index.js';
import { PatternIndex } from './pattern-index.js';
import { NotificationBatcher } from './notification-batcher.js';

export class SubscriptionEngine {
	private exact = new ExactIndex();
	private patterns = new PatternIndex();
	private batcher = new NotificationBatcher();

	subscribePointer(pointer: Pointer, subscriber: Subscriber): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'exact',
			pattern: pointer,
			subscriber,
		};
		this.exact.add(pointer, sub);
		return () => {
			this.exact.delete(pointer, sub);
		};
	}

	subscribePattern(pathPattern: string, subscriber: Subscriber): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'pattern',
			pattern: pathPattern,
			subscriber,
		};
		this.patterns.add(sub);
		return () => {
			this.patterns.delete(sub);
		};
	}

	notify(pointer: Pointer, value: unknown): void {
		const event: SubscriptionEvent = { pointer, value };
		for (const sub of this.exact.get(pointer)) this.batcher.queue(sub, event);
		for (const sub of this.patterns.match(pointer))
			this.batcher.queue(sub, event);
	}
}
```

- [ ] Create `packages/data-map/subscriptions/src/index.ts`:

```ts
export type {
	Pointer,
	SubscriptionEvent,
	Subscriber,
	Unsubscribe,
} from './types.js';
export { SubscriptionEngine } from './subscription-engine.js';
```

- [ ] Create `packages/data-map/subscriptions/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

- [ ] Create tests:

```ts
// packages/data-map/subscriptions/src/__tests__/subscriptions.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionEngine } from '../subscription-engine.js';

describe('SubscriptionEngine', () => {
	it('notifies exact pointer subscribers', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/a/b', fn);
		engine.notify('/a/b', 123);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual({ pointer: '/a/b', value: 123 });
	});

	it('matches wildcard patterns like $.users[*].name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$.users[*].name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/users/1/name', 'Bob');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('matches recursive descent like $..name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$..name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/org/name', 'ACME');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
```

##### Step 5 Verification Checklist

- [ ] Run `pnpm --filter @data-map/subscriptions test`.
- [ ] Run `pnpm --filter @data-map/subscriptions type-check`.

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/subscriptions engine

- Implement exact and pattern subscriptions with microtask batching
- Add tests for wildcard and recursive descent patterns

completes: step 5 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: @data-map/arrays - Optimized Array Operations

- [ ] Create `packages/data-map/arrays/package.json`:

```json
{
	"name": "@data-map/arrays",
	"version": "0.1.0",
	"description": "Optimized array operations for DataMap",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/storage": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

- [ ] Create `packages/data-map/arrays/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/arrays/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/arrays/src/types.ts`:

```ts
export interface IndirectionState {
	logicalToPhysical: number[];
	freeSlots: number[];
}
```

- [ ] Create `packages/data-map/arrays/src/indirection-layer.ts`:

```ts
import type { IndirectionState } from './types.js';

export class IndirectionLayer {
	private state: IndirectionState;

	constructor(initialLength = 0) {
		this.state = {
			logicalToPhysical: Array.from({ length: initialLength }, (_, i) => i),
			freeSlots: [],
		};
	}

	get length(): number {
		return this.state.logicalToPhysical.length;
	}

	getPhysical(logicalIndex: number): number {
		return this.state.logicalToPhysical[logicalIndex];
	}

	pushPhysical(): number {
		const reused = this.state.freeSlots.pop();
		const physical =
			typeof reused === 'number' ? reused : this.nextPhysicalIndex();
		this.state.logicalToPhysical.push(physical);
		return physical;
	}

	insertAt(logicalIndex: number): number {
		const reused = this.state.freeSlots.pop();
		const physical =
			typeof reused === 'number' ? reused : this.nextPhysicalIndex();
		this.state.logicalToPhysical.splice(logicalIndex, 0, physical);
		return physical;
	}

	removeAt(logicalIndex: number): number {
		const [physical] = this.state.logicalToPhysical.splice(logicalIndex, 1);
		this.state.freeSlots.push(physical);
		return physical;
	}

	private nextPhysicalIndex(): number {
		const used = new Set(this.state.logicalToPhysical);
		let i = 0;
		while (used.has(i)) i++;
		return i;
	}
}
```

- [ ] Create `packages/data-map/arrays/src/gap-buffer.ts`:

```ts
export class GapBuffer<T> {
	private buf: (T | undefined)[];
	private gapStart: number;
	private gapEnd: number;

	constructor(initialCapacity = 16) {
		this.buf = new Array(initialCapacity);
		this.gapStart = 0;
		this.gapEnd = initialCapacity;
	}

	get length(): number {
		return this.buf.length - (this.gapEnd - this.gapStart);
	}

	insert(position: number, value: T): void {
		this.moveGap(position);
		if (this.gapStart === this.gapEnd) this.grow();
		this.buf[this.gapStart] = value;
		this.gapStart++;
	}

	delete(position: number): void {
		this.moveGap(position);
		if (this.gapEnd < this.buf.length) {
			this.buf[this.gapEnd] = undefined;
			this.gapEnd++;
		}
	}

	toArray(): T[] {
		const out: T[] = [];
		for (let i = 0; i < this.buf.length; i++) {
			if (i >= this.gapStart && i < this.gapEnd) continue;
			const v = this.buf[i];
			if (typeof v !== 'undefined') out.push(v);
		}
		return out;
	}

	private moveGap(position: number): void {
		position = Math.max(0, Math.min(position, this.length));
		while (this.gapStart > position) {
			this.gapStart--;
			this.gapEnd--;
			this.buf[this.gapEnd] = this.buf[this.gapStart];
			this.buf[this.gapStart] = undefined;
		}
		while (this.gapStart < position) {
			this.buf[this.gapStart] = this.buf[this.gapEnd];
			this.buf[this.gapEnd] = undefined;
			this.gapStart++;
			this.gapEnd++;
		}
	}

	private grow(): void {
		const old = this.buf;
		const newCap = old.length * 2;
		const next = new Array<T | undefined>(newCap);

		const left = this.gapStart;
		for (let i = 0; i < left; i++) next[i] = old[i];

		const rightLen = old.length - this.gapEnd;
		const newGapEnd = newCap - rightLen;
		for (let i = 0; i < rightLen; i++)
			next[newGapEnd + i] = old[this.gapEnd + i];

		this.buf = next;
		this.gapEnd = newGapEnd;
	}
}
```

- [ ] Create `packages/data-map/arrays/src/persistent-vector.ts`:

```ts
export class PersistentVector<T> {
	private data: readonly T[];

	constructor(data: readonly T[] = []) {
		this.data = data;
	}

	get length(): number {
		return this.data.length;
	}

	get(index: number): T {
		return this.data[index];
	}

	push(value: T): PersistentVector<T> {
		return new PersistentVector([...this.data, value]);
	}

	set(index: number, value: T): PersistentVector<T> {
		const next = this.data.slice();
		(next as T[])[index] = value;
		return new PersistentVector(next);
	}

	slice(start: number, end?: number): PersistentVector<T> {
		return new PersistentVector(this.data.slice(start, end));
	}

	toArray(): T[] {
		return [...this.data];
	}
}
```

- [ ] Create `packages/data-map/arrays/src/array-operations.ts`:

```ts
import { FlatStore } from '@data-map/storage';
import { IndirectionLayer } from './indirection-layer.js';

export class SmartArray {
	private store: FlatStore;
	private pointer: string;
	private indirection: IndirectionLayer;

	constructor(store: FlatStore, pointer: string) {
		this.store = store;
		this.pointer = pointer;
		this.indirection = new IndirectionLayer(0);
	}

	push(value: unknown): void {
		const physical = this.indirection.pushPhysical();
		this.store.set(`${this.pointer}/_p/${physical}`, value);
		this.store.set(`${this.pointer}/${this.indirection.length - 1}`, value);
	}

	get(index: number): unknown {
		return this.store.get(`${this.pointer}/${index}`);
	}

	splice(index: number, deleteCount: number, ...items: unknown[]): void {
		for (let i = 0; i < deleteCount; i++) {
			this.indirection.removeAt(index);
		}
		for (let i = 0; i < items.length; i++) {
			this.indirection.insertAt(index + i);
		}

		// Rewrite logical projection (keeps physical slots stable; logical pointers updated)
		for (let i = 0; i < this.indirection.length; i++) {
			const phys = this.indirection.getPhysical(i);
			const v = this.store.get(`${this.pointer}/_p/${phys}`);
			this.store.set(`${this.pointer}/${i}`, v);
		}
	}
}
```

- [ ] Create `packages/data-map/arrays/src/smart-array.ts`:

```ts
export { SmartArray } from './array-operations.js';
```

- [ ] Create `packages/data-map/arrays/src/index.ts`:

```ts
export type { IndirectionState } from './types.js';
export { IndirectionLayer } from './indirection-layer.js';
export { GapBuffer } from './gap-buffer.js';
export { PersistentVector } from './persistent-vector.js';
export { SmartArray } from './smart-array.js';
```

- [ ] Create `packages/data-map/arrays/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

- [ ] Create tests:

```ts
// packages/data-map/arrays/src/__tests__/arrays.spec.ts
import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';
import { SmartArray } from '../smart-array.js';

describe('SmartArray', () => {
	it('push/get', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/users');
		arr.push('A');
		arr.push('B');
		expect(arr.get(0)).toBe('A');
		expect(arr.get(1)).toBe('B');
	});

	it('splice maintains logical view', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/items');
		arr.push('A');
		arr.push('B');
		arr.push('C');
		arr.splice(1, 1, 'X');
		expect(arr.get(0)).toBe('A');
		expect(arr.get(1)).toBe('X');
		expect(arr.get(2)).toBe('C');
	});
});
```

##### Step 6 Verification Checklist

- [ ] Run `pnpm --filter @data-map/arrays test`.
- [ ] Run `pnpm --filter @data-map/arrays type-check`.

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/arrays optimized structures

- Implement IndirectionLayer + SmartArray helper
- Add GapBuffer and PersistentVector utilities with tests

completes: step 6 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 7: @data-map/path - JSON Path Wrapper

- [ ] Create `packages/data-map/path/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/path/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/path/src/types.ts`:

```ts
export type Pointer = string;

export interface QueryResult {
	values: unknown[];
	pointers: Pointer[];
}
```

- [ ] Create `packages/data-map/path/src/cache.ts`:

```ts
import LRUCache from 'mnemonist/lru-cache';

export class QueryCache<T> {
	private cache: LRUCache<string, T>;

	constructor(maxSize = 500) {
		this.cache = new LRUCache<string, T>(maxSize);
	}

	get(key: string): T | undefined {
		return this.cache.get(key);
	}

	set(key: string, value: T): void {
		this.cache.set(key, value);
	}
}
```

- [ ] Create `packages/data-map/path/src/compiler.ts`:

```ts
import { compileQuery, type CompiledQuery } from '@jsonpath/jsonpath';
import { QueryCache } from './cache.js';

const cache = new QueryCache<CompiledQuery>(500);

export function compile(path: string): CompiledQuery {
	const hit = cache.get(path);
	if (hit) return hit;
	const compiled = compileQuery(path);
	cache.set(path, compiled);
	return compiled;
}
```

- [ ] Create `packages/data-map/path/src/query.ts`:

```ts
import type { FlatStore } from '@data-map/storage';
import { query as runQuery } from '@jsonpath/jsonpath';
import type { QueryResult } from './types.js';

export function queryFlat(store: FlatStore, path: string): QueryResult {
	const root = store.toObject();
	const res = runQuery(root, path);
	return {
		values: res.values(),
		pointers: res.pointers().map((p) => p.toString()),
	};
}
```

- [ ] Create `packages/data-map/path/src/pointer-bridge.ts`:

```ts
import type { Pointer } from './types.js';

export function pointerToJsonPath(pointer: Pointer): string {
	if (pointer === '') return '$';
	return (
		'$' +
		pointer
			.split('/')
			.slice(1)
			.map((s) => `.${unescapeSegment(s)}`)
			.join('')
	);
}

function unescapeSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}
```

- [ ] Create `packages/data-map/path/src/index.ts`:

```ts
export type { Pointer, QueryResult } from './types.js';
export { compile } from './compiler.js';
export { queryFlat } from './query.js';
export { pointerToJsonPath } from './pointer-bridge.js';
```

- [ ] Create `packages/data-map/path/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

- [ ] Create tests:

```ts
// packages/data-map/path/src/__tests__/path.spec.ts
import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';
import { queryFlat } from '../query.js';

describe('@data-map/path', () => {
	it('queries against FlatStore via nested materialization', () => {
		const store = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const res = queryFlat(store, '$.users[*].name');
		expect(res.values).toEqual(['Alice', 'Bob']);
		expect(res.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});
});
```

##### Step 7 Verification Checklist

- [ ] Run `pnpm --filter @data-map/path test`.
- [ ] Run `pnpm --filter @data-map/path type-check`.

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/path JSONPath wrapper

- Add compiled query cache and flat-store query execution
- Add tests for wildcard query pointers

completes: step 7 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 8: @data-map/computed - Pointer-Based Computed Values

- [ ] Create `packages/data-map/computed/package.json`:

```json
{
	"name": "@data-map/computed",
	"version": "0.1.0",
	"description": "Computed helpers integrated with DataMap pointers and queries",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/signals": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

- [ ] Create `packages/data-map/computed/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/computed/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/computed/src/types.ts`:

```ts
export type Pointer = string;

export interface DataMapComputeHost {
	get(pointer: Pointer): unknown;
	subscribePointer(pointer: Pointer, cb: () => void): () => void;
	queryPointers(path: string): Pointer[];
	subscribePattern(path: string, cb: () => void): () => void;
}
```

- [ ] Create `packages/data-map/computed/src/dependency-tracker.ts`:

```ts
import type { DataMapComputeHost, Pointer } from './types.js';

export class DependencyTracker {
	private host: DataMapComputeHost;
	private unsubs: Array<() => void> = [];

	constructor(host: DataMapComputeHost) {
		this.host = host;
	}

	trackPointers(pointers: Pointer[], onInvalidate: () => void): void {
		this.dispose();
		for (const p of pointers) {
			this.unsubs.push(this.host.subscribePointer(p, onInvalidate));
		}
	}

	trackQuery(path: string, onInvalidate: () => void): void {
		this.dispose();
		const pointers = this.host.queryPointers(path);
		this.trackPointers(pointers, onInvalidate);
		this.unsubs.push(this.host.subscribePattern(path, onInvalidate));
	}

	dispose(): void {
		for (const u of this.unsubs) u();
		this.unsubs = [];
	}
}
```

- [ ] Create `packages/data-map/computed/src/pointer-computed.ts`:

```ts
import { computed } from '@data-map/signals';
import type { DataMapComputeHost, Pointer } from './types.js';
import { DependencyTracker } from './dependency-tracker.js';

export function pointerComputed<T = unknown>(
	host: DataMapComputeHost,
	pointer: Pointer,
) {
	const tracker = new DependencyTracker(host);
	const c = computed(() => host.get(pointer) as T);
	tracker.trackPointers([pointer], () => c.invalidate());
	return {
		computed: c,
		dispose: () => tracker.dispose(),
	};
}
```

- [ ] Create `packages/data-map/computed/src/query-computed.ts`:

```ts
import { computed } from '@data-map/signals';
import type { DataMapComputeHost } from './types.js';
import { DependencyTracker } from './dependency-tracker.js';

export function queryComputed<T = unknown>(
	host: DataMapComputeHost,
	path: string,
) {
	const tracker = new DependencyTracker(host);
	const c = computed(() => {
		const pointers = host.queryPointers(path);
		return pointers.map((p) => host.get(p)) as T;
	});
	tracker.trackQuery(path, () => c.invalidate());
	return {
		computed: c,
		dispose: () => tracker.dispose(),
	};
}
```

- [ ] Create `packages/data-map/computed/src/index.ts`:

```ts
export type { Pointer, DataMapComputeHost } from './types.js';
export { DependencyTracker } from './dependency-tracker.js';
export { pointerComputed } from './pointer-computed.js';
export { queryComputed } from './query-computed.js';
```

- [ ] Create `packages/data-map/computed/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

- [ ] Create tests:

```ts
// packages/data-map/computed/src/__tests__/computed.spec.ts
import { describe, expect, it } from 'vitest';
import { pointerComputed } from '../pointer-computed.js';

describe('@data-map/computed', () => {
	it('pointerComputed invalidates on dependency callback', () => {
		let value = 1;
		let invalidate: (() => void) | undefined;
		const host = {
			get: () => value,
			subscribePointer: (_p: string, cb: () => void) => {
				invalidate = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const { computed } = pointerComputed<number>(host, '/x');
		expect(computed.value).toBe(1);
		value = 2;
		invalidate?.();
		expect(computed.value).toBe(2);
	});
});
```

##### Step 8 Verification Checklist

- [ ] Run `pnpm --filter @data-map/computed test`.
- [ ] Run `pnpm --filter @data-map/computed type-check`.

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/computed helpers

- Implement pointerComputed and queryComputed integrations
- Add dependency tracker and unit tests

completes: step 8 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 9: @data-map/core - Integration Facade

- [ ] Create `packages/data-map/core/package.json`:

```json
{
	"name": "@data-map/core",
	"version": "0.1.0",
	"description": "DataMap core facade",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/signals": "workspace:*",
		"@data-map/storage": "workspace:*",
		"@data-map/subscriptions": "workspace:*",
		"@data-map/path": "workspace:*",
		"@data-map/computed": "workspace:*",
		"@data-map/arrays": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
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

- [ ] Create `packages/data-map/core/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/data-map/core/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

- [ ] Create `packages/data-map/core/src/types.ts`:

```ts
export type Pointer = string;

export type Unsubscribe = () => void;

export interface SubscribeEvent {
	pointer: Pointer;
	value: unknown;
}
```

- [ ] Create `packages/data-map/core/src/data-map.ts`:

```ts
import { batch } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { queryFlat } from '@data-map/path';
import { pointerComputed, queryComputed } from '@data-map/computed';
import type { Pointer, SubscribeEvent, Unsubscribe } from './types.js';

export class DataMap<T = unknown> {
	private store: FlatStore;
	private subs: SubscriptionEngine;

	constructor(initial?: T) {
		this.store = new FlatStore(initial);
		this.subs = new SubscriptionEngine();
	}

	get(pointer: Pointer): unknown {
		return this.store.get(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		this.store.set(pointer, value);
		this.subs.notify(pointer, value);
	}

	delete(pointer: Pointer): boolean {
		const existed = this.store.delete(pointer);
		if (existed) this.subs.notify(pointer, undefined);
		return existed;
	}

	subscribe(
		pointer: Pointer,
		cb: (event: SubscribeEvent) => void,
	): Unsubscribe {
		return this.subs.subscribePointer(pointer, cb);
	}

	subscribePattern(
		path: string,
		cb: (event: SubscribeEvent) => void,
	): Unsubscribe {
		return this.subs.subscribePattern(path, cb);
	}

	query(path: string): { values: unknown[]; pointers: string[] } {
		return queryFlat(this.store, path);
	}

	queryPointers(path: string): string[] {
		return this.query(path).pointers;
	}

	computedPointer<V = unknown>(pointer: Pointer) {
		return pointerComputed<V>(
			{
				get: (p) => this.get(p),
				subscribePointer: (p, cb) => this.subscribe(p, () => cb()),
				queryPointers: (p) => this.queryPointers(p),
				subscribePattern: (p, cb) => this.subscribePattern(p, () => cb()),
			},
			pointer,
		);
	}

	computedQuery<V = unknown>(path: string) {
		return queryComputed<V>(
			{
				get: (p) => this.get(p),
				subscribePointer: (p, cb) => this.subscribe(p, () => cb()),
				queryPointers: (p) => this.queryPointers(p),
				subscribePattern: (p, cb) => this.subscribePattern(p, () => cb()),
			},
			path,
		);
	}

	batch(fn: () => void): void {
		batch(fn);
	}

	snapshot(): Map<string, unknown> {
		return this.store.snapshot().data;
	}

	toObject(): unknown {
		return this.store.toObject();
	}
}
```

- [ ] Create `packages/data-map/core/src/create.ts`:

```ts
import { DataMap } from './data-map.js';

export function createDataMap<T>(initial: T): DataMap<T> {
	return new DataMap(initial);
}
```

- [ ] Create `packages/data-map/core/src/index.ts`:

```ts
export type { Pointer, SubscribeEvent, Unsubscribe } from './types.js';
export { DataMap } from './data-map.js';
export { createDataMap } from './create.js';
```

- [ ] Create `packages/data-map/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

- [ ] Create tests:

```ts
// packages/data-map/core/src/__tests__/core.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { createDataMap } from '../create.js';

describe('@data-map/core', () => {
	it('get/set via pointers', () => {
		const store = createDataMap({ users: [{ name: 'Alice' }] });
		store.set('/users/0/name', 'Bob');
		expect(store.get('/users/0/name')).toBe('Bob');
	});

	it('subscribe to pointer', async () => {
		const store = createDataMap({});
		const fn = vi.fn();
		store.subscribe('/x', fn);
		store.set('/x', 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('computedPointer updates after mutation', () => {
		const store = createDataMap({});
		store.set('/x', 1);
		const { computed } = store.computedPointer<number>('/x');
		expect(computed.value).toBe(1);
		store.set('/x', 2);
		computed.invalidate();
		expect(computed.value).toBe(2);
	});

	it('query returns pointers', () => {
		const store = createDataMap({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const res = store.query('$.users[*].name');
		expect(res.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});
});
```

##### Step 9 Verification Checklist

- [ ] Run `pnpm --filter @data-map/core test`.
- [ ] Run `pnpm --filter @data-map/core type-check`.

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(data-map): add @data-map/core facade

- Compose FlatStore + subscriptions + JSONPath wrapper
- Add computed helpers and core API tests

completes: step 9 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 10: @data-map/benchmarks - Performance Suite

- [ ] Create `packages/data-map/benchmarks/package.json`:

```json
{
	"name": "@data-map/benchmarks",
	"version": "0.1.0",
	"description": "DataMap performance benchmarks",
	"license": "MIT",
	"private": true,
	"type": "module",
	"scripts": {
		"build": "vite build",
		"bench": "node -e \"console.log('benchmarks placeholder package: add runners in later step')\"",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@data-map/core": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@types/node": "^24",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3"
	}
}
```

- [ ] Create `packages/data-map/benchmarks/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist"],
}
```

- [ ] Create `packages/data-map/benchmarks/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
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
			tsconfigPaths(),
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

##### Step 10 Verification Checklist

- [ ] Run `pnpm --filter @data-map/benchmarks type-check`.
- [ ] Run `pnpm --filter @data-map/core test` as a smoke baseline.

#### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(data-map): add benchmarks package scaffolding

- Add @data-map/benchmarks workspace package

completes: step 10 of 10 for DataMap
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
