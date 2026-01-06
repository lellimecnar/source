import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from '../adapters';
import { STORE_DATA } from '../fixtures';

describe('Browser: Query Performance (subset)', () => {
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];
	const q = '$.store.book[*].title';
	for (const adapter of adapters) {
		bench(adapter.name, () => adapter.queryValues(STORE_DATA, q));
	}
});
