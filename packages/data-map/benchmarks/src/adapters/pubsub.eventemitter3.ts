import EventEmitter from 'eventemitter3';

import type { PubSubAdapter } from './types.js';

export const eventemitter3PubSubAdapter: PubSubAdapter = {
	kind: 'pubsub',
	name: 'eventemitter3',
	features: {
		supportsMultiple: true,
		supportsWildcard: false,
	},
	createBus: () => {
		const ee = new EventEmitter();
		return {
			on: (event, handler) => {
				ee.on(event, handler as any);
			},
			off: (event, handler) => {
				ee.off(event, handler as any);
			},
			emit: (event, data) => {
				ee.emit(event, data);
			},
		};
	},
	smokeTest: () => {
		const bus = eventemitter3PubSubAdapter.createBus();
		let hits = 0;
		const handler = () => hits++;
		bus.on('a', handler);
		bus.emit('a', 1);
		bus.off('a', handler);
		bus.emit('a', 2);
		return hits === 1;
	},
};
