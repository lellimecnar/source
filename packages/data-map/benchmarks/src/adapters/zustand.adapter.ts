import { create } from 'zustand';

import type { BenchmarkAdapter, SubscriptionHandle } from './types.js';

export const zustandAdapter: BenchmarkAdapter = {
	name: 'zustand',
	features: {
		get: true,
		set: true,
		mutate: false,
		immutable: false,
		patch: false,
		subscribe: true,
		batch: false,
		definitions: false,
		clone: false,
	},
	get: (data: unknown, path: string) => {
		const state = structuredClone(data as any);
		const parts = path.split('/').filter(Boolean);
		let current = state;
		for (const part of parts) {
			current = current[part];
		}
		return current;
	},
	set: (data: unknown, path: string, value: unknown) => {
		const state = structuredClone(data as any);
		const parts = path.split('/').filter(Boolean);
		let current = state;
		for (let i = 0; i < parts.length - 1; i++) {
			current = current[parts[i]];
		}
		current[parts[parts.length - 1]] = value;
		return state;
	},
	subscribe: (data: unknown, callback: (data: unknown) => void) => {
		const useStore = create((set) => ({
			data: structuredClone(data as any),
			setState: (newData: unknown) => {
				set({ data: newData });
			},
		}));

		const unsubscribe = useStore.subscribe(
			(state) => state.data,
			(newData) => {
				callback(newData);
			},
		);
		return { unsubscribe };
	},
};
