import { describe, expect, it } from 'vitest';

import { nameSelector, path, segment } from '@jsonpath/ast';
import { printAst } from './printer';

describe('@jsonpath/printer', () => {
	it('prints the root path', () => {
		expect(printAst(path([]))).toBe('$');
	});

	it('prints a simple child-member path using dot-notation', () => {
		expect(printAst(path([segment([nameSelector('a')])]))).toBe('$.a');
	});
});
