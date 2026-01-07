import { getProperty, setProperty, deleteProperty } from 'dot-prop';

import type { BenchmarkAdapter } from './types.js';

export const dotPropAdapter: BenchmarkAdapter = {
	name: 'dot-prop',
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
	},
	get: (data: unknown, path: string) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		return getProperty(data as any, dotPath);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		const cloned = structuredClone(data);
		setProperty(cloned as any, dotPath, value);
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		setProperty(data as any, dotPath, value);
	},
};
