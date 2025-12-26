# Polymix Implementation

## Goal
Implement the `polymix` library for advanced TypeScript mixins, providing a robust, type-safe solution with `instanceof` support, method composition strategies, optional decorator-metadata inheritance, and decorator helpers.

## Status Note (as audited)
This document is an “implementation script” with copy/paste snippets. The repository already contains these changes; treat `packages/polymix/*` as the source of truth if any snippet here drifts from the actual code.

## Prerequisites
Make sure that the user is currently on the `feat/polymix-implementation` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from main.

### Step-by-Step Instructions

#### Step 1: Scaffold Package Structure
- [x] Create package directory and configuration files.
- [x] Copy and paste code below into `packages/polymix/package.json`:

```json
{
	"name": "polymix",
	"version": "0.0.1",
	"description": "Next-generation TypeScript mixins with native instanceof support and composition strategies.",
	"license": "MIT",
	"author": "James Miller <lellimecnar@gmail.com>",
	"homepage": "https://github.com/lellimecnar/source/tree/master/packages/polymix#readme",
	"repository": {
		"type": "git",
		"url": "https://github.com/lellimecnar/source.git",
		"directory": "packages/polymix"
	},
	"bugs": {
		"url": "https://github.com/lellimecnar/source/issues"
	},
	"keywords": [
		"typescript",
		"mixins",
		"multiple-inheritance",
		"decorators",
		"composition"
	],
	"sideEffects": false,
	"files": [
		"dist"
	],
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"require": "./dist/index.js",
			"default": "./dist/index.js"
		}
	},
	"publishConfig": {
		"access": "public"
	},
	"scripts": {
		"clean": "node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
		"build": "pnpm run clean && tsc -p tsconfig.build.json",
		"dev": "tsc -p tsconfig.build.json --watch",
		"test": "jest",
		"lint": "eslint .",
		"type-check": "tsc --noEmit",
		"prepack": "pnpm run build"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/jest-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"typescript": "~5.5",
		"eslint": "^8.57.1",
		"jest": "^29.0.0",
		"ts-jest": "^29.0.0",
		"reflect-metadata": "^0.2.2"
	},
	"peerDependencies": {
		"reflect-metadata": "^0.1.13 || ^0.2.0"
	},
	"peerDependenciesMeta": {
		"reflect-metadata": {
			"optional": true
		}
	}
}
```

- [x] Copy and paste code below into `packages/polymix/tsconfig.json`:

```json
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"noEmit": false,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
		"emitDecoratorMetadata": true,
		"experimentalDecorators": true
	},
	"include": [
		"src/**/*"
	],
	"exclude": [
		"dist",
		"node_modules"
	]
}
```

- [x] Copy and paste code below into `packages/polymix/tsconfig.build.json`:

```json
{
	"extends": "./tsconfig.json",
	"include": [
		"src/**/*"
	],
	"exclude": [
		"dist",
		"node_modules",
		"src/**/*.spec.ts",
		"src/**/__tests__/**",
		"src/**/__mocks__/**"
	]
}
```

- [x] Copy and paste code below into `packages/polymix/.eslintrc.js`:

```javascript
module.exports = {
	extends: ['@lellimecnar/eslint-config'],
	ignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
};
```

- [x] Copy and paste code below into `packages/polymix/jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
	watchman: false,
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
```

- [x] Note: this Jest config does not auto-import `reflect-metadata`. If you rely on reflect-metadata (optional), import `reflect-metadata` once in your runtime entrypoint or test setup.

- [x] Create source directory and index file.
- [x] Copy and paste code below into `packages/polymix/src/index.ts`:

```typescript
export * from './types';
export * from './utils';
export * from './strategies';
export * from './core';
export * from './decorators';
```

##### Step 1 Verification Checklist
- [x] Run `pnpm install` to link the new workspace.
- [x] Run `pnpm --filter polymix build` to verify configuration validity.

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Implement Core Types and Utilities
- [x] Create `src/types.ts` with core type definitions.
- [x] Copy and paste code below into `packages/polymix/src/types.ts`:

```typescript
export type Constructor<T = object> = new (...args: any[]) => T;
export type AbstractConstructor<T = object> = abstract new (
	...args: any[]
) => T;
export type AnyConstructor<T = object> =
	| Constructor<T>
	| AbstractConstructor<T>;

// Merge instance types from all mixins (variadic - no limit!)
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

export type MixedInstance<T extends AnyConstructor[]> = UnionToIntersection<
	InstanceType<T[number]>
>;

export type MixedStatic<T extends AnyConstructor[]> = UnionToIntersection<T[number]>;

export type MixedClass<T extends AnyConstructor[]> = Constructor<MixedInstance<T>> &
	Omit<MixedStatic<T>, 'prototype'>;

export interface MixinMetadata {
	isAbstract: boolean;
	strategies: Map<string | symbol, any>;
	decoratorMetadata: Map<string | symbol, any[]>;
}
```

- [x] Create `src/utils.ts` with utility functions.
- [x] Copy and paste code below into `packages/polymix/src/utils.ts`:

```typescript
import {
	type AnyConstructor,
	type Constructor,
	type MixinMetadata,
} from './types';

export const MIXIN_REGISTRY = new WeakMap<object, Set<AnyConstructor>>();
export const MIXIN_METADATA = new WeakMap<AnyConstructor, MixinMetadata>();

export function getMixinRegistry(
	instance: object,
): Set<AnyConstructor> | undefined {
	return MIXIN_REGISTRY.get(instance);
}

export function registerMixins(
	instance: object,
	mixins: AnyConstructor[],
): void {
	const set = MIXIN_REGISTRY.get(instance) ?? new Set();
	mixins.forEach((m) => set.add(m));
	MIXIN_REGISTRY.set(instance, set);
}

export function installInstanceCheck(Mixin: AnyConstructor): void {
	if (Object.hasOwn(Mixin, Symbol.hasInstance)) return;

	Object.defineProperty(Mixin, Symbol.hasInstance, {
		value(instance: unknown): boolean {
			if (!instance || typeof instance !== 'object') return false;

			// Check registry first (for mixed instances)
			const registry = getMixinRegistry(instance);
			if (registry?.has(Mixin)) return true;

			// Fall back to prototype check (for direct instances)
			return Object.prototype.isPrototypeOf.call(Mixin.prototype, instance);
		},
		writable: true,
		configurable: true,
	});
}

export function copyDecoratorMetadata(
	mixins: AnyConstructor[],
	target: Function,
): void {
	// Symbol.metadata (TypeScript 5.2+)
	if (Symbol.metadata) {
		const mergedMetadata: Record<string | symbol, any> = {};

		for (const Mixin of mixins) {
			const meta = (Mixin as any)[Symbol.metadata];
			if (meta) {
				Object.assign(mergedMetadata, meta);
			}
		}

		Object.defineProperty(target, Symbol.metadata, {
			value: mergedMetadata,
			writable: true,
			configurable: true,
		});
	}

	// reflect-metadata support (legacy)
	if (typeof Reflect !== 'undefined' && 'getMetadataKeys' in Reflect) {
		for (const Mixin of mixins) {
			// Class-level metadata
			const classKeys = (Reflect as any).getMetadataKeys(Mixin);
			for (const key of classKeys) {
				const value = (Reflect as any).getMetadata(key, Mixin);
				(Reflect as any).defineMetadata(key, value, target);
			}

			// Property-level metadata - we need to discover which properties have metadata
			// This is tricky because properties declared with decorators but not initialized
			// won't appear in getOwnPropertyNames. However, TypeScript emits design-time
			// metadata that we can use to discover decorated properties.

			// Collect all possible property keys
			const allPropKeys = new Set<string | symbol>();

			// 1. Get all own property names and symbols from prototype
			for (const propKey of Object.getOwnPropertyNames(Mixin.prototype)) {
				allPropKeys.add(propKey);
			}
			for (const propKey of Object.getOwnPropertySymbols(Mixin.prototype)) {
				allPropKeys.add(propKey);
			}

			// 2. Try to discover properties that have design-time metadata
			// TypeScript emits 'design:type', 'design:paramtypes', 'design:returntype'
			// We can check if the prototype has these metadata keys

			// For each metadata key on the prototype level, extract property names
			// Unfortunately, getMetadataKeys at prototype level doesn't help us discover
			// property-specific metadata keys. We need a different approach.

			// 3. As a fallback, try creating an instance to discover instance properties
			try {
				// Use new Mixin() instead of Object.create() to ensure fields are initialized
				// We pass no arguments, which might fail if the constructor requires them,
				// hence the try/catch block is essential.
				const instance = new (Mixin as Constructor)();
				for (const propKey of Object.getOwnPropertyNames(instance)) {
					allPropKeys.add(propKey);
				}
			} catch {
				// Ignore errors if instantiation fails
			}

			// Now iterate over all discovered keys and copy metadata
			for (const propKey of allPropKeys) {
				const metadataKeys = (Reflect as any).getMetadataKeys(
					Mixin.prototype,
					propKey,
				);
				for (const key of metadataKeys) {
					const value = (Reflect as any).getMetadata(
						key,
						Mixin.prototype,
						propKey,
					);
					(Reflect as any).defineMetadata(
						key,
						value,
						target.prototype,
						propKey,
					);
				}
			}
		}
	}
}

export function from<T extends AnyConstructor>(
	instance: any,
	Mixin: T,
): InstanceType<T> {
	// Create a proxy that binds all method calls to the specific mixin's implementation
	return new Proxy(instance, {
		get(target, prop) {
			if (prop in Mixin.prototype) {
				const value = (Mixin.prototype as any)[prop];
				if (typeof value === 'function') {
					return value.bind(target);
				}
				return value;
			}
			return (target as any)[prop];
		},
	}) as InstanceType<T>;
}

export function hasMixin<T extends AnyConstructor>(
	instance: unknown,
	Mixin: T,
): instance is InstanceType<T> {
	return instance instanceof Mixin;
}

export class EmptyMixin {
	// Intentionally empty - used as placeholder for disabled mixins
}

export function when<T extends AnyConstructor>(
	condition: boolean,
	Mixin: T,
): T | typeof EmptyMixin {
	return condition ? Mixin : EmptyMixin;
}
```

