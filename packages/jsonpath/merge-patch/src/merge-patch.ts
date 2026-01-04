import { deepEqual } from '@jsonpath/core';

/**
 * JSON Merge Patch (RFC 7386) implementation.
 */
export interface MergePatchOptions {
	/** When patch value is null: delete property (default: 'delete') */
	readonly nullBehavior?: 'delete' | 'set-null';

	/** Strategy for arrays (default: 'replace') */
	readonly arrayMergeStrategy?: 'replace';

	/** Whether to mutate the target object (default: true) */
	readonly mutate?: boolean;
}

function isObject(value: any): value is Record<string, any> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function applyMergePatch(
	target: any,
	patch: any,
	options: MergePatchOptions = {},
): any {
	const {
		nullBehavior = 'delete',
		arrayMergeStrategy = 'replace',
		mutate = true,
	} = options;

	// RFC 7386: non-object patch replaces target.
	if (!isObject(patch)) {
		return patch;
	}

	// RFC 7386: if target is not an object, treat as empty object.
	if (!isObject(target)) {
		if (mutate) {
			// Cannot mutate non-object into object in-place if it's a primitive
			// but we return the patch as per RFC.
			return patch;
		}
		target = {};
	}

	const out: Record<string, any> = mutate ? target : { ...target };

	for (const key of Object.keys(patch)) {
		const value = patch[key];
		if (value === null) {
			if (nullBehavior === 'delete') {
				delete out[key];
			} else {
				out[key] = null;
			}
			continue;
		}

		if (Array.isArray(value)) {
			if (arrayMergeStrategy === 'replace') {
				out[key] = value;
			}
			continue;
		}

		if (isObject(value)) {
			// For nested objects, we always mutate the child if we are mutating the parent
			out[key] = applyMergePatch(out[key], value, { ...options, mutate: true });
			continue;
		}

		out[key] = value;
	}

	return out;
}

export function createMergePatch(source: any, target: any): any {
	// RFC 7386 algorithm: scalar/array differences produce replacement,
	// object differences produce object patch with deletions as null.
	if (!isObject(source) || !isObject(target)) {
		return deepEqual(source, target) ? {} : structuredClone(target);
	}

	const patch: Record<string, any> = {};
	const keys = new Set([...Object.keys(source), ...Object.keys(target)]);

	for (const key of keys) {
		if (!(key in target)) {
			patch[key] = null;
			continue;
		}
		if (!(key in source)) {
			patch[key] = structuredClone(target[key]);
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (deepEqual(s, t)) continue;

		if (isObject(s) && isObject(t)) {
			const child = createMergePatch(s, t);
			if (isObject(child) && Object.keys(child).length === 0) continue;
			patch[key] = child;
			continue;
		}

		patch[key] = structuredClone(t);
	}

	return patch;
}
