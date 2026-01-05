import { describe, it, expect } from 'vitest';
import { multiQuery } from '../multi-query.js';
import { QuerySet } from '../query-set.js';

describe('Multi-Query', () => {
	const data = {
		a: 1,
		b: 2,
		c: { d: 3 },
	};

	it('multiQuery should handle array of queries', () => {
		const queries = ['$.a', '$.b'];
		const results = multiQuery(data, queries) as Map<string, any>;

		expect(results.get('$.a').values()).toEqual([1]);
		expect(results.get('$.b').values()).toEqual([2]);
	});

	it('multiQuery should handle record of queries', () => {
		const queries = {
			first: '$.a',
			nested: '$.c.d',
		};
		const results = multiQuery(data, queries) as Record<string, any>;

		expect(results.first.values()).toEqual([1]);
		expect(results.nested.values()).toEqual([3]);
	});

	it('QuerySet should be reusable', () => {
		const qs = new QuerySet({
			a: '$.a',
			b: '$.b',
		});

		const res1 = qs.execute(data);
		expect(res1.a.values()).toEqual([1]);

		const res2 = qs.execute({ a: 10, b: 20 });
		expect(res2.a.values()).toEqual([10]);
		expect(res2.b.values()).toEqual([20]);
	});

	it('QuerySet should be mutable', () => {
		const qs = new QuerySet();
		qs.add('a', '$.a');
		expect(qs.names).toEqual(['a']);

		qs.remove('a');
		expect(qs.names).toEqual([]);
	});
});
