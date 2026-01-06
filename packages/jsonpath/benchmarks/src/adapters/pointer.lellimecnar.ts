import { JSONPointer } from '@jsonpath/pointer';

import { type JsonPointerAdapter } from './types.js';

interface JsonpathPointerInstance {
	resolve: (value: unknown) => unknown;
}

type JsonpathPointerCtor = new (pointer: string) => JsonpathPointerInstance;

const JsonPointer = JSONPointer as unknown as JsonpathPointerCtor;

export const lellimecnarPointerAdapter: JsonPointerAdapter = {
	kind: 'pointer',
	name: '@jsonpath/pointer',
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
				'Token-array pointers are not supported by @jsonpath/pointer adapter',
			);
		}
		const ptr = new JsonPointer(pointer);
		return ptr.resolve(obj) as T;
	},
	smokeTest: (): boolean => {
		const data = { a: { b: 123 } };
		const ptr = new JsonPointer('/a/b');
		return (ptr.resolve(data) as number) === 123;
	},
};
