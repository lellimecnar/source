import { create } from 'mutative';

import { dlvDsetAdapter } from './dlv-dset.adapter.js';
import type { BenchmarkAdapter } from './types.js';

export const mutativeAdapter: BenchmarkAdapter = {
	name: 'mutative',
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
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		return create(data, (draft) => {
			dlvDsetAdapter.mutate!(draft, path, value);
		});
	},
	immutableUpdate: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		return create(data, (draft) => {
			dlvDsetAdapter.mutate!(draft, path, value);
		});
	},
};
