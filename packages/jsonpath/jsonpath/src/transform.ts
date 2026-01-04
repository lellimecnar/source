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
	const patch: PatchOperation[] = results.nodes().map((node) => ({
		op: 'replace',
		path: node.path
			.map((seg) => String(seg).replace(/~/g, '~0').replace(/\//g, '~1'))
			.join('/'),
		value: fn(node.value),
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
	let result = root;
	for (const path of paths) {
		const results = query(root, path);
		const patch: PatchOperation[] = results.normalizedPaths().map((p) => ({
			op: 'remove',
			path: p,
		}));
		result = applyPatch(result, patch);
	}
	return result;
}
