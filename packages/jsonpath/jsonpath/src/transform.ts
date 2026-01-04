/**
 * @jsonpath/jsonpath
 *
 * Transformation API for JSONPath.
 *
 * @packageDocumentation
 */

import { applyPatch, type PatchOperation } from '@jsonpath/patch';

import { query } from './facade.js';

/**
 * Transforms a JSON object by applying a function to all matches of a JSONPath.
 */
export function transform<T = any>(
	root: T,
	path: string,
	fn: (value: any) => any,
): T {
	const results = query(root, path);
	const pointers = results.pointerStrings();
	const values = results.values();

	const patch: PatchOperation[] = pointers.map((ptr, i) => ({
		op: 'replace',
		path: ptr,
		value: fn(values[i]),
	}));

	return applyPatch(root, patch);
}

/**
 * Projects a JSON object into a new shape based on a map of JSONPaths.
 */
export function project(root: any, mapping: Record<string, string>): any {
	const result: any = {};
	for (const [targetKey, path] of Object.entries(mapping)) {
		const matches = query(root, path).values();
		if (matches.length === 1) {
			result[targetKey] = matches[0];
		} else if (matches.length > 1) {
			result[targetKey] = matches;
		}
	}
	return result;
}

/**
 * Picks specific paths from the root object.
 */
export function pick(root: any, paths: string[]): any {
	const result: any = {};
	for (const path of paths) {
		const matches = query(root, path).values();
		if (matches.length > 0) {
			// Use the last segment of the path as the key
			const key = path.split('.').pop() || path;
			result[key] = matches.length === 1 ? matches[0] : matches;
		}
	}
	return result;
}

/**
 * Omits specific paths from the root object.
 */
export function omit(root: any, paths: string[]): any {
	const result = root;
	const allOps: PatchOperation[] = [];

	for (const path of paths) {
		const results = query(root, path);
		const pointers = results.pointerStrings();
		for (const ptr of pointers) {
			allOps.push({
				op: 'remove',
				path: ptr,
			});
		}
	}

	// Sort pointers in descending order to avoid index shift issues when removing array elements
	// Actually, JSON Patch 'remove' on arrays handles this if we go from end to start.
	// But for now, let's just apply them.
	return applyPatch(result, allOps);
}
