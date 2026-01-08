import { immutableJSONPatch } from 'immutable-json-patch';

import type { BenchmarkAdapter, PatchOp } from './types.js';

export const immutableJsonPatchAdapter: BenchmarkAdapter = {
	name: 'immutable-json-patch',
	description: 'Immutable RFC 6902 JSON Patch (structural sharing)',
	category: 'patch',
	features: {
		get: false,
		set: false,
		mutate: false,
		immutable: true,
		immutableUpdate: true,
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
		return immutableJSONPatch(data, converted as any);
	},
	patch: (data: unknown, patches: PatchOp[]) => {
		const converted = patches.map((p) => ({
			op: p.op,
			path: p.path,
			value: p.value,
			from: p.from,
		}));
		return immutableJSONPatch(data, converted as any);
	},
};
