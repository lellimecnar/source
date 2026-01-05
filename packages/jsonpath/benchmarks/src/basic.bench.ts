import { bench, describe } from 'vitest';
import { query } from '@jsonpath/jsonpath';
import jp from 'jsonpath';
import { JSONPath } from 'jsonpath-plus';

const data = {
	store: {
		book: Array.from({ length: 100 }, (_, i) => ({
			category: i % 2 === 0 ? 'reference' : 'fiction',
			author: `Author ${i}`,
			title: `Title ${i}`,
			price: Math.random() * 100,
		})),
		bicycle: { color: 'red', price: 19.95 },
	},
};

describe('JSONPath Benchmarks', () => {
	const path = '$.store.book[*].title';

	bench('@jsonpath/jsonpath', () => {
		query(data, path);
	});

	bench('jsonpath', () => {
		jp.query(data, path);
	});

	bench('jsonpath-plus', () => {
		JSONPath({ path, json: data });
	});
});

describe('Filter Benchmarks', () => {
	const path = '$.store.book[?(@.price < 50)].title';

	bench('@jsonpath/jsonpath', () => {
		query(data, path);
	});

	bench('jsonpath', () => {
		jp.query(data, path);
	});

	bench('jsonpath-plus', () => {
		JSONPath({ path, json: data });
	});
});
