import { Pointer } from 'rfc6902';

import { type JsonPointerAdapter } from './types.js';

interface Rfc6902Pointer {
	get: (object: unknown) => unknown;
}

interface Rfc6902PointerCtor {
	fromJSON: (pointer: string) => Rfc6902Pointer;
}

const RfcPointer = Pointer as unknown as Rfc6902PointerCtor;

export const rfc6902PointerAdapter: JsonPointerAdapter = {
	kind: 'pointer',
	name: 'rfc6902.Pointer',
	features: {
		supportsGet: true,
		supportsSet: false,
		supportsRemove: false,
		supportsHas: false,
		supportsParse: false,
		supportsCompile: false,
		mutatesInput: false,
	},
	get: <T = unknown>(obj: unknown, pointer: string | readonly string[]): T => {
		if (typeof pointer !== 'string') {
			throw new Error(
				'Token-array pointers are not supported by rfc6902.Pointer adapter',
			);
		}
		const ptr = RfcPointer.fromJSON(pointer);
		return ptr.get(obj) as T;
	},
	smokeTest: (): boolean => {
		const data = { contributors: ['a', 'b'] };
		const ptr = RfcPointer.fromJSON('/contributors/0');
		return (ptr.get(data) as string) === 'a';
	},
};
