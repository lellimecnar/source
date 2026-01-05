import { JSONPointer } from './pointer.js';

export function normalize(
	pointer: string | JSONPointer | readonly string[],
): string {
	if (pointer instanceof JSONPointer) {
		return JSONPointer.format(pointer.getTokens());
	}

	if (Array.isArray(pointer)) {
		return JSONPointer.format([...pointer]);
	}

	return JSONPointer.format(JSONPointer.parse(pointer as string));
}
