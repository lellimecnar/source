import {
	QuerySet,
	secureQuery,
	transform,
	transformAll,
} from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { STORE_DATA } from './fixtures/index.js';

describe('Advanced @jsonpath/jsonpath Features', () => {
	describe('transform()', () => {
		bench('increment ages', () => {
			void transform(
				STORE_DATA,
				'$.users[*].score',
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
				(score: unknown) => (score as number) + 1,
			);
		});
	});

	describe('transformAll()', () => {
		bench('multiple transforms', () => {
			void transformAll(STORE_DATA, [
				{
					path: '$.users[*].score',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
					fn: (v: unknown) => (v as number) + 1,
				},
				{
					path: '$.store.book[*].price',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
					fn: (v: unknown) => (v as number) * 1.1,
				},
			]);
		});
	});

	describe('QuerySet', () => {
		bench('5 queries', () => {
			const qs = new QuerySet({
				titles: '$.store.book[*].title',
				prices: '$.store.book[*].price',
				authors: '$.store.book[*].author',
				cheap: '$.store.book[?(@.price < 10)].title',
				activeUsers: '$.users[?(@.active == true)].name',
			});
			void qs.queryAll(STORE_DATA);
		});
	});

	describe('secureQuery()', () => {
		bench('allowed query', () => {
			void secureQuery(STORE_DATA, '$.users[*].name');
		});
	});
});
