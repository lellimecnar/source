import { parsePointer } from './parse';

export function getByPointer(root: unknown, pointer: string): unknown {
	const parts = parsePointer(pointer);
	let current: any = root as any;
	for (const part of parts) {
		if (current == null) return undefined;
		current = current[part];
	}
	return current;
}
