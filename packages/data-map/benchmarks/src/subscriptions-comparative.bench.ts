/**
 * Subscriptions / PubSub Comparative Benchmarks
 *
 * Compares performance of event emitter / pubsub libraries:
 * - @data-map/core
 * - mitt
 * - eventemitter3
 * - nanoevents
 */
import { bench, describe } from 'vitest';

import { PUBSUB_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const LISTENER_COUNTS = [1, 10, 100, 1000] as const;

// ============================================================================
// Basic Operations
// ============================================================================

describe('Subscriptions / Basic Operations', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'smoke',
				adapterName: adapter.name,
			}),
			() => {
				if (!adapter.smokeTest())
					throw new Error(`Smoke test failed: ${adapter.name}`);
			},
		);

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'createBus',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createBus();
			},
		);

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

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'singleEmit',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				const handler = () => {};
				bus.on('evt', handler);
				bus.emit('evt', { value: 1 });
			},
		);
	}
});

// ============================================================================
// Listener Count Scaling
// ============================================================================

describe('Subscriptions / Listener Scaling', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
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
	}
});

// ============================================================================
// Repeated Emit
// ============================================================================

describe('Subscriptions / Repeated Emit', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'emit100x1Listener',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				let count = 0;
				bus.on('evt', () => count++);
				for (let i = 0; i < 100; i++) {
					bus.emit('evt', i);
				}
				if (count !== 100) throw new Error('missed emit');
			},
		);

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'emit100x10Listeners',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				let count = 0;
				for (let i = 0; i < 10; i++) {
					bus.on('evt', () => count++);
				}
				for (let i = 0; i < 100; i++) {
					bus.emit('evt', i);
				}
				if (count !== 1000) throw new Error('missed emit');
			},
		);

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'emit1000x1Listener',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				let count = 0;
				bus.on('evt', () => count++);
				for (let i = 0; i < 1000; i++) {
					bus.emit('evt', i);
				}
				if (count !== 1000) throw new Error('missed emit');
			},
		);
	}
});

// ============================================================================
// Multiple Event Types
// ============================================================================

describe('Subscriptions / Multiple Events', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'multiEvent10Types',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				const handlers = Array.from({ length: 10 }, () => () => {});
				handlers.forEach((h, i) => bus.on(`evt${i}`, h));
				for (let i = 0; i < 10; i++) {
					bus.emit(`evt${i}`, i);
				}
			},
		);

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'multiEvent100Types',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				const handlers = Array.from({ length: 100 }, () => () => {});
				handlers.forEach((h, i) => bus.on(`evt${i}`, h));
				for (let i = 0; i < 100; i++) {
					bus.emit(`evt${i}`, i);
				}
			},
		);
	}
});

// ============================================================================
// Dynamic Subscription
// ============================================================================

describe('Subscriptions / Dynamic', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'addRemove100',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				for (let i = 0; i < 100; i++) {
					const h = () => {};
					bus.on('evt', h);
					bus.off('evt', h);
				}
			},
		);

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'subscribe100Unsubscribe100',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				const handlers: (() => void)[] = [];
				for (let i = 0; i < 100; i++) {
					const h = () => {};
					handlers.push(h);
					bus.on('evt', h);
				}
				for (const h of handlers) {
					bus.off('evt', h);
				}
			},
		);
	}
});

// ============================================================================
// Wildcard Support
// ============================================================================

describe('Subscriptions / Wildcard', () => {
	for (const adapter of PUBSUB_ADAPTERS) {
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

			bench(
				benchKey({
					category: 'subscriptions',
					caseName: 'wildcardEmit10Events',
					adapterName: adapter.name,
				}),
				() => {
					const bus = adapter.createBus();
					let count = 0;
					bus.on('*', () => count++);
					for (let i = 0; i < 10; i++) {
						bus.emit(`event${i}`, i);
					}
					if (count !== 10) throw new Error('missed emit');
				},
			);

			bench(
				benchKey({
					category: 'subscriptions',
					caseName: 'wildcardMixedListeners',
					adapterName: adapter.name,
				}),
				() => {
					const bus = adapter.createBus();
					let wildcardCount = 0;
					let specificCount = 0;
					bus.on('*', () => wildcardCount++);
					bus.on('evt1', () => specificCount++);
					for (let i = 0; i < 50; i++) {
						bus.emit('evt1', i);
						bus.emit('evt2', i);
					}
					if (wildcardCount !== 100) throw new Error('missed wildcard');
					if (specificCount !== 50) throw new Error('missed specific');
				},
			);
		}
	}
});

// ============================================================================
// Large Payload
// ============================================================================

describe('Subscriptions / Large Payload', () => {
	const largePayload = {
		items: Array.from({ length: 1000 }, (_, i) => ({
			id: i,
			data: `value-${i}`,
		})),
	};

	for (const adapter of PUBSUB_ADAPTERS) {
		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'largePayload1Listener',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				let received: typeof largePayload | null = null;
				bus.on('evt', (p: typeof largePayload) => {
					received = p;
				});
				bus.emit('evt', largePayload);
				if (!received) throw new Error('not received');
			},
		);

		bench(
			benchKey({
				category: 'subscriptions',
				caseName: 'largePayload10Listeners',
				adapterName: adapter.name,
			}),
			() => {
				const bus = adapter.createBus();
				let count = 0;
				for (let i = 0; i < 10; i++) {
					bus.on('evt', () => count++);
				}
				bus.emit('evt', largePayload);
				if (count !== 10) throw new Error('missed emit');
			},
		);
	}
});
