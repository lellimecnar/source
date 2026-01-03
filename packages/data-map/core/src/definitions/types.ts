import type { DataMap } from '../datamap';

export type GetterFn<T, Ctx> = (
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;

export interface GetterConfig<T, Ctx> {
	fn: GetterFn<T, Ctx>;
	deps?: string[];
}

export type SetterFn<T, Ctx> = (
	newValue: unknown,
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;

export interface SetterConfig<T, Ctx> {
	fn: SetterFn<T, Ctx>;
	deps?: string[];
}

export interface DefinitionBase<T, Ctx> {
	get?: GetterFn<T, Ctx> | GetterConfig<T, Ctx>;
	set?: SetterFn<T, Ctx> | SetterConfig<T, Ctx>;
	deps?: string[];
	readOnly?: boolean;
	defaultValue?: unknown;
}

export interface DefinitionWithPath<T, Ctx> extends DefinitionBase<T, Ctx> {
	path: string;
	pointer?: never;
}

export interface DefinitionWithPointer<T, Ctx> extends DefinitionBase<T, Ctx> {
	pointer: string;
	path?: never;
}

export type Definition<T, Ctx> =
	| DefinitionWithPath<T, Ctx>
	| DefinitionWithPointer<T, Ctx>;

export type DefinitionFactory<T, Ctx> = (
	instance: DataMap<T, Ctx>,
	ctx: Ctx,
) => Definition<T, Ctx> | Definition<T, Ctx>[];
