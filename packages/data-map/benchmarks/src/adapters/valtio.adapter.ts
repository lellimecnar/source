import { proxy, subscribe as valtioSubscribe } from 'valtio/vanilla';

import type { BenchmarkAdapter, SubscriptionHandle } from './types.js';

export const valtioAdapter: BenchmarkAdapter = {
	name: 'valtio',
	features: {
		get: true,
		set: true,
		mutate: true,
		immutable: false,
		patch: false,
		subscribe: true,
		batch: false,
		definitions: false,
		clone: false,
	},
	get: (data: unknown, path: string) => {
		const state: any = proxy(structuredClone(data as any));
		const parts = path.split('/').filter(Boolean);
		let current = state;
		for (const part of parts) {
			current = current[part];
		}
		return current;
	},
	set: (data: unknown, path: string, value: unknown) => {
		const state: any = proxy(structuredClone(data as any));
		const parts = path.split('/').filter(Boolean);
		let current = state;
		for (let i = 0; i < parts.length - 1; i++) {
			current = current[parts[i]];
		}
		current[parts[parts.length - 1]] = value;
		return state;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const state: any = proxy(structuredClone(data as any));
		const parts = path.split('/').filter(Boolean);
		let current = state;
		for (let i = 0; i < parts.length - 1; i++) {
			current = current[parts[i]];
		}
		current[parts[parts.length - 1]] = value;
	},
	subscribe: (data: unknown, callback: (data: unknown) => void) => {
		const state: any = proxy(structuredClone(data as any));
		const unsubscribe = valtioSubscribe(
			state,
			() => {
				callback(state);
			},
			true,
		);
		return { unsubscribe };
	},
};
