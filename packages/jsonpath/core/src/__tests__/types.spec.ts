import { describe, it, expect } from 'vitest';
import type { QueryNode, QueryResult } from '../types.js';

describe('types', () => {
	it('should allow creating a QueryNode', () => {
		const node: QueryNode<number> = {
			value: 42,
			path: ['a', 0],
			root: { a: [42] },
			parent: [42],
			parentKey: 0,
		};

		expect(node.value).toBe(42);
		expect(node.path).toEqual(['a', 0]);
		expect(node.parentKey).toBe(0);
	});

	it('should define QueryResult interface structure', () => {
		// This is mostly a type-level test, but we can verify the interface expectations
		const mockResult: Partial<QueryResult<number>> = {
			length: 1,
			isEmpty: () => false,
			values: () => [42],
			nodes: () => [{ value: 42, path: ['a'], root: {} }],
		};

		expect(mockResult.length).toBe(1);
		expect(mockResult.isEmpty?.()).toBe(false);
		expect(mockResult.values?.()).toEqual([42]);
	});
});
