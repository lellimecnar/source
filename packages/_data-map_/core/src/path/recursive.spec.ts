import { describe, it, expect } from 'vitest';
import { compilePathPattern } from './compile';

describe('Recursive Descent Matching ($..)', () => {
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
			bicycle: { color: 'red', price: 19.95 },
		},
	};

	const getValue = (ptr: string) => {
		if (ptr === '') return data;
		const parts = ptr.split('/').slice(1);
		let curr: any = data;
		for (const p of parts) {
			const key = p.replace(/~1/g, '/').replace(/~0/g, '~');
			curr = curr?.[key];
		}
		return curr;
	};

	it('should match $..price against all price pointers', () => {
		const pattern = compilePathPattern('$..price');
		expect(pattern.match('/store/book/0/price', getValue).matches).toBe(true);
		expect(pattern.match('/store/book/1/price', getValue).matches).toBe(true);
		expect(pattern.match('/store/bicycle/price', getValue).matches).toBe(true);
		expect(pattern.match('/store/book', getValue).matches).toBe(false);
	});

	it('should match $..book[*] against book array elements', () => {
		const pattern = compilePathPattern('$..book[*]');
		expect(pattern.match('/store/book/0', getValue).matches).toBe(true);
		expect(pattern.match('/store/book/1', getValue).matches).toBe(true);
		expect(pattern.match('/store/book', getValue).matches).toBe(false);
	});

	it('should expand $..price correctly', () => {
		const pattern = compilePathPattern('$..price');
		const results = pattern.expand(data);
		expect(results).toContain('/store/book/0/price');
		expect(results).toContain('/store/book/1/price');
		expect(results).toContain('/store/bicycle/price');
		expect(results.length).toBe(3);
	});

	it('should expand $..book[0].title', () => {
		const pattern = compilePathPattern('$..book[0].title');
		const results = pattern.expand(data);
		expect(results).toEqual(['/store/book/0/title']);
	});
});
