import { deepEqual, fastDeepClone } from '@jsonpath/core';

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

function isPlainObject(value: unknown): value is Record<string, any> {
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

	if (!isPlainObject(patch)) {
		return patch;
	}

	if (!isPlainObject(target)) {
		if (mutate) return patch;
		target = {};
	}

	const out: Record<string, any> = mutate ? target : { ...target };

	for (const key in patch) {
		if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
		const value = patch[key];

		if (value === null) {
			if (nullBehavior === 'delete') delete out[key];
			else out[key] = null;
			continue;
		}

		if (Array.isArray(value)) {
			if (arrayMergeStrategy === 'replace') out[key] = value;
			continue;
		}

		if (isPlainObject(value) && isPlainObject(out[key])) {
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
	if (!isPlainObject(source) || !isPlainObject(target)) {
		return deepEqual(source, target) ? {} : fastDeepClone(target);
	}

	const patch: Record<string, any> = {};

	for (const key in source) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

		if (!Object.prototype.hasOwnProperty.call(target, key)) {
			patch[key] = null;
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (deepEqual(s, t)) continue;

		if (isPlainObject(s) && isPlainObject(t)) {
			const child = createMergePatch(s, t);
			if (isPlainObject(child) && Object.keys(child).length === 0) continue;
			patch[key] = child;
			continue;
		}

		patch[key] = t;
	}

	for (const key in target) {
		if (!Object.prototype.hasOwnProperty.call(target, key)) continue;
		if (Object.prototype.hasOwnProperty.call(source, key)) continue;
		patch[key] = target[key];
	}

	return patch;
}
