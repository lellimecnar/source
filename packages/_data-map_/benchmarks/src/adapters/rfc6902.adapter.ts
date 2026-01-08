import { applyPatch, createPatch } from 'rfc6902';

import type { BenchmarkAdapter, PatchOp } from './types.js';

export const rfc6902Adapter: BenchmarkAdapter = {
	name: 'rfc6902',
	description: 'RFC 6902 JSON Patch with diff generation',
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
		const converted = patches.map((p) => ({
			op: p.op,
			path: p.path,
			value: p.value,
			from: p.from,
		}));
		const cloned = structuredClone(data);
		applyPatch(cloned, converted as any);
		return cloned;
	},
	patch: (data: unknown, patches: PatchOp[]) => {
		const converted = patches.map((p) => ({
			op: p.op,
			path: p.path,
			value: p.value,
			from: p.from,
		}));
		const cloned = structuredClone(data);
		applyPatch(cloned, converted as any);
		return cloned;
	},
	generatePatch: (before: unknown, after: unknown) => {
		return createPatch(before, after) as PatchOp[];
	},
};
