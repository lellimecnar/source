export const ForbiddenPointerSegments = new Set([
	'__proto__',
	'prototype',
	'constructor',
]);

export function assertNotForbiddenSegment(segment: string): void {
	if (ForbiddenPointerSegments.has(segment)) {
		throw new Error(`Forbidden JSON Pointer segment: ${segment}`);
	}
}
