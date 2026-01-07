import cloneDeep from 'lodash-es/cloneDeep';
import get from 'lodash-es/get';
import set from 'lodash-es/set';

import type { BenchmarkAdapter } from './types.js';

function toDotPath(path: string): string {
	return (path.startsWith('/') ? path.slice(1) : path).replace(/\//g, '.');
}

export const lodashAdapter: BenchmarkAdapter = {
	name: 'lodash-es',
	description:
		'Classic utility library with path-based get/set and deep cloning',
	category: 'path-access',
	features: {
		get: true,
		set: true,
		mutate: true,
		immutable: false,
		immutableUpdate: false,
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
		getAll: false,
		resolveStream: false,
		transaction: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	get: (data: unknown, path: string) => {
		return get(data, toDotPath(path));
	},
	set: (data: unknown, path: string, value: unknown) => {
		const cloned = cloneDeep(data) as object;
		set(cloned, toDotPath(path), value);
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		set(data as object, toDotPath(path), value);
	},
	clone: (data: unknown) => {
		return cloneDeep(data);
	},
};
