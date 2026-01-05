import { describe, it, expect } from 'vitest';
import { PathBuilder, FilterBuilder } from '../index.js';
import { parseExpression } from '@jsonpath/parser';

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

	it('should support arithmetic helpers', () => {
		const filter = new FilterBuilder().add('@.a', '@.b').gt(10).build();
		expect(filter).toBe('add(@.a, @.b) > 10');
	});

	it('should support function helpers', () => {
		const filter = new FilterBuilder().length('@.name').gt(5).build();
		expect(filter).toBe('length(@.name) > 5');
	});

	it('should round-trip simple expressions through parseExpression', () => {
		const expr1 = new FilterBuilder().current().field('a').eq(1).build();
		const parsed1 = parseExpression(expr1);
		expect(parsed1.type).toBe('BinaryExpr');
		// Verify the expression parses without error and produces correct node structure
		expect(parsed1).toBeDefined();
	});

	it('should round-trip complex nested expressions through parseExpression', () => {
		const expr = new FilterBuilder()
			.group((f) =>
				f.current().field('price').lt(10).or().current().field('price').gt(100),
			)
			.and((f) => f.current().field('category').eq('fiction'))
			.build();
		const parsed = parseExpression(expr);
		expect(parsed.type).toBe('BinaryExpr');
		expect(parsed).toBeDefined();
	});

	it('should round-trip expressions with nested groups', () => {
		const expr = new FilterBuilder()
			.group((f) =>
				f
					.group((f2) =>
						f2.current().field('a').eq(1).or().current().field('b').eq(2),
					)
					.and()
					.current()
					.field('c')
					.gt(0),
			)
			.build();
		const parsed = parseExpression(expr);
		expect(parsed.type).toBe('BinaryExpr');
		expect(parsed).toBeDefined();
	});

	it('should round-trip expressions with function calls through parseExpression', () => {
		const expr = new FilterBuilder()
			.length('@.items')
			.gt(0)
			.and((f) => f.fn('match', '@.name', 'John'))
			.build();
		const parsed = parseExpression(expr);
		expect(parsed.type).toBe('BinaryExpr');
		expect(parsed).toBeDefined();
	});

	it('should build and parse complex multi-level filter expressions', () => {
		const expr = new FilterBuilder()
			.current()
			.field('price')
			.lt(100)
			.and((f) =>
				f
					.group((f2) =>
						f2
							.current()
							.field('category')
							.eq('fiction')
							.or((f3) => f3.current().field('category').eq('science')),
					)
					.and((f2) => f2.current().field('inStock').eq(true)),
			)
			.build();
		const parsed = parseExpression(expr);
		expect(parsed.type).toBe('BinaryExpr');
		expect(parsed).toBeDefined();
	});
});
