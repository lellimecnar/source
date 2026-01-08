import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

import { SMALL } from './fixtures';
import {
	captureMemory,
	deltaMemory,
	warmupGC,
} from './utils/memory-profiler.js';

describe('Memory / Subscriptions', () => {
	bench('memory.subscriptionEngineCreate', () => {
		warmupGC();
		const before = captureMemory();

		const engine = new SubscriptionEngine();

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void engine;
	});

	bench('memory.subscriptionSubscribe1000', () => {
		warmupGC();
		const engine = new SubscriptionEngine();
		const pointer = SMALL.pointers[0];
		const before = captureMemory();

		const unsubs = Array.from({ length: 1000 }, () =>
			engine.subscribePointer(pointer, () => {}),
		);

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		// Cleanup
		for (const unsub of unsubs) {
			unsub();
		}

		void delta;
	});

	bench('memory.subscriptionPatterns100', () => {
		warmupGC();
		const engine = new SubscriptionEngine();
		const before = captureMemory();

		const unsubs = Array.from({ length: 100 }, (_, i) =>
			engine.subscribePattern(`$.data.item${i}.*`, () => {}),
		);

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		// Cleanup
		for (const unsub of unsubs) {
			unsub();
		}

		void delta;
	});

	bench('memory.subscriptionNotify', () => {
		warmupGC();
		const engine = new SubscriptionEngine();
		const pointers = SMALL.pointers;
		const unsubs = pointers.map((p) => engine.subscribePointer(p, () => {}));

		const before = captureMemory();

		for (const pointer of pointers) {
			engine.notify(pointer, 1);
		}

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		// Cleanup
		for (const unsub of unsubs) {
			unsub();
		}

		void delta;
	});
});
