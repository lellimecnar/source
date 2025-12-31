import { describe, expect, it } from 'vitest';

import {
	descendantSegment,
	indexSelector,
	nameSelector,
	path,
	segment,
	sliceSelector,
	wildcardSelector,
} from './nodes';

describe('@jsonpath/ast RFC-ish nodes', () => {
	it('builds a path with child + descendant segments', () => {
		const ast = path([
			segment([nameSelector('store')]),
			descendantSegment([wildcardSelector()]),
		]);
		expect(ast.kind).toBe('Path');
		expect(ast.segments.map((s) => s.kind)).toEqual([
			'Segment',
			'DescendantSegment',
		]);
	});

	it('creates selector nodes with stable kinds', () => {
		expect(nameSelector('a')).toEqual({ kind: 'Selector:Name', name: 'a' });
		expect(wildcardSelector()).toEqual({ kind: 'Selector:Wildcard' });
		expect(indexSelector(-1)).toEqual({ kind: 'Selector:Index', index: -1 });
		expect(sliceSelector({ start: 1, end: 3, step: 2 })).toEqual({
			kind: 'Selector:Slice',
			start: 1,
			end: 3,
			step: 2,
		});
	});
});
