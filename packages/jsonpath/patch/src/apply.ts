import type { JsonPatchOp } from './types';

import { removeByPointer, setByPointer } from '@jsonpath/pointer';

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
		const _exhaustive: never = op;
		throw new Error('Unsupported JSON Patch operation');
	}
	return current;
}
