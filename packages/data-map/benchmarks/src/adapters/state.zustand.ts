import { createStore } from 'zustand/vanilla';

import type { StateAdapter, StateStore } from './types.js';

export const zustandStateAdapter: StateAdapter = {
	kind: 'state',
	name: 'zustand',
	features: {
		supportsSubscribe: true,
		isSync: true,
	},
	createStore: (initial) => {
		const zustandStore = createStore<Record<string, unknown>>(() => ({
			...initial,
		}));

		const store: StateStore = {
			get: (key) => zustandStore.getState()[key],
			set: (key, value) => {
				zustandStore.setState({ [key]: value });
			},
			subscribe: (cb) => zustandStore.subscribe(cb),
			getSnapshot: () => ({ ...zustandStore.getState() }),
		};

		return store;
	},
	smokeTest: () => {
		const store = zustandStateAdapter.createStore({ a: 1 });
		store.set('a', 2);
		return store.get('a') === 2;
	},
};
