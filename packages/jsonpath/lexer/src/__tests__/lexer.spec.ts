import { describe, it, expect } from 'vitest';
import { tokenize, TokenType } from '../index.js';

describe('Lexer', () => {
	it('should tokenize basic structural elements', () => {
		const tokens = tokenize('$.store.book[*]');
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.DOT,
			TokenType.IDENT,
			TokenType.DOT,
			TokenType.IDENT,
			TokenType.LBRACKET,
			TokenType.WILDCARD,
			TokenType.RBRACKET,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe('store');
		expect(tokens[4].value).toBe('book');
	});

	it('should tokenize recursive descent', () => {
		const tokens = tokenize('$..book');
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.DOT_DOT,
			TokenType.IDENT,
			TokenType.EOF,
		]);
	});

	it('should tokenize strings with single quotes', () => {
		const tokens = tokenize("$['single\\'quote']");
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.LBRACKET,
			TokenType.STRING,
			TokenType.RBRACKET,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe("single'quote");
	});

	it('should tokenize strings with double quotes', () => {
		const tokens = tokenize('$["double\\"quote"]');
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.LBRACKET,
			TokenType.STRING,
			TokenType.RBRACKET,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe('double"quote');
	});

	it('should tokenize numbers', () => {
		const tokens = tokenize('$[0, -1, 3.14, 1e10]');
		expect(
			tokens.filter((t) => t.type === TokenType.NUMBER).map((t) => t.value),
		).toEqual([0, -1, 3.14, 1e10]);
	});

	it('should tokenize boolean and null literals', () => {
		const tokens = tokenize('$[true, false, null]');
		expect(
			tokens
				.filter((t) =>
					[TokenType.TRUE, TokenType.FALSE, TokenType.NULL].includes(t.type),
				)
				.map((t) => t.value),
		).toEqual([true, false, null]);
	});

	it('should tokenize comparison operators', () => {
		const tokens = tokenize('$[?(@.price == 10 && @.stock != 0)]');
		const ops = tokens.filter((t) =>
			[TokenType.EQ, TokenType.NE, TokenType.AND].includes(t.type),
		);
		expect(ops.map((t) => t.type)).toEqual([
			TokenType.EQ,
			TokenType.AND,
			TokenType.NE,
		]);
	});

	it('should track line and column correctly', () => {
		const tokens = tokenize('$\n.store');
		expect(tokens[0].line).toBe(1);
		expect(tokens[0].column).toBe(1);
		expect(tokens[1].line).toBe(2);
		expect(tokens[1].column).toBe(1);
		expect(tokens[2].line).toBe(2);
		expect(tokens[2].column).toBe(2);
	});

	it('should handle unicode escape sequences', () => {
		const tokens = tokenize("$['\\u0041']");
		expect(tokens[2].value).toBe('A');
	});

	it('should emit ERROR for invalid characters', () => {
		const tokens = tokenize('$#');
		expect(tokens[1].type).toBe(TokenType.ERROR);
		expect(tokens[1].value).toBe('#');
	});

	it('should perform well (benchmark)', () => {
		const query =
			'$.store.book[?(@.price < 10 && @.category == "fiction")].title';
		const start = performance.now();
		for (let i = 0; i < 10000; i++) {
			tokenize(query);
		}
		const end = performance.now();
		const duration = end - start;
		// Target: 10K queries in < 1000ms (relaxed for CI/dev environments)
		expect(duration).toBeLessThan(1000);
	});
});
