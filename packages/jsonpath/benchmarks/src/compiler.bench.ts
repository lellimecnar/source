import { Compiler } from '@jsonpath/compiler';
import { queryValues } from '@jsonpath/jsonpath';
import { parse } from '@jsonpath/parser';
import { bench, describe } from 'vitest';

const data = {
	store: {
		book: Array.from({ length: 1_000 }, (_, i) => ({
			title: `Book ${i}`,
			price: Math.random() * 100,
			category: i % 2 === 0 ? 'fiction' : 'reference',
		})),
	},
};

const compiler = new Compiler();

describe('Compiler performance', () => {
	const queryStr = '$.store.book[*].title';

	bench('compile and execute', () => {
		const ast = parse(queryStr);
		const compiled = compiler.compile(ast);
		compiled(data);
	});

	bench('interpreted execution', () => {
		queryValues(data, queryStr);
	});

	bench('compilation cache hit', () => {
		const ast = parse(queryStr);
		// First compile (cache miss)
		const compiled1 = compiler.compile(ast);
		// Second compile (cache hit)
		const compiled2 = compiler.compile(ast);
		compiled1(data);
		compiled2(data);
	});
});
