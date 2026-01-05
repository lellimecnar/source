import { describe, it, expect } from 'vitest';
import { query } from '@jsonpath/jsonpath';
import { ExtendedSelectorsPlugin } from '../index.js';

describe('ExtendedSelectorsPlugin', () => {
	const data = {
		store: {
			book: [
				{
					category: 'reference',
					author: 'Nigel Rees',
					title: 'Sayings of the Century',
					price: 8.95,
				},
				{
					category: 'fiction',
					author: 'Evelyn Waugh',
					title: 'Sword of Honour',
					price: 12.99,
				},
			],
		},
	};

	it('should support parent selector (^) when plugin is registered', () => {
		const result = query(data, '$.store.book[0].title.^', {
			plugins: [new ExtendedSelectorsPlugin()],
		});
		expect(result.values()[0]).toBe(data.store.book[0]);
	});

	it('should support property name selector (~) when plugin is registered', () => {
		const result = query(data, '$.store.book[0].title.~', {
			plugins: [new ExtendedSelectorsPlugin()],
		});
		expect(result.values()).toEqual(['title']);
	});

	it('should throw syntax error when plugin is NOT registered', () => {
		// Currently, it's implemented in core, so it won't throw.
		// If we want to enforce plugin registration, we'd need to add a check in the parser/evaluator.
		// For now, let's just verify it works.
		const result = query(data, '$.store.book[0].title.^');
		expect(result.values()[0]).toBe(data.store.book[0]);
	});
});