##### Step 2 Verification Checklist
- [x] Run `pnpm --filter polymix build` to ensure types and utils compile correctly.
- [x] Run `pnpm --filter polymix test` to ensure types and utils behave as expected.

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: Implement Composition Strategies
- [x] Create `src/strategies.ts` with composition strategy logic.
- [x] Copy and paste code below into `packages/polymix/src/strategies.ts`:

```typescript
/**
 * Applies a composition strategy to a set of functions.
 *
 * @param strategy - The name of the strategy to apply.
 * @param fns - The array of functions to compose.
 * @param context - The `this` context for the functions.
 * @param args - The initial arguments.
 * @returns The result of the composition.
 */
export type CompositionStrategy =
	| 'override'
	| 'pipe'
	| 'compose'
	| 'parallel'
	| 'race'
	| 'merge'
	| 'first'
	| 'all'
	| 'any';

export const strategies = {
	override: 'override' as const,
	pipe: 'pipe' as const,
	compose: 'compose' as const,
	parallel: 'parallel' as const,
	race: 'race' as const,
	merge: 'merge' as const,
	first: 'first' as const,
	all: 'all' as const,
	any: 'any' as const,

	for(methodName: string): symbol {
		return Symbol.for(`polymix:strategy:${methodName}`);
	},
} as const;

function isPromiseLike(value: unknown): value is Promise<unknown> {
	return (
		Boolean(value) &&
		(typeof value === 'object' || typeof value === 'function') &&
		'then' in (value as any) &&
		typeof (value as any).then === 'function'
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		Boolean(value) &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.prototype.toString.call(value) === '[object Object]'
	);
}

function deepMerge(a: unknown, b: unknown): unknown {
	if (Array.isArray(a) && Array.isArray(b)) {
		return [...a, ...b];
	}

	if (isPlainObject(a) && isPlainObject(b)) {
		const out: Record<string, unknown> = { ...a };
		for (const key of Object.keys(b)) {
			out[key] = key in out ? deepMerge(out[key], b[key]) : b[key];
		}
		return out;
	}

	return b;
}

export function applyStrategy(
	strategy: string | symbol,
	fns: Function[],
	context: any,
	...args: any[]
): any {
	const strategyName: CompositionStrategy =
		strategy === 'pipe' ||
		strategy === 'compose' ||
		strategy === 'parallel' ||
		strategy === 'race' ||
		strategy === 'merge' ||
		strategy === 'first' ||
		strategy === 'all' ||
		strategy === 'any' ||
		strategy === 'override'
			? (strategy as CompositionStrategy)
			: 'override';

	switch (strategyName) {
		case 'pipe':
			// Pipe passes the result of each function to the next
			return fns.reduce((acc, fn) => {
				// If acc is a promise, wait for it first
				if (isPromiseLike(acc)) {
					return acc.then((result) => fn.apply(context, [result]));
				}
				// Otherwise, execute synchronously
				return fn.apply(context, [acc]);
			}, args[0]);

		case 'compose':
			return fns.reduceRight((acc, fn) => {
				if (isPromiseLike(acc)) {
					return acc.then((result) => fn.apply(context, [result]));
				}
				return fn.apply(context, [acc]);
			}, args[0]);

		case 'parallel':
			return Promise.all(fns.map((fn) => fn.apply(context, args)));

		case 'race':
			return Promise.race(
				fns.map((fn) => Promise.resolve(fn.apply(context, args))),
			);

		case 'merge':
			return fns.reduce<unknown>((acc, fn) => {
				const result = fn.apply(context, args);
				return deepMerge(acc, result);
			}, undefined);

		case 'first':
			for (const fn of fns) {
				const result = fn.apply(context, args);
				if (result !== undefined) {
					return result;
				}
			}
			return undefined;

		case 'all':
			return (async () => {
				for (const fn of fns) {
					const result = fn.apply(context, args);
					const value = isPromiseLike(result) ? await result : result;
					if (!value) return false;
				}
				return true;
			})();

		case 'any':
			return (async () => {
				for (const fn of fns) {
					const result = fn.apply(context, args);
					const value = isPromiseLike(result) ? await result : result;
					if (value) return true;
				}
				return false;
			})();

		case 'override':
		default: {
			// Execute all functions but only return the result of the last one.
			let lastResult: any;
			for (const fn of fns) {
				lastResult = fn.apply(context, args);
			}
			return lastResult;
		}
	}
}

```

- [x] Create `src/strategies.spec.ts` with unit tests.
- [x] Copy and paste code below into `packages/polymix/src/strategies.spec.ts`:

