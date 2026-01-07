import { produce } from 'immer';

import { dlvDsetAdapter } from './dlv-dset.adapter.js';
import type { BenchmarkAdapter } from './types.js';

export const immerAdapter: BenchmarkAdapter = {
	name: 'immer',
	features: {
		get: true,
		set: true,
		mutate: false,
		immutable: true,
		patch: false,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: false,
	},
	get: dlvDsetAdapter.get,
	set: (data: unknown, path: string, value: unknown) => {
		return produce(data, (draft) => {
			dlvDsetAdapter.mutate!(draft, path, value);
		});
	},
	immutableUpdate: (data: unknown, path: string, value: unknown) => {
		return produce(data, (draft) => {
			dlvDsetAdapter.mutate!(draft, path, value);
		});
	},
};
