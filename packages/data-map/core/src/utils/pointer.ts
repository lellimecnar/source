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