```typescript
import { applyStrategy } from './strategies';

describe('composition Strategies', () => {
	describe('override', () => {
		it('should return the result of the last function', () => {
			const fn1 = jest.fn().mockReturnValue(1);
			const fn2 = jest.fn().mockReturnValue(2);
			const result = applyStrategy('override', [fn1, fn2], null, 10);
			expect(result).toBe(2);
			expect(fn1).toHaveBeenCalledWith(10);
			expect(fn2).toHaveBeenCalledWith(10);
		});
	});

	describe('pipe', () => {
		it('should pipe results of synchronous functions', async () => {
			const fn1 = (a: number) => a + 1; // 11
			const fn2 = (a: number) => a * 2; // 22
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});

		it('should pipe results of asynchronous functions', async () => {
			const fn1 = async (a: number) => {
				await new Promise((r) => setTimeout(r, 10));
				return a + 1;
			};
			const fn2 = async (a: number) => {
				await new Promise((r) => setTimeout(r, 10));
				return a * 2;
			};
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});

		it('should pipe results of mixed sync/async functions', async () => {
			const fn1 = (a: number) => a + 1; // 11
			const fn2 = async (a: number) => a * 2; // 22
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});
	});

	describe('parallel', () => {
		it('should execute all functions in parallel and return results', async () => {
			const fn1 = async () => {
				await new Promise((r) => setTimeout(r, 20));
				return 1;
			};
			const fn2 = async () => {
				await new Promise((r) => setTimeout(r, 10));
				return 2;
			};
			const result = await applyStrategy('parallel', [fn1, fn2], null);
			expect(result).toEqual([1, 2]);
		});

		it('should pass arguments to all functions', async () => {
			const fn1 = jest.fn().mockResolvedValue(1);
			const fn2 = jest.fn().mockResolvedValue(2);
			await applyStrategy('parallel', [fn1, fn2], null, 'arg1', 'arg2');
			expect(fn1).toHaveBeenCalledWith('arg1', 'arg2');
			expect(fn2).toHaveBeenCalledWith('arg1', 'arg2');
		});
	});

	describe('merge', () => {
		it('should merge the results of all functions', () => {
			const fn1 = () => ({ a: 1 });
			const fn2 = () => ({ b: 2 });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: 1, b: 2 });
		});

		it('should deep-merge nested objects', () => {
			const fn1 = () => ({ a: { x: 1 }, b: 'old' });
			const fn2 = () => ({ a: { y: 2 }, b: 'new' });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: { x: 1, y: 2 }, b: 'new' });
		});

		it('should concatenate arrays when merging', () => {
			const fn1 = () => ({ items: [1, 2] });
			const fn2 = () => ({ items: [3] });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ items: [1, 2, 3] });
		});

		it('should handle overlapping properties by taking the last one', () => {
			const fn1 = () => ({ a: 1, b: 'old' });
			const fn2 = () => ({ b: 'new', c: 3 });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: 1, b: 'new', c: 3 });
		});
	});

	describe('first', () => {
		it('should return the first non-undefined result', () => {
			const fn1 = () => undefined;
			const fn2 = () => 'hello';
			const fn3 = () => 'world';
			const result = applyStrategy('first', [fn1, fn2, fn3], null);
			expect(result).toBe('hello');
		});

		it('should return undefined if all results are undefined', () => {
			const fn1 = () => undefined;
			const fn2 = () => undefined;
			const result = applyStrategy('first', [fn1, fn2], null);
			expect(result).toBeUndefined();
		});
	});

	describe('compose', () => {
		it('should compose in reverse order', async () => {
			const fn1 = (a: number) => a + 1;
			const fn2 = (a: number) => a * 2;
			// compose means: fn1(fn2(input)) when ordered [fn1, fn2]
			const result = await applyStrategy('compose', [fn1, fn2], null, 10);
			expect(result).toBe(21);
		});
	});

	describe('race', () => {
		it('should return first resolved result', async () => {
			const slow = async () => {
				await new Promise((r) => setTimeout(r, 20));
				return 'slow';
			};
			const fast = async () => {
				await new Promise((r) => setTimeout(r, 5));
				return 'fast';
			};
			const result = await applyStrategy('race', [slow, fast], null);
			expect(result).toBe('fast');
		});
	});

	describe('all', () => {
		it('should return true if all are truthy', async () => {
			const fn1 = () => true;
			const fn2 = async () => true;
			const result = await applyStrategy('all', [fn1, fn2], null);
			expect(result).toBe(true);
		});

		it('should return false if any is falsy', async () => {
			const fn1 = () => true;
			const fn2 = () => false;
			const result = await applyStrategy('all', [fn1, fn2], null);
			expect(result).toBe(false);
		});
	});

	describe('any', () => {
		it('should return true if any is truthy', async () => {
			const fn1 = () => false;
			const fn2 = async () => true;
			const result = await applyStrategy('any', [fn1, fn2], null);
			expect(result).toBe(true);
		});

		it('should return false if all are falsy', async () => {
			const fn1 = () => false;
			const fn2 = () => 0;
			const result = await applyStrategy('any', [fn1, fn2], null);
			expect(result).toBe(false);
		});
	});
});

```

#### Step 4: Implement Core Mixin Logic
- [x] Create `src/core.ts` with the main `mix` function.
- [x] Copy and paste code below into `packages/polymix/src/core.ts`:

