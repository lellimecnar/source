import { describe, it, expect } from 'vitest';
import { PathBuilder, FilterBuilder } from '../index.js';

describe('PathBuilder', () => {
	it('should build a simple path', () => {
		const path = PathBuilder.root()
			.child('store')
			.child('book')
			.index(0)
			.build();
		expect(path).toBe('$.store.book[0]');
	});

	it('should handle special characters in child names', () => {
		const path = PathBuilder.root().child('special-name').build();
		expect(path).toBe("$['special-name']");
	});

	it('should build a path with a slice', () => {
		const path = PathBuilder.root().child('book').slice(0, 2).build();
		expect(path).toBe('$.book[0:2]');
	});

	it('should build a path with a filter', () => {
		const path = PathBuilder.root()
			.child('book')
			.filter((f) => f.current().field('price').lt(10))
			.build();
		expect(path).toBe('$.book[?(@.price < 10)]');
	});

	it('should build a complex path with logical operators in filter', () => {
		const path = PathBuilder.root()
			.child('book')
			.filter((f) =>
				f
					.current()
					.field('price')
					.lt(10)
					.and((f2) => f2.current().field('category').eq('fiction')),
			)
			.build();
		expect(path).toBe('$.book[?(@.price < 10 && @.category == "fiction")]');
	});

	it('should support descendant selector', () => {
		const path = PathBuilder.root().descendant('author').build();
		expect(path).toBe('$..author');
	});

	it('should support union selector', () => {
		const path = PathBuilder.root()
			.child('book')
			.union('title', 'price')
			.build();
		expect(path).toBe("$.book['title', 'price']");
	});
});

describe('FilterBuilder', () => {
	it('should build a simple comparison', () => {
		const filter = new FilterBuilder().current().field('a').eq(1).build();
		expect(filter).toBe('@.a == 1');
	});

	it('should build a function call', () => {
		const filter = new FilterBuilder().fn('length', '@.list').eq(3).build();
		expect(filter).toBe('length(@.list) == 3');
	});

	it('should support grouping', () => {
		const filter = new FilterBuilder()
			.group((f) =>
				f.current().field('a').eq(1).or().current().field('b').eq(2),
			)
			.and()
			.current()
			.field('c')
			.gt(0)
			.build();
		expect(filter).toBe('(@.a == 1 || @.b == 2) && @.c > 0');
	});
});
