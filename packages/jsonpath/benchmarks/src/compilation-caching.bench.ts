import { compileQuery, queryValues } from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { STORE_DATA } from './fixtures/index.js';

describe('Compilation & Caching (@jsonpath/jsonpath)', () => {
	const path = '$.store.book[?(@.price < 10)].title';

	describe('Cold: interpreted', () => {
		bench('queryValues', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			void queryValues(STORE_DATA as any, path);
		});
	});

	describe('Warm: compiled reuse', () => {
		const compiled = compileQuery(path);
		bench('compileQuery() once, execute', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			void (compiled as any).queryValues(STORE_DATA as any);
		});
	});
});
