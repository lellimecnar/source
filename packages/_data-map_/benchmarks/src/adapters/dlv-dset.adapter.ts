import dlv from 'dlv';
import { dset } from 'dset';

import type { BenchmarkAdapter } from './types.js';

export function toDotPath(path: string): string {
	return (path.startsWith('/') ? path.slice(1) : path).replace(/\//g, '.');
}

export const dlvDsetAdapter: BenchmarkAdapter = {
	name: 'dlv+dset',
	description: 'Minimal path-based get/set utilities',
	category: 'path-access',
	features: {
		get: true,
		set: true,
		mutate: true,
		immutable: false,
		patch: false,
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
		resolveStream: false,
		transaction: false,
		immutableUpdate: false,
		getAll: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	get: (data: unknown, path: string) => {
		return dlv(data as object, toDotPath(path));
	},
	set: (data: unknown, path: string, value: unknown) => {
		const cloned = structuredClone(data) as object;
		dset(cloned, toDotPath(path), value);
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		dset(data as object, toDotPath(path), value);
	},
};
