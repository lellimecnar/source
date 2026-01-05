/**
 * @jsonpath/jsonpath
 *
 * Merge API for JSONPath.
 *
 * @packageDocumentation
 */

import { applyMergePatch } from '@jsonpath/merge-patch';

/**
 * Merges a patch into a root object using JSON Merge Patch (RFC 7386).
 */
export function merge<T = any>(root: T, patch: any): T {
	return applyMergePatch(root, patch);
}

/**
 * Merges multiple patches into a root object.
 */
export function mergeWith<T = any>(root: T, ...patches: any[]): T {
	let current = root;
	for (const patch of patches) {
		current = applyMergePatch(current, patch);
	}
	return current;
}
