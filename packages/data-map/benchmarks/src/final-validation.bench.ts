import { PersistentVector } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { signal } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

function buildStore(entryCount: number): FlatStore {
	const store = new FlatStore();
	for (let i = 0; i < entryCount; i++) {
		store.set(`/users/${i}/name`, `u${i}`);
		store.set(`/users/${i}/age`, i);
	}
	return store;
}

describe('Performance Target Validation', () => {
	bench('targets.signalRead', () => {
		const s = signal(1);
		void s.value;
	});

	bench('targets.signalWrite', () => {
		const s = signal(0);
		s.value = 1;
	});

	bench('targets.subscriptions.patternMatch1k', () => {
		const engine = new SubscriptionEngine();
		const unsubs: (() => void)[] = [];
		for (let i = 0; i < 1000; i++) {
			unsubs.push(engine.subscribePattern('$.data.*', () => {}));
		}
		engine.notify('/data/x', 1);
		for (const u of unsubs) u();
	});

	bench('targets.wideGet.10k.usersStar', () => {
		const store = buildStore(10_000);
		void queryFlat(store, '$.users[*]');
	});

	bench('targets.wideGet.10k.usersStar.name', () => {
		const store = buildStore(10_000);
		void queryFlat(store, '$.users[*].name');
	});

	bench('targets.toObject.100k.first', () => {
		const store = buildStore(100_000);
		void store.toObject();
	});

	bench('targets.toObject.100k.repeated10', () => {
		const store = buildStore(100_000);
		void store.toObject();
		for (let i = 0; i < 10; i++) void store.toObject();
	});

	bench('targets.queryWildcard100k', () => {
		const store = buildStore(100_000);
		void queryFlat(store, '$.users[*].name');
	});

	bench('targets.persistentVectorPush', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 10_000; i++) v = v.push(i);
	});
});
