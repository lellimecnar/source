import * as fastJsonPatch from 'fast-json-patch';

import type { BenchmarkAdapter, PatchOp } from './types.js';

export const fastJsonPatchAdapter: BenchmarkAdapter = {
	name: 'fast-json-patch',
	description: 'RFC 6902 JSON Patch implementation with diff generation',
	category: 'patch',
	features: {
		get: false,
		set: false,
		mutate: false,
		immutable: false,
		immutableUpdate: false,
		patch: true,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: false,
		push: false,
		pop: false,
		shift: false,
		unshift: false,
		splice: false,
		sort: false,
		map: false,
		setAll: false,
		getAll: false,
		resolveStream: false,
		transaction: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	applyPatch: (data: unknown, patches: PatchOp[]) => {
		const cloned = structuredClone(data);
		const converted = patches.map((p) => ({
			op: p.op,
			path: p.path,
			value: p.value,
			from: p.from,
		}));
		fastJsonPatch.applyPatch(cloned as any, converted as any);
		return cloned;
	},
	patch: (data: unknown, patches: PatchOp[]) => {
		const cloned = structuredClone(data);
		const converted = patches.map((p) => ({
			op: p.op,
			path: p.path,
			value: p.value,
			from: p.from,
		}));
		fastJsonPatch.applyPatch(cloned as any, converted as any);
		return cloned;
	},
	generatePatch: (before: unknown, after: unknown) => {
		return fastJsonPatch.compare(before as any, after as any) as PatchOp[];
	},
};
