import { compileQuery, queryValues } from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { STORE_DATA } from './fixtures';

describe('Compilation & Caching (@jsonpath/jsonpath)', () => {
	const path = '$.store.book[?(@.price < 10)].title';

	describe('Cold: interpreted', () => {
		bench('queryValues', () => {
			queryValues(STORE_DATA as any, path);
		});
	});

	describe('Warm: compiled reuse', () => {
		const compiled = compileQuery(path);
		bench('compileQuery() once, execute', () => {
			compiled.values(STORE_DATA as any);
		});
	});
});
