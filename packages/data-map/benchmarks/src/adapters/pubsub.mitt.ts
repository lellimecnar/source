import mitt from 'mitt';

import type { PubSubAdapter } from './types.js';

export const mittPubSubAdapter: PubSubAdapter = {
	kind: 'pubsub',
	name: 'mitt',
	features: {
		supportsMultiple: true,
		supportsWildcard: false,
	},
	createBus: () => {
		const emitter = mitt();
		return {
			on: (event, handler) => emitter.on(event, handler as any),
			off: (event, handler) => emitter.off(event, handler as any),
			emit: (event, data) => emitter.emit(event, data),
		};
	},
	smokeTest: () => {
		const bus = mittPubSubAdapter.createBus();
		let hits = 0;
		const handler = () => hits++;
		bus.on('a', handler);
		bus.emit('a', 1);
		bus.off('a', handler);
		bus.emit('a', 2);
		return hits === 1;
	},
};
