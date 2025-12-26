# Polymix Enhancements & Compatibility

## Goal
Enhance `@lellimecnar/polymix` to support the `init` method pattern used in `@card-stack/core`, improve the robustness of mixin composition, and prepare the library to serve as a drop-in replacement for `ts-mixer`.

## Prerequisites
Make sure that the use is currently on the `feat/polymix-improvements` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from main.

### Step-by-Step Instructions

#### Step 1: Implement `init` Lifecycle Support
- [ ] Modify `packages/polymix/src/core.ts` to invoke `init` methods on mixins during construction.
- [ ] Copy and paste code below into `packages/polymix/src/core.ts`:

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

	const Mixed = class extends (Base as AnyConstructor) {
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
				const initMethod = (Mixin.prototype as any).init;
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
		const protoKeys: Array<string | symbol> = [
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
				const strategy = applyStrategy(Mixin.prototype, propKey);
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
		// If only one method exists and it's not on the base class, just define it.
		// If it IS on the base class, we might want to override it or call super.
		// For now, we simply overwrite if there's no strategy.
		if (methods.length === 1 && !strategyMap.has(propKey)) {
			Mixed.prototype[propKey] = methods[0];
			continue;
		}

		const strategy = strategyMap.get(propKey) || 'override'; // Default to override (last wins)

		if (strategy === 'override') {
			Mixed.prototype[propKey] = methods[methods.length - 1];
		} else if (strategy === 'pipe') {
			Mixed.prototype[propKey] = function (...args: any[]) {
				let result = args;
				for (const method of methods) {
					// If result is an array, spread it. If not, pass as single arg.
					// This is a simplification; robust piping might need more logic.
					const nextArgs = Array.isArray(result) ? result : [result];
					result = method.apply(this, nextArgs);
				}
				return result;
			};
		} else if (strategy === 'compose') {
			Mixed.prototype[propKey] = function (...args: any[]) {
				// Execute all methods in order
				const results = methods.map((m) => m.apply(this, args));
				// Return the result of the last one
				return results[results.length - 1];
			};
		}
	}

	// Copy decorator metadata from mixins to the new class
	copyDecoratorMetadata(pureMixins, Mixed);

	return Mixed as any;
}
```

- [ ] Create `packages/polymix/src/__tests__/lifecycle.spec.ts` to verify `init` execution.
- [ ] Copy and paste code below into `packages/polymix/src/__tests__/lifecycle.spec.ts`:

```typescript
import { mix } from '../core';

describe('Lifecycle Methods', () => {
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

##### Step 1 Verification Checklist
- [ ] Run `pnpm --filter @lellimecnar/polymix test` and ensure all tests pass, including the new lifecycle tests.

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Robust Metadata Discovery
- [ ] Modify `packages/polymix/src/utils.ts` to improve property discovery using instantiation.
- [ ] Copy and paste code below into `packages/polymix/src/utils.ts`:

```typescript
import { type AnyConstructor, type MixinMetadata } from './types';

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
					(Reflect as any).defineMetadata(key, value, target.prototype, propKey);
				}
			}
		}
	}
}
```

##### Step 2 Verification Checklist
- [ ] Run `pnpm --filter @lellimecnar/polymix test` and ensure all tests pass.

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: TS-Mixer Compatibility Verification
- [ ] Create `packages/polymix/src/__tests__/compatibility.spec.ts` to verify compatibility with `ts-mixer` patterns.
- [ ] Copy and paste code below into `packages/polymix/src/__tests__/compatibility.spec.ts`:

```typescript
import { mix } from '../core';

describe('TS-Mixer Compatibility', () => {
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
		// or we use .with(Base).
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

##### Step 3 Verification Checklist
- [ ] Run `pnpm --filter @lellimecnar/polymix test` and ensure all tests pass.

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
