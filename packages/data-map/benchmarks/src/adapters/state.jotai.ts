import { atom, createStore as createJotaiStore } from 'jotai/vanilla';

import type { StateAdapter, StateStore } from './types.js';

export const jotaiStateAdapter: StateAdapter = {
	kind: 'state',
	name: 'jotai',
	features: {
		supportsSubscribe: true,
		isSync: true,
	},
	createStore: (initial) => {
		const jotaiStore = createJotaiStore();
		const atoms = new Map<string, ReturnType<typeof atom>>();

		// Initialize atoms for each key
		for (const [key, value] of Object.entries(initial)) {
			const a = atom(value);
			atoms.set(key, a);
		}

		const store: StateStore = {
			get: (key) => {
				const a = atoms.get(key);
				if (!a) return undefined;
				return jotaiStore.get(a);
			},
			set: (key, value) => {
				let a = atoms.get(key);
				if (!a) {
					a = atom(value);
					atoms.set(key, a);
				}
				jotaiStore.set(a, value);
			},
			subscribe: (cb) => {
				const unsubs: (() => void)[] = [];
				for (const a of atoms.values()) {
					unsubs.push(jotaiStore.sub(a, cb));
				}
				return () => {
					for (const unsub of unsubs) unsub();
				};
			},
			getSnapshot: () => {
				const snapshot: Record<string, unknown> = {};
				for (const [key, a] of atoms) {
					snapshot[key] = jotaiStore.get(a);
				}
				return snapshot;
			},
		};

		return store;
	},
	smokeTest: () => {
		const store = jotaiStateAdapter.createStore({ a: 1 });
		store.set('a', 2);
		return store.get('a') === 2;
	},
};
