import { bench, describe } from 'vitest';
import { queryValues } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: Array.from({ length: 1_000 }, (_, i) => ({
			title: `Book ${i}`,
			price: i,
			category: i % 2 === 0 ? 'fiction' : 'reference',
		})),
	},
};

describe('queryValues()', () => {
	bench('titles', () => {
		queryValues(data, '$.store.book[*].title');
	});

	bench('filter', () => {
		queryValues(
			data,
			'$.store.book[?(@.category == "fiction" && @.price < 500)].title',
		);
	});
});
