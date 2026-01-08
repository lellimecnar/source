import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

describe('Batch', () => {
	bench('Batch 100 sets', () => {
		const dm = new DataMap({
			data: structuredClone(DATASETS.smallObject),
		});
		for (let i = 0; i < 100; i++) {
			dm.set(`/key_${i}`, i);
		}
	});

	bench('Batch setAll on array', () => {
		const dm = new DataMap({
			arr: structuredClone(DATASETS.wideArray),
		});
		dm.setAll('/arr/*/value', 999);
	});
});