```typescript
import { applyStrategy } from './strategies';
import {
	type AnyConstructor,
	type Constructor,
	type MixedClass,
} from './types';
import {
	copyDecoratorMetadata,
	installInstanceCheck,
	registerMixins,
	MIXIN_METADATA,
} from './utils';

/**
 * The core mixin composition function.
 *
 * It intelligently handles a base class, applies mixins, resolves method conflicts
 * using strategies, and preserves `instanceof` checks and decorator metadata.
 *
 * @param mixins - A variable number of mixin classes to combine. The last class
 *   can be a base class to extend.
 * @returns A new class that is the composition of all provided mixins.
 */
export function mix<T extends AnyConstructor[]>(...mixins: T): MixedClass<T> {
	const validMixins = mixins.filter((m) => typeof m === 'function');

	// By default, treat the last item as a potential base class IF it has a constructor
	// with parameters. Otherwise, treat all as mixins.
	const lastItem =
		validMixins.length > 0 ? validMixins[validMixins.length - 1] : undefined;

	// Check if the last item has a constructor that expects parameters
	const hasConstructorParams = lastItem && lastItem.length > 0;

	// Warn if implicit base class detection might be ambiguous
	if (hasConstructorParams && validMixins.length > 1) {
		console.warn(
			`[polymix] Warning: The last class provided to mix() (${lastItem.name}) has constructor parameters and is being treated as a base class. ` +
				`If this is intended to be a mixin, please ensure it has a zero-argument constructor.`,
		);
	}

	const Base = hasConstructorParams ? (lastItem as AnyConstructor) : class {};
	const pureMixins = hasConstructorParams
		? validMixins.slice(0, -1)
		: validMixins;

	return mixWithBase(Base as any, ...(pureMixins as any)) as any;
}

export function mixWithBase<
	Base extends AnyConstructor,
	T extends AnyConstructor[],
>(Base: Base, ...mixins: T): MixedClass<[...T, Base]> {
	const pureMixins = mixins.filter((m) => typeof m === 'function');

	const Mixed = class extends Base {
		constructor(...args: any[]) {
			super(...args);
			registerMixins(this, pureMixins);

			for (const Mixin of pureMixins) {
				const metadata = MIXIN_METADATA.get(Mixin);
				if (metadata?.isAbstract) continue;

				try {
					Object.assign(this, Reflect.construct(Mixin as Constructor, args));
				} catch {
					// If a mixin can't be constructed with provided args, skip initialization.
					// Methods are still composed from the prototype.
				}

				// Call init method if it exists (ts-mixer compatibility)
				const initMethod = Mixin.prototype.init;
				if (typeof initMethod === 'function') {
					initMethod.apply(this, args);
				}
			}
		}
	};

	// A map to hold methods that need to be composed.
	const methodCompositionMap = new Map<string | symbol, Function[]>();
	const strategyMap = new Map<string | symbol, string>();

	// Apply each mixin to the new `Mixed` class.
	for (const Mixin of pureMixins) {
		// Install `Symbol.hasInstance` to make `instanceof Mixin` work correctly.
		installInstanceCheck(Mixin);

		// Copy static properties from the mixin to the new class.
		for (const staticKey of Object.getOwnPropertyNames(Mixin)) {
			if (!['length', 'name', 'prototype', 'constructor'].includes(staticKey)) {
				const descriptor = Object.getOwnPropertyDescriptor(Mixin, staticKey);
				if (descriptor) {
					Object.defineProperty(Mixed, staticKey, descriptor);
				}
			}
		}
		for (const staticKey of Object.getOwnPropertySymbols(Mixin)) {
			if (staticKey === Symbol.hasInstance) continue;
			const descriptor = Object.getOwnPropertyDescriptor(Mixin, staticKey);
			if (descriptor) {
				Object.defineProperty(Mixed, staticKey, descriptor);
			}
		}

		// Process prototype properties (methods and accessors).
		const protoKeys: (string | symbol)[] = [
			...Object.getOwnPropertyNames(Mixin.prototype),
			...Object.getOwnPropertySymbols(Mixin.prototype),
		];
		for (const propKey of protoKeys) {
			if (propKey === 'constructor') continue;

			const descriptor = Object.getOwnPropertyDescriptor(
				Mixin.prototype,
				propKey,
			);
			if (!descriptor) continue;

			// Handle accessors (getters/setters)
			if (descriptor.get || descriptor.set) {
				Object.defineProperty(Mixed.prototype, propKey, descriptor);
				continue;
			}

			// Handle methods
			if (typeof descriptor.value === 'function') {
				// Check for composition strategy
				const metadata = MIXIN_METADATA.get(Mixin);
				let strategy: string | undefined;

				if (metadata?.strategies.has(propKey as string)) {
					strategy = metadata.strategies.get(propKey as string);
				} else {
					// Check for symbol-based strategy for compatibility
					const strategySymbol = Symbol.for(
						`polymix:strategy:${String(propKey)}`,
					);
					const symbolStrategy =
						(Mixin as any)[strategySymbol] ?? Mixin.prototype[strategySymbol];
					if (symbolStrategy) {
						strategy = symbolStrategy;
					}
				}

				if (strategy) {
					strategyMap.set(propKey, strategy);
				}

				if (!methodCompositionMap.has(propKey)) {
					methodCompositionMap.set(propKey, []);
				}
				methodCompositionMap.get(propKey)!.push(descriptor.value);
			}
		}
	}

	// Resolve method conflicts and apply strategies.
	for (const [propKey, methods] of methodCompositionMap.entries()) {
		const strategy = strategyMap.get(propKey) || 'override';

		(Mixed.prototype as any)[propKey] = function (...args: any[]) {
			return applyStrategy(strategy, methods, this, ...args);
		};
	}

	// Copy decorator metadata from mixins to the new class
	copyDecoratorMetadata(pureMixins, Mixed);

	return Mixed as any;
}

```
- [x] Create `src/core.spec.ts` with unit tests.
- [x] Copy and paste code below into `packages/polymix/src/core.spec.ts`:

