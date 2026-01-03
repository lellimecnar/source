export function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return a === b;
	if (typeof a !== 'object') return a === b;
	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
		return true;
	}

	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const k of aKeys) {
		if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
		if (!deepEqual(a[k], b[k])) return false;
	}
	return true;
}

export function deepExtends(target: any, partial: any): boolean {
	if (partial === undefined) return true;
	if (partial === null || typeof partial !== 'object')
		return deepEqual(target, partial);
	if (target === null || typeof target !== 'object') return false;

	if (Array.isArray(partial)) {
		if (!Array.isArray(target)) return false;
		if (partial.length > target.length) return false;
		for (let i = 0; i < partial.length; i++)
			if (!deepExtends(target[i], partial[i])) return false;
		return true;
	}

	for (const k of Object.keys(partial)) {
		if (!Object.prototype.hasOwnProperty.call(target, k)) return false;
		if (!deepExtends(target[k], partial[k])) return false;
	}
	return true;
}
