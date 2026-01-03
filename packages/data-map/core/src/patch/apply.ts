import { jsonpatch } from 'json-p3';

import type { Operation } from '../types';

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
	const working = structuredClone(currentData);
	jsonpatch.apply(ops as any, working as any);

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

	return { nextData: working, affectedPointers, structuralPointers };
}
