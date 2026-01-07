import { DataMap } from '@data-map/core';

import type { BenchmarkAdapter, PatchOp, SubscriptionHandle } from './types.js';

export const dataMapAdapter: BenchmarkAdapter = {
	name: '@data-map/core',
	description: 'Full-featured reactive data management with JSONPath support',
	category: 'full-featured',
	features: {
		get: true,
		set: true,
		mutate: true,
		immutable: true,
		immutableUpdate: true,
		patch: true,
		subscribe: true,
		batch: true,
		definitions: true,
		clone: true,
		push: true,
		pop: true,
		shift: true,
		unshift: true,
		splice: true,
		sort: true,
		map: true,
		setAll: true,
		getAll: true,
		resolveStream: true,
		transaction: true,
		jsonpathQuery: true,
		shuffle: true,
	},
	get: (data: unknown, path: string) => {
		const dm = new DataMap(data);
		return dm.get(path);
	},
	getAll: (data: unknown, path: string) => {
		const dm = new DataMap(data);
		return dm.getAll(path);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const dm = new DataMap(data);
		dm.set(path, value);
		return dm.getSnapshot();
	},
	setAll: (data: unknown, path: string, value: unknown) => {
		const dm = new DataMap(data);
		dm.setAll(path, value);
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
	map: (data: unknown, path: string, fn: (v: unknown) => unknown) => {
		const dm = new DataMap(data);
		dm.map(path, fn);
		return dm.getSnapshot();
	},
	applyPatch: (data: unknown, patches: PatchOp[]) => {
		const dm = new DataMap(data);
		dm.patch(patches as any);
		return dm.getSnapshot();
	},
	patch: (data: unknown, patches: PatchOp[]) => {
		const dm = new DataMap(data);
		dm.patch(patches as any);
		return dm.getSnapshot();
	},
	push: (data: unknown, path: string, ...items: unknown[]) => {
		const dm = new DataMap(data);
		dm.push(path, ...items);
		return dm.getSnapshot();
	},
	pop: (data: unknown, path: string) => {
		const dm = new DataMap(data);
		const value = dm.pop(path);
		return { data: dm.getSnapshot(), value };
	},
	shift: (data: unknown, path: string) => {
		const dm = new DataMap(data);
		const value = dm.shift(path);
		return { data: dm.getSnapshot(), value };
	},
	unshift: (data: unknown, path: string, ...items: unknown[]) => {
		const dm = new DataMap(data);
		dm.unshift(path, ...items);
		return dm.getSnapshot();
	},
	splice: (
		data: unknown,
		path: string,
		start: number,
		deleteCount: number,
		...items: unknown[]
	) => {
		const dm = new DataMap(data);
		dm.splice(path, start, deleteCount, ...items);
		return dm.getSnapshot();
	},
	sort: (
		data: unknown,
		path: string,
		compareFn?: (a: unknown, b: unknown) => number,
	) => {
		const dm = new DataMap(data);
		dm.sort(path, compareFn);
		return dm.getSnapshot();
	},
	subscribe: (
		data: unknown,
		callback: (data: unknown) => void,
		path?: string,
	) => {
		const dm = new DataMap(data);
		const subscription = dm.subscribe({
			path: path ?? '$..*',
			after: 'set',
			fn: () => {
				callback(dm.getSnapshot());
			},
		});
		return () => subscription.unsubscribe();
	},
	batch: (
		data: unknown,
		fn: (apply: (p: string, v: unknown) => void) => void,
	) => {
		const dm = new DataMap(data);
		dm.batch(() => {
			fn((path: string, value: unknown) => {
				dm.set(path, value);
			});
		});
		return dm.getSnapshot();
	},
	transaction: (
		data: unknown,
		fn: (apply: (p: string, v: unknown) => void) => void,
	) => {
		const dm = new DataMap(data);
		dm.transaction(() => {
			fn((path: string, value: unknown) => {
				dm.set(path, value);
			});
		});
		return dm.getSnapshot();
	},
	createDefinition: (name: string, getter: (data: unknown) => unknown) => {
		// DataMap supports definitions via constructor options
	},
	clone: (data: unknown) => {
		const dm = new DataMap(data);
		return dm.clone().getSnapshot();
	},
	query: (data: unknown, expression: string) => {
		const dm = new DataMap(data);
		return dm.getAll(expression);
	},
	shuffle: (data: unknown, path: string) => {
		const dm = new DataMap(data);
		dm.shuffle(path);
		return dm.getSnapshot();
	},
	subscribeWithPath: (
		data: unknown,
		path: string,
		callback: (value: unknown) => void,
	) => {
		const dm = new DataMap(data);
		const unsubscribe = dm.subscribe({
			path,
			after: 'set',
			fn: () => {
				callback(dm.get(path));
			},
		});
		return unsubscribe;
	},
};
