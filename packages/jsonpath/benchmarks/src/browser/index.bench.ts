import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
	type JsonPathAdapter,
} from '../adapters';
import { STORE_DATA } from '../fixtures';

describe('Browser: Query Performance (subset)', () => {
	const adapters: JsonPathAdapter[] = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];
	const q = '$.store.book[*].title';
	for (const adapter of adapters) {
		bench(adapter.name, () => {
			void adapter.queryValues(STORE_DATA, q);
		});
	}
});
