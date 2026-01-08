import type { ArrayMetadata, Pointer } from './types.js';

export function ensureArrayMeta(
	arrays: Map<Pointer, ArrayMetadata>,
	pointer: Pointer,
): ArrayMetadata {
	let meta = arrays.get(pointer);
	if (!meta) {
		meta = {
			length: 0,
			indices: [],
			freeSlots: [],
			physicalPrefix: `${pointer}/_p`,
		};
		arrays.set(pointer, meta);
	}
	return meta;
}
