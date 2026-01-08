import { DataMap } from '@data-map/core';
import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

import { MEDIUM } from './fixtures/index.js';

describe('Scale', () => {
	const pointers = MEDIUM.pointers;
	const values = MEDIUM.values;

	describe('FlatStore (medium)', () => {
		const store = new FlatStore(MEDIUM.root);
		let i = 0;

		bench('scale.flatStoreGetMedium', () => {
			const idx = i++ % pointers.length;
			store.get(pointers[idx]!);
		});

		bench('scale.flatStoreSetMedium', () => {
			const idx = i++ % pointers.length;
			store.set(pointers[idx]!, values[idx]);
		});
	});

	describe('DataMap (medium)', () => {
		const dm = new DataMap(MEDIUM.root as any);
		let i = 0;

		bench('scale.dataMapSetMedium', () => {
			const idx = i++ % pointers.length;
			dm.set(pointers[idx]!, values[idx]);
		});

		bench('scale.dataMapSubscribeMedium', () => {
			const idx = i++ % pointers.length;
			const unsub = dm.subscribe(pointers[idx]!, () => {});
			unsub();
		});
	});
});
