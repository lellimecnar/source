import { createDataMap } from '@data-map/core';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';
import { bench, describe } from 'vitest';

import {
	generateArray,
	generateFlatObject,
	generateNestedObject,
	generatePointerPaths,
	SCALE_SIZES,
} from './fixtures/scale-generators.js';
import { benchKey } from './utils/adapter-helpers.js';

describe('Scale / Comprehensive', () => {
	describe('Storage Operations at Scale', () => {
		for (const [sizeLabel, count] of Object.entries(SCALE_SIZES)) {
			const data = generateFlatObject(count);
			const keys = Object.keys(data).slice(0, 100);

			bench(
				benchKey({
					category: 'scale',
					caseName: `storage_create_${sizeLabel}`,
					adapterName: 'storage',
				}),
				() => {
					const store = new FlatStore(data);
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `storage_getMany_${sizeLabel}`,
					adapterName: 'storage',
				}),
				() => {
					const store = new FlatStore(data);
					for (const key of keys) {
						store.get(`/${key}`);
					}
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `storage_setMany_${sizeLabel}`,
					adapterName: 'storage',
				}),
				() => {
					const store = new FlatStore(data);
					for (let i = 0; i < keys.length; i++) {
						store.set(`/${keys[i]}`, i);
					}
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `storage_toObject_${sizeLabel}`,
					adapterName: 'storage',
				}),
				() => {
					const store = new FlatStore(data);
					store.toObject();
				},
			);
		}
	});

	describe('DataMap Operations at Scale', () => {
		for (const [sizeLabel, count] of Object.entries(SCALE_SIZES)) {
			const data = generateFlatObject(count);
			const keys = Object.keys(data).slice(0, 100);

			bench(
				benchKey({
					category: 'scale',
					caseName: `datamap_create_${sizeLabel}`,
					adapterName: 'datamap',
				}),
				() => {
					const dm = createDataMap(structuredClone(data));
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `datamap_getMany_${sizeLabel}`,
					adapterName: 'datamap',
				}),
				() => {
					const dm = createDataMap(structuredClone(data));
					for (const key of keys) {
						dm.get(`/${key}`);
					}
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `datamap_setMany_${sizeLabel}`,
					adapterName: 'datamap',
				}),
				() => {
					const dm = createDataMap(structuredClone(data));
					for (let i = 0; i < keys.length; i++) {
						dm.set(`/${keys[i]}`, i);
					}
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `datamap_batchSetMany_${sizeLabel}`,
					adapterName: 'datamap',
				}),
				() => {
					const dm = createDataMap(structuredClone(data));
					dm.batch(() => {
						for (let i = 0; i < keys.length; i++) {
							dm.set(`/${keys[i]}`, i);
						}
					});
				},
			);
		}
	});

	describe('Subscription Operations at Scale', () => {
		for (const [sizeLabel, count] of Object.entries(SCALE_SIZES)) {
			const pointers = generatePointerPaths(count).slice(0, 100);

			bench(
				benchKey({
					category: 'scale',
					caseName: `subscriptions_subscribe_${sizeLabel}`,
					adapterName: 'subscriptions',
				}),
				() => {
					const engine = new SubscriptionEngine();
					const unsubs: (() => void)[] = [];
					for (const ptr of pointers) {
						unsubs.push(engine.subscribePointer(ptr, () => {}));
					}
					for (const u of unsubs) u();
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `subscriptions_notifyMany_${sizeLabel}`,
					adapterName: 'subscriptions',
				}),
				() => {
					const engine = new SubscriptionEngine();
					const unsubs: (() => void)[] = [];
					for (const ptr of pointers) {
						unsubs.push(engine.subscribePointer(ptr, () => {}));
					}
					for (const ptr of pointers) {
						engine.notify(ptr, Math.random());
					}
					for (const u of unsubs) u();
				},
			);
		}
	});

	describe('Path Access at Scale', () => {
		for (const [sizeLabel, count] of Object.entries(SCALE_SIZES)) {
			const flatData = generateFlatObject(count);
			const nestedData = generateNestedObject(5, 3);

			bench(
				benchKey({
					category: 'scale',
					caseName: `paths_flatAccess_${sizeLabel}`,
					adapterName: 'paths',
				}),
				() => {
					const keys = Object.keys(flatData).slice(0, 100);
					for (const key of keys) {
						const dm = createDataMap(structuredClone(flatData));
						dm.get(`/${key}`);
					}
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `paths_deepAccess_${sizeLabel}`,
					adapterName: 'paths',
				}),
				() => {
					const dm = createDataMap(structuredClone(nestedData));
					// Access multiple deep paths
					for (let i = 0; i < 10; i++) {
						dm.get('/prop_0/prop_1/prop_2');
					}
				},
			);
		}
	});

	describe('Array Operations at Scale', () => {
		for (const [sizeLabel, count] of Object.entries(SCALE_SIZES)) {
			const arrayData = generateArray(count);

			bench(
				benchKey({
					category: 'scale',
					caseName: `arrays_largeArray_${sizeLabel}`,
					adapterName: 'arrays',
				}),
				() => {
					// Simulate common array operations
					const arr = [...arrayData];
					arr.push({ id: count, value: Math.random(), name: 'new' });
					arr.splice(Math.floor(arr.length / 2), 1);
					arr.slice(0, 10);
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `arrays_lazyMap_${sizeLabel}`,
					adapterName: 'arrays',
				}),
				() => {
					// Lazy iteration (common pattern)
					const arr = [...arrayData];
					let sum = 0;
					for (let i = 0; i < Math.min(100, arr.length); i++) {
						sum += (arr[i] as any).id;
					}
				},
			);
		}
	});

	describe('Memory-Intensive Operations', () => {
		for (const [sizeLabel, count] of Object.entries(SCALE_SIZES)) {
			bench(
				benchKey({
					category: 'scale',
					caseName: `memory_cloneAndModify_${sizeLabel}`,
					adapterName: 'memory',
				}),
				() => {
					const data = generateFlatObject(count);
					const clone = structuredClone(data);
					Object.entries(clone)
						.slice(0, 10)
						.forEach(([k, v]) => {
							clone[k] = (v as number) * 2;
						});
				},
			);

			bench(
				benchKey({
					category: 'scale',
					caseName: `memory_spreadAndMerge_${sizeLabel}`,
					adapterName: 'memory',
				}),
				() => {
					const data1 = generateFlatObject(Math.floor(count / 2));
					const data2 = generateFlatObject(Math.floor(count / 2));
					const merged = { ...data1, ...data2 };
				},
			);
		}
	});
});
