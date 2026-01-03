import { JSONPointer } from 'json-p3';

import type { Operation } from '../types';
import { buildSetPatch } from './builder';

function resolveArray(data: unknown, pointer: string): unknown[] {
	try {
		const v = new JSONPointer(pointer).resolve(data as any);
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

function existsPointer(data: unknown, pointer: string): boolean {
	try {
		return new JSONPointer(pointer).exists(data as any);
	} catch {
		return false;
	}
}

function itemPointer(
	arrayPointer: string,
	index: number,
	length: number,
): string {
	const seg = index === length ? '-' : index.toString();
	return arrayPointer === '' ? `/${seg}` : `${arrayPointer}/${seg}`;
}

export function buildPushPatch(
	currentData: unknown,
	arrayPointer: string,
	items: unknown[],
): Operation[] {
	if (!existsPointer(currentData, arrayPointer)) {
		return items.length === 0
			? []
			: buildSetPatch(currentData, arrayPointer, [...items]);
	}
	const arr = resolveArray(currentData, arrayPointer);
	const ops: Operation[] = [];
	for (let i = 0; i < items.length; i++) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, arr.length + i, arr.length + i),
			value: items[i],
		});
	}
	return ops;
}

export function buildPopPatch(
	currentData: unknown,
	arrayPointer: string,
): { ops: Operation[]; value: unknown } {
	const arr = resolveArray(currentData, arrayPointer);
	if (arr.length === 0) return { ops: [], value: undefined };
	const value = arr[arr.length - 1];
	return {
		ops: [
			{
				op: 'remove',
				path: itemPointer(arrayPointer, arr.length - 1, arr.length),
			},
		],
		value,
	};
}

export function buildShiftPatch(
	currentData: unknown,
	arrayPointer: string,
): { ops: Operation[]; value: unknown } {
	const arr = resolveArray(currentData, arrayPointer);
	if (arr.length === 0) return { ops: [], value: undefined };
	return {
		ops: [{ op: 'remove', path: itemPointer(arrayPointer, 0, arr.length) }],
		value: arr[0],
	};
}

export function buildUnshiftPatch(
	currentData: unknown,
	arrayPointer: string,
	items: unknown[],
): Operation[] {
	if (!existsPointer(currentData, arrayPointer)) {
		return items.length === 0
			? []
			: buildSetPatch(currentData, arrayPointer, [...items]);
	}
	const arr = resolveArray(currentData, arrayPointer);
	const ops: Operation[] = [];
	// Insert at 0 in reverse order so final order matches caller.
	for (let i = items.length - 1; i >= 0; i--) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, 0, arr.length + (items.length - 1 - i)),
			value: items[i],
		});
	}
	return ops;
}

export function buildSplicePatch(
	currentData: unknown,
	arrayPointer: string,
	start: number,
	deleteCount: number,
	items: unknown[],
): { ops: Operation[]; removed: unknown[] } {
	if (!existsPointer(currentData, arrayPointer)) {
		return {
			ops:
				items.length === 0
					? []
					: buildSetPatch(currentData, arrayPointer, [...items]),
			removed: [],
		};
	}
	const arr = resolveArray(currentData, arrayPointer);
	const removed = arr.slice(start, start + deleteCount);
	const ops: Operation[] = [];

	let currentLength = arr.length;

	// Remove `deleteCount` items at `start`.
	for (let i = 0; i < deleteCount; i++) {
		if (start >= 0 && start < currentLength) {
			ops.push({
				op: 'remove',
				path: itemPointer(arrayPointer, start, currentLength),
			});
			currentLength--;
		}
	}

	// Insert new items starting at `start`.
	for (let i = 0; i < items.length; i++) {
		ops.push({
			op: 'add',
			path: itemPointer(arrayPointer, start + i, currentLength),
			value: items[i],
		});
		currentLength++;
	}

	return { ops, removed };
}

export function buildSortPatch(
	currentData: unknown,
	arrayPointer: string,
	compareFn?: (a: unknown, b: unknown) => number,
): Operation[] {
	const arr = resolveArray(currentData, arrayPointer);
	const nextArr = [...arr].sort(compareFn as any);
	// Sorting is a whole-array transformation; represent as a replace.
	return [{ op: 'replace', path: arrayPointer, value: nextArr }];
}

export function buildShufflePatch(
	currentData: unknown,
	arrayPointer: string,
	rng: () => number = Math.random,
): Operation[] {
	const arr = resolveArray(currentData, arrayPointer);
	const nextArr = [...arr];
	for (let i = nextArr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[nextArr[i], nextArr[j]] = [nextArr[j], nextArr[i]];
	}
	// Shuffling is a whole-array transformation; represent as a replace.
	return [{ op: 'replace', path: arrayPointer, value: nextArr }];
}
