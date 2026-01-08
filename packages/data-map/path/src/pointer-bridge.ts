import type { Pointer } from './types.js';

export function pointerToJsonPath(pointer: Pointer): string {
	if (pointer === '') return '$';
	return `$${pointer
		.split('/')
		.slice(1)
		.map((s) => `.${unescapeSegment(s)}`)
		.join('')}`;
}

function unescapeSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}
