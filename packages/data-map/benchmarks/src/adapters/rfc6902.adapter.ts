import { applyPatch } from 'rfc6902';

import type { BenchmarkAdapter, PatchOp } from './types.js';

export const rfc6902Adapter: BenchmarkAdapter = {
	name: 'rfc6902',
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
		const cloned = structuredClone(data);
		applyPatch(cloned, converted as any);
		return cloned;
	},
};
