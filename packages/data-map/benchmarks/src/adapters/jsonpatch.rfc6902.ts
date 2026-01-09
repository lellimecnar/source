import { applyPatch, createPatch } from 'rfc6902';

import type { JsonPatchAdapter, JsonPatchOperation } from './types.js';

export const rfc6902Adapter: JsonPatchAdapter = {
	kind: 'jsonpatch',
	name: 'rfc6902',
	features: {
		mutatesInput: true,
		supportsMoveAndCopy: true,
		supportsTest: true,
	},
	applyPatch: (doc, operations) => {
		try {
			const cloned = structuredClone(doc);
			const errors = applyPatch(
				cloned,
				operations as Parameters<typeof applyPatch>[1],
			);
			const firstError = errors.find((e) => e !== null);
			if (firstError) {
				return { result: cloned, error: firstError };
			}
			return { result: cloned };
		} catch (e) {
			return { result: doc, error: e as Error };
		}
	},
	generatePatch: (from, to) => {
		return createPatch(from, to) as JsonPatchOperation[];
	},
	smokeTest: () => {
		const doc = { a: 1, b: { c: 2 } };
		const ops: JsonPatchOperation[] = [
			{ op: 'replace', path: '/a', value: 99 },
			{ op: 'add', path: '/b/d', value: 3 },
		];
		const { result, error } = rfc6902Adapter.applyPatch(doc, ops);
		if (error) return false;
		const r = result as { a: number; b: { c: number; d: number } };
		return r.a === 99 && r.b.d === 3;
	},
};
