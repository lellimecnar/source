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
