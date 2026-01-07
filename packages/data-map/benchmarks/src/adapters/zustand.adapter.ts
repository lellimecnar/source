import { createStore } from 'zustand/vanilla';

import type { BenchmarkAdapter, SubscriptionHandle } from './types.js';

function resolvePath(obj: any, path: string): any {
	const parts = path.split('/').filter(Boolean);
	let current = obj;
	for (const part of parts) {
		current = current?.[part];
	}
	return current;
}

function setPath(obj: any, path: string, value: unknown): void {
	const parts = path.split('/').filter(Boolean);
	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		current = current[parts[i]!];
	}
	current[parts[parts.length - 1]!] = value;
}

export const zustandAdapter: BenchmarkAdapter = {
	name: 'zustand',
	description: 'Minimal state management with React/vanilla support',
	category: 'state-management',
	features: {
		get: true,
		set: true,
		mutate: false,
		immutable: true,
		patch: false,
		subscribe: true,
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
		return resolvePath(data, path);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const cloned = structuredClone(data);
		setPath(cloned, path, value);
		return cloned;
	},
	immutableUpdate: (data: unknown, path: string, value: unknown) => {
		const cloned = structuredClone(data);
		setPath(cloned, path, value);
		return cloned;
	},
	subscribe: (data: unknown, callback: (data: unknown) => void) => {
		const store = createStore(() => structuredClone(data as any));
		const unsubscribe = store.subscribe((state) => {
			callback(state);
		});
		return { unsubscribe };
	},
};
