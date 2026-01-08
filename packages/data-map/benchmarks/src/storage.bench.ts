import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

import { SMALL } from './fixtures/index.js';

describe('Storage', () => {
	const pointers = SMALL.pointers;
	const values = SMALL.values;
	const store = new FlatStore(SMALL.root);
	let i = 0;

	bench('storage.getSmall', () => {
		const idx = i++ % pointers.length;
		store.get(pointers[idx]!);
	});

	bench('storage.setSmall', () => {
		const idx = i++ % pointers.length;
		store.set(pointers[idx]!, values[idx]);
	});

	bench('storage.hasSmall', () => {
		const idx = i++ % pointers.length;
		store.has(pointers[idx]!);
	});

	bench('storage.deleteSmall', () => {
		const idx = i++ % pointers.length;
		const p = pointers[idx]!;
		store.delete(p);
		store.set(p, values[idx]);
	});

	bench('storage.toObjectSmall', () => {
		store.toObject();
	});
});
