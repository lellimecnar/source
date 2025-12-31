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
});
