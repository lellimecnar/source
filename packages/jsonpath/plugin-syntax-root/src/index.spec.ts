import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { createSyntaxRootPlugin, plugin } from './index';

describe('@jsonpath/plugin-syntax-root', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-root');
		expect(plugin.meta.capabilities).toEqual(['syntax:rfc9535:root']);
	});
});

describe('@jsonpath/plugin-syntax-root parser', () => {
	it('parses $ and dot-notation', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const ast = engine.parse('$.store.book');
		expect(ast.kind).toBe('Path');
		expect(ast.segments).toHaveLength(2);
	});

	it('parses bracket selectors', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const ast = engine.parse("$['a'][0]");
		expect(ast.segments).toHaveLength(2);
	});

	it('parses descendant segments', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const ast = engine.parse('$..author');
		expect(ast.segments[0]!.kind).toBe('DescendantSegment');
	});

	it('rejects filters in rfc9535-core', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		expect(() => engine.parse('$[?@.a]')).toThrow(
			'Filter selectors are not supported in rfc9535-core',
		);
	});

	it('parses filters in rfc9535-full', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
				},
			},
		});
		const ast = engine.parse('$[?@.a == 1]');
		expect(ast.segments[0]!.kind).toBe('Segment');
		const selector = (ast.segments[0] as any).selectors[0];
		expect(selector.kind).toBe('Selector:Filter');
		expect(selector.expr.kind).toBe('FilterExpr:Compare');
	});

	it('rejects wildcards in comparison operands', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
				},
			},
		});
		expect(() => engine.parse('$[?@.* == 1]')).toThrow(
			'Singular query in filter comparison',
		);
	});

	it('rejects descendant segments in comparison operands', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
				},
			},
		});
		expect(() => engine.parse('$[?@..a == 1]')).toThrow(
			'Singular query in filter comparison',
		);
	});

	it('accepts singular queries in comparison operands', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
				},
			},
		});
		const ast = engine.parse('$[?@.a == 1]');
		expect(ast.segments[0]!.kind).toBe('Segment');
		const selector = (ast.segments[0] as any).selectors[0];
		expect(selector.kind).toBe('Selector:Filter');
		// Check that the embedded query has singular: true
		const compare = selector.expr;
		expect(compare.left.singular).toBe(true);
		expect(compare.right.kind).toBe('FilterExpr:Literal');
	});
});
