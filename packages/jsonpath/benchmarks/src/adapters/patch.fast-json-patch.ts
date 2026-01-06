import * as jsonpatch from 'fast-json-patch';

import { type JsonPatchAdapter } from './types.js';

interface FastJsonPatchApi {
	applyPatch: <T>(
		document: T,
		patch: readonly unknown[],
	) => {
		newDocument: T;
	};
}

const fastJsonPatch = jsonpatch as unknown as FastJsonPatchApi;

export const fastJsonPatchAdapter: JsonPatchAdapter = {
	kind: 'patch',
	name: 'fast-json-patch',
	features: {
		mutatesInput: 'unknown',
		returnsDocument: true,
	},
	applyPatch: <T>(document: T, patch: readonly unknown[]): T => {
		return fastJsonPatch.applyPatch(document, patch).newDocument;
	},
	smokeTest: (): boolean => {
		interface Doc {
			a: number;
			b?: number;
		}
		const input: Doc = { a: 1 };
		const patched = fastJsonPatch.applyPatch(input, [
			{ op: 'add', path: '/b', value: 2 },
		]).newDocument;
		return patched.b === 2;
	},
};
