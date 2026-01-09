import { IndirectionLayer } from '@data-map/arrays';
import { queryFlat } from '@data-map/path';
import { signal } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

describe('Baselines / Bottlenecks', () => {
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
