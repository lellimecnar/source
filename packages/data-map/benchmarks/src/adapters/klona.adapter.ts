import { klona } from 'klona';

import type { BenchmarkAdapter } from './types.js';

export const klonaAdapter: BenchmarkAdapter = {
	name: 'klona',
	features: {
		get: false,
		set: false,
		mutate: false,
		immutable: false,
		patch: false,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: true,
	},
	clone: (data: unknown) => {
		return klona(data);
	},
};
