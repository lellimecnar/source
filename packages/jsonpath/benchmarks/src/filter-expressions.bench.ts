import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
	type JsonPathAdapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSONPath: Filter Expressions', () => {
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];

	const suites: {
		name: string;
		query: string;
		requiresArithmetic?: boolean;
	}[] = [
		{ name: 'simple comparison', query: '$.store.book[?(@.price < 10)].title' },
		{ name: 'boolean check', query: '$.users[?(@.active == true)].name' },
		{
			name: 'logical &&',
			query: '$.users[?(@.score >= 80 && @.active == true)].name',
		},
		{
			name: 'arithmetic',
			query: '$.users[?(@.score + 10 > 90)].name',
			requiresArithmetic: true,
		},
	];

	for (const suite of suites) {
		describe(suite.name, () => {
			for (const adapter of adapters) {
				const typedAdapter = adapter as JsonPathAdapter;
				// Skip if filter not supported
				if (!typedAdapter.features.supportsFilter) continue;
				// Skip arithmetic benchmarks for adapters that don't support it
				if (
					suite.requiresArithmetic &&
					typedAdapter.features.supportsArithmetic === false
				)
					continue;
				bench(typedAdapter.name, () => {
					void typedAdapter.queryValues(STORE_DATA, suite.query);
				});
			}
		});
	}
});
