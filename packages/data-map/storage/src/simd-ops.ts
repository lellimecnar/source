export function scanDirtyIndices(dirty: Uint8Array): Uint32Array {
	const out: number[] = [];
	for (let i = 0; i < dirty.length; i++) {
		if (dirty[i]) out.push(i);
	}
	return new Uint32Array(out);
}
