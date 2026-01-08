import type { Pointer } from './types.js';

export function bumpVersion(
	versions: Map<Pointer, number>,
	pointer: Pointer,
): void {
	versions.set(pointer, (versions.get(pointer) ?? 0) + 1);
}
