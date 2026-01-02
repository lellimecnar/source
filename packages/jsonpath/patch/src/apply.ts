import { getByPointer, removeByPointer, setByPointer } from '@jsonpath/pointer';

import type { JsonPatchOp } from './types';

function deepEqual(a: any, b: any): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== typeof b) return false;
	if (a == null || b == null) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i += 1) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	if (typeof a === 'object' && typeof b === 'object') {
		const ak = Object.keys(a);
		const bk = Object.keys(b);
		if (ak.length !== bk.length) return false;
		ak.sort();
		bk.sort();
		for (let i = 0; i < ak.length; i += 1) {
			if (ak[i] !== bk[i]) return false;
		}
		for (const k of ak) {
			if (!deepEqual(a[k], b[k])) return false;
		}
		return true;
	}
	return false;
}

export function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): unknown {
	let current: unknown = doc;
	for (const op of ops) {
		if (op.op === 'add' || op.op === 'replace') {
			current = setByPointer(current, op.path, op.value);
			continue;
		}
		if (op.op === 'remove') {
			current = removeByPointer(current, op.path);
			continue;
		}
		if (op.op === 'copy') {
			const value = getByPointer(current, op.from);
			current = setByPointer(current, op.path, value);
			continue;
		}
		if (op.op === 'move') {
			const value = getByPointer(current, op.from);
			current = removeByPointer(current, op.from);
			current = setByPointer(current, op.path, value);
			continue;
		}
		if (op.op === 'test') {
			const actual = getByPointer(current, op.path);
			if (!deepEqual(actual, op.value)) {
				throw new Error('JSON Patch test operation failed');
			}
			continue;
		}
		const _exhaustive: never = op;
		throw new Error('Unsupported JSON Patch operation');
	}
	return current;
}