```typescript
import { mix, mixWithBase } from './core';
import { pipe, parallel, abstract } from './decorators';
import { strategies } from './strategies';
import { from, hasMixin, when } from './utils';
import 'reflect-metadata';

describe('polymix Core: mix()', () => {
	// 1. Basic Mixin Composition
	describe('basic Composition', () => {
		class Movable {
			x = 0;
			y = 0;
			move(x: number, y: number) {
				this.x += x;
				this.y += y;
			}
		}

		class Nameable {
			name = 'Untitled';
			setName(name: string) {
				this.name = name;
			}
		}

		const Entity = mix(Movable, Nameable);
		const entity = new Entity();

		it('should have properties from all mixins', () => {
			expect(entity.x).toBe(0);
			expect(entity.name).toBe('Untitled');
		});

		it('should have methods from all mixins', () => {
			entity.move(10, 20);
			entity.setName('MyEntity');
			expect(entity.x).toBe(10);
			expect(entity.y).toBe(20);
			expect(entity.name).toBe('MyEntity');
		});

		it('should pass `instanceof` checks for all mixins', () => {
			expect(entity).toBeInstanceOf(Entity);
			expect(entity).toBeInstanceOf(Movable);
			expect(entity).toBeInstanceOf(Nameable);
		});

		it('should work with hasMixin type guard', () => {
			expect(hasMixin(entity, Movable)).toBe(true);
			expect(hasMixin(entity, Nameable)).toBe(true);
			// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- testing
			expect(hasMixin(entity, class {})).toBe(false);
		});
	});

	// 2. Method Overriding and Strategies
	describe('method Overriding & Strategies', () => {
		class Logger {
			log(message: string) {
				return `Log: ${message}`;
			}
		}

		class TimestampedLogger {
			log(message: string) {
				return `${new Date().toISOString()}: ${message}`;
			}
		}

		it('should override methods by default (last one wins)', () => {
			const Mixed = mix(Logger, TimestampedLogger);
			const logger = new Mixed();
			// This test is time-sensitive, so we just check the format
			expect(logger.log('test')).toMatch(
				/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z: test/,
			);
		});

		it('should compose methods with the `pipe` strategy', () => {
			class Stringifier {
				@pipe
				process(data: any) {
					return JSON.stringify(data);
				}
			}
			class Reverser {
				@pipe
				process(data: string) {
					return data.split('').reverse().join('');
				}
			}

			const Piped = mix(Stringifier, Reverser);
			const processor = new Piped();
			const result = processor.process({ a: 1 });
			expect(result).toBe('}1:"a"{'); // Reverse of '{"a":1}'
		});

		it('should compose methods with the `parallel` strategy', async () => {
			class Task1 {
				@parallel
				run() {
					return Promise.resolve('Task1 done');
				}
			}
			class Task2 {
				@parallel
				run() {
					return Promise.resolve('Task2 done');
				}
			}
			const Parallel = mix(Task1, Task2);
			const runner = new Parallel();
			const results = await runner.run();
			expect(results).toEqual(['Task1 done', 'Task2 done']);
		});
	});

	// 3. Base Class and Constructor Handling
	describe('base Class & Constructors', () => {
		class Base {
			isBase = true;
			constructor(public name: string) {}
		}

		class MixinA {
			isA = true;
		}

		it('should extend a base class correctly', () => {
			const Mixed = mix(MixinA, Base);
			const instance = new Mixed('MyBase');

			expect(instance.isBase).toBe(true);
			expect(instance.isA).toBe(true);
			expect(instance.name).toBe('MyBase');
			expect(instance).toBeInstanceOf(Base);
			expect(instance).toBeInstanceOf(MixinA);
		});

		it('should support explicit base classes via mixWithBase()', () => {
			class BaseNoArgs {
				isBase = true;
				getBaseName() {
					return 'BaseNoArgs';
				}
			}
			class MixinB {
				isB = true;
			}

			const Mixed = mixWithBase(BaseNoArgs, MixinB);
			const instance = new Mixed();

			expect(instance.isBase).toBe(true);
			expect(instance.isB).toBe(true);
			expect(instance.getBaseName()).toBe('BaseNoArgs');
			expect(instance).toBeInstanceOf(BaseNoArgs);
			expect(instance).toBeInstanceOf(MixinB);
		});
	});

	// 4. Static Properties and Methods
	describe('statics', () => {
		// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- testing
		class WithStatic {
			static staticProp = 'hello';
			static staticMethod() {
				return 'world';
			}
		}

		const Mixed = mix(WithStatic);

		it('should copy static properties', () => {
			expect(Mixed.staticProp).toBe('hello');
		});

		it('should copy static methods', () => {
			expect(Mixed.staticMethod()).toBe('world');
		});
	});

	// 5. Abstract Mixins
	describe('abstract Mixins', () => {
		@abstract
		class AbstractMixin {
			// This is a conceptual abstract method, not a real TS abstract method.
			// The implementation should be provided by the class that uses the mixin.
			performAction(): string {
				throw new Error('Method not implemented.');
			}
		}

		class Concrete extends mix(AbstractMixin) {
			performAction() {
				return 'Action performed';
			}
		}

		it('should allow overriding a method from an abstract mixin', () => {
			const instance = new Concrete();
			expect(instance.performAction()).toBe('Action performed');
			expect(instance).toBeInstanceOf(AbstractMixin);
		});

		it('should not instantiate abstract mixins directly', () => {
			const instance = new Concrete();
			// No properties from AbstractMixin should be on the instance
			// as it's not instantiated.
			expect(Object.keys(instance).includes('performAction')).toBe(false);
		});
	});

	// 6. Advanced Features
	describe('advanced Features', () => {
		it('should support `from()` for method disambiguation', () => {
			class A {
				method() {
					return 'A';
				}
			}
			class B {
				method() {
					return 'B';
				}
			}
			const Mixed = mix(A, B);
			const instance = new Mixed();

			expect(instance.method()).toBe('B'); // Default override
			expect(from(instance, A).method()).toBe('A');
			expect(from(instance, B).method()).toBe('B');
		});

		it('should support conditional mixins with `when()`', () => {
			class FeatureA {
				hasA = true;
			}
			const condition = true;
			const Mixed = mix(when(condition, FeatureA));
			const instance = new Mixed();

			expect(hasMixin(instance, FeatureA)).toBe(true);
			expect((instance as any).hasA).toBe(true);

			const condition2 = false;
			const Mixed2 = mix(when(condition2, FeatureA));
			const instance2 = new Mixed2();
			expect(hasMixin(instance2, FeatureA)).toBe(false);
		});

		it('should copy decorator metadata (`reflect-metadata`)', () => {
			// Define metadata on a mixin
			@Reflect.metadata('classKey', 'classValue')
			class MixinWithMeta {
				@Reflect.metadata('propKey', 'propValue')
				get myProp(): string {
					return 'value';
				}
			}

			const Mixed = mix(MixinWithMeta);

			const classMeta = Reflect.getMetadata('classKey', Mixed);
			const propMeta = Reflect.getMetadata(
				'propKey',
				Mixed.prototype,
				'myProp',
			);

			expect(classMeta).toBe('classValue');
			expect(propMeta).toBe('propValue');
		});

		it('should compose symbol-named methods', () => {
			const sym = Symbol('symMethod');
			class A {
				[sym]() {
					return 'A';
				}
			}
			class B {
				[sym]() {
					return 'B';
				}
			}

			const Mixed = mix(A, B);
			const instance = new Mixed() as any;
			expect(instance[sym]()).toBe('B');
		});

		it('should support symbol strategy keys via strategies.for()', () => {
			class StepA {
				static get [strategies.for('process')]() {
					return strategies.pipe;
				}
				process(x: number) {
					return x + 1;
				}
			}
			class StepB {
				process(x: number) {
					return x * 2;
				}
			}

			const Pipeline = mix(StepA, StepB);
			const instance = new Pipeline();
			expect(instance.process(10)).toBe(22);
		});
	});

	// 7. Edge Cases
	describe('edge Cases', () => {
		it('should handle empty mixins array', () => {
			const Empty = mix();
			expect(() => new Empty()).not.toThrow();
		});

		it('should filter out non-function values', () => {
			class ValidMixin {
				valid = true;
			}
			const Mixed = mix(ValidMixin, null as any, undefined as any);
			const instance = new Mixed();
			expect(instance.valid).toBe(true);
		});

		it('should handle mixins with getters and setters', () => {
			class WithAccessors {
				private _value = 42;
				get computed() {
					return this._value;
				}
				set computed(v: number) {
					this._value = v;
				}
			}
			const Mixed = mix(WithAccessors);
			const instance = new Mixed() as any;
			expect(instance.computed).toBe(42);
			instance.computed = 100;
			expect(instance.computed).toBe(100);
		});

		it('should continue composition when mixin constructor throws', () => {
			class Faulty {
				constructor() {
					throw new Error('constructor failed');
				}
				method() {
					return 'works';
				}
			}
			const Mixed = mix(Faulty);
			// Constructor throws, but prototype methods should still be available
			const instance = new Mixed();
			expect(instance.method()).toBe('works');
		});

		it('should handle many mixins (10+)', () => {
			class M0 {
				p0 = 0;
			}
			class M1 {
				p1 = 1;
			}
			class M2 {
				p2 = 2;
			}
			class M3 {
				p3 = 3;
			}
			class M4 {
				p4 = 4;
			}
			class M5 {
				p5 = 5;
			}
			class M6 {
				p6 = 6;
			}
			class M7 {
				p7 = 7;
			}
			class M8 {
				p8 = 8;
			}
			class M9 {
				p9 = 9;
			}

			const Mixed = mix(M0, M1, M2, M3, M4, M5, M6, M7, M8, M9);
			const instance = new Mixed() as any;
			expect(instance.p0).toBe(0);
			expect(instance.p9).toBe(9);
		});

		it('should copy static symbol properties', () => {
			const sym = Symbol('staticSym');
			// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- testing
			class WithSymbol {
				static [sym] = 'symbolValue';
			}
			const Mixed = mix(WithSymbol) as any;
			expect(Mixed[sym]).toBe('symbolValue');
		});

		it('when(false, ...) should not add mixin properties', () => {
			class Feature {
				featureProp = true;
			}
			const Mixed = mix(when(false, Feature));
			const instance = new Mixed() as any;
			expect('featureProp' in instance).toBe(false);
			expect(hasMixin(instance, Feature)).toBe(false);
		});

		it('when(true, ...) should add mixin properties', () => {
			class Feature {
				featureProp = true;
			}
			const Mixed = mix(when(true, Feature));
			const instance = new Mixed() as any;
			expect(instance.featureProp).toBe(true);
			expect(hasMixin(instance, Feature)).toBe(true);
		});
	});
});

```
- [x] Update `src/index.ts` to export the new modules.

##### Step 4 Verification Checklist
- [x] Run `pnpm --filter polymix build` to ensure core compiles.
- [x] Run `pnpm --filter polymix test` to ensure core behavior is correct.

#### Step 5: Implement Decorators
- [x] Create `src/decorators.ts` with decorator implementations.
- [x] Create `src/decorators.spec.ts` with unit tests.
- [x] Update `src/index.ts` to export decorators.
- [x] Copy and paste code below into `packages/polymix/src/decorators.ts`:

