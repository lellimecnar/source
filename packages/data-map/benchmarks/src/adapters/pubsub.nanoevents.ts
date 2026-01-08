import { createNanoEvents } from 'nanoevents';

import type { PubSubAdapter } from './types.js';

export const nanoeventsPubSubAdapter: PubSubAdapter = {
	kind: 'pubsub',
	name: 'nanoevents',
	features: {
		supportsMultiple: true,
		supportsWildcard: false,
	},
	createBus: () => {
		const ee = createNanoEvents();
		const unsubs = new Map<string, Map<Function, () => void>>();
		return {
			on: (event, handler) => {
				const unsub = ee.on(event, handler as any);
				const byEvent = unsubs.get(event) ?? new Map<Function, () => void>();
				byEvent.set(handler as any, unsub);
				unsubs.set(event, byEvent);
			},
			off: (event, handler) => {
				unsubs.get(event)?.get(handler as any)?.();
				unsubs.get(event)?.delete(handler as any);
			},
			emit: (event, data) => {
				ee.emit(event, data);
			},
		};
	},
	smokeTest: () => {
		const bus = nanoeventsPubSubAdapter.createBus();
		let hits = 0;
		const handler = () => hits++;
		bus.on('a', handler);
		bus.emit('a', 1);
		bus.off('a', handler);
		bus.emit('a', 2);
		return hits === 1;
	},
};
