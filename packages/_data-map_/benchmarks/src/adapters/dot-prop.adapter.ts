import { getProperty, setProperty, deleteProperty } from 'dot-prop';

import type { BenchmarkAdapter } from './types.js';

function toDotPath(path: string): string {
	return (path.startsWith('/') ? path.slice(1) : path).replace(/\//g, '.');
}

export const dotPropAdapter: BenchmarkAdapter = {
	name: 'dot-prop',
	description: 'Path-based property access with ES module support',
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
		return getProperty(data as any, toDotPath(path));
	},
	set: (data: unknown, path: string, value: unknown) => {
		const cloned = structuredClone(data);
		setProperty(cloned as any, toDotPath(path), value);
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		setProperty(data as any, toDotPath(path), value);
	},
};
