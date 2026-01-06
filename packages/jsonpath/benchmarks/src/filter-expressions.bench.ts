import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSONPath: Filter Expressions', () => {
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];

	const suites: { name: string; query: string }[] = [
		{ name: 'simple comparison', query: '$.store.book[?(@.price < 10)].title' },
		{ name: 'boolean check', query: '$.users[?(@.active == true)].name' },
		{
			name: 'logical &&',
			query: '$.users[?(@.score >= 80 && @.active == true)].name',
		},
		{ name: 'arithmetic', query: '$.users[?(@.score + 10 > 90)].name' },
	];

	for (const suite of suites) {
		describe(suite.name, () => {
			for (const adapter of adapters) {
				if (!adapter.features.supportsFilter) continue;
				bench(adapter.name, () => adapter.queryValues(suite.query, STORE_DATA));
			}
		});
	}
});
