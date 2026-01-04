import { describe, it, expect } from 'vitest';
import { parse } from '../parser.js';
import { NodeType } from '../nodes.js';

describe('Parser', () => {
	it('should parse a simple root query', () => {
		const ast = parse('$');
		expect(ast.type).toBe(NodeType.Query);
		expect(ast.segments).toHaveLength(0);
	});

	it('should parse a simple child segment', () => {
		const ast = parse('$.a');
		expect(ast.segments).toHaveLength(1);
		expect(ast.segments[0].type).toBe(NodeType.ChildSegment);
		expect(ast.segments[0].selectors).toHaveLength(1);
		expect(ast.segments[0].selectors[0].type).toBe(NodeType.NameSelector);
		expect((ast.segments[0].selectors[0] as any).name).toBe('a');
	});

	it('should parse bracket notation', () => {
		const ast = parse('$["a", 1]');
		expect(ast.segments).toHaveLength(1);
		expect(ast.segments[0].selectors).toHaveLength(2);
		expect(ast.segments[0].selectors[0].type).toBe(NodeType.NameSelector);
		expect(ast.segments[0].selectors[1].type).toBe(NodeType.IndexSelector);
	});

	it('should parse descendant segments', () => {
		const ast = parse('$..a');
		expect(ast.segments).toHaveLength(1);
		expect(ast.segments[0].type).toBe(NodeType.DescendantSegment);
	});

	it('should parse wildcards', () => {
		const ast = parse('$.*');
		expect(ast.segments[0].selectors[0].type).toBe(NodeType.WildcardSelector);
	});

	it('should parse slices', () => {
		const ast = parse('$[1:5:2]');
		const selector = ast.segments[0].selectors[0] as any;
		expect(selector.type).toBe(NodeType.SliceSelector);
		expect(selector.start).toBe(1);
		expect(selector.end).toBe(5);
		expect(selector.step).toBe(2);
	});

	it('should parse filter expressions', () => {
		const ast = parse('$[?(@.a == 1)]');
		const selector = ast.segments[0].selectors[0] as any;
		expect(selector.type).toBe(NodeType.FilterSelector);
		expect(selector.expression.type).toBe(NodeType.BinaryExpr);
		expect(selector.expression.operator).toBe('==');
	});

	it('should parse complex expressions with precedence', () => {
		const ast = parse('$[?(@.a == 1 || @.b == 2 && @.c == 3)]');
		const filter = ast.segments[0].selectors[0] as any;
		const expr = filter.expression;
		expect(expr.operator).toBe('||');
		expect(expr.right.operator).toBe('&&');
	});

	it('should parse function calls', () => {
		const ast = parse('$[?(length(@.a) > 0)]');
		const filter = ast.segments[0].selectors[0] as any;
		const expr = filter.expression;
		expect(expr.left.type).toBe(NodeType.FunctionCall);
		expect(expr.left.name).toBe('length');
	});

	it('should throw on invalid index selector $[+1]', () => {
		expect(() => parse('$[+1]')).toThrow();
	});

	it('should throw on invalid index selector $[1.0]', () => {
		expect(() => parse('$[1.0]')).toThrow();
	});
});
