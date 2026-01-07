import rfdc from 'rfdc';

import type { BenchmarkAdapter } from './types.js';

const cloneDefault = rfdc();
const cloneCircular = rfdc({ circles: true });
const cloneProto = rfdc({ proto: true });

export const rfdcAdapter: BenchmarkAdapter = {
	name: 'rfdc',
	description: 'Really Fast Deep Clone',
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
		return cloneDefault(data);
	},
};

export const rfdcCircularAdapter: BenchmarkAdapter = {
	name: 'rfdc (circular)',
	description: 'rfdc with circular reference support',
	category: 'clone',
	features: { ...rfdcAdapter.features },
	clone: (data: unknown) => cloneCircular(data),
};

export const rfdcProtoAdapter: BenchmarkAdapter = {
	name: 'rfdc (proto)',
	description: 'rfdc with prototype chain preservation',
	category: 'clone',
	features: { ...rfdcAdapter.features },
	clone: (data: unknown) => cloneProto(data),
};