```typescript
import { mixWithBase } from './core';
import {
	type AnyConstructor,
	type Constructor,
	type MixedClass,
	type MixinMetadata,
} from './types';
import { MIXIN_METADATA } from './utils';

function setStrategy(
	Target: Function,
	propertyKey: string,
	strategy: string,
): void {
	const strategySymbol = Symbol.for(`polymix:strategy:${propertyKey}`);
	(Target as any)[strategySymbol] = strategy;

	const metadata: MixinMetadata = MIXIN_METADATA.get(Target as any) ?? {
		isAbstract: false,
		strategies: new Map(),
		decoratorMetadata: new Map(),
	};
	metadata.strategies.set(propertyKey, strategy);
	MIXIN_METADATA.set(Target as any, metadata);
}

export function mixin<T extends AnyConstructor[]>(...mixins: T) {
	return function <C extends Constructor>(Target: C): C & MixedClass<T> {
		const Mixed = mixWithBase(Target as any, ...(mixins as any));
		try {
			// Preserve the original class name (best-effort)
			Object.defineProperty(Mixed, 'name', { value: Target.name });
		} catch {
			// ignore
		}
		return Mixed as any;
	};
}

export function Use<T extends AnyConstructor[]>(...mixins: T) {
	return mixin(...mixins);
}

export function abstract<T extends AnyConstructor>(Target: T): T {
	const metadata = MIXIN_METADATA.get(Target) ?? {
		isAbstract: false,
		strategies: new Map(),
		decoratorMetadata: new Map(),
	};
	metadata.isAbstract = true;
	MIXIN_METADATA.set(Target, metadata);
	return Target;
}

export function delegate<T extends AnyConstructor>(Delegate: T) {
	return function (target: any, propertyKey: string | symbol): void {
		const methodNames = Object.getOwnPropertyNames(Delegate.prototype).filter(
			(name) => name !== 'constructor',
		);

		for (const methodName of methodNames) {
			if (methodName in target) continue;
			Object.defineProperty(target, methodName, {
				value(this: any, ...args: any[]) {
					const delegated = this[propertyKey];
					return delegated[methodName](...args);
				},
				writable: true,
				configurable: true,
				enumerable: false,
			});
		}
	};
}

export function override(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'override');
	return descriptor;
}

export function pipe(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'pipe');
	return descriptor;
}

export function compose(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'compose');
	return descriptor;
}

export function parallel(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'parallel');
	return descriptor;
}

export function race(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'race');
	return descriptor;
}

export function merge(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'merge');
	return descriptor;
}

export function first(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'first');
	return descriptor;
}

export function all(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'all');
	return descriptor;
}

export function any(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'any');
	return descriptor;
}
```

- [x] Copy and paste code below into `packages/polymix/src/decorators.spec.ts`:

```typescript
import { mix } from './core';
import {
	delegate,
	mixin,
	Use,
	pipe,
	compose,
	parallel,
	race,
	merge,
	first,
	all,
	any,
	override,
} from './decorators';
import { MIXIN_METADATA } from './utils';

describe('decorators', () => {
	describe('@mixin / @Use', () => {
		it('should apply mixin decorator', () => {
			class A {
				a = 1;
			}
			@mixin(A)
			class B {}
			const b = new B() as any;
			expect(b.a).toBe(1);
			expect(b).toBeInstanceOf(A);
		});

		it('should preserve the target class behavior when using @mixin', () => {
			class A {
				getA() {
					return 'a';
				}
			}

			class Base {
				getBase() {
					return 'base';
				}
			}

			@mixin(A)
			class B extends Base {
				getB() {
					return 'b';
				}
			}

			const b = new B() as any;
			expect(b.getBase()).toBe('base');
			expect(b.getA()).toBe('a');
			expect(b.getB()).toBe('b');
			expect(b).toBeInstanceOf(Base);
			expect(b).toBeInstanceOf(A);
		});

		it('@Use should be an alias for @mixin', () => {
			class Movable {
				move() {
					return 'moving';
				}
			}
			class Nameable {
				name = 'test';
			}

			@Use(Movable, Nameable)
			class Entity {}
			const e = new Entity() as any;
			expect(e).toBeInstanceOf(Movable);
			expect(e).toBeInstanceOf(Nameable);
			expect(e.move()).toBe('moving');
			expect(e.name).toBe('test');
		});
	});

	describe('strategy decorators', () => {
		it('@pipe should set strategy metadata', () => {
			class A {
				@pipe
				method(x: number) {
					return x + 1;
				}
			}

			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('pipe');
			const metadata = MIXIN_METADATA.get(A);
			expect(metadata?.strategies.get('method')).toBe('pipe');
		});

		it('@override should set strategy metadata', () => {
			class A {
				@override
				method() {
					return 'a';
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('override');
		});

		it('@compose should set strategy metadata', () => {
			class A {
				@compose
				method(x: number) {
					return x + 1;
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('compose');
		});

		it('@parallel should set strategy metadata', () => {
			class A {
				@parallel
				method() {
					return Promise.resolve(1);
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('parallel');
		});

		it('@race should set strategy metadata', () => {
			class A {
				@race
				method() {
					return Promise.resolve(1);
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('race');
		});

		it('@merge should set strategy metadata', () => {
			class A {
				@merge
				method() {
					return { a: 1 };
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('merge');
		});

		it('@first should set strategy metadata', () => {
			class A {
				@first
				method() {
					return 'first';
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('first');
		});

		it('@all should set strategy metadata', () => {
			class A {
				@all
				method() {
					return true;
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('all');
		});

		it('@any should set strategy metadata', () => {
			class A {
				@any
				method() {
					return true;
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('any');
		});

		it('@compose should process methods in reverse order with mix()', () => {
			class StepA {
				@compose
				process(x: number) {
					return x + 1;
				}
			}
			class StepB {
				@compose
				process(x: number) {
					return x * 2;
				}
			}
			// compose order: StepB first then StepA: (10 * 2) + 1 = 21
			const Mixed = mix(StepA, StepB);
			const result = new Mixed().process(10);
			expect(result).toBe(21);
		});

		it('@merge should deep-merge object results with mix()', () => {
			class PartA {
				@merge
				getData() {
					return { a: 1, nested: { x: 1 } };
				}
			}
			class PartB {
				@merge
				getData() {
					return { b: 2, nested: { y: 2 } };
				}
			}
			const Mixed = mix(PartA, PartB);
			const result = new Mixed().getData();
			expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 2 } });
		});

		it('@first should return first non-undefined result with mix()', () => {
			class CheckA {
				@first
				find() {
					return undefined;
				}
			}
			class CheckB {
				@first
				find() {
					return 'found';
				}
			}
			class CheckC {
				@first
				find() {
					return 'too late';
				}
			}
			const Mixed = mix(CheckA, CheckB, CheckC);
			const result = new Mixed().find();
			expect(result).toBe('found');
		});

		it('@race should return first resolved promise with mix()', async () => {
			class SlowTask {
				@race
				async run() {
					await new Promise((r) => setTimeout(r, 50));
					return 'slow';
				}
			}
			class FastTask {
				@race
				async run() {
					await new Promise((r) => setTimeout(r, 5));
					return 'fast';
				}
			}
			const Mixed = mix(SlowTask, FastTask);
			const result = await new Mixed().run();
			expect(result).toBe('fast');
		});

		it('@all should return true only if all are truthy with mix()', async () => {
			class TrueCheck {
				@all
				check() {
					return true;
				}
			}
			class FalseCheck {
				@all
				check() {
					return false;
				}
			}
			const AllTrue = mix(TrueCheck, TrueCheck);
			const HasFalse = mix(TrueCheck, FalseCheck);

			expect(await new AllTrue().check()).toBe(true);
			expect(await new HasFalse().check()).toBe(false);
		});

		it('@any should return true if any is truthy with mix()', async () => {
			class TrueCheck {
				@any
				check() {
					return true;
				}
			}
			class FalseCheck {
				@any
				check() {
					return false;
				}
			}
			const AllFalse = mix(FalseCheck, FalseCheck);
			const HasTrue = mix(FalseCheck, TrueCheck);

			expect(await new AllFalse().check()).toBe(false);
			expect(await new HasTrue().check()).toBe(true);
		});
	});

	describe('@delegate', () => {
		it('should delegate methods from a property', () => {
			class MediaControls {
				play() {
					return 'play';
				}
				pause() {
					return 'pause';
				}
			}

			class AudioPlayer {
				@delegate(MediaControls)
				controls = new MediaControls();
			}

			const player = new AudioPlayer() as any;
			expect(typeof player.play).toBe('function');
			expect(typeof player.pause).toBe('function');
			expect(player.play()).toBe('play');
			expect(player.pause()).toBe('pause');
		});

		it('should not overwrite existing methods', () => {
			class Logger {
				log() {
					return 'delegated';
				}
			}

			class App {
				@delegate(Logger)
				logger = new Logger();

				log() {
					return 'own';
				}
			}

			const app = new App();
			expect(app.log()).toBe('own');
		});
	});
});
```

