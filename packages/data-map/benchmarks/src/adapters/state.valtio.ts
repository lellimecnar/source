import { proxy, subscribe } from 'valtio';

import type { StateAdapter, StateStore } from './types.js';

export const valtioStateAdapter: StateAdapter = {
	kind: 'state',
	name: 'valtio',
	features: {
		supportsSubscribe: true,
		isSync: true,
	},
	createStore: (initial) => {
		const state = proxy({ ...initial });

		const store: StateStore = {
			get: (key) => (state as Record<string, unknown>)[key],
			set: (key, value) => {
				(state as Record<string, unknown>)[key] = value;
			},
			subscribe: (cb) => subscribe(state, cb),
			getSnapshot: () => ({ ...state }),
		};

		return store;
	},
	smokeTest: () => {
		const store = valtioStateAdapter.createStore({ a: 1 });
		store.set('a', 2);
		return store.get('a') === 2;
	},
};
