import { describe, expect, it } from 'vitest';

import { path, segment } from './nodes';

describe('@jsonpath/ast', () => {
	it('constructs a basic AST', () => {
		const ast = path([segment([{ kind: 'Root' }])]);
		expect(ast.kind).toBe('Path');
		expect(ast.segments).toHaveLength(1);
	});
});
