import { parsePointerSegments } from './pointer';

/**
 * Update a value at a specific JSON pointer using structural sharing.
 * Only clones branches along the modified path; shares unmodified references.
 */
export function updateAtPointer<T>(
	data: T,
	pointer: string,
	value: unknown,
): T {
	const segments = parsePointerSegments(pointer);
	return updateRecursive(data, segments, 0, value) as T;
}

function updateRecursive(
	node: unknown,
	segments: string[],
	depth: number,
	value: unknown,
): unknown {
	if (depth === segments.length) return value;

	if (node === null || typeof node !== 'object') {
		throw new Error('Cannot set path: intermediate value is not an object');
	}

	const key = segments[depth]!;
	const isArray = Array.isArray(node);
	const currentChild = (node as any)[key];
	const nextChild = updateRecursive(currentChild, segments, depth + 1, value);

	if (isArray) {
		// Match pointer array index semantics: only digits, no leading zeros.
		if (!/^(0|[1-9][0-9]*)$/.test(key)) {
			throw new Error('Cannot set path: invalid array index');
		}
		const arr = node as unknown[];
		const next = arr.slice();
		const idx = Number.parseInt(key, 10);
		next[idx] = nextChild;
		return next;
	}

	return { ...(node as any), [key]: nextChild };
}
