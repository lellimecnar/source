import { proxy, subscribe as valtioSubscribe, snapshot } from 'valtio/vanilla';

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

export const valtioAdapter: BenchmarkAdapter = {
	name: 'valtio',
	description: 'Proxy-based reactive state management',
	category: 'state-management',
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
		push: true,
		pop: true,
		shift: true,
		unshift: true,
		splice: true,
		sort: true,
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
		const state = proxy(structuredClone(data as any));
		return resolvePath(state, path);
	},
	set: (data: unknown, path: string, value: unknown) => {
		const state = proxy(structuredClone(data as any));
		setPath(state, path, value);
		return snapshot(state);
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const state = proxy(structuredClone(data as any));
		setPath(state, path, value);
	},
	push: (data: unknown, path: string, ...items: unknown[]) => {
		const state = proxy(structuredClone(data as any));
		const arr = resolvePath(state, path) as unknown[];
		arr.push(...items);
		return snapshot(state);
	},
	pop: (data: unknown, path: string) => {
		const state = proxy(structuredClone(data as any));
		const arr = resolvePath(state, path) as unknown[];
		const value = arr.pop();
		return { data: snapshot(state), value };
	},
	shift: (data: unknown, path: string) => {
		const state = proxy(structuredClone(data as any));
		const arr = resolvePath(state, path) as unknown[];
		const value = arr.shift();
		return { data: snapshot(state), value };
	},
	unshift: (data: unknown, path: string, ...items: unknown[]) => {
		const state = proxy(structuredClone(data as any));
		const arr = resolvePath(state, path) as unknown[];
		arr.unshift(...items);
		return snapshot(state);
	},
	splice: (
		data: unknown,
		path: string,
		start: number,
		deleteCount: number,
		...items: unknown[]
	) => {
		const state = proxy(structuredClone(data as any));
		const arr = resolvePath(state, path) as unknown[];
		arr.splice(start, deleteCount, ...items);
		return snapshot(state);
	},
	sort: (
		data: unknown,
		path: string,
		compareFn?: (a: unknown, b: unknown) => number,
	) => {
		const state = proxy(structuredClone(data as any));
		const arr = resolvePath(state, path) as unknown[];
		arr.sort(compareFn);
		return snapshot(state);
	},
	subscribe: (data: unknown, callback: (data: unknown) => void) => {
		const state = proxy(structuredClone(data as any));
		const unsubscribe = valtioSubscribe(
			state,
			() => {
				callback(snapshot(state));
			},
			true,
		);
		return { unsubscribe };
	},
};
