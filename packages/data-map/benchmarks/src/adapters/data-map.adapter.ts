import { DataMap } from '@data-map/core';

import type { BenchmarkAdapter, PatchOp, SubscriptionHandle } from './types.js';

export const dataMapAdapter: BenchmarkAdapter = {
	name: '@data-map/core',
	features: {
		get: true,
		set: true,
		mutate: true,
		immutable: true,
		patch: false,
		subscribe: true,
		batch: true,
		definitions: true,
		clone: false,
	},
	get: (data: unknown, path: string) => {
		const dm = new DataMap(data);
		return dm.get(path);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const dm = new DataMap(data);
		dm.set(path, value);
		return dm.getSnapshot();
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const dm = new DataMap(data);
		dm.set(path, value);
	},
	immutableUpdate: (data: unknown, path: string, value: unknown) => {
		const dm = new DataMap(data);
		dm.set(path, value);
		return dm.getSnapshot();
	},
	subscribe: (data: unknown, callback: (data: unknown) => void) => {
		const dm = new DataMap(data);
		const unsubscribe = dm.subscribe({
			on: (event) => {
				callback(dm.getSnapshot());
			},
		});
		return { unsubscribe };
	},
	batch: (fn: (apply: (p: string, v: unknown) => void) => void) => {
		const dm = new DataMap({});
		fn((path: string, value: unknown) => {
			dm.set(path, value);
		});
		return dm.getSnapshot();
	},
	createDefinition: (name: string, getter: (data: unknown) => unknown) => {
		// DataMap supports definitions but this is a simplified interface
	},
};
