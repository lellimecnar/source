import { assertNotForbiddenSegment } from './forbidden';

function decode(segment: string): string {
	// RFC 6901: ~1 => / and ~0 => ~
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function parsePointer(pointer: string): string[] {
	if (pointer === '') return [];
	if (!pointer.startsWith('/'))
		throw new Error('JSON Pointer must start with "/" or be empty.');
	const parts = pointer.split('/').slice(1).map(decode);
	for (const p of parts) assertNotForbiddenSegment(p);
	return parts;
}
