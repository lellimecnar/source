import { createDataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { SMALL } from '../fixtures';

describe('Baselines / Core', () => {
	const dm = createDataMap(SMALL.root);
	const pointers = SMALL.pointers;
	const values = SMALL.values;
	let i = 0;

	bench('core.dataMapGetSmall', () => {
		dm.get(pointers[i++ % pointers.length]);
	});

	bench('core.dataMapSetSmall', () => {
		const idx = i++ % pointers.length;
		dm.set(pointers[idx], values[idx]);
	});

	bench('core.dataMapSubscribePointer', () => {
		const unsub = dm.subscribe(pointers[0], () => {});
		unsub();
	});

	bench('core.dataMapBatch10Sets', () => {
		dm.batch(() => {
			for (let j = 0; j < 10; j++) {
				const idx = (i + j) % pointers.length;
				dm.set(pointers[idx], values[idx]);
			}
		});
	});
});
