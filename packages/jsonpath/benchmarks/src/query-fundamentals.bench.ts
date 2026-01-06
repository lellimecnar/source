import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSONPath: Fundamentals', () => {
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];

	describe('Basic Path Access', () => {
		const queries = [
			'$.store.bicycle.color',
			'$.store.book[0].title',
			'$.store.book[*].title',
		];
		for (const q of queries) {
			describe(q, () => {
				for (const adapter of adapters) {
					bench(adapter.name, () => {
						adapter.queryValues(STORE_DATA, q);
					});
				}
			});
		}
	});

	describe('Recursive Descent', () => {
		const q = '$..author';
		for (const adapter of adapters) {
			if (!adapter.features.supportsFilter) continue;
			bench(adapter.name, () => adapter.queryValues(q, STORE_DATA));
		}
	});
});
