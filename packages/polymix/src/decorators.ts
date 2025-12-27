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

/**
 * Class decorator that applies one or more mixins to an existing class.
 *
 * @example
 * ```ts
 * @mixin(Timestamped, Identifiable)
 * class User {}
 * ```
 */
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

/** Alias for {@link mixin}. */
export function Use<T extends AnyConstructor[]>(...mixins: T) {
	return mixin(...mixins);
}

/** Marks a mixin as abstract so it is not instantiated during construction. */
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

/**
 * Delegates methods to an instance property.
 *
 * @example
 * ```ts
 * class Service { doWork() {} }
 *
 * class Worker {
 *   service = new Service()
 *
 *   @delegate(Service)
 *   doWork!: Service['doWork']
 * }
 * ```
 */
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

/** Chains method calls in sequence (output of one becomes input of next). */
export function pipe(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'pipe');
	return descriptor;
}

/** Composes method results using functional composition. */
export function compose(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'compose');
	return descriptor;
}

/** Executes all method implementations in parallel and returns array of results. */
export function parallel(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'parallel');
	return descriptor;
}

/** Returns the result of the first method to complete. */
export function race(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'race');
	return descriptor;
}

/** Merges all method results into a single object. */
export function merge(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'merge');
	return descriptor;
}

/** Returns the first truthy result from all implementations. */
export function first(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'first');
	return descriptor;
}

/** Returns true only if all implementations return truthy values. */
export function all(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'all');
	return descriptor;
}

/** Returns true if any implementation returns a truthy value. */
export function any(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	setStrategy(target.constructor, propertyKey, 'any');
	return descriptor;
}
