/**
 * Subscriptions Comparison Benchmarks
 *
 * Compares reactive subscription performance across adapters.
 * Tests subscribe overhead, notification speed, and cleanup.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import { getSubscribeAdapters } from '../comparison.js';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();
const subscribeAdapters = getSubscribeAdapters(allAdapters);

const smallDataset = BENCHMARK_DATASETS.find((d) => d.name === 'small')!;
const mediumDataset = BENCHMARK_DATASETS.find((d) => d.name === 'medium')!;
const userStoreDataset = BENCHMARK_DATASETS.find(
	(d) => d.name === 'userStore',
)!;

describe('Subscriptions Comparison', () => {
	describe('Subscribe Setup - Single Subscriber', () => {
		for (const adapter of subscribeAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsub = adapter.subscribe!(adapterData, () => {
					// noop callback
				});
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Subscribe Setup - Multiple Subscribers (10)', () => {
		for (const adapter of subscribeAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsubscribes: (() => void)[] = [];
				for (let i = 0; i < 10; i++) {
					const unsub = adapter.subscribe!(adapterData, () => {});
					if (typeof unsub === 'function') {
						unsubscribes.push(unsub);
					}
				}
				for (const unsub of unsubscribes) {
					unsub();
				}
			});
		}
	});

	describe('Subscribe Setup - Many Subscribers (100)', () => {
		for (const adapter of subscribeAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsubscribes: (() => void)[] = [];
				for (let i = 0; i < 100; i++) {
					const unsub = adapter.subscribe!(adapterData, () => {});
					if (typeof unsub === 'function') {
						unsubscribes.push(unsub);
					}
				}
				for (const unsub of unsubscribes) {
					unsub();
				}
			});
		}
	});

	describe('Path-based Subscribe (if supported)', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.subscribeWithPath) continue;
			bench(adapter.name, () => {
				const data = structuredClone(mediumDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsub = adapter.subscribeWithPath!(
					adapterData,
					mediumDataset.samplePaths.shallow,
					() => {},
				);
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Notification Speed - Single Update', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				let notificationCount = 0;
				const unsub = adapter.subscribe!(adapterData, () => {
					notificationCount++;
				});
				adapter.set!(adapterData, '/key0', 'updated');
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Notification Speed - Burst Updates (10)', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				let notificationCount = 0;
				const unsub = adapter.subscribe!(adapterData, () => {
					notificationCount++;
				});
				for (let i = 0; i < 10; i++) {
					adapter.set!(adapterData, `/key${i % 10}`, `updated${i}`);
				}
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Notification Speed - Heavy Updates (100)', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(adapter.name, () => {
				const data = structuredClone(mediumDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				let notificationCount = 0;
				const unsub = adapter.subscribe!(adapterData, () => {
					notificationCount++;
				});
				for (let i = 0; i < 100; i++) {
					adapter.set!(adapterData, `/key${i % 25}`, `updated${i}`);
				}
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Fan-out - 10 Subscribers, 1 Update', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsubscribes: (() => void)[] = [];
				for (let i = 0; i < 10; i++) {
					const unsub = adapter.subscribe!(adapterData, () => {});
					if (typeof unsub === 'function') {
						unsubscribes.push(unsub);
					}
				}
				adapter.set!(adapterData, '/key0', 'updated');
				for (const unsub of unsubscribes) {
					unsub();
				}
			});
		}
	});

	describe('Fan-out - 100 Subscribers, 1 Update', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsubscribes: (() => void)[] = [];
				for (let i = 0; i < 100; i++) {
					const unsub = adapter.subscribe!(adapterData, () => {});
					if (typeof unsub === 'function') {
						unsubscribes.push(unsub);
					}
				}
				adapter.set!(adapterData, '/key0', 'updated');
				for (const unsub of unsubscribes) {
					unsub();
				}
			});
		}
	});

	describe('Cleanup Speed - Unsubscribe', () => {
		for (const adapter of subscribeAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsubscribes: (() => void)[] = [];
				for (let i = 0; i < 50; i++) {
					const unsub = adapter.subscribe!(adapterData, () => {});
					if (typeof unsub === 'function') {
						unsubscribes.push(unsub);
					}
				}
				// Measure cleanup time
				for (const unsub of unsubscribes) {
					unsub();
				}
			});
		}
	});

	describe('Realistic: User Store Updates', () => {
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(adapter.name, () => {
				const data = structuredClone(userStoreDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsub = adapter.subscribe!(adapterData, () => {});
				// Simulate user profile update
				adapter.set!(adapterData, '/currentUser/profile/name', 'Updated Name');
				adapter.set!(
					adapterData,
					'/currentUser/profile/email',
					'updated@example.com',
				);
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Memory: Subscription Overhead', () => {
		// This test measures if subscriptions add significant overhead
		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(`${adapter.name} - with subscription`, () => {
				const data = structuredClone(mediumDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				const unsub = adapter.subscribe!(adapterData, () => {});
				for (let i = 0; i < 50; i++) {
					adapter.set!(adapterData, `/key${i % 25}`, `value${i}`);
				}
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}

		for (const adapter of subscribeAdapters) {
			if (!adapter.set) continue;
			bench(`${adapter.name} - without subscription`, () => {
				const data = structuredClone(mediumDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				for (let i = 0; i < 50; i++) {
					adapter.set!(adapterData, `/key${i % 25}`, `value${i}`);
				}
			});
		}
	});
});
