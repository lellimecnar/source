export type Constructor<T = object> = new (...args: any[]) => T;
export type AbstractConstructor<T = object> = abstract new (
	...args: any[]
) => T;
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

export interface MixinMetadata {
	isAbstract: boolean;
	strategies: Map<string | symbol, any>;
	decoratorMetadata: Map<string | symbol, any[]>;
}
