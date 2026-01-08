import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

import { SMALL } from '../fixtures';

describe('Baselines / Path', () => {
	const store = new FlatStore(SMALL.root);
	const pointers = SMALL.pointers;
	let i = 0;

	bench('path.pointerGetSmall', () => {
		const idx = i++ % pointers.length;
		store.get(pointers[idx]);
	});

	bench('path.pointerSetSmall', () => {
		const idx = i++ % pointers.length;
		store.set(pointers[idx], idx);
	});
});
