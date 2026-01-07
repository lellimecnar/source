export function escapePointerSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function unescapePointerSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}

export function parsePointerSegments(pointerString: string): string[] {
	if (pointerString === '' || pointerString === '#') {
		return [];
	}

	let raw = pointerString;
	if (raw.startsWith('#/')) {
		raw = raw.slice(1);
	}

	if (!raw.startsWith('/')) {
		throw new Error(`Invalid JSON Pointer: "${pointerString}"`);
	}

	const encodedSegments = raw.slice(1).split('/');
	return encodedSegments.map(unescapePointerSegment);
}

export function buildPointer(segments: string[]): string {
	if (segments.length === 0) return '';
	return `/${segments.map(escapePointerSegment).join('/')}`;
}

const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;

function hasInvalidTildeSequence(seg: string): boolean {
	return /~[^01]/.test(seg) || seg.endsWith('~');
}

export function tryResolvePointerInline<T = unknown>(
	data: unknown,
	pointer: string,
): { ok: true; value: T | undefined } | { ok: false } {
	if (pointer === '') {
		return { ok: true, value: data as T };
	}

	// Fast-path only for absolute (non-fragment) pointers.
	if (!pointer.startsWith('/')) {
		return { ok: false };
	}

	const parts = pointer.split('/');
	// parts[0] is always "" because pointer starts with '/'
	let current: any = data;

	for (let i = 1; i < parts.length; i++) {
		const encoded = parts[i]!;
		if (hasInvalidTildeSequence(encoded)) {
			return { ok: false };
		}
		// gitleaks:allow
		const token = encoded.replace(/~1/g, '/').replace(/~0/g, '~');

		if (current === null || typeof current !== 'object') {
			return { ok: true, value: undefined };
		}

		if (Array.isArray(current)) {
			if (!ARRAY_INDEX.test(token)) {
				return { ok: true, value: undefined };
			}
			const index = Number.parseInt(token, 10);
			if (index < 0 || index >= current.length) {
				return { ok: true, value: undefined };
			}
			current = current[index];
			continue;
		}

		if (!(token in current)) {
			return { ok: true, value: undefined };
		}
		current = current[token];
	}

	return { ok: true, value: current as T };
}

export function tryPointerExistsInline(
	data: unknown,
	pointer: string,
): { ok: true; exists: boolean } | { ok: false } {
	if (pointer === '') {
		return { ok: true, exists: true };
	}

	if (!pointer.startsWith('/')) {
		return { ok: false };
	}

	const parts = pointer.split('/');
	let current: any = data;

	for (let i = 1; i < parts.length; i++) {
		const encoded = parts[i]!;
		if (hasInvalidTildeSequence(encoded)) {
			return { ok: false };
		}
		// gitleaks:allow
		const token = encoded.replace(/~1/g, '/').replace(/~0/g, '~');

		if (current === null || typeof current !== 'object') {
			return { ok: true, exists: false };
		}

		if (Array.isArray(current)) {
			if (!ARRAY_INDEX.test(token)) {
				return { ok: true, exists: false };
			}
			const index = Number.parseInt(token, 10);
			if (index < 0 || index >= current.length) {
				return { ok: true, exists: false };
			}
			current = current[index];
			continue;
		}

		if (!(token in current)) {
			return { ok: true, exists: false };
		}
		current = current[token];
	}

	return { ok: true, exists: true };
}
