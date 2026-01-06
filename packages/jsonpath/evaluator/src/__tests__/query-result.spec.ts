import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../index.js';

describe('QueryResult pointers()', () => {
	it('returns JSONPointer objects that match the string form', () => {
		const data = { a: { b: [10, 20] } };
		const ast = parse('$.a.b[1]');
		const result = evaluate(data, ast);

		const ptr = result.pointers()[0]!;
		expect(ptr.toString()).toBe('/a/b/1');
		expect(result.pointerStrings()[0]).toBe('/a/b/1');
	});

	it('caches node.path (same array instance on repeated access)', () => {
		const data = { a: { b: [10, 20] } };
		const ast = parse('$.a.b[1]');
		const result = evaluate(data, ast);

		const node = result.nodes()[0]!;
		const p1 = node.path;
		const p2 = node.path;

		expect(p1).toBe(p2);
		expect(p1).toEqual(['a', 'b', 1]);
	});
});
