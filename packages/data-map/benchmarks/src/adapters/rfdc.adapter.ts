import { rfdc } from 'rfdc';

import type { BenchmarkAdapter } from './types.js';

const clone = rfdc();

export const rfdcAdapter: BenchmarkAdapter = {
	name: 'rfdc',
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
		return clone(data);
	},
};
