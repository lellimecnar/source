import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';
import { generateWideArray } from './fixtures/generators.js';

describe('Array Operations', () => {
	bench('Array push (DataMap)', () => {
		const dm = new DataMap({
			arr: structuredClone(DATASETS.wideArray),
		});
		dm.push('/arr', { id: 1001, value: 1, name: 'item1001' });
	});

	bench('Array set index (DataMap)', () => {
		const dm = new DataMap({
			arr: structuredClone(DATASETS.wideArray),
		});
		dm.set('/arr/50', { id: 50, value: 999, name: 'updated' });
	});

	bench('Array pop (DataMap)', () => {
		const dm = new DataMap({
			arr: structuredClone(DATASETS.wideArray),
		});
		dm.pop('/arr');
	});
});
