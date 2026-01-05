import { queryValues } from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

const data = {
	items: Array.from({ length: 1_000 }, (_, i) => ({
		id: i,
		val: i * 10,
		tags: ['a', 'b', 'c'].slice(0, (i % 3) + 1),
		meta: {
			active: i % 2 === 0,
			score: i / 100,
		},
	})),
};

describe('Expressions and Functions', () => {
	bench('arithmetic filter', () => {
		queryValues(data, '$.items[?(@.val / 10 == @.id)]');
	});

	bench('logical filter', () => {
		queryValues(data, '$.items[?(@.meta.active && @.id < 500)]');
	});

	bench('length function', () => {
		queryValues(data, '$.items[?length(@.tags) == 2]');
	});

	bench('match function', () => {
		queryValues(data, '$.items[?match(@.tags[0], "a")]');
	});

	bench('complex expression', () => {
		queryValues(data, '$.items[?(@.val + 100 > 5000 && length(@.tags) > 1)]');
	});
});
