import { compileQuery, queryValues } from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { STORE_DATA } from './fixtures';

describe('Compilation & Caching (@jsonpath/jsonpath)', () => {
	const path = '$.store.book[?(@.price < 10)].title';

	describe('Cold: interpreted', () => {
		bench('queryValues', () => {
			void queryValues(STORE_DATA, path);
		});
	});

	describe('Warm: compiled reuse', () => {
		const compiled = compileQuery(path);
		bench('compileQuery() once, execute', () => {
			// CompiledQuery is a callable that returns QueryResult
			void compiled(STORE_DATA).values();
		});
	});
});