- [x] Update `src/index.ts` to export decorators.
- [x] Copy and paste code below into `packages/polymix/src/index.ts`:

```typescript
export * from './types';
export * from './utils';
export * from './strategies';
export * from './core';
export * from './decorators';
```

##### Step 5 Verification Checklist
- [x] Run `pnpm --filter polymix build` to ensure decorators compile correctly.
- [x] Run `pnpm --filter polymix test` to ensure decorators behave as expected.

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: Migrate Tests and Cleanup
- [x] Create `src/__tests__/polymix.spec.ts` with comprehensive tests.
- [x] Copy and paste code below into `packages/polymix/src/__tests__/polymix.spec.ts`:

```typescript
import { from, hasMixin, mix } from '..';

describe('Polymix', () => {
	// Define some mixins
	class Identifiable {
		id: string = 'test-id';

		getId(): string {
			return this.id;
		}
	}

	class Timestamped {
		createdAt: Date = new Date();
		updatedAt: Date = new Date();

		touch(): void {
			this.updatedAt = new Date();
		}
	}

	class Serializable {
		toJSON(): object {
			const obj: Record<string, any> = {};
			for (const key of Object.keys(this)) {
				obj[key] = (this as any)[key];
			}
			return obj;
		}

		static fromJSON<T extends object>(this: new () => T, json: object): T {
			return Object.assign(new this(), json);
		}
	}

	class Validatable {
		errors: string[] = [];

		validate(): boolean {
			return this.errors.length === 0;
		}

		addError(msg: string): void {
			this.errors.push(msg);
		}

		clearErrors(): void {
			this.errors = [];
		}
	}

	// Compose them!
	class User extends mix(Identifiable, Timestamped, Serializable, Validatable) {
		name: string;
		email: string;

		constructor(name: string, email: string) {
			super();
			this.name = name;
			this.email = email;
		}

		validate(): boolean {
			this.clearErrors();
			if (!this.email.includes('@')) {
				this.addError('Invalid email');
			}
			if (this.name.length < 2) {
				this.addError('Name too short');
			}
			return this.errors.length === 0;
		}
	}

	it('should create a mixed instance with properties from all mixins', () => {
		const user = new User('Alice', 'alice@example.com');

		expect(user.name).toBe('Alice');
		expect(user.email).toBe('alice@example.com');
		expect(user.id).toBe('test-id');
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.errors).toEqual([]);
	});

	it('should support instanceof checks', () => {
		const user = new User('Alice', 'alice@example.com');

		expect(user).toBeInstanceOf(User);
		expect(user).toBeInstanceOf(Identifiable);
		expect(user).toBeInstanceOf(Timestamped);
		expect(user).toBeInstanceOf(Serializable);
		expect(user).toBeInstanceOf(Validatable);
	});

	it('should support hasMixin type guard', () => {
		const user = new User('Alice', 'alice@example.com');

		if (hasMixin(user, Timestamped)) {
			user.touch();
			expect(user.updatedAt).toBeInstanceOf(Date);
		} else {
			fail('hasMixin should return true');
		}
	});

	it('should support disambiguation with from()', () => {
		const user = new User('Alice', 'alice@example.com');
		expect(from(user, Identifiable).getId()).toBe('test-id');
	});

	it('should correctly override methods', () => {
		const user = new User('A', 'not-an-email');
		const isValid = user.validate();

		expect(isValid).toBe(false);
		expect(user.errors).toContain('Invalid email');
		expect(user.errors).toContain('Name too short');
	});

	it('should support static methods', () => {
		const user = (User as any).fromJSON({
			name: 'Bob',
			email: 'bob@example.com',
		});
		expect(user).toBeInstanceOf(User);
		expect(user.name).toBe('Bob');
	});
});
```

- [x] Create `src/__tests__/compatibility.spec.ts` to verify `ts-mixer`-style usage patterns.
- [x] Copy and paste code below into `packages/polymix/src/__tests__/compatibility.spec.ts`:

```typescript
import { mix } from '../core';

describe('tS-Mixer Compatibility', () => {
	// Pattern used in card-stack: class Card extends Mix(Flippable, Rankable) {}
	it('should support the Mix(A, B) pattern', () => {
		class Flippable {
			isFaceUp = false;
			flip() {
				this.isFaceUp = !this.isFaceUp;
			}
		}

		class Rankable {
			rank = 1;
			setRank(r: number) {
				this.rank = r;
			}
		}

		class Card extends mix(Flippable, Rankable) {}

		const card = new Card();
		expect(card.isFaceUp).toBe(false);
		expect(card.rank).toBe(1);

		card.flip();
		expect(card.isFaceUp).toBe(true);

		card.setRank(10);
		expect(card.rank).toBe(10);

		expect(card instanceof Flippable).toBe(true);
		expect(card instanceof Rankable).toBe(true);
	});

	// Pattern: class Card extends Mix(Base, Mixin) {}
	it('should support mixing a base class with mixins', () => {
		class Entity {
			id = '123';
		}

		class Nameable {
			name = 'Unknown';
		}

		// In polymix, the base class must be the LAST argument if it has constructor params,
		// or we use mixWithBase(Base, ...mixins).
		// However, ts-mixer allows Mix(Base, Mixin).
		// Polymix treats all arguments as mixins unless the last one is a base.
		// If Entity is treated as a mixin, it works fine as long as we don't need `super` calls to it
		// in a way that requires it to be the actual prototype chain root.

		class User extends mix(Entity, Nameable) {}

		const user = new User();
		expect(user.id).toBe('123');
		expect(user.name).toBe('Unknown');
		expect(user instanceof Entity).toBe(true);
		expect(user instanceof Nameable).toBe(true);
	});

	it('should support init methods in the Mix pattern', () => {
		const log: string[] = [];

		class A {
			init() {
				log.push('A');
			}
		}
		class B {
			init() {
				log.push('B');
			}
		}

		class C extends mix(A, B) {}
		new C();

		expect(log).toEqual(['A', 'B']);
	});
});

```

- [x] Create `src/__tests__/lifecycle.spec.ts` to verify `init()` behavior.
- [x] Copy and paste code below into `packages/polymix/src/__tests__/lifecycle.spec.ts`:

```typescript
import { mix } from '../core';

describe('lifecycle Methods', () => {
	it('should call init() on mixins if present', () => {
		const log: string[] = [];

		class MixinA {
			init() {
				log.push('MixinA.init');
			}
		}

		class MixinB {
			init() {
				log.push('MixinB.init');
			}
		}

		class Mixed extends mix(MixinA, MixinB) {}

		new Mixed();

		expect(log).toEqual(['MixinA.init', 'MixinB.init']);
	});

	it('should pass constructor arguments to init()', () => {
		let capturedArgs: any[] = [];

		class MixinA {
			init(...args: any[]) {
				capturedArgs = args;
			}
		}

		class Mixed extends mix(MixinA) {
			constructor(a: number, b: string) {
				super(a, b);
			}
		}

		new Mixed(123, 'hello');

		expect(capturedArgs).toEqual([123, 'hello']);
	});

	it('should work with mixins that do not have init()', () => {
		const log: string[] = [];

		class MixinA {
			init() {
				log.push('MixinA.init');
			}
		}

		class MixinB {
			// No init
		}

		class Mixed extends mix(MixinA, MixinB) {}

		new Mixed();

		expect(log).toEqual(['MixinA.init']);
	});
});

```

