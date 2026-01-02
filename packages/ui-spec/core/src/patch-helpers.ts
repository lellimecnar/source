import { JSONPointer } from 'json-p3';

import { UISpecError } from './errors';
import type { JsonPatchOperation } from './store';

function escapeJsonPointerSegment(segment: string): string {
	return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function joinPointer(pointer: string, segment: string): string {
	const s = escapeJsonPointerSegment(segment);
	if (pointer === '') return `/${s}`;
	return `${pointer}/${s}`;
}

export function makeSetOps(
	pointer: string,
	doc: unknown,
	value: unknown,
): JsonPatchOperation[] {
	const ptr = new JSONPointer(pointer);
	const exists = ptr.exists(doc as any);
	return [
		exists
			? { op: 'replace', path: pointer, value }
			: { op: 'add', path: pointer, value },
	];
}

export function makeMergeOps(
	basePointer: string,
	current: unknown,
	partial: Record<string, unknown>,
): JsonPatchOperation[] {
	if (
		typeof current !== 'object' ||
		current === null ||
		Array.isArray(current)
	) {
		throw new UISpecError(
			'UI_SPEC_INVALID_SCHEMA',
			'merge target is not an object',
			{
				pointer: basePointer,
			},
		);
	}

	const ops: JsonPatchOperation[] = [];
	for (const [key, next] of Object.entries(partial)) {
		const path = joinPointer(basePointer, key);
		const hasKey = Object.prototype.hasOwnProperty.call(current, key);
		ops.push(
			hasKey
				? { op: 'replace', path, value: next }
				: { op: 'add', path, value: next },
		);
	}
	return ops;
}

export function makePushOps(
	basePointer: string,
	current: unknown,
	items: unknown[],
): JsonPatchOperation[] {
	if (!Array.isArray(current)) {
		throw new UISpecError(
			'UI_SPEC_INVALID_SCHEMA',
			'push target is not an array',
			{
				pointer: basePointer,
			},
		);
	}

	return items.map((value) => ({ op: 'add', path: `${basePointer}/-`, value }));
}

export function makeRemoveOps(
	basePointer: string,
	current: unknown,
	predicate: (item: unknown) => boolean,
): JsonPatchOperation[] {
	if (!Array.isArray(current)) {
		throw new UISpecError(
			'UI_SPEC_INVALID_SCHEMA',
			'remove target is not an array',
			{
				pointer: basePointer,
			},
		);
	}

	const ops: JsonPatchOperation[] = [];
	for (let i = current.length - 1; i >= 0; i -= 1) {
		if (predicate(current[i])) {
			ops.push({ op: 'remove', path: `${basePointer}/${i}` });
		}
	}
	return ops;
}
