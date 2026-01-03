function isObject(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object';
}

function sameRegExp(a: RegExp, b: RegExp): boolean {
	return a.source === b.source && a.flags === b.flags;
}

export function deepEqual(a: any, b: any): boolean {
	const seen = new WeakMap<object, WeakSet<object>>();

	const inner = (x: any, y: any): boolean => {
		if (x === y) return true;
		if (typeof x !== typeof y) return false;
		if (x === null || y === null) return x === y;
		if (typeof x !== 'object') return x === y;

		// Date comparison
		if (x instanceof Date && y instanceof Date) {
			return x.getTime() === y.getTime();
		}

		// RegExp comparison
		if (x instanceof RegExp && y instanceof RegExp) {
			return sameRegExp(x, y);
		}

		// Array vs object mismatch
		if (Array.isArray(x) !== Array.isArray(y)) return false;

		// Circular reference handling
		if (isObject(x) && isObject(y)) {
			const existing = seen.get(x);
			if (existing?.has(y)) return true;
			if (!existing) seen.set(x, new WeakSet([y]));
			else existing.add(y);
		}

		if (Array.isArray(x)) {
			if (x.length !== y.length) return false;
			for (let i = 0; i < x.length; i++) {
				if (!inner(x[i], y[i])) return false;
			}
			return true;
		}

		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);
		if (xKeys.length !== yKeys.length) return false;
		for (const k of xKeys) {
			if (!Object.prototype.hasOwnProperty.call(y, k)) return false;
			if (!inner(x[k], y[k])) return false;
		}
		return true;
	};

	return inner(a, b);
}

export function deepExtends(target: any, partial: any): boolean {
	if (partial === undefined) return true;
	if (partial === null || typeof partial !== 'object') {
		return deepEqual(target, partial);
	}
	if (target === null || typeof target !== 'object') return false;

	if (Array.isArray(partial)) {
		if (!Array.isArray(target)) return false;
		if (partial.length > target.length) return false;
		for (let i = 0; i < partial.length; i++) {
			if (!deepExtends(target[i], partial[i])) return false;
		}
		return true;
	}

	for (const k of Object.keys(partial)) {
		if (!Object.prototype.hasOwnProperty.call(target, k)) return false;
		if (!deepExtends(target[k], partial[k])) return false;
	}
	return true;
}
