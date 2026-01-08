import { parsePointerSegments } from './pointer';

const ARRAY_INDEX_STRICT = /^(0|[1-9][0-9]*)$/;
const ARRAY_INDEX_LOOSE = /^\d+$/;

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

/**
 * Attempts to set a child value on an existing parent path using structural sharing.
 *
 * - Clones only nodes along the parent path (plus the parent container itself)
 * - Shares all untouched branches by reference
 * - If the parent path cannot be resolved (missing/non-object), returns the input `data` unchanged
 *
 * Notes:
 * - Parent-path traversal uses strict RFC 6901 array index rules.
 * - The final set on an array parent intentionally uses a looser "digits" check,
 *   matching the existing patch builder behavior.
 */
export function trySetChildAtPointerWithSharing<T>(
	data: T,
	parentSegments: readonly string[],
	childKey: string,
	childValue: unknown,
): T {
	if (data === null || typeof data !== 'object') return data;

	const stack: (
		| { kind: 'array'; node: unknown[]; index: number }
		| { kind: 'object'; node: Record<string, unknown>; key: string }
	)[] = [];

	let current: any = data;
	for (const seg of parentSegments) {
		if (current === null || typeof current !== 'object') return data;

		if (Array.isArray(current)) {
			if (!ARRAY_INDEX_STRICT.test(seg)) return data;
			const index = Number.parseInt(seg, 10);
			if (index < 0 || index >= current.length) return data;
			stack.push({ kind: 'array', node: current, index });
			current = current[index];
			continue;
		}

		const obj = current as Record<string, unknown>;
		if (!(seg in obj)) return data;
		stack.push({ kind: 'object', node: obj, key: seg });
		current = obj[seg];
	}

	if (current === null || typeof current !== 'object') return data;

	let next: unknown;
	if (Array.isArray(current)) {
		if (!ARRAY_INDEX_LOOSE.test(childKey)) return data;
		const arr = current as unknown[];
		const cloned = arr.slice();
		cloned[Number.parseInt(childKey, 10)] = childValue;
		next = cloned;
	} else {
		next = { ...current, [childKey]: childValue };
	}

	for (let i = stack.length - 1; i >= 0; i--) {
		const frame = stack[i]!;
		if (frame.kind === 'array') {
			const cloned = frame.node.slice();
			cloned[frame.index] = next;
			next = cloned;
		} else {
			next = { ...frame.node, [frame.key]: next };
		}
	}

	return next as T;
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
