export function shallowEqual<T>(a: T, b: T): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== 'object' || typeof b !== 'object') return false;
	if (a === null || b === null) return false;

	const keysA = Object.keys(a as any);
	const keysB = Object.keys(b as any);
	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (
			!Object.hasOwn(b as any, key) ||
			!Object.is((a as any)[key], (b as any)[key])
		) {
			return false;
		}
	}

	return true;
}
