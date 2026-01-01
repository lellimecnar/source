import { assertNotForbiddenSegment } from './forbidden';

function encode(segment: string): string {
	assertNotForbiddenSegment(segment);
	// RFC 6901: ~ => ~0, / => ~1
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function formatPointer(segments: readonly string[]): string {
	if (segments.length === 0) return '';
	return `/${segments.map(encode).join('/')}`;
}
