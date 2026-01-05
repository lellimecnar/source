/**
 * @jsonpath/merge-patch
 *
 * Conversion between JSON Merge Patch and JSON Patch.
 *
 * @packageDocumentation
 */

import type { PatchOperation } from '@jsonpath/patch';

import { applyMergePatchWithTrace } from './trace.js';

/**
 * Converts a JSON Merge Patch to a JSON Patch (RFC 6902).
 *
 * @param patch - The JSON Merge Patch.
 * @param target - The target document (required to determine deletions vs replacements).
 * @returns An array of JSON Patch operations.
 */
export function toJSONPatch(patch: any, target: any): PatchOperation[] {
	const { trace } = applyMergePatchWithTrace(target, patch, { mutate: false });

	return trace.map((op) => {
		if (op.type === 'delete') {
			return { op: 'remove', path: op.path };
		}

		// If oldValue is undefined, it's an 'add', otherwise it's a 'replace'
		// However, RFC 6902 'add' to an existing member is also valid.
		// For simplicity and consistency with merge-patch semantics, we use 'add'
		// if it didn't exist, and 'replace' if it did.
		if (op.oldValue === undefined) {
			return { op: 'add', path: op.path, value: op.value };
		}
		return { op: 'replace', path: op.path, value: op.value };
	});
}

/**
 * Converts a JSON Patch to a JSON Merge Patch.
 * Note: This is lossy as JSON Merge Patch cannot represent all JSON Patch operations
 * (e.g., array insertions, moves, copies, or tests).
 *
 * @param ops - The JSON Patch operations.
 * @returns A JSON Merge Patch.
 */
export function fromJSONPatch(ops: PatchOperation[]): any {
	const patch: any = {};

	for (const op of ops) {
		if (op.op === 'add' || op.op === 'replace') {
			setPath(patch, op.path, op.value);
		} else if (op.op === 'remove') {
			setPath(patch, op.path, null);
		}
		// 'move', 'copy', 'test' are ignored or would require a target to resolve
	}

	return patch;
}

function setPath(obj: any, path: string, value: any): void {
	const parts = path
		.split('/')
		.slice(1)
		.map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
	if (parts.length === 0) return;

	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i]!;
		if (
			!(part in current) ||
			typeof current[part] !== 'object' ||
			current[part] === null
		) {
			current[part] = {};
		}
		current = current[part];
	}

	current[parts[parts.length - 1]!] = value;
}
