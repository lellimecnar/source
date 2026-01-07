import { applyPatch } from 'immutable-json-patch';
import type { BenchmarkAdapter, PatchOp } from './types.js';

export const immutableJsonPatchAdapter: BenchmarkAdapter = {
	name: 'immutable-json-patch',
	features: {
		get: false,
		set: false,
		mutate: false,
		immutable: false,
		patch: true,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: false,
	},
	applyPatch: (data: unknown, patches: PatchOp[]) => {
		const converted = patches.map((p) => ({
			op: p.op,
			path: p.path,
			value: p.value,
		}));
		return applyPatch(data, converted as any).newDocument;
	},
};
