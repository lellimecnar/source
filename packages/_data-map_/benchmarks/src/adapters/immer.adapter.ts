import { produce } from 'immer';

import { toDotPath, dlvDsetAdapter } from './dlv-dset.adapter.js';
import type { BenchmarkAdapter } from './types.js';

export const immerAdapter: BenchmarkAdapter = {
	name: 'immer',
	description: 'Immutable state with mutable-like API via Proxy',
	category: 'immutable',
	features: {
		get: true,
		set: true,
		mutate: false,
		immutable: true,
		patch: false,
		subscribe: false,
		batch: true,
		definitions: false,
		clone: false,
		push: true,
		pop: true,
		shift: true,
		unshift: true,
		splice: true,
		sort: true,
		map: true,
		setAll: false,
		resolveStream: false,
		transaction: false,
		immutableUpdate: true,
		getAll: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	get: dlvDsetAdapter.get,
	set: (data: unknown, path: string, value: unknown) => {
		return produce(data, (draft) => {
			dlvDsetAdapter.mutate!(draft, path, value);
		});
	},
	immutableUpdate: (data: unknown, path: string, value: unknown) => {
		return produce(data, (draft) => {
			dlvDsetAdapter.mutate!(draft, path, value);
		});
	},
	batch: (
		data: unknown,
		fn: (apply: (p: string, v: unknown) => void) => void,
	) => {
		return produce(data, (draft) => {
			fn((path: string, value: unknown) => {
				dlvDsetAdapter.mutate!(draft, path, value);
			});
		});
	},
	push: (data: unknown, path: string, ...items: unknown[]) => {
		return produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			arr.push(...items);
		});
	},
	pop: (data: unknown, path: string) => {
		let value: unknown;
		const result = produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			value = arr.pop();
		});
		return { data: result, value };
	},
	shift: (data: unknown, path: string) => {
		let value: unknown;
		const result = produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			value = arr.shift();
		});
		return { data: result, value };
	},
	unshift: (data: unknown, path: string, ...items: unknown[]) => {
		return produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			arr.unshift(...items);
		});
	},
	splice: (
		data: unknown,
		path: string,
		start: number,
		deleteCount: number,
		...items: unknown[]
	) => {
		return produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			arr.splice(start, deleteCount, ...items);
		});
	},
	sort: (
		data: unknown,
		path: string,
		compareFn?: (a: unknown, b: unknown) => number,
	) => {
		return produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			arr.sort(compareFn);
		});
	},
	map: (data: unknown, path: string, fn: (v: unknown) => unknown) => {
		return produce(data, (draft: any) => {
			const arr = dlvDsetAdapter.get!(draft, path) as unknown[];
			for (let i = 0; i < arr.length; i++) {
				arr[i] = fn(arr[i]);
			}
		});
	},
};
