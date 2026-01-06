import {
	QuerySet,
	secureQuery,
	transform,
	transformAll,
} from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { STORE_DATA } from './fixtures';

describe('Advanced @jsonpath/jsonpath Features', () => {
	describe('transform()', () => {
		bench('increment ages', () => {
			transform(
				STORE_DATA as any,
				'$.users[*].score',
				(score: any) => score + 1,
			);
		});
	});

	describe('transformAll()', () => {
		bench('multiple transforms', () => {
			transformAll(STORE_DATA as any, [
				{ path: '$.users[*].score', transform: (v: any) => v + 1 },
				{ path: '$.store.book[*].price', transform: (v: any) => v * 1.1 },
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
			qs.query(STORE_DATA as any);
		});
	});

	describe('secureQuery()', () => {
		bench('allowed query', () => {
			secureQuery(STORE_DATA as any, '$.users[*].name', {
				allowedRootPaths: ['$.users'],
			});
		});
	});
});
