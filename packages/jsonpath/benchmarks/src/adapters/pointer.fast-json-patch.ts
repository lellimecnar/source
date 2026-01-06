import * as jsonpatch from 'fast-json-patch';

import { type JsonPointerAdapter } from './types.js';

interface FastJsonPatchPointerApi {
	getValueByPointer: (document: object, pointer: string) => unknown;
}

const jsonPatchPointer = jsonpatch as unknown as FastJsonPatchPointerApi;

export const fastJsonPatchPointerAdapter: JsonPointerAdapter = {
	kind: 'pointer',
	name: 'fast-json-patch.getValueByPointer',
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
				'Token-array pointers are not supported by fast-json-patch.getValueByPointer adapter',
			);
		}
		return jsonPatchPointer.getValueByPointer(obj as object, pointer) as T;
	},
	smokeTest: (): boolean => {
		const data = { a: { b: { c: 5 } } };
		return (
			(jsonPatchPointer.getValueByPointer(
				data as object,
				'/a/b/c',
			) as number) === 5
		);
	},
};
