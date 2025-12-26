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
