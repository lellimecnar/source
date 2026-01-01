import { describe, expect, it } from 'vitest';

import { path, segment, nameSelector } from '@jsonpath/ast';

import { JsonPathParser } from './index';

describe('@jsonpath/parser (additional)', () => {
	it('returns an empty path when no segment parsers are installed', () => {
		const parser = new JsonPathParser();
		const ast = parser.parse({ input: '$.x', tokens: null as any });
		expect(ast).toEqual(path([]));
	});

	it('uses the first segment parser that returns a non-null value', () => {
		const parser = new JsonPathParser();
		parser.registerSegmentParser(() => null);
		parser.registerSegmentParser(
			() => path([segment([nameSelector('a')])]) as any,
		);
		parser.registerSegmentParser(
			() => path([segment([nameSelector('b')])]) as any,
		);
		const ast = parser.parse({ input: '$', tokens: null as any });
		expect((ast as any).segments[0].selectors[0]).toMatchObject({ name: 'a' });
	});

	it('calls parsers in registration order', () => {
		const parser = new JsonPathParser();
		const order: string[] = [];
		parser.registerSegmentParser(() => {
			order.push('first');
			return null;
		});
		parser.registerSegmentParser(() => {
			order.push('second');
			return path([]);
		});
		parser.parse({ input: '$', tokens: null as any });
		expect(order).toEqual(['first', 'second']);
	});

	it('does not require a TokenStream at the framework level', () => {
		const parser = new JsonPathParser();
		parser.registerSegmentParser((ctx) => {
			expect(ctx.input).toBe('$.x');
			return path([]);
		});
		parser.parse({ input: '$.x', tokens: undefined as any });
	});

	it('parsers can return any PathNode instance', () => {
		const parser = new JsonPathParser();
		const ast = path([segment([nameSelector('x')])]);
		parser.registerSegmentParser(() => ast);
		expect(parser.parse({ input: '$.x', tokens: null as any })).toBe(ast);
	});
});
