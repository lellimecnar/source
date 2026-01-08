import { JSONPointer } from '@jsonpath/pointer';

export function pointerToSegments(pointer: string): string[] {
	if (pointer === '') return [];
	return JSONPointer.parse(pointer);
}

export function segmentsToPointer(segments: string[]): string {
	return JSONPointer.format(segments);
}

export function parentPointer(pointer: string): string {
	const segs = pointerToSegments(pointer);
	segs.pop();
	return segmentsToPointer(segs);
}
