import { createDataMap } from '@data-map/core';

import type { PubSubAdapter, PubSubBus } from './types.js';

export const dataMapPubSubAdapter: PubSubAdapter = {
	kind: 'pubsub',
	name: 'data-map',
	features: {
		supportsMultiple: true,
		supportsWildcard: true,
	},
	createBus: () => {
		const dm = createDataMap<Record<string, unknown>>({});
		const handlers = new Map<string, Set<Function>>();

		const bus: PubSubBus = {
			on: (event, handler) => {
				const key = event;
				const set = handlers.get(key) ?? new Set<Function>();
				set.add(handler);
				handlers.set(key, set);
			},
			off: (event, handler) => {
				const key = event;
				handlers.get(key)?.delete(handler);
			},
			emit: (event, data) => {
				const key = event;
				const set = handlers.get(key);
				if (set) {
					for (const handler of set) {
						handler(data);
					}
				}
			},
		};

		return bus;
	},
	smokeTest: () => {
		const bus = dataMapPubSubAdapter.createBus();
		let hits = 0;
		const handler = () => hits++;
		bus.on('a', handler);
		bus.emit('a', 1);
		bus.off('a', handler);
		bus.emit('a', 2);
		return hits === 1;
	},
};
