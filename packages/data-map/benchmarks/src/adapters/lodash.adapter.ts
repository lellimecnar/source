import get from 'lodash-es/get';
import set from 'lodash-es/set';
import cloneDeep from 'lodash-es/cloneDeep';
import type { BenchmarkAdapter } from './types.js';

export const lodashAdapter: BenchmarkAdapter = {
	name: 'lodash-es',
	features: {
		get: true,
		set: true,
		mutate: true,
		immutable: false,
		patch: false,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: true,
	},
	get: (data: unknown, path: string) => {
		// lodash uses dot-notation paths; convert from pointer if needed
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		return get(data, dotPath);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		const cloned = cloneDeep(data);
		set(cloned, dotPath, value);
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		set(data, dotPath, value);
	},
	clone: (data: unknown) => {
		return cloneDeep(data);
	},
};
