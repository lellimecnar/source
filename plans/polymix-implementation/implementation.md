# Polymix Implementation

## Goal
Implement the `polymix` library for advanced TypeScript mixins, providing a robust, type-safe solution with `instanceof` support, method composition strategies, and decorator support.

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
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "@lellimecnar/jest-config": "workspace:*",
    "typescript": "~5.5",
    "eslint": "^8.57.1",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "peerDependencies": {
    "reflect-metadata": "^0.1.13"
  }
}
```

- [x] Copy and paste code below into `packages/polymix/tsconfig.json`:

```json
{
  "extends": "@lellimecnar/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src/**/*"]
}
```

- [x] Copy and paste code below into `packages/polymix/.eslintrc.js`:

```javascript
module.exports = require('@lellimecnar/eslint-config/base');
```

- [x] Copy and paste code below into `packages/polymix/jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
```

- [x] Create empty source directory and index file.
- [x] Copy and paste code below into `packages/polymix/src/index.ts`:

```typescript
// Initial empty export
export {};
```

##### Step 1 Verification Checklist
- [x] Run `pnpm install` to link the new workspace.
- [x] Run `pnpm build --filter polymix` to verify configuration validity.

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Implement Core Types and Utilities
- [x] Create `src/types.ts` with core type definitions.
- [x] Copy and paste code below into `packages/polymix/src/types.ts`:

```typescript
export type Constructor<T = {}> = new (...args: any[]) => T;
export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;
export type AnyConstructor<T = {}> = Constructor<T> | AbstractConstructor<T>;

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
import { AnyConstructor, MixinMetadata } from './types';

export const MIXIN_REGISTRY = new WeakMap<object, Set<AnyConstructor>>();
export const MIXIN_METADATA = new WeakMap<AnyConstructor, MixinMetadata>();

export function getMixinRegistry(instance: object): Set<AnyConstructor> | undefined {
	return MIXIN_REGISTRY.get(instance);
}

export function registerMixins(instance: object, mixins: AnyConstructor[]): void {
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

			// Property-level metadata
			for (const propKey of Object.keys(Mixin.prototype)) {
				const propMetaKeys = (Reflect as any).getMetadataKeys(
					Mixin.prototype,
					propKey,
				);
				for (const key of propMetaKeys) {
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
				const value = Mixin.prototype[prop];
				if (typeof value === 'function') {
					return value.bind(target);
				}
				return value;
			}
			return target[prop];
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
- [x] Run `pnpm build --filter polymix` to ensure types and utils compile correctly.

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: Implement Composition Strategies
- [x] Create `src/strategies.ts` with composition strategy logic.
- [x] Create `src/strategies.spec.ts` with unit tests.

#### Step 4: Implement Core Mixin Logic
- [x] Create `src/core.ts` with the main `mix` function.
- [x] Create `src/core.spec.ts` with unit tests.
- [x] Update `src/index.ts` to export the new modules.

#### Step 5: Implement Decorators
- [x] Create `src/decorators.ts` with decorator implementations.
- [x] Create `src/decorators.spec.ts` with unit tests.
- [x] Update `src/index.ts` to export decorators.
- [x] Copy and paste code below into `packages/polymix/src/decorators.ts`:

```typescript
import { AnyConstructor, Constructor, MixedClass, MixinMetadata } from './types';
import { mix } from './core';
import { MIXIN_METADATA } from './utils';

export function mixin<T extends AnyConstructor[]>(...mixins: T) {
	return function <C extends Constructor>(Target: C): C & MixedClass<T> {
		const Mixed = mix(...mixins, Target as any);

		// Preserve the original class name
		Object.defineProperty(Mixed, 'name', { value: Target.name });

		return Mixed as C & MixedClass<T>;
	};
}

export function abstract<T extends AnyConstructor>(Target: T): T {
	const metadata: MixinMetadata = MIXIN_METADATA.get(Target) ?? {
		isAbstract: false,
		strategies: new Map(),
		decoratorMetadata: new Map(),
	};
	metadata.isAbstract = true;
	MIXIN_METADATA.set(Target, metadata);
	return Target;
}

export function pipe(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	const strategySymbol = Symbol.for(`polymix:strategy:${propertyKey}`);
	target.constructor[strategySymbol] = 'pipe';
	return descriptor;
}

export function parallel(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	const strategySymbol = Symbol.for(`polymix:strategy:${propertyKey}`);
	target.constructor[strategySymbol] = 'parallel';
	return descriptor;
}
```

- [x] Create `src/decorators.spec.ts` with unit tests.
- [x] Copy and paste code below into `packages/polymix/src/decorators.spec.ts`:

```typescript
import { mixin, pipe } from './decorators';
import { applyStrategy } from './strategies';

describe('Decorators', () => {
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

	it('should apply strategy decorator', () => {
		class A {
			@pipe
			method(x: number) {
				return x + 1;
			}
		}
		
		const strategySymbol = Symbol.for('polymix:strategy:method');
		expect((A as any)[strategySymbol]).toBe('pipe');
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
- [x] Run `pnpm build --filter polymix` to ensure decorators compile correctly.

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: Migrate Tests and Cleanup
- [x] Create `src/__tests__/polymix.spec.ts` with comprehensive tests.
- [x] Copy and paste code below into `packages/polymix/src/__tests__/polymix.spec.ts`:

```typescript
import { mix, hasMixin, from } from '../index';

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

		static fromJSON<T>(this: new () => T, json: object): T {
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
		const user = User.fromJSON({ name: 'Bob', email: 'bob@example.com' });
		expect(user).toBeInstanceOf(User);
		expect(user.name).toBe('Bob');
	});
});
```

##### Step 6 Verification Checklist
- [x] Run `pnpm test --filter polymix` to ensure all tests pass.

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: Documentation
- [x] Create `packages/polymix/README.md`.
- [x] Copy and paste code below into `packages/polymix/README.md`:

```markdown
# polymix

Next-Generation TypeScript Mixins.

## Features

- **True `instanceof` support**: Mixed instances pass `instanceof` checks for all mixin classes.
- **Type-safe**: Full TypeScript support with type inference for mixed methods and properties.
- **Composition Strategies**: Control how methods are merged (override, pipe, parallel, etc.).
- **Decorators**: Easy-to-use decorators for applying mixins and strategies.

## Installation

```bash
pnpm add polymix
```

## Usage

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

console.log(user.id); // '123'
console.log(user.createdAt); // Date object
console.log(user instanceof Identifiable); // true
```

## API

### `mix(...mixins)`

Creates a new class that extends all provided mixins.

### `hasMixin(instance, Mixin)`

Type guard to check if an instance has a specific mixin.

### `from(instance, Mixin)`

Disambiguates method calls when multiple mixins have methods with the same name.

### Strategies

- `override`: Last mixin wins (default).
- `pipe`: Output of one method becomes input of the next.
- `parallel`: Run all methods concurrently (Promise.all).
- `merge`: Deep merge results.
```

##### Step 7 Verification Checklist
- [ ] Verify README renders correctly.

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
