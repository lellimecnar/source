/**
 * @jsonpath/jsonpath
 *
 * Merge API for JSONPath.
 *
 * @packageDocumentation
 */

export interface MergeOptions {
	/** How to handle arrays: 'replace' | 'concat' | 'union' */
	arrays?: 'replace' | 'concat' | 'union';
}

/**
 * Deep merges multiple documents into a target object.
 */
export function merge<T = any>(target: T, ...sources: any[]): T {
	return mergeWith(target, sources);
}

/**
 * Deep merges multiple documents with options.
 */
export function mergeWith<T = any>(
	target: T,
	sources: any[],
	options: MergeOptions = {},
): T {
	const { arrays = 'replace' } = options;
	let result = structuredClone(target);

	for (const source of sources) {
		result = deepMerge(result, source, arrays);
	}

	return result;
}

function deepMerge(
	target: any,
	source: any,
	arrayStrategy: 'replace' | 'concat' | 'union',
): any {
	if (source === null || typeof source !== 'object') {
		return source;
	}

	if (Array.isArray(source)) {
		if (!Array.isArray(target) || arrayStrategy === 'replace') {
			return structuredClone(source);
		}
		if (arrayStrategy === 'concat') {
			return [...target, ...structuredClone(source)];
		}
		if (arrayStrategy === 'union') {
			const combined = [...target, ...source];
			const seen = new Set<string>();
			const result: any[] = [];
			for (const item of combined) {
				const s = JSON.stringify(item);
				if (!seen.has(s)) {
					seen.add(s);
					result.push(structuredClone(item));
				}
			}
			return result;
		}
	}

	if (target === null || typeof target !== 'object' || Array.isArray(target)) {
		return structuredClone(source);
	}

	const result = { ...target };
	for (const key of Object.keys(source)) {
		result[key] = deepMerge(target[key], source[key], arrayStrategy);
	}
	return result;
}
