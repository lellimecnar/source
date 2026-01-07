import type { BenchmarkAdapter } from './types.js';

/**
 * Baseline adapter using native JavaScript operations for comparison.
 * This helps measure the overhead of library abstractions.
 */
export const nativeAdapter: BenchmarkAdapter = {
	name: 'native (baseline)',
	description: 'Native JS operations for baseline comparison',
	category: 'clone',
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
		immutableUpdate: false,
		getAll: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	get: (data: unknown, path: string) => {
		const parts = path.split('/').filter(Boolean);
		let current: any = data;
		for (const part of parts) {
			current = current?.[part];
		}
		return current;
	},
	set: (data: unknown, path: string, value: unknown) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (let i = 0; i < parts.length - 1; i++) {
			current = current[parts[i]!];
		}
		current[parts[parts.length - 1]!] = value;
		return cloned;
	},
	mutate: (data: unknown, path: string, value: unknown) => {
		const parts = path.split('/').filter(Boolean);
		let current: any = data;
		for (let i = 0; i < parts.length - 1; i++) {
			current = current[parts[i]!];
		}
		current[parts[parts.length - 1]!] = value;
	},
	clone: (data: unknown) => {
		return structuredClone(data);
	},
	push: (data: unknown, path: string, ...items: unknown[]) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (const part of parts) {
			current = current[part];
		}
		(current as unknown[]).push(...items);
		return cloned;
	},
	pop: (data: unknown, path: string) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (const part of parts) {
			current = current[part];
		}
		const value = (current as unknown[]).pop();
		return { data: cloned, value };
	},
	shift: (data: unknown, path: string) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (const part of parts) {
			current = current[part];
		}
		const value = (current as unknown[]).shift();
		return { data: cloned, value };
	},
	unshift: (data: unknown, path: string, ...items: unknown[]) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (const part of parts) {
			current = current[part];
		}
		(current as unknown[]).unshift(...items);
		return cloned;
	},
	splice: (
		data: unknown,
		path: string,
		start: number,
		deleteCount: number,
		...items: unknown[]
	) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (const part of parts) {
			current = current[part];
		}
		(current as unknown[]).splice(start, deleteCount, ...items);
		return cloned;
	},
	sort: (
		data: unknown,
		path: string,
		compareFn?: (a: unknown, b: unknown) => number,
	) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		for (const part of parts) {
			current = current[part];
		}
		(current as unknown[]).sort(compareFn);
		return cloned;
	},
	map: (data: unknown, path: string, fn: (v: unknown) => unknown) => {
		const cloned = structuredClone(data);
		const parts = path.split('/').filter(Boolean);
		let current: any = cloned;
		let parent: any = cloned;
		let lastKey = '';
		for (const part of parts) {
			parent = current;
			lastKey = part;
			current = current[part];
		}
		parent[lastKey] = (current as unknown[]).map(fn);
		return cloned;
	},
};

/**
 * JSON.parse/stringify clone adapter for comparison
 */
export const jsonCloneAdapter: BenchmarkAdapter = {
	name: 'JSON.parse/stringify',
	description: 'Traditional JSON-based cloning',
	category: 'clone',
	features: {
		get: false,
		set: false,
		mutate: false,
		immutable: false,
		immutableUpdate: false,
		patch: false,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: true,
		push: false,
		pop: false,
		shift: false,
		unshift: false,
		splice: false,
		sort: false,
		map: false,
		setAll: false,
		getAll: false,
		resolveStream: false,
		transaction: false,
		jsonpathQuery: false,
		shuffle: false,
	},
	clone: (data: unknown) => {
		return JSON.parse(JSON.stringify(data));
	},
};
