import { klona, klona as klonaFull, klona as klonaJson } from 'klona';

import type { BenchmarkAdapter } from './types.js';

export const klonaAdapter: BenchmarkAdapter = {
	name: 'klona',
	description: 'Fast deep cloning with multiple modes',
	category: 'clone',
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
		push: false,
		pop: false,
		shift: false,
		unshift: false,
		splice: false,
		sort: false,
		map: false,
		setAll: false,
		resolveStream: false,
		transaction: false,
		immutableUpdate: false,
		getAll: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	clone: (data: unknown) => {
		return klona(data);
	},
};

// Additional klona variants for benchmarking
export const klonaFullAdapter: BenchmarkAdapter = {
	name: 'klona/full',
	description: 'klona with full type support (Date, RegExp, etc.)',
	category: 'clone',
	features: { ...klonaAdapter.features },
	clone: (data: unknown) => klonaFull(data),
};

export const klonaJsonAdapter: BenchmarkAdapter = {
	name: 'klona/json',
	description: 'klona optimized for JSON-safe data',
	category: 'clone',
	features: { ...klonaAdapter.features },
	clone: (data: unknown) => klonaJson(data),
};
