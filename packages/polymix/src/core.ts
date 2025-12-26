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

			if (typeof descriptor.value === 'function') {
				const functions = methodCompositionMap.get(propKey) ?? [];
				functions.push(descriptor.value);
				methodCompositionMap.set(propKey, functions);

				const strategySymbol = Symbol.for(
					`polymix:strategy:${String(propKey)}`,
				);
				const symbolStrategy = (Mixin as any)[strategySymbol];
				if (symbolStrategy) {
					strategyMap.set(propKey, symbolStrategy);
				} else {
					const meta = MIXIN_METADATA.get(Mixin);
					const metaStrategy = meta?.strategies.get(propKey);
					if (metaStrategy) {
						strategyMap.set(propKey, metaStrategy);
					}
				}
			} else {
				Object.defineProperty(Mixed.prototype, propKey, descriptor);
			}
		}
	}

	// Compose methods from the map.
	for (const [propKey, fns] of Array.from(methodCompositionMap.entries())) {
		const strategy = strategyMap.get(propKey) ?? 'override';
		let composedFn;

		if (fns.length === 1) {
			composedFn = fns[0];
		} else if (strategy === 'override') {
			composedFn = fns[fns.length - 1];
		} else {
			composedFn = function (this: any, ...args: any[]) {
				return applyStrategy(strategy, fns, this, ...args);
			};
		}

		Object.defineProperty(Mixed.prototype, propKey, {
			value: composedFn,
			writable: true,
			configurable: true,
			enumerable: false,
		});
	}

	// Copy decorator metadata from all mixins to the final class.
	copyDecoratorMetadata(pureMixins, Mixed);

	// Return the fully composed class, cast to the correct mixed type.
	return Mixed as any;
}
