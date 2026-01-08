import { createDataMap } from '@data-map/core';

import type { StateAdapter } from './types.js';

export const dataMapStateAdapter: StateAdapter = {
	kind: 'state',
	name: 'data-map',
	features: {
		supportsSubscribe: true,
		isSync: true,
	},
	createStore: (initial) => {
		const dm = createDataMap({ ...initial });
		return {
			get: (key) => dm.get(`/${key}`),
			set: (key, value) => {
				dm.set(`/${key}`, value);
			},
			subscribe: (cb) => dm.subscribe('/*', cb),
			getSnapshot: () => dm.toObject(),
		};
	},
	smokeTest: () => {
		const s = dataMapStateAdapter.createStore({ a: 1 });
		s.set('a', 2);
		return s.get('a') === 2;
	},
};
