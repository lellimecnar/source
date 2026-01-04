import { describe, it, expect } from 'vitest';
import { parse } from '../parser.js';
import { walk } from '../walk.js';
import { transform } from '../transform.js';
import { NodeType } from '../nodes.js';

describe('AST Utilities', () => {
	it('should walk the AST', () => {
		const ast = parse('$.a.b[?(@.c == 1)]');
		const types: string[] = [];
		walk(ast, {
			[NodeType.NameSelector]: (node) => types.push(node.name),
			[NodeType.Literal]: (node) => types.push(String(node.value)),
		});
		expect(types).toContain('a');
		expect(types).toContain('b');
		expect(types).toContain('c');
		expect(types).toContain('1');
	});

	it('should transform the AST', () => {
		const ast = parse('$.a');
		const transformed = transform(ast, {
			[NodeType.NameSelector]: (node) => ({
				...node,
				name: 'transformed_' + node.name,
			}),
		});
		expect((transformed as any).segments[0].selectors[0].name).toBe('transformed_a');
	});
});
