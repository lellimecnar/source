/**
 * @jsonpath/merge-patch
 *
 * RFC 7386 tracing helpers.
 *
 * @packageDocumentation
 */

import { applyMergePatch, type MergePatchOptions } from './merge-patch.js';

/**
 * Represents an operation performed during a merge patch.
 */
export interface MergePatchOperation {
	/** The type of operation: 'set' or 'delete' */
	type: 'set' | 'delete';
	/** The path to the property (JSON Pointer format) */
	path: string;
	/** The new value (for 'set' operations) */
	value?: unknown;
	/** The old value (if available) */
	oldValue?: unknown;
}

/**
 * The result of a merge patch with trace information.
 */
export interface MergePatchResult<T> {
	/** The resulting document */
	result: T;
	/** The list of operations performed */
	trace: MergePatchOperation[];
}

/**
 * Applies a JSON Merge Patch and returns a trace of the operations performed.
 *
 * @param target - The target document.
 * @param patch - The merge patch.
 * @param options - Merge patch options.
 * @returns The result and a trace of operations.
 */
export function applyMergePatchWithTrace<T = any>(
	target: T,
	patch: any,
	options: MergePatchOptions = {},
): MergePatchResult<T> {
	const trace: MergePatchOperation[] = [];
	const mutate = options.mutate !== false;

	// We wrap the target to capture changes if we're not mutating
	// or we just use the target if we are.
	// To get a trace, we need to intercept the changes.
	// A simple way is to use a recursive function that mirrors applyMergePatch
	// but records changes.

	const result = recordMerge(target, patch, '', trace, options);

	return { result, trace };
}

function isObject(value: any): value is Record<string, any> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordMerge(
	target: any,
	patch: any,
	currentPath: string,
	trace: MergePatchOperation[],
	options: MergePatchOptions,
): any {
	if (!isObject(patch)) {
		if (patch === null) {
			trace.push({
				type: 'delete',
				path: currentPath || '/',
				oldValue: target,
			});
			return null;
		}
		trace.push({
			type: 'set',
			path: currentPath || '/',
			value: patch,
			oldValue: target,
		});
		return patch;
	}

	if (!isObject(target)) {
		target = {};
	}

	const out: Record<string, any> = options.mutate ? target : { ...target };

	for (const key of Object.keys(patch)) {
		const value = patch[key];
		const path = `${currentPath}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;

		if (value === null) {
			if (key in out) {
				const oldValue = out[key];
				delete out[key];
				trace.push({
					type: 'delete',
					path,
					oldValue,
				});
			}
		} else if (isObject(value)) {
			out[key] = recordMerge(out[key], value, path, trace, options);
		} else {
			const oldValue = out[key];
			out[key] = value;
			trace.push({
				type: 'set',
				path,
				value,
				oldValue,
			});
		}
	}

	return out;
}
