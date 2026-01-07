import * as fastJsonPatch from 'fast-json-patch';

import type { BenchmarkAdapter, PatchOp } from './types.js';

export const fastJsonPatchAdapter: BenchmarkAdapter = {
	name: 'fast-json-patch',
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
		const result = fastJsonPatch.applyPatch(data as any, converted as any);
		return result[0];
	},
};
