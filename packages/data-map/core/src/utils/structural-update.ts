import { parsePointerSegments } from './pointer';

const ARRAY_INDEX_STRICT = /^(0|[1-9][0-9]*)$/;

export interface SetAtPointerOptions {
	createPath?: boolean;
}

function inferContainerForNextSeg(nextSeg: string | undefined): unknown {
	if (nextSeg === undefined) return {};
	return ARRAY_INDEX_STRICT.test(nextSeg) ? [] : {};
}

/**
 * Sets a value at a JSON Pointer using structural sharing.
 *
 * - Clones only branches along the modified path
 * - Shares all untouched references
 * - When `createPath` is true, creates missing intermediate containers
 *   using object vs array inference based on the next segment.
 */
export function setAtPointer<T>(
	data: T,
	pointer: string,
	value: unknown,
	options: SetAtPointerOptions = {},
): T {
	const segments = parsePointerSegments(pointer);
	if (segments.length === 0) return value as T;

	const createPath = options.createPath ?? false;

	let root: any = data;
	if (root === null || typeof root !== 'object') {
		if (!createPath) {
			throw new Error('Cannot set path: intermediate value is not an object');
		}
		root = ARRAY_INDEX_STRICT.test(segments[0]!) ? [] : {};
	}

	const stack: Array<
		| { kind: 'array'; node: unknown[]; index: number }
		| { kind: 'object'; node: Record<string, unknown>; key: string }
	> = [];

	let current: any = root;
	for (let depth = 0; depth < segments.length - 1; depth++) {
		const seg = segments[depth]!;
		const nextSeg = segments[depth + 1];

		if (current === null || typeof current !== 'object') {
			throw new Error('Cannot set path: intermediate value is not an object');
		}

		if (Array.isArray(current)) {
			if (!ARRAY_INDEX_STRICT.test(seg)) {
				throw new Error('Cannot set path: invalid array index');
			}
			const index = Number.parseInt(seg, 10);
			stack.push({ kind: 'array', node: current, index });

			let child = current[index];
			if (child === undefined) {
				if (!createPath) {
					throw new Error(
						'Cannot set path: intermediate value is not an object',
					);
				}
				child = inferContainerForNextSeg(nextSeg);
			}
			current = child;
			continue;
		}

		const obj = current as Record<string, unknown>;
		stack.push({ kind: 'object', node: obj, key: seg });

		let child = obj[seg];
		if (child === undefined) {
			if (!createPath) {
				throw new Error('Cannot set path: intermediate value is not an object');
			}
			child = inferContainerForNextSeg(nextSeg);
		}
		current = child;
	}

	// Set leaf
	const leafSeg = segments[segments.length - 1]!;
	let next: unknown;
	if (current === null || typeof current !== 'object') {
		if (!createPath) {
			throw new Error('Cannot set path: intermediate value is not an object');
		}
		current = inferContainerForNextSeg(undefined);
	}

	if (Array.isArray(current)) {
		if (!ARRAY_INDEX_STRICT.test(leafSeg)) {
			throw new Error('Cannot set path: invalid array index');
		}
		const idx = Number.parseInt(leafSeg, 10);
		const cloned = (current as unknown[]).slice();
		cloned[idx] = value;
		next = cloned;
	} else {
		next = { ...(current as any), [leafSeg]: value };
	}

	// Rebuild upwards
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