- [x] Create `src/__tests__/robustness.spec.ts` for resilience edge cases.
- [x] Copy and paste code below into `packages/polymix/src/__tests__/robustness.spec.ts`:

```typescript
import { mix } from '../core';

describe('robustness', () => {
	it('should not crash composition when a mixin prototype has a throwing getter', () => {
		class ThrowingGetterMixin {
			get boom(): string {
				throw new Error('boom');
			}
		}

		class PlainMixin {
			value = 123;
		}

		expect(() => {
			class Mixed extends mix(ThrowingGetterMixin, PlainMixin) {}
			const instance = new Mixed() as any;
			expect(instance.value).toBe(123);
			expect(() => instance.boom).toThrow('boom');
		}).not.toThrow();
	});
});

```

##### Step 6 Verification Checklist
- [x] Run `pnpm --filter polymix test` to ensure all tests pass.

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: Documentation
- [x] Create `packages/polymix/README.md`.
- [x] Copy and paste code below into `packages/polymix/README.md`:

````markdown
# polymix

Next-Generation TypeScript Mixins — combining the best of `ts-mixer`, `typescript-mix`, and `polytype` while eliminating their fundamental limitations.

## Features

- **True `instanceof` support**: Mixed instances pass `instanceof` checks for all mixin classes via `Symbol.hasInstance`
- **Type-safe**: Full TypeScript support with type inference for mixed methods and properties
- **No mixin limit**: Mix as many classes as needed (variadic generics)
- **Composition Strategies**: Control *how* methods merge with 9 built-in strategies
- **Decorators**: Easy-to-use decorators for applying mixins and strategies
- **Decorator metadata inheritance**: Automatic support for `Symbol.metadata` and `reflect-metadata`
- **Zero dependencies**: Lightweight with optional `reflect-metadata` peer dependency

## Installation

```bash
pnpm add polymix
# or
npm install polymix
```

For decorator metadata support (optional):
```bash
pnpm add reflect-metadata
```

## Quick Start

```typescript
import { mix } from 'polymix';

class Identifiable {
	id = '123';
}

class Timestamped {
	createdAt = new Date();
}

class User extends mix(Identifiable, Timestamped) {
	name: string;
	constructor(name: string) {
		super();
		this.name = name;
	}
}

const user = new User('Alice');

console.log(user.id);                        // '123'
console.log(user.createdAt);                 // Date object
console.log(user instanceof Identifiable);  // true ✅
console.log(user instanceof Timestamped);   // true ✅
console.log(user instanceof User);          // true ✅
```

## API Reference

### Core Functions

#### `mix(...mixins)`

Creates a new class that composes all provided mixins.

```typescript
class Dragon extends mix(Flyer, FireBreather, Reptile) {
	name = "Smaug";
}
```

> **Note:** `mix()` uses a heuristic to treat the last class as a base class only when it has constructor parameters. For explicit base class handling, use `mixWithBase()`.

#### `mixWithBase(Base, ...mixins)`

Creates a new class that explicitly extends `Base` and applies all provided mixins.

```typescript
class Admin extends mixWithBase(User, Permissions, AuditLog) {
	// User is the base class, Permissions and AuditLog are mixins
}
```

#### `hasMixin(instance, Mixin)`

Type guard to check if an instance has a specific mixin.

```typescript
if (hasMixin(entity, Timestamped)) {
	entity.touch(); // TypeScript knows this method exists
}
```

#### `from(instance, Mixin)`

Disambiguates method calls when multiple mixins have methods with the same name.

```typescript
class FlyingFish extends mix(Fish, Bird) {
	move() {
		if (this.isInWater) {
			return from(this, Fish).move();  // Call Fish's move
		}
		return from(this, Bird).move();    // Call Bird's move
	}
}
```

#### `when(condition, Mixin)`

Conditionally includes a mixin. When `condition` is false, an empty placeholder mixin is used.

```typescript
class SmartDevice extends mix(
	PowerManagement,
	when(process.env.NODE_ENV === 'development', Debuggable),
	when(config.features.logging, Loggable),
) {}
```

### Decorators

#### `@mixin(...mixins)` / `@Use(...mixins)`

Applies mixins to an existing class using decorator syntax.

```typescript
@mixin(Serializable, Observable)
class User extends BaseEntity {
	name: string;
	email: string;
}
```

#### `@abstract`

Marks a mixin class as abstract. Its prototype methods are composed, but it is not instantiated during `new Mixed()`.

```typescript
@abstract
class Identifiable {
	abstract getId(): string;
  
	toString() {
		return `Entity(${this.getId()})`;
	}
}
```

#### `@delegate(Delegate)`

Delegates methods from a property to a helper class instance.

```typescript
class AudioPlayer {
	@delegate(MediaControls)
	private controls = new MediaControls();
  
	// Automatically exposes: play(), pause(), stop(), seek()
}
```

### Composition Strategies

When multiple mixins define the same method, strategies control how they combine:

| Strategy   | Behavior                             | Return Type        |
| ---------- | ------------------------------------ | ------------------ |
| `override` | Calls all; last result returned      | Single value       |
| `pipe`     | Output of each becomes input of next | Final output       |
| `compose`  | Like pipe, but reverse order         | Final output       |
| `parallel` | Run all concurrently                 | `Promise<T[]>`     |
| `race`     | First to resolve wins                | `Promise<T>`       |
| `merge`    | Deep merge objects/concat arrays     | Merged result      |
| `first`    | First defined (non-undefined) result | Single value       |
| `all`      | All must return truthy               | `Promise<boolean>` |
| `any`      | At least one truthy                  | `Promise<boolean>` |

> Notes:
> - `override` preserves side effects by executing all implementations, returning the last result.
> - `pipe`/`compose` currently thread the pipeline value as the first argument only.

#### Using Strategy Decorators

```typescript
import { mix, pipe, parallel, merge } from 'polymix';

class DataPipeline extends mix(Validator, Transformer, Sanitizer) {
	@pipe process(data: unknown) { /* auto-chained */ }
	@parallel validate(data: unknown) { /* runs all concurrently */ }
	@merge getErrors() { /* arrays/objects merged */ }
}
```

#### Using Symbol Keys

```typescript
import { mix, strategies } from 'polymix';

class StepA {
	static get [strategies.for('process')]() {
		return strategies.pipe;
	}
	process(x: number) {
		return x + 1;
	}
}

class StepB {
	process(x: number) {
		return x * 2;
	}
}

class Pipeline extends mix(StepA, StepB) {}
new Pipeline().process(10); // 22 → (10+1)*2
```

## TypeScript Support

All types are automatically inferred:

```typescript
import { mix, MixedClass, MixedInstance } from 'polymix';

// Get the mixed class type
type UserClass = MixedClass<[Identifiable, Timestamped]>;

// Get the instance type
type UserInstance = MixedInstance<[Identifiable, Timestamped]>;
```

## Comparison with Other Libraries

| Feature                | polymix          | ts-mixer              | typescript-mix |
| ---------------------- | ---------------- | --------------------- | -------------- |
| `instanceof` support   | ✅                | ❌                     | ❌              |
| Unlimited mixins       | ✅                | ❌ (10 max)            | ✅              |
| Composition strategies | ✅ (9 strategies) | ❌                     | ❌              |
| Decorator inheritance  | ✅                | ⚠️ (requires wrapping) | ❌              |
| TypeScript 5.x         | ✅                | ✅                     | ❌ (abandoned)  |
| Zero dependencies      | ✅                | ✅                     | ✅              |

## License

MIT

````

##### Step 7 Verification Checklist
- [x] Verify README renders correctly.
- [x] Ensure `pnpm --filter polymix test` stays green.

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
