import { bench, describe } from 'vitest';

import { PUBSUB_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const LISTENER_COUNTS = [1, 10, 100, 1000] as const;

describe('Subscriptions / Comparative', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'subscribeUnsubscribe',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				const handler = () => {};
				bus.on('evt', handler);
				bus.off('evt', handler);
			},
		);

		for (const n of LISTENER_COUNTS) {
			bench(
				benchKey({
					category: 'subscriptions',
					caseName: `emitTo${n}`,
					adapterName: adapter.name,
				}),
				() => {
					const bus = adapter.createBus();
					const handlers = Array.from({ length: n }, () => () => {});
					for (const h of handlers) bus.on('evt', h);
					bus.emit('evt', 1);
					for (const h of handlers) bus.off('evt', h);
				},
			);
		}

		if (adapter.features.supportsWildcard === true) {
			bench(
				benchKey({
					category: 'subscriptions',
					caseName: 'wildcardEmit',
					adapterName: adapter.name,
				}),
				() => {
					const bus = adapter.createBus();
					const handler = () => {};
					bus.on('*', handler);
					bus.emit('evt', 1);
					bus.off('*', handler);
				},
			);
		}
	}
});
