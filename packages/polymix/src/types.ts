/** Standard (concrete) constructor type. */
export type Constructor<T = object> = new (...args: any[]) => T;

/** Abstract constructor type. */
export type AbstractConstructor<T = object> = abstract new (
	...args: any[]
) => T;

/** Union of concrete and abstract constructor types used by polymix. */
export type AnyConstructor<T = object> =
	| Constructor<T>
	| AbstractConstructor<T>;

// Merge instance types from all mixins (variadic - no limit!)
export type UnionToIntersection<U> = (
	U extends any ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;

export type MixedInstance<T extends AnyConstructor[]> = UnionToIntersection<
	InstanceType<T[number]>
>;

export type MixedStatic<T extends AnyConstructor[]> = UnionToIntersection<
	T[number]
>;

export type MixedClass<T extends AnyConstructor[]> = Constructor<
	MixedInstance<T>
> &
	Omit<MixedStatic<T>, 'prototype'>;

/** Internal metadata tracked per mixin constructor. */
export interface MixinMetadata {
	isAbstract: boolean;
	strategies: Map<string | symbol, any>;
	decoratorMetadata: Map<string | symbol, any[]>;
}
