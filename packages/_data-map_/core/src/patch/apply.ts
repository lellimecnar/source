import type { Operation } from '../types';
import { applyOperations as applyPatchOperations } from '../utils/jsonpath';
import { updateAtPointer } from '../utils/structural-sharing';

export interface ApplyResult {
	nextData: unknown;
	affectedPointers: Set<string>;
	structuralPointers: Set<string>;
}

function parentPointer(pointer: string): string {
	if (pointer === '') return '';
	const idx = pointer.lastIndexOf('/');
	if (idx <= 0) return '';
	return pointer.slice(0, idx);
}

function isStructuralOp(op: Operation): boolean {
	return (
		op.op === 'add' ||
		op.op === 'remove' ||
		op.op === 'move' ||
		op.op === 'copy'
	);
}

export function applyOperations(
	currentData: unknown,
	ops: Operation[],
): ApplyResult {
	// Fast-path: for pure pointer `replace` operations on existing paths, use structural-sharing.
	// Fall back to JSON Patch engine for all other ops (add, remove, etc).
	let nextData: unknown = currentData;
	let allFastPath = true;

	// Check if all ops are simple replace operations
	for (const op of ops) {
		if (op.op !== 'replace' || !op.path.startsWith('/')) {
			allFastPath = false;
			break;
		}
	}

	if (allFastPath && ops.length > 0) {
		// Try fast-path: apply replace ops using structural sharing
		for (const op of ops) {
			nextData = updateAtPointer(nextData, op.path, op.value);
		}
	} else {
		// Default to immutable semantics; DataMap will decide whether it can safely mutate.
		nextData = applyPatchOperations(currentData, ops, { mutate: false });
	}

	const affectedPointers = new Set<string>();
	const structuralPointers = new Set<string>();

	for (const op of ops) {
		affectedPointers.add(op.path);
		if (isStructuralOp(op)) {
			structuralPointers.add(parentPointer(op.path));
		}
		if (op.op === 'move' || op.op === 'copy') {
			affectedPointers.add(op.from);
			structuralPointers.add(parentPointer(op.from));
		}
	}

	return { nextData, affectedPointers, structuralPointers };
}
