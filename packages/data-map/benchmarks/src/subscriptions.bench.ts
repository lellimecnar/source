import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

describe('Subscriptions', () => {
	bench('subscribe + 100 updates', () => {
		const dm = new DataMap({
			data: structuredClone(DATASETS.smallObject),
		});
		let hits = 0;
		const unsubscribe = dm.subscribe({
			on: () => {
				hits++;
			},
		});

		for (let i = 0; i < 100; i++) {
			dm.set('/key0', i);
		}

		unsubscribe();
		if (hits === 0) throw new Error('no hits');
	});

	bench('multiple subscriptions + updates', () => {
		const dm = new DataMap({
			data: structuredClone(DATASETS.smallObject),
		});
		let hits1 = 0;
		let hits2 = 0;
		const unsub1 = dm.subscribe({
			on: () => {
				hits1++;
			},
		});
		const unsub2 = dm.subscribe({
			on: () => {
				hits2++;
			},
		});

		for (let i = 0; i < 10; i++) {
			dm.set('/key0', i);
		}

		unsub1();
		unsub2();
	});
});
