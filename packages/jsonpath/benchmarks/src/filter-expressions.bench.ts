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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (!(adapter as any).features.supportsFilter) continue;
				bench(
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					(adapter as any).name,
					() => {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
						void (adapter as any).queryValues(suite.query, STORE_DATA);
					},
				);
			}
		});
	}
});
