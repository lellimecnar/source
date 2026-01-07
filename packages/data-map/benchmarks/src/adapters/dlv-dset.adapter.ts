import dlv from 'dlv';
import dset from 'dset';
import type { BenchmarkAdapter } from './types.js';

export const dlvDsetAdapter: BenchmarkAdapter = {
	name: 'dlv+dset',
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
		return dlv(data, dotPath);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		const cloned = structuredClone(data);
		dset(cloned, dotPath, value);
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const dotPath = (path.startsWith('/') ? path.slice(1) : path).replace(
			/\//g,
			'.',
		);
		dset(data, dotPath, value);
	},
};
