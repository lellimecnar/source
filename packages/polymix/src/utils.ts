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
