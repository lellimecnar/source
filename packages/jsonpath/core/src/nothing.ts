export const Nothing = Symbol.for('@jsonpath/nothing');
export type Nothing = typeof Nothing;

export function isNothing(value: unknown): value is Nothing {
	return value === Nothing;
}
