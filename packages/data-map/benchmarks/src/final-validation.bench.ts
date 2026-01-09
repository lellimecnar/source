import { PersistentVector } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { signal } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

describe('Performance Target Validation', () => {
	bench('targets.signalRead', () => {
		const s = signal(1);
		void s.value;
	});

	bench('targets.signalWrite', () => {
		const s = signal(0);
		s.value = 1;
	});

	bench('targets.patternMatch1k', () => {
		const engine = new SubscriptionEngine();
		const unsubs: (() => void)[] = [];
		for (let i = 0; i < 1000; i++) {
			unsubs.push(engine.subscribePattern('$.data.*', () => {}));
		}
		engine.notify('/data/x', 1);
		for (const u of unsubs) u();
	});

	bench('targets.queryWildcard100k', () => {
		const store = new FlatStore();
		for (let i = 0; i < 100_000; i++) {
			store.set(`/users/${i}/name`, `u${i}`);
			store.set(`/users/${i}/age`, i);
		}
		void queryFlat(store, '$.users[*].name');
	});

	bench('targets.persistentVectorPush', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 10_000; i++) v = v.push(i);
	});
});
