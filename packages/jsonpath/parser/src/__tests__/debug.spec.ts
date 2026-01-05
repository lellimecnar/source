import { describe, it, expect } from 'vitest';
import { parse } from '../index.js';
import { NodeType } from '../nodes.js';

describe('Debug Parser', () => {
	it('should parse parent selector', () => {
		const ast = parse('$.store.book[0].title.^');
		console.log(JSON.stringify(ast, null, 2));
		const lastSegment = ast.segments[ast.segments.length - 1];
		expect(lastSegment.selectors[0].type).toBe(NodeType.ParentSelector);
	});
});
