import { applyPatch, compare } from 'fast-json-patch';

import type { JsonPatchAdapter, JsonPatchOperation } from './types.js';

export const fastJsonPatchAdapter: JsonPatchAdapter = {
	kind: 'jsonpatch',
	name: 'fast-json-patch',
	features: {
		mutatesInput: true,
		supportsMoveAndCopy: true,
		supportsTest: true,
	},
	applyPatch: (doc, operations) => {
		try {
			const cloned = structuredClone(doc);
			const result = applyPatch(
				cloned,
				operations as Parameters<typeof applyPatch>[1],
			);
			return { result: result.newDocument };
		} catch (e) {
			return { result: doc, error: e as Error };
		}
	},
	generatePatch: (from, to) => {
		return compare(from as object, to as object) as JsonPatchOperation[];
	},
	smokeTest: () => {
		const doc = { a: 1, b: { c: 2 } };
		const ops: JsonPatchOperation[] = [
			{ op: 'replace', path: '/a', value: 99 },
			{ op: 'add', path: '/b/d', value: 3 },
		];
		const { result, error } = fastJsonPatchAdapter.applyPatch(doc, ops);
		if (error) return false;
		const r = result as { a: number; b: { c: number; d: number } };
		return r.a === 99 && r.b.d === 3;
	},
};
