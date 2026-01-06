import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
	type JsonPathAdapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('Output Formats', () => {
	const adapters: JsonPathAdapter[] = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];
	const q = '$.store.book[*].title';

	describe('Values', () => {
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.queryValues(STORE_DATA, q);
			});
		}
	});

	describe('Paths', () => {
		for (const adapter of adapters) {
			if (!adapter.queryNodes) continue;
			bench(adapter.name, () => {
				void adapter.queryNodes!(STORE_DATA, q);
			});
		}
	});
});
