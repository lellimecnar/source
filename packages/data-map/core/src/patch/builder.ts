import type { Operation } from '../types';
import { cloneSnapshot } from '../utils/clone';
import { resolvePointer, pointerExists } from '../utils/jsonpath';
import { parsePointerSegments, buildPointer } from '../utils/pointer';

function isIndexSegment(seg: string): boolean {
	return /^\d+$/.test(seg);
}

function inferContainerForNextSeg(nextSeg: string | undefined): unknown {
	if (nextSeg === undefined) return {};
	return isIndexSegment(nextSeg) ? [] : {};
}

function getAtPointer(data: unknown, pointer: string): unknown {
	return resolvePointer(data, pointer);
}

function existsAtPointer(data: unknown, pointer: string): boolean {
	try {
		return pointerExists(data, pointer);
	} catch {
		return false;
	}
}

/**
 * Creates intermediate containers so that the parent of target pointer exists.
 * Returns a list of JSON Patch operations needed to create those containers.
 */
export function ensureParentContainers(
	currentData: unknown,
	targetPointer: string,
): { ops: Operation[]; nextData: unknown } {
	const ops: Operation[] = [];
	const nextData = cloneSnapshot(currentData);

	const segments = parsePointerSegments(targetPointer);
	if (segments.length === 0) {
		return { ops, nextData };
	}

	// Walk down until parent of last segment.
	for (let depth = 0; depth < segments.length - 1; depth++) {
		const parentPointer = buildPointer(segments.slice(0, depth));
		const seg = segments[depth]!;
		const childPointer = buildPointer(segments.slice(0, depth + 1));
		const nextSeg = segments[depth + 1];

		// If child already exists, continue.
		if (existsAtPointer(nextData, childPointer)) {
			continue;
		}

		// If we're setting a property on a missing parent, create it.
		const container = inferContainerForNextSeg(nextSeg);

		// Root-level property creation is still an add on childPointer.
		// We clone the container for the op so that subsequent mutations to nextData
		// (to build further ops) don't leak into this op's value.
		ops.push({
			op: 'add',
			path: childPointer,
			value: cloneSnapshot(container),
		});

		// Apply the op to nextData by directly mutating through JSON Pointer.
		// (We keep this local to builder to avoid pulling in patch apply here.)
		const parentValue =
			parentPointer === '' ? nextData : getAtPointer(nextData, parentPointer);
		if (parentPointer === '') {
			if (Array.isArray(nextData) && isIndexSegment(seg)) {
				(nextData as unknown[])[Number(seg)] = container;
			} else if (typeof nextData === 'object' && nextData !== null) {
				(nextData as Record<string, unknown>)[seg] = container;
			}
		} else if (Array.isArray(parentValue) && isIndexSegment(seg)) {
			(parentValue as unknown[])[Number(seg)] = container;
		} else if (typeof parentValue === 'object' && parentValue !== null) {
			(parentValue as Record<string, unknown>)[seg] = container;
		}
	}

	return { ops, nextData };
}

export function buildSetPatch(
	currentData: unknown,
	targetPointer: string,
	value: unknown,
): Operation[] {
	const { ops: containerOps, nextData } = ensureParentContainers(
		currentData,
		targetPointer,
	);
	const exists = existsAtPointer(nextData, targetPointer);

	const finalOp: Operation = exists
		? { op: 'replace', path: targetPointer, value }
		: { op: 'add', path: targetPointer, value };

	return [...containerOps, finalOp];
}
