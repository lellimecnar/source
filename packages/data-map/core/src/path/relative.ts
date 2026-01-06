/**
 * Relative JSON Pointer resolver (RFC 3986-inspired relative reference support).
 * Resolves relative pointers like '../foo', './bar' relative to a context pointer.
 */

/**
 * Parse a relative pointer reference.
 * Supports:
 * - '../' or '..' - go up one level
 * - './' or '.' - same level
 * - absolute pointers (starting with '/') - returned as-is
 * @param relativePath The relative pointer string
 * @returns Parsed reference with type and remaining path
 */
export function parseRelativeReference(relativePath: string): {
	type: 'absolute' | 'parent' | 'self' | 'sibling';
	levels: number;
	remaining: string;
} {
	if (relativePath.startsWith('/')) {
		return { type: 'absolute', levels: 0, remaining: relativePath };
	}

	let levels = 0;
	let idx = 0;

	// Count '../' or '..' prefixes
	while (idx < relativePath.length) {
		if (relativePath.startsWith('../', idx)) {
			levels++;
			idx += 3;
		} else if (relativePath.startsWith('..', idx)) {
			// Handle bare '..' (without trailing slash)
			if (idx + 2 === relativePath.length || relativePath[idx + 2] === '/') {
				levels++;
				idx += 2;
				if (relativePath[idx] === '/') idx++;
			} else {
				break;
			}
		} else if (relativePath.startsWith('./', idx)) {
			idx += 2;
		} else if (
			relativePath[idx] === '.' &&
			(idx + 1 === relativePath.length || relativePath[idx + 1] === '/')
		) {
			// Handle bare '.' (without trailing slash)
			idx += 1;
			if (relativePath[idx] === '/') idx++;
		} else {
			break;
		}
	}

	const remaining = relativePath.slice(idx);
	const type: 'absolute' | 'parent' | 'self' | 'sibling' =
		levels > 0 ? 'parent' : 'self';

	return { type, levels, remaining };
}

/**
 * Resolve a relative pointer against a context pointer.
 * @param relativePath The relative or absolute pointer
 * @param contextPointer The base pointer to resolve relative to
 * @returns Resolved absolute pointer
 * @throws If relative path goes above root
 */
export function resolveRelativePointer(
	relativePath: string,
	contextPointer: string,
): string {
	const parsed = parseRelativeReference(relativePath);

	if (parsed.type === 'absolute') {
		return parsed.remaining || '/';
	}

	// Parse context pointer into segments
	const contextSegments =
		contextPointer === '/' ? [] : contextPointer.split('/').slice(1);

	// Go up 'levels' parent directories
	if (parsed.levels > contextSegments.length) {
		throw new Error(
			`Relative pointer '../' goes above root: ${relativePath} relative to ${contextPointer}`,
		);
	}

	const resultSegments = contextSegments.slice(
		0,
		contextSegments.length - parsed.levels,
	);

	// Append remaining path
	if (parsed.remaining) {
		const remainingSegments = parsed.remaining.split('/').filter((s) => s);
		resultSegments.push(...remainingSegments);
	}

	return resultSegments.length === 0 ? '/' : `/${resultSegments.join('/')}`;
}
