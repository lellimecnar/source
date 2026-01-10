import { IndirectionLayer } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { signal } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

function buildWideStore(entryCount: number): FlatStore {
	const store = new FlatStore();
	for (let i = 0; i < entryCount; i++) {
		store.set(`/users/${i}/name`, `u${i}`);
		store.set(`/users/${i}/age`, i);
	}
	return store;
}

describe('Baselines / Bottlenecks', () => {
	describe('Path wideGet catastrophe reproduction', () => {
		// This reproduces the audit's "wideGet" shape: many lookups against a large store.
		// The query expands to many pointers; the implementation must avoid repeated subtree materialization.
		for (const entryCount of [10_000]) {
			const store = buildWideStore(entryCount);
			bench(`bottlenecks.wideGet.usersStar.${entryCount}`, () => {
				void queryFlat(store, '$.users[*]');
			});
			bench(`bottlenecks.wideGet.usersStar.name.${entryCount}`, () => {
				void queryFlat(store, '$.users[*].name');
			});
		}
	});

	describe('Materialization caching absence (toObject)', () => {
		const store = buildWideStore(100_000);
		bench('bottlenecks.toObject.first', () => {
			void store.toObject();
		});
		bench('bottlenecks.toObject.repeated10', () => {
			for (let i = 0; i < 10; i++) void store.toObject();
		});
	});

	describe('getObject descendant check behavior', () => {
		const store = buildWideStore(50_000);
		bench('bottlenecks.getObject.leafNoChildren', () => {
			// Should be fast: no descendants.
			void store.getObject('/users/0/name');
		});
		bench('bottlenecks.getObject.containerHasChildren', () => {
			// Should be fast to detect children existence (no O(n) scans).
			void store.getObject('/users/0');
		});
	});

	describe('PatternIndex scaling', () => {
		for (const patternCount of [10, 100, 500, 1000]) {
			const engine = new SubscriptionEngine();
			for (let i = 0; i < patternCount; i++) {
				// Patterns in this codebase are JSONPath strings.
				// `$.data.*` exercises wildcard matching.
				engine.subscribePattern('$.data.*', () => {});
			}

			bench(`bottlenecks.patternMatch.${patternCount}`, () => {
				// Measure matching/dispatch only (setup is outside the bench fn).
				engine.notify('/data/x', 1);
			});
		}
	});

	describe('queryFlat complexity', () => {
		const simpleStore = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const complexStore = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});

		bench('bottlenecks.queryFlat.simplePointerLike', () => {
			// pointer-iterator fast path
			void queryFlat(simpleStore, '$.users[0].name');
		});

		bench('bottlenecks.queryFlat.complexJsonPath', () => {
			// This intentionally represents the "fallback" class of queries.
			// `queryFlat` will materialize the root for recursive descent.
			void queryFlat(complexStore, '$..name');
		});
	});

	describe('Signal notification overhead', () => {
		for (const observerCount of [10, 100, 500, 1000]) {
			bench(`bottlenecks.signalNotify.${observerCount}`, () => {
				const s = signal(0);
				const unsubs: (() => void)[] = [];
				for (let i = 0; i < observerCount; i++) {
					unsubs.push(s.subscribe(() => {}));
				}
				s.value++;
				for (const u of unsubs) u();
			});
		}
	});

	describe('IndirectionLayer allocation', () => {
		bench('bottlenecks.indirection.allocateFresh', () => {
			const layer = new IndirectionLayer();
			for (let i = 0; i < 10_000; i++) layer.pushPhysical();
		});

		bench('bottlenecks.indirection.allocateAfterFrees', () => {
			const layer = new IndirectionLayer();
			for (let i = 0; i < 10_000; i++) layer.pushPhysical();
			for (let i = 0; i < 10_000; i++) layer.removeAt(layer.length - 1);
			for (let i = 0; i < 10_000; i++) layer.pushPhysical();
		});
	});
});
