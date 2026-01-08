import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

import { SMALL } from './fixtures/index.js';

describe('Subscriptions', () => {
	const engine = new SubscriptionEngine();
	const pointer = SMALL.pointers[0]!;

	bench('subscriptions.subscribePointer', () => {
		const unsub = engine.subscribePointer(pointer, () => {});
		unsub();
	});

	bench('subscriptions.subscribePattern', () => {
		const unsub = engine.subscribePattern('$.data.*', () => {});
		unsub();
	});

	// Pre-wire 100 exact subscriptions once.
	const unsubs100: (() => void)[] = [];
	for (let i = 0; i < 100; i++) {
		unsubs100.push(engine.subscribePointer(pointer, () => {}));
	}

	bench('subscriptions.notifyExact100', () => {
		engine.notify(pointer, 1);
	});

	// Pre-wire 10 pattern subscriptions once.
	const unsubs10: (() => void)[] = [];
	for (let i = 0; i < 10; i++) {
		unsubs10.push(engine.subscribePattern('$.data.*', () => {}));
	}

	bench('subscriptions.notifyPattern10', () => {
		engine.notify(pointer, 1);
	});

	// Cleanup bench (ensures unsub fns are exercised)
	bench('subscriptions.cleanup', () => {
		for (const u of unsubs100) u();
		for (const u of unsubs10) u();
	});
});
