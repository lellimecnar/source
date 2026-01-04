import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { compile } from '../compiler.js';

describe('Compiler', () => {
	it('should compile and execute a query', () => {
		const data = { a: { b: 1 } };
		const ast = parse('$.a.b');
		const query = compile(ast);

		const result = query(data);
		expect(result.values()).toEqual([1]);
	});

	it('should be reusable', () => {
		const ast = parse('$.val');
		const query = compile(ast);

		expect(query({ val: 1 }).values()).toEqual([1]);
		expect(query({ val: 2 }).values()).toEqual([2]);
	});
});
