export function defaultEquality<T>(a: T, b: T): boolean {
	return Object.is(a, b);
}
