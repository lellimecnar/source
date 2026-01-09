import { immutableJSONPatch } from 'immutable-json-patch';

import type { JsonPatchAdapter, JsonPatchOperation } from './types.js';

export const immutableJsonPatchAdapter: JsonPatchAdapter = {
	kind: 'jsonpatch',
	name: 'immutable-json-patch',
	features: {
		mutatesInput: false,
		supportsMoveAndCopy: true,
		supportsTest: true,
	},
	applyPatch: (doc, operations) => {
		try {
			const result = immutableJSONPatch(
				doc,
				operations as Parameters<typeof immutableJSONPatch>[1],
			);
			return { result };
		} catch (e) {
			return { result: doc, error: e as Error };
		}
	},
	smokeTest: () => {
		const doc = { a: 1, b: { c: 2 } };
		const ops: JsonPatchOperation[] = [
			{ op: 'replace', path: '/a', value: 99 },
			{ op: 'add', path: '/b/d', value: 3 },
		];
		const { result, error } = immutableJsonPatchAdapter.applyPatch(doc, ops);
		if (error) return false;
		const r = result as { a: number; b: { c: number; d: number } };
		// Verify immutability
		return r.a === 99 && r.b.d === 3 && doc.a === 1;
	},
};
