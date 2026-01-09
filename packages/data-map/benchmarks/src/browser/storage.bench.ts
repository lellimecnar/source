import { createDataMap } from '@data-map/core';
import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

import { SMALL } from '../fixtures';
import { benchKey } from '../utils/adapter-helpers.js';

describe('Browser / Storage', () => {
	describe('FlatStore Operations', () => {
		const store = new FlatStore(SMALL.root);
		const pointers = SMALL.pointers;
		let i = 0;

		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'get',
				adapterName: 'storage',
			}),
			() => {
				const idx = i++ % pointers.length;
				store.get(pointers[idx]);
			},
		);

		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'set',
				adapterName: 'storage',
			}),
			() => {
				const idx = i++ % pointers.length;
				store.set(pointers[idx], idx);
			},
		);

		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'has',
				adapterName: 'storage',
			}),
			() => {
				const idx = i++ % pointers.length;
				store.has(pointers[idx]);
			},
		);
	});

	describe('DataMap Operations', () => {
		const dm = createDataMap(SMALL.root);
		const pointers = SMALL.pointers;
		const values = SMALL.values;
		let i = 0;

		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'dataMapGet',
				adapterName: 'datamap',
			}),
			() => {
				dm.get(pointers[i++ % pointers.length]);
			},
		);

		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'dataMapSet',
				adapterName: 'datamap',
			}),
			() => {
				const idx = i++ % pointers.length;
				dm.set(pointers[idx], values[idx]);
			},
		);

		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'dataMapBatch',
				adapterName: 'datamap',
			}),
			() => {
				dm.batch(() => {
					for (let j = 0; j < 10; j++) {
						const idx = (i + j) % pointers.length;
						dm.set(pointers[idx], values[idx]);
					}
				});
			},
		);
	});

	describe('Subscription Operations', () => {
		bench(
			benchKey({
				category: 'browser.storage',
				caseName: 'subscribe',
				adapterName: 'datamap',
			}),
			() => {
				const dm = createDataMap(SMALL.root);
				const unsub = dm.subscribe(SMALL.pointers[0], () => {});
				unsub();
			},
		);
	});
});
