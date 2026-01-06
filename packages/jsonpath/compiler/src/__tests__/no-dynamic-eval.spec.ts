import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { compile } from '../compiler.js';

describe('compiler security', () => {
	it('does not embed dynamic compilation', () => {
		const ast = parse('$.a');
		const fn = compile(ast);
		expect(String(fn.source)).not.toContain('new Function');
	});
});
