import { describe, expect, it } from 'vitest';

import { Scanner, TokenStream } from '@jsonpath/lexer';
import { JsonPathParser } from '@jsonpath/parser';

import { createSyntaxRootPlugin } from './index';

describe('@jsonpath/plugin-syntax-root (additional)', () => {
	function makeParse(
		profile?: 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full',
	) {
		const p = createSyntaxRootPlugin();
		p.configure?.(profile ? { profile } : undefined);

		const scanner = new Scanner();
		const parser = new JsonPathParser();
		p.hooks?.registerTokens?.(scanner);
		p.hooks?.registerParsers?.(parser);

		return (expr: string) =>
			parser.parse({
				input: expr,
				tokens: new TokenStream(scanner.scanAll(expr)),
			});
	}

	it('parses a simple child-member path in the default profile', () => {
		const parse = makeParse();
		const ast = parse('$.a');
		expect(ast.segments).toHaveLength(1);
		expect(ast.segments[0]).toMatchObject({
			kind: 'Segment',
			selectors: [{ kind: 'Selector:Name', name: 'a' }],
		});
	});

	it('rejects filter selectors in rfc9535-core', () => {
		const parse = makeParse('rfc9535-core');
		expect(() => parse('$[?(@.a)]')).toThrow(
			/Filter selectors are not supported in rfc9535-core/i,
		);
	});

	it('rejects function expressions outside rfc9535-full', () => {
		const parse = makeParse('rfc9535-draft');
		expect(() => parse('$[?length(@.a) == 1]')).toThrow(
			/Function expressions are not supported/i,
		);
	});

	it('accepts function expressions in rfc9535-full', () => {
		const parse = makeParse('rfc9535-full');
		const ast = parse('$[?length(@.a) == 1]');
		expect(ast.segments).toHaveLength(1);
		expect(ast.segments[0]).toMatchObject({
			kind: 'Segment',
			selectors: [
				{
					kind: 'Selector:Filter',
					expr: {
						kind: 'FilterExpr:Compare',
						operator: '==',
					},
				},
			],
		});
	});

	it('does not leak profile configuration between plugin instances', () => {
		const parseCore = makeParse('rfc9535-core');
		const parseDraft = makeParse('rfc9535-draft');
		expect(() => parseCore('$[?(@.a)]')).toThrow();
		expect(() => parseDraft('$[?(@.a)]')).not.toThrow();
	});
});
